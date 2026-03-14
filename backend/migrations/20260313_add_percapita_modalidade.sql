-- Migration: Adicionar suporte para per capita por modalidade
-- Data: 2026-03-13
-- Descrição: Permite ajustar o per capita de produtos das refeições por modalidade de ensino

-- Criar tabela de ajustes de per capita por modalidade
CREATE TABLE IF NOT EXISTS refeicao_produto_modalidade (
  id SERIAL PRIMARY KEY,
  refeicao_produto_id INTEGER NOT NULL REFERENCES refeicao_produtos(id) ON DELETE CASCADE,
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  per_capita_ajustado NUMERIC(10,2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_refeicao_produto_modalidade UNIQUE(refeicao_produto_id, modalidade_id)
);

-- Índices para performance
CREATE INDEX idx_refeicao_produto_modalidade_refeicao_produto 
  ON refeicao_produto_modalidade(refeicao_produto_id);

CREATE INDEX idx_refeicao_produto_modalidade_modalidade 
  ON refeicao_produto_modalidade(modalidade_id);

-- Comentários
COMMENT ON TABLE refeicao_produto_modalidade IS 
  'Ajustes de per capita por modalidade de ensino. Se não houver ajuste, usa o per capita padrão da tabela refeicao_produtos';

COMMENT ON COLUMN refeicao_produto_modalidade.per_capita_ajustado IS 
  'Per capita específico para esta modalidade. Sobrescreve o per capita padrão';

COMMENT ON COLUMN refeicao_produto_modalidade.observacao IS 
  'Justificativa ou observação sobre o ajuste (ex: "Crianças menores precisam de porções reduzidas")';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_refeicao_produto_modalidade_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_refeicao_produto_modalidade_updated_at
  BEFORE UPDATE ON refeicao_produto_modalidade
  FOR EACH ROW
  EXECUTE FUNCTION update_refeicao_produto_modalidade_updated_at();

-- View para facilitar consultas (retorna per capita correto por modalidade)
CREATE OR REPLACE VIEW vw_refeicao_produtos_com_modalidade AS
SELECT 
  rp.id as refeicao_produto_id,
  rp.refeicao_id,
  rp.produto_id,
  p.nome as produto_nome,
  rp.per_capita as per_capita_padrao,
  rp.tipo_medida,
  m.id as modalidade_id,
  m.nome as modalidade_nome,
  COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita_efetivo,
  CASE 
    WHEN rpm.per_capita_ajustado IS NOT NULL THEN true 
    ELSE false 
  END as tem_ajuste,
  rpm.observacao as observacao_ajuste
FROM refeicao_produtos rp
CROSS JOIN modalidades m
LEFT JOIN refeicao_produto_modalidade rpm 
  ON rpm.refeicao_produto_id = rp.id 
  AND rpm.modalidade_id = m.id
LEFT JOIN produtos p ON p.id = rp.produto_id
WHERE m.ativo = true;

COMMENT ON VIEW vw_refeicao_produtos_com_modalidade IS 
  'View que retorna o per capita efetivo para cada combinação de produto/modalidade. Usa o ajuste se existir, senão usa o padrão';
