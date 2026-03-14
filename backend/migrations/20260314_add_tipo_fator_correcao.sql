-- Migration: Adicionar tipo_fator_correcao aos produtos
-- Data: 2026-03-14
-- Descrição: Indica se o fator é de perda (ex: casca) ou rendimento (ex: arroz cru→cozido)

ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS tipo_fator_correcao VARCHAR(20) DEFAULT 'perda' NOT NULL;

COMMENT ON COLUMN produtos.tipo_fator_correcao IS 
  'Tipo do fator de correção: "perda" = perda no preparo (casca, osso), "rendimento" = rendimento após cocção (arroz, feijão)';
