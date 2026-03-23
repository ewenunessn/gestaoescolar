-- Adiciona unidade_compra nos produtos
-- O campo peso (já existente) é usado como peso da embalagem em gramas
-- unidade_compra: unidade usada na guia de demanda (ex: 'pct', 'cx', 'un')
-- Quando peso > 0 e unidade_compra estiver definido, a geração da guia converte kg → unidade_compra

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS unidade_compra TEXT DEFAULT NULL;

-- Remover coluna duplicada caso tenha sido criada anteriormente
ALTER TABLE produtos
  DROP COLUMN IF EXISTS peso_embalagem_g;

COMMENT ON COLUMN produtos.unidade_compra IS 'Unidade usada na guia de demanda (ex: pct, cx, un). Quando definido junto com peso (g), converte kg para unidades de embalagem.';
