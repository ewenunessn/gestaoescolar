-- Migration: Criar tabela de comprovantes de entrega
-- Data: 2026-03-02
-- Objetivo: Agrupar múltiplas entregas em um único comprovante

-- Criar tabela de comprovantes
CREATE TABLE IF NOT EXISTS comprovantes_entrega (
  id SERIAL PRIMARY KEY,
  numero_comprovante VARCHAR(50) UNIQUE NOT NULL, -- Ex: COMP-2026-03-00001
  escola_id INTEGER NOT NULL REFERENCES escolas(id),
  data_entrega TIMESTAMP NOT NULL DEFAULT NOW(),
  nome_quem_entregou VARCHAR(255) NOT NULL,
  nome_quem_recebeu VARCHAR(255) NOT NULL,
  cargo_recebedor VARCHAR(255), -- Cargo de quem recebeu (diretor, merendeira, etc)
  observacao TEXT,
  assinatura_base64 TEXT, -- Assinatura digital do recebedor
  latitude NUMERIC,
  longitude NUMERIC,
  precisao_gps NUMERIC,
  total_itens INTEGER NOT NULL DEFAULT 0, -- Quantidade de itens diferentes
  status VARCHAR(50) DEFAULT 'finalizado', -- finalizado, cancelado
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar tabela de itens do comprovante (relacionamento N:N)
CREATE TABLE IF NOT EXISTS comprovante_itens (
  id SERIAL PRIMARY KEY,
  comprovante_id INTEGER NOT NULL REFERENCES comprovantes_entrega(id) ON DELETE CASCADE,
  historico_entrega_id INTEGER NOT NULL REFERENCES historico_entregas(id) ON DELETE CASCADE,
  produto_nome VARCHAR(255) NOT NULL, -- Desnormalizado para facilitar consultas
  quantidade_entregue NUMERIC NOT NULL,
  unidade VARCHAR(50) NOT NULL,
  lote VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(comprovante_id, historico_entrega_id) -- Evitar duplicatas
);

-- Comentários
COMMENT ON TABLE comprovantes_entrega IS 'Comprovantes de entrega que agrupam múltiplos itens';
COMMENT ON COLUMN comprovantes_entrega.numero_comprovante IS 'Número único do comprovante (formato: COMP-YYYY-MM-NNNNN)';
COMMENT ON COLUMN comprovantes_entrega.total_itens IS 'Quantidade de itens diferentes no comprovante';
COMMENT ON TABLE comprovante_itens IS 'Itens incluídos em cada comprovante de entrega';

-- Índices para performance
CREATE INDEX idx_comprovantes_escola ON comprovantes_entrega(escola_id);
CREATE INDEX idx_comprovantes_data ON comprovantes_entrega(data_entrega);
CREATE INDEX idx_comprovantes_numero ON comprovantes_entrega(numero_comprovante);
CREATE INDEX idx_comprovante_itens_comprovante ON comprovante_itens(comprovante_id);
CREATE INDEX idx_comprovante_itens_historico ON comprovante_itens(historico_entrega_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_comprovantes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comprovantes_updated_at
  BEFORE UPDATE ON comprovantes_entrega
  FOR EACH ROW
  EXECUTE FUNCTION update_comprovantes_updated_at();

-- Função para gerar número de comprovante
CREATE OR REPLACE FUNCTION gerar_numero_comprovante()
RETURNS VARCHAR AS $$
DECLARE
  ano INTEGER;
  mes INTEGER;
  sequencia INTEGER;
  numero VARCHAR(50);
BEGIN
  ano := EXTRACT(YEAR FROM NOW());
  mes := EXTRACT(MONTH FROM NOW());
  
  -- Buscar o último número do mês
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero_comprovante FROM 'COMP-[0-9]{4}-[0-9]{2}-([0-9]{5})') AS INTEGER)
  ), 0) + 1
  INTO sequencia
  FROM comprovantes_entrega
  WHERE numero_comprovante LIKE 'COMP-' || ano || '-' || LPAD(mes::TEXT, 2, '0') || '-%';
  
  -- Gerar número no formato COMP-YYYY-MM-NNNNN
  numero := 'COMP-' || ano || '-' || LPAD(mes::TEXT, 2, '0') || '-' || LPAD(sequencia::TEXT, 5, '0');
  
  RETURN numero;
END;
$$ LANGUAGE plpgsql;

-- View para facilitar consultas de comprovantes completos
CREATE OR REPLACE VIEW vw_comprovantes_completos AS
SELECT 
  c.id,
  c.numero_comprovante,
  c.escola_id,
  e.nome as escola_nome,
  e.endereco as escola_endereco,
  c.data_entrega,
  c.nome_quem_entregou,
  c.nome_quem_recebeu,
  c.cargo_recebedor,
  c.observacao,
  c.assinatura_base64,
  c.total_itens,
  c.status,
  c.created_at,
  json_agg(
    json_build_object(
      'id', ci.id,
      'produto_nome', ci.produto_nome,
      'quantidade_entregue', ci.quantidade_entregue,
      'unidade', ci.unidade,
      'lote', ci.lote
    ) ORDER BY ci.id
  ) as itens
FROM comprovantes_entrega c
INNER JOIN escolas e ON c.escola_id = e.id
LEFT JOIN comprovante_itens ci ON c.id = ci.comprovante_id
GROUP BY c.id, e.nome, e.endereco;

COMMENT ON VIEW vw_comprovantes_completos IS 'View com comprovantes e seus itens em formato JSON';
