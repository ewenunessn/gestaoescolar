-- Migration: Criar tabela de histórico de entregas
-- Data: 2025-02-28
-- Objetivo: Permitir múltiplas entregas parciais para o mesmo item

-- Criar tabela de histórico de entregas
CREATE TABLE IF NOT EXISTS historico_entregas (
  id SERIAL PRIMARY KEY,
  guia_produto_escola_id INTEGER NOT NULL REFERENCES guia_produto_escola(id) ON DELETE CASCADE,
  quantidade_entregue NUMERIC NOT NULL CHECK (quantidade_entregue > 0),
  data_entrega TIMESTAMP NOT NULL DEFAULT NOW(),
  nome_quem_entregou VARCHAR(255) NOT NULL,
  nome_quem_recebeu VARCHAR(255) NOT NULL,
  observacao TEXT,
  assinatura_base64 TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  precisao_gps NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE historico_entregas IS 'Histórico de todas as entregas realizadas, permitindo entregas parciais múltiplas';
COMMENT ON COLUMN historico_entregas.guia_produto_escola_id IS 'Referência ao item da guia que foi entregue';
COMMENT ON COLUMN historico_entregas.quantidade_entregue IS 'Quantidade entregue nesta entrega específica';
COMMENT ON COLUMN historico_entregas.assinatura_base64 IS 'Assinatura digital do recebedor em formato base64 (PNG)';

-- Índices para performance
CREATE INDEX idx_historico_entregas_guia_produto ON historico_entregas(guia_produto_escola_id);
CREATE INDEX idx_historico_entregas_data ON historico_entregas(data_entrega);
CREATE INDEX idx_historico_entregas_recebedor ON historico_entregas(nome_quem_recebeu);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_historico_entregas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_historico_entregas_updated_at
  BEFORE UPDATE ON historico_entregas
  FOR EACH ROW
  EXECUTE FUNCTION update_historico_entregas_updated_at();

-- Migrar dados existentes (se houver)
INSERT INTO historico_entregas (
  guia_produto_escola_id,
  quantidade_entregue,
  data_entrega,
  nome_quem_entregou,
  nome_quem_recebeu,
  observacao,
  assinatura_base64,
  latitude,
  longitude,
  precisao_gps,
  created_at
)
SELECT 
  id,
  COALESCE(quantidade_entregue, quantidade) as quantidade_entregue,
  COALESCE(data_entrega, NOW()) as data_entrega,
  COALESCE(nome_quem_entregou, 'Sistema') as nome_quem_entregou,
  COALESCE(nome_quem_recebeu, 'Não informado') as nome_quem_recebeu,
  observacao_entrega,
  assinatura_base64,
  latitude,
  longitude,
  precisao_gps,
  COALESCE(data_entrega, NOW())
FROM guia_produto_escola
WHERE entrega_confirmada = true;

-- Adicionar coluna para controlar saldo
ALTER TABLE guia_produto_escola 
ADD COLUMN IF NOT EXISTS quantidade_total_entregue NUMERIC DEFAULT 0;

-- Atualizar quantidade total entregue baseado no histórico
UPDATE guia_produto_escola gpe
SET quantidade_total_entregue = (
  SELECT COALESCE(SUM(quantidade_entregue), 0)
  FROM historico_entregas he
  WHERE he.guia_produto_escola_id = gpe.id
);

-- Criar view para facilitar consultas
CREATE OR REPLACE VIEW vw_entregas_completas AS
SELECT 
  gpe.id as item_id,
  gpe.guia_id,
  gpe.produto_id,
  gpe.escola_id,
  gpe.quantidade as quantidade_programada,
  gpe.unidade,
  gpe.quantidade_total_entregue,
  (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente,
  gpe.entrega_confirmada,
  gpe.para_entrega,
  p.nome as produto_nome,
  e.nome as escola_nome,
  g.mes,
  g.ano,
  COUNT(he.id) as total_entregas,
  MAX(he.data_entrega) as ultima_entrega,
  json_agg(
    json_build_object(
      'id', he.id,
      'quantidade', he.quantidade_entregue,
      'data', he.data_entrega,
      'entregador', he.nome_quem_entregou,
      'recebedor', he.nome_quem_recebeu,
      'observacao', he.observacao
    ) ORDER BY he.data_entrega DESC
  ) FILTER (WHERE he.id IS NOT NULL) as historico_entregas
FROM guia_produto_escola gpe
INNER JOIN produtos p ON gpe.produto_id = p.id
INNER JOIN escolas e ON gpe.escola_id = e.id
INNER JOIN guias g ON gpe.guia_id = g.id
LEFT JOIN historico_entregas he ON gpe.id = he.guia_produto_escola_id
GROUP BY gpe.id, p.nome, e.nome, g.mes, g.ano;

COMMENT ON VIEW vw_entregas_completas IS 'View consolidada com informações de entregas e histórico';
