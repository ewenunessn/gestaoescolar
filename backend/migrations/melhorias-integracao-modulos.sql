-- ============================================================================
-- MELHORIAS DE INTEGRAÇÃO ENTRE MÓDULOS
-- ============================================================================
-- Este script implementa melhorias críticas na integração e sincronização
-- de dados entre os módulos do sistema
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SINCRONIZAÇÃO ESTOQUE CENTRAL ↔ ESTOQUE ESCOLAR
-- ----------------------------------------------------------------------------

-- Adicionar campo para rastrear escola destino nas movimentações
ALTER TABLE estoque_central_movimentacoes
ADD COLUMN IF NOT EXISTS escola_destino_id INTEGER REFERENCES escolas(id);

-- Adicionar campo para rastrear lote de origem no estoque escolar
ALTER TABLE estoque_escolas
ADD COLUMN IF NOT EXISTS lote_origem_id INTEGER REFERENCES estoque_central_lotes(id);

-- Função para sincronizar estoque central com escolar
CREATE OR REPLACE FUNCTION sync_estoque_central_para_escola()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for uma saída com destino para escola
  IF NEW.tipo_movimentacao = 'saida' AND NEW.escola_destino_id IS NOT NULL THEN
    
    -- Registrar entrada automática no estoque da escola
    INSERT INTO estoque_escolas (
      escola_id, 
      produto_id, 
      quantidade, 
      lote, 
      lote_origem_id,
      data_validade
    )
    SELECT 
      NEW.escola_destino_id,
      NEW.produto_id,
      NEW.quantidade,
      ecl.lote,
      ecl.id,
      ecl.data_validade
    FROM estoque_central_lotes ecl
    WHERE ecl.id = NEW.lote_id
    ON CONFLICT (escola_id, produto_id, COALESCE(lote, ''))
    DO UPDATE SET 
      quantidade = estoque_escolas.quantidade + EXCLUDED.quantidade,
      updated_at = CURRENT_TIMESTAMP;
    
    -- Log da sincronização
    INSERT INTO estoque_escolas_historico (
      escola_id,
      produto_id,
      tipo_movimentacao,
      quantidade,
      lote,
      observacao
    )
    VALUES (
      NEW.escola_destino_id,
      NEW.produto_id,
      'entrada_central',
      NEW.quantidade,
      (SELECT lote FROM estoque_central_lotes WHERE id = NEW.lote_id),
      'Transferência automática do estoque central - Movimentação #' || NEW.id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_sync_estoque ON estoque_central_movimentacoes;
CREATE TRIGGER trigger_sync_estoque
AFTER INSERT ON estoque_central_movimentacoes
FOR EACH ROW EXECUTE FUNCTION sync_estoque_central_para_escola();

-- View para rastreamento completo de lotes
CREATE OR REPLACE VIEW vw_rastreamento_lotes AS
SELECT 
  ecl.id as lote_id,
  ecl.lote,
  ecl.data_fabricacao,
  ecl.data_validade,
  ec.produto_id,
  p.nome as produto_nome,
  p.unidade,
  'Estoque Central' as localizacao_tipo,
  NULL::INTEGER as escola_id,
  NULL::TEXT as escola_nome,
  ecl.quantidade as quantidade_atual,
  ecl.quantidade_reservada,
  ecl.quantidade_disponivel,
  CASE 
    WHEN ecl.data_validade < CURRENT_DATE THEN 'vencido'
    WHEN ecl.data_validade < CURRENT_DATE + INTERVAL '30 days' THEN 'proximo_vencimento'
    ELSE 'ok'
  END as status_validade
FROM estoque_central_lotes ecl
JOIN estoque_central ec ON ecl.estoque_central_id = ec.id
JOIN produtos p ON ec.produto_id = p.id

UNION ALL

SELECT 
  ecl.id as lote_id,
  ecl.lote,
  ecl.data_fabricacao,
  ecl.data_validade,
  ee.produto_id,
  p.nome as produto_nome,
  p.unidade,
  'Estoque Escolar' as localizacao_tipo,
  ee.escola_id,
  e.nome as escola_nome,
  ee.quantidade as quantidade_atual,
  0 as quantidade_reservada,
  ee.quantidade as quantidade_disponivel,
  CASE 
    WHEN ecl.data_validade < CURRENT_DATE THEN 'vencido'
    WHEN ecl.data_validade < CURRENT_DATE + INTERVAL '30 days' THEN 'proximo_vencimento'
    ELSE 'ok'
  END as status_validade
FROM estoque_escolas ee
JOIN estoque_central_lotes ecl ON ee.lote_origem_id = ecl.id
JOIN escolas e ON ee.escola_id = e.id
JOIN produtos p ON ee.produto_id = p.id;

-- ----------------------------------------------------------------------------
-- 2. AUDITORIA DE MUDANÇAS DE STATUS
-- ----------------------------------------------------------------------------

-- Criar tabela de auditoria
CREATE TABLE IF NOT EXISTS auditoria_status (
  id SERIAL PRIMARY KEY,
  tabela VARCHAR(50) NOT NULL,
  registro_id INTEGER NOT NULL,
  status_anterior VARCHAR(50),
  status_novo VARCHAR(50) NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  usuario_nome VARCHAR(255),
  motivo TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para consultas rápidas
  INDEX idx_auditoria_tabela_registro (tabela, registro_id),
  INDEX idx_auditoria_created_at (created_at DESC)
);

-- Função genérica para auditar mudanças de status
CREATE OR REPLACE FUNCTION auditar_mudanca_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Só auditar se o status realmente mudou
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO auditoria_status (
      tabela, 
      registro_id, 
      status_anterior, 
      status_novo,
      usuario_id,
      metadata
    )
    VALUES (
      TG_TABLE_NAME, 
      NEW.id, 
      OLD.status, 
      NEW.status,
      COALESCE(NEW.updated_by, NEW.usuario_criacao_id),
      jsonb_build_object(
        'old_row', to_jsonb(OLD),
        'new_row', to_jsonb(NEW),
        'trigger_op', TG_OP
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers em tabelas críticas
DROP TRIGGER IF EXISTS trigger_audit_pedidos ON pedidos;
CREATE TRIGGER trigger_audit_pedidos
AFTER UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION auditar_mudanca_status();

DROP TRIGGER IF EXISTS trigger_audit_guias ON guias;
CREATE TRIGGER trigger_audit_guias
AFTER UPDATE ON guias
FOR EACH ROW EXECUTE FUNCTION auditar_mudanca_status();

-- Adicionar campo updated_by se não existir
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES usuarios(id);
ALTER TABLE guias ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES usuarios(id);

-- ----------------------------------------------------------------------------
-- 3. VALIDAÇÃO DE SALDO DE CONTRATO
-- ----------------------------------------------------------------------------

-- Função para verificar saldo disponível de um produto
CREATE OR REPLACE FUNCTION verificar_saldo_produto(
  p_produto_id INTEGER,
  p_quantidade_solicitada NUMERIC
)
RETURNS TABLE(
  saldo_disponivel NUMERIC,
  saldo_suficiente BOOLEAN,
  contratos_disponiveis JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(cpm.quantidade_disponivel), 0) as saldo_disponivel,
    COALESCE(SUM(cpm.quantidade_disponivel), 0) >= p_quantidade_solicitada as saldo_suficiente,
    jsonb_agg(
      jsonb_build_object(
        'contrato_id', c.id,
        'contrato_numero', c.numero,
        'fornecedor', f.nome,
        'saldo_disponivel', cpm.quantidade_disponivel,
        'preco_unitario', cp.preco_unitario
      )
    ) as contratos_disponiveis
  FROM contrato_produtos cp
  JOIN contrato_produtos_modalidades cpm ON cp.id = cpm.contrato_produto_id
  JOIN contratos c ON cp.contrato_id = c.id
  JOIN fornecedores f ON c.fornecedor_id = f.id
  WHERE cp.produto_id = p_produto_id 
    AND cp.ativo = true 
    AND cpm.ativo = true
    AND c.status = 'ativo';
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 4. INTEGRIDADE REFERENCIAL MELHORADA
-- ----------------------------------------------------------------------------

-- Função para verificar dependências antes de excluir produto
CREATE OR REPLACE FUNCTION verificar_dependencias_produto(p_produto_id INTEGER)
RETURNS TABLE(tabela TEXT, quantidade BIGINT, detalhes TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'pedido_itens'::TEXT, 
    COUNT(*),
    'Produto usado em ' || COUNT(*) || ' item(ns) de pedido'
  FROM pedido_itens 
  WHERE produto_id = p_produto_id
  
  UNION ALL
  
  SELECT 
    'guia_produto_escola'::TEXT, 
    COUNT(*),
    'Produto usado em ' || COUNT(*) || ' guia(s) de demanda'
  FROM guia_produto_escola 
  WHERE produto_id = p_produto_id
  
  UNION ALL
  
  SELECT 
    'estoque_central'::TEXT, 
    COUNT(*),
    'Produto possui ' || COALESCE(SUM(quantidade), 0) || ' unidades no estoque central'
  FROM estoque_central 
  WHERE produto_id = p_produto_id
  
  UNION ALL
  
  SELECT 
    'estoque_escolas'::TEXT, 
    COUNT(*),
    'Produto possui ' || COALESCE(SUM(quantidade), 0) || ' unidades em escolas'
  FROM estoque_escolas 
  WHERE produto_id = p_produto_id
  
  UNION ALL
  
  SELECT 
    'contrato_produtos'::TEXT, 
    COUNT(*),
    'Produto vinculado a ' || COUNT(*) || ' contrato(s)'
  FROM contrato_produtos 
  WHERE produto_id = p_produto_id;
END;
$$ LANGUAGE plpgsql;

-- Revisar constraints críticas
-- Produtos não devem ser excluídos se houver pedidos
ALTER TABLE pedido_itens
DROP CONSTRAINT IF EXISTS pedido_itens_produto_id_fkey;

ALTER TABLE pedido_itens
ADD CONSTRAINT pedido_itens_produto_id_fkey 
  FOREIGN KEY (produto_id) 
  REFERENCES produtos(id) 
  ON DELETE RESTRICT;

-- Itens de guia devem ser excluídos com a guia
ALTER TABLE guia_produto_escola
DROP CONSTRAINT IF EXISTS guia_produto_escola_guia_id_fkey;

ALTER TABLE guia_produto_escola
ADD CONSTRAINT guia_produto_escola_guia_id_fkey 
  FOREIGN KEY (guia_id) 
  REFERENCES guias(id) 
  ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 5. VIEWS PARA MONITORAMENTO DE INTEGRAÇÃO
-- ----------------------------------------------------------------------------

-- View para monitorar sincronização de estoque
CREATE OR REPLACE VIEW vw_status_sincronizacao_estoque AS
SELECT 
  p.id as produto_id,
  p.nome as produto_nome,
  COALESCE(ec.quantidade, 0) as quantidade_central,
  COALESCE(SUM(ee.quantidade), 0) as quantidade_escolas,
  COALESCE(ec.quantidade, 0) - COALESCE(SUM(ee.quantidade), 0) as diferenca,
  CASE 
    WHEN COALESCE(ec.quantidade, 0) = COALESCE(SUM(ee.quantidade), 0) THEN 'sincronizado'
    WHEN COALESCE(ec.quantidade, 0) > COALESCE(SUM(ee.quantidade), 0) THEN 'central_maior'
    ELSE 'escolas_maior'
  END as status_sincronizacao
FROM produtos p
LEFT JOIN estoque_central ec ON p.id = ec.produto_id
LEFT JOIN estoque_escolas ee ON p.id = ee.produto_id
GROUP BY p.id, p.nome, ec.quantidade;

-- View para monitorar status de pedidos vs faturamentos
CREATE OR REPLACE VIEW vw_status_pedidos_faturamento AS
SELECT 
  p.id as pedido_id,
  p.numero as pedido_numero,
  p.status as status_pedido,
  p.valor_total as valor_pedido,
  COUNT(DISTINCT fp.id) as total_faturamentos,
  COALESCE(SUM(fi.quantidade_alocada * fi.preco_unitario), 0) as valor_faturado,
  CASE 
    WHEN COUNT(DISTINCT fp.id) = 0 THEN 'sem_faturamento'
    WHEN COALESCE(SUM(fi.quantidade_alocada * fi.preco_unitario), 0) >= p.valor_total THEN 'faturado_completo'
    WHEN COALESCE(SUM(fi.quantidade_alocada * fi.preco_unitario), 0) > 0 THEN 'faturado_parcial'
    ELSE 'sem_faturamento'
  END as status_faturamento,
  CASE 
    WHEN p.status = 'pendente' AND COUNT(DISTINCT fp.id) > 0 THEN true
    ELSE false
  END as inconsistencia_status
FROM pedidos p
LEFT JOIN faturamentos_pedidos fp ON p.id = fp.pedido_id
LEFT JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
GROUP BY p.id, p.numero, p.status, p.valor_total;

-- View para alertas de integridade
CREATE OR REPLACE VIEW vw_alertas_integridade AS
-- Guias com produtos sem saldo
SELECT 
  'guia_sem_saldo' as tipo_alerta,
  'CRÍTICO' as severidade,
  g.id as registro_id,
  'Guia ' || g.nome || ' possui produtos sem saldo em contrato' as mensagem,
  jsonb_build_object(
    'guia_id', g.id,
    'guia_nome', g.nome,
    'produtos_sem_saldo', COUNT(DISTINCT gpe.produto_id)
  ) as detalhes
FROM guias g
JOIN guia_produto_escola gpe ON g.id = gpe.guia_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(cpm.quantidade_disponivel), 0) as saldo
  FROM contrato_produtos cp
  JOIN contrato_produtos_modalidades cpm ON cp.id = cpm.contrato_produto_id
  WHERE cp.produto_id = gpe.produto_id AND cp.ativo = true AND cpm.ativo = true
) s ON true
WHERE s.saldo < gpe.quantidade
GROUP BY g.id, g.nome

UNION ALL

-- Pedidos com status inconsistente
SELECT 
  'pedido_status_inconsistente' as tipo_alerta,
  'MÉDIO' as severidade,
  pedido_id as registro_id,
  'Pedido ' || pedido_numero || ' possui status inconsistente com faturamento' as mensagem,
  jsonb_build_object(
    'pedido_id', pedido_id,
    'status_pedido', status_pedido,
    'status_faturamento', status_faturamento
  ) as detalhes
FROM vw_status_pedidos_faturamento
WHERE inconsistencia_status = true

UNION ALL

-- Estoque com diferenças significativas
SELECT 
  'estoque_dessincronizado' as tipo_alerta,
  'ALTO' as severidade,
  produto_id as registro_id,
  'Produto ' || produto_nome || ' possui diferença de ' || ABS(diferenca) || ' unidades entre central e escolas' as mensagem,
  jsonb_build_object(
    'produto_id', produto_id,
    'quantidade_central', quantidade_central,
    'quantidade_escolas', quantidade_escolas,
    'diferenca', diferenca
  ) as detalhes
FROM vw_status_sincronizacao_estoque
WHERE ABS(diferenca) > 0 AND status_sincronizacao != 'sincronizado';

-- ----------------------------------------------------------------------------
-- 6. ÍNDICES PARA PERFORMANCE
-- ----------------------------------------------------------------------------

-- Índices para melhorar performance de consultas de integração
CREATE INDEX IF NOT EXISTS idx_estoque_central_mov_escola 
ON estoque_central_movimentacoes(escola_destino_id) 
WHERE escola_destino_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_escolas_lote_origem 
ON estoque_escolas(lote_origem_id) 
WHERE lote_origem_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_produto 
ON guia_produto_escola(produto_id);

CREATE INDEX IF NOT EXISTS idx_pedido_itens_produto 
ON pedido_itens(produto_id);

-- ----------------------------------------------------------------------------
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION sync_estoque_central_para_escola() IS 
'Sincroniza automaticamente movimentações de saída do estoque central com entrada no estoque escolar';

COMMENT ON FUNCTION auditar_mudanca_status() IS 
'Registra todas as mudanças de status em tabelas críticas para auditoria';

COMMENT ON FUNCTION verificar_saldo_produto(INTEGER, NUMERIC) IS 
'Verifica se há saldo disponível em contratos para um produto e quantidade específicos';

COMMENT ON FUNCTION verificar_dependencias_produto(INTEGER) IS 
'Lista todas as dependências de um produto antes de permitir exclusão';

COMMENT ON VIEW vw_rastreamento_lotes IS 
'Rastreamento completo de lotes desde estoque central até escolas';

COMMENT ON VIEW vw_status_sincronizacao_estoque IS 
'Monitora sincronização entre estoque central e escolar';

COMMENT ON VIEW vw_status_pedidos_faturamento IS 
'Monitora consistência entre status de pedidos e faturamentos';

COMMENT ON VIEW vw_alertas_integridade IS 
'Alertas automáticos de problemas de integridade de dados';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
