-- Adiciona quantidade_demanda em guia_produto_escola
-- Preserva o valor calculado na geração para comparação com ajustes manuais
ALTER TABLE guia_produto_escola
  ADD COLUMN IF NOT EXISTS quantidade_demanda DECIMAL(12,3);

-- Preencher retroativamente com o valor atual de quantidade
UPDATE guia_produto_escola SET quantidade_demanda = quantidade WHERE quantidade_demanda IS NULL;
