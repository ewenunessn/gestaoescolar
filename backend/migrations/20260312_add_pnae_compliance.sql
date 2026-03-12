-- Migration: Adicionar campos para conformidade PNAE (Lei 11.947/2009)
-- Data: 2026-03-12
-- Descrição: Adiciona campos necessários para rastreabilidade e prestação de contas FNDE
-- IMPORTANTE: Esta migration é ADITIVA - não remove nem altera campos existentes

-- 1. ADICIONAR TIPO DE FORNECEDOR (Agricultura Familiar)
-- Adiciona campo para identificar se fornecedor é de agricultura familiar
ALTER TABLE fornecedores 
ADD COLUMN IF NOT EXISTS tipo_fornecedor VARCHAR(50) DEFAULT 'CONVENCIONAL';

-- Valores possíveis: 'AGRICULTURA_FAMILIAR', 'CONVENCIONAL', 'COOPERATIVA_AF', 'ASSOCIACAO_AF'
COMMENT ON COLUMN fornecedores.tipo_fornecedor IS 'Tipo de fornecedor para cálculo PNAE: AGRICULTURA_FAMILIAR, CONVENCIONAL, COOPERATIVA_AF, ASSOCIACAO_AF';

-- Adicionar campos de documentação para agricultura familiar
ALTER TABLE fornecedores 
ADD COLUMN IF NOT EXISTS dap_caf VARCHAR(100);

COMMENT ON COLUMN fornecedores.dap_caf IS 'Número da DAP (Declaração de Aptidão ao PRONAF) ou CAF (Cadastro Nacional da Agricultura Familiar)';

ALTER TABLE fornecedores 
ADD COLUMN IF NOT EXISTS data_validade_dap DATE;

COMMENT ON COLUMN fornecedores.data_validade_dap IS 'Data de validade da DAP/CAF';

-- 2. ADICIONAR VINCULAÇÃO DE MODALIDADE NOS PEDIDOS
-- Para calcular per capita por modalidade
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS escola_id INTEGER REFERENCES escolas(id);

COMMENT ON COLUMN pedidos.escola_id IS 'Escola do pedido para vincular com modalidade';

ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS modalidade_id INTEGER REFERENCES modalidades(id);

COMMENT ON COLUMN pedidos.modalidade_id IS 'Modalidade de ensino para cálculo per capita PNAE';

-- 3. ADICIONAR CAMPOS DE RASTREABILIDADE PNAE NOS PEDIDOS
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS origem_recurso VARCHAR(50) DEFAULT 'PNAE';

COMMENT ON COLUMN pedidos.origem_recurso IS 'Origem do recurso: PNAE, PROPRIO, OUTROS';

ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS percentual_agricultura_familiar DECIMAL(5,2);

COMMENT ON COLUMN pedidos.percentual_agricultura_familiar IS 'Percentual do pedido destinado à agricultura familiar (calculado automaticamente)';

-- 4. CRIAR TABELA DE CONFIGURAÇÃO PNAE PER CAPITA
-- Valores per capita por modalidade conforme FNDE
CREATE TABLE IF NOT EXISTS pnae_per_capita (
  id SERIAL PRIMARY KEY,
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id),
  ano INTEGER NOT NULL,
  valor_per_capita DECIMAL(10,2) NOT NULL,
  dias_letivos INTEGER NOT NULL DEFAULT 200,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(modalidade_id, ano)
);

COMMENT ON TABLE pnae_per_capita IS 'Valores per capita PNAE por modalidade e ano conforme FNDE';

-- Inserir valores padrão 2026 (conforme Resolução FNDE)
INSERT INTO pnae_per_capita (modalidade_id, ano, valor_per_capita, dias_letivos) 
SELECT id, 2026, 
  CASE 
    WHEN nome ILIKE '%creche%' THEN 1.50
    WHEN nome ILIKE '%pré%' OR nome ILIKE '%infantil%' THEN 1.00
    WHEN nome ILIKE '%fundamental%' THEN 0.50
    WHEN nome ILIKE '%eja%' OR nome ILIKE '%adulto%' THEN 0.40
    WHEN nome ILIKE '%integral%' THEN 2.00
    ELSE 0.50
  END,
  200
FROM modalidades
WHERE EXISTS (SELECT 1 FROM modalidades)
ON CONFLICT (modalidade_id, ano) DO NOTHING;

-- 5. CRIAR TABELA DE RELATÓRIOS PNAE
-- Para armazenar relatórios gerados para prestação de contas
CREATE TABLE IF NOT EXISTS pnae_relatorios (
  id SERIAL PRIMARY KEY,
  tipo_relatorio VARCHAR(100) NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  dados_json JSONB NOT NULL,
  percentual_agricultura_familiar DECIMAL(5,2),
  valor_total DECIMAL(12,2),
  valor_agricultura_familiar DECIMAL(12,2),
  gerado_por INTEGER REFERENCES usuarios(id),
  gerado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  observacoes TEXT
);

COMMENT ON TABLE pnae_relatorios IS 'Histórico de relatórios PNAE gerados para prestação de contas FNDE';

CREATE INDEX idx_pnae_relatorios_periodo ON pnae_relatorios(ano, mes);
CREATE INDEX idx_pnae_relatorios_tipo ON pnae_relatorios(tipo_relatorio);

-- 6. CRIAR VIEW PARA CÁLCULO AUTOMÁTICO DE AGRICULTURA FAMILIAR
-- Relacionamento: pedido → pedido_itens → contrato_produtos → contratos → fornecedores
CREATE OR REPLACE VIEW vw_pnae_agricultura_familiar AS
SELECT 
  p.id as pedido_id,
  p.numero as pedido_numero,
  p.data_pedido,
  p.valor_total as valor_pedido,
  f.id as fornecedor_id,
  f.nome as fornecedor_nome,
  f.tipo_fornecedor,
  c.id as contrato_id,
  c.numero as contrato_numero,
  SUM(pi.valor_total) as valor_itens,
  CASE 
    WHEN f.tipo_fornecedor IN ('AGRICULTURA_FAMILIAR', 'COOPERATIVA_AF', 'ASSOCIACAO_AF') 
    THEN SUM(pi.valor_total)
    ELSE 0 
  END as valor_agricultura_familiar,
  CASE 
    WHEN f.tipo_fornecedor IN ('AGRICULTURA_FAMILIAR', 'COOPERATIVA_AF', 'ASSOCIACAO_AF') 
    THEN 100.0 
    ELSE 0.0 
  END as percentual_af,
  p.origem_recurso
FROM pedidos p
INNER JOIN pedido_itens pi ON p.id = pi.pedido_id
INNER JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
INNER JOIN contratos c ON cp.contrato_id = c.id
INNER JOIN fornecedores f ON c.fornecedor_id = f.id
WHERE p.origem_recurso = 'PNAE' OR p.origem_recurso IS NULL
GROUP BY p.id, p.numero, p.data_pedido, p.valor_total, f.id, f.nome, f.tipo_fornecedor, c.id, c.numero, p.origem_recurso;

COMMENT ON VIEW vw_pnae_agricultura_familiar IS 'View para cálculo automático do percentual de agricultura familiar';

-- 7. CRIAR VIEW PARA RELATÓRIO PER CAPITA POR MODALIDADE
CREATE OR REPLACE VIEW vw_pnae_per_capita_modalidade AS
SELECT 
  m.id as modalidade_id,
  m.nome as modalidade_nome,
  pc.ano,
  pc.valor_per_capita,
  pc.dias_letivos,
  COUNT(DISTINCT p.id) as total_pedidos,
  COALESCE(SUM(p.valor_total), 0) as valor_total_gasto,
  COUNT(DISTINCT p.escola_id) as total_escolas
FROM modalidades m
LEFT JOIN pnae_per_capita pc ON m.id = pc.modalidade_id AND pc.ativo = true
LEFT JOIN pedidos p ON p.modalidade_id = m.id
GROUP BY m.id, m.nome, pc.ano, pc.valor_per_capita, pc.dias_letivos;

COMMENT ON VIEW vw_pnae_per_capita_modalidade IS 'View para relatório per capita por modalidade conforme PNAE';

-- 8. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_fornecedores_tipo ON fornecedores(tipo_fornecedor);
CREATE INDEX IF NOT EXISTS idx_pedidos_modalidade ON pedidos(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_origem_recurso ON pedidos(origem_recurso);

-- 9. ATUALIZAR PEDIDOS EXISTENTES
-- Marcar todos os pedidos existentes como PNAE por padrão
UPDATE pedidos 
SET origem_recurso = 'PNAE' 
WHERE origem_recurso IS NULL;

-- 10. MENSAGENS DE SUCESSO
DO $$
BEGIN
  RAISE NOTICE '✅ Migration PNAE concluída com sucesso!';
  RAISE NOTICE '📋 Campos adicionados:';
  RAISE NOTICE '   - fornecedores.tipo_fornecedor';
  RAISE NOTICE '   - fornecedores.dap_caf';
  RAISE NOTICE '   - fornecedores.data_validade_dap';
  RAISE NOTICE '   - pedidos.modalidade_id';
  RAISE NOTICE '   - pedidos.origem_recurso';
  RAISE NOTICE '   - pedidos.percentual_agricultura_familiar';
  RAISE NOTICE '📊 Tabelas criadas:';
  RAISE NOTICE '   - pnae_per_capita';
  RAISE NOTICE '   - pnae_relatorios';
  RAISE NOTICE '👁️  Views criadas:';
  RAISE NOTICE '   - vw_pnae_agricultura_familiar';
  RAISE NOTICE '   - vw_pnae_per_capita_modalidade';
  RAISE NOTICE '⚠️  IMPORTANTE: Sistema existente continua funcionando normalmente!';
END $$;
