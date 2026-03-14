-- Migration: Adicionar fator de correção aos produtos
-- Data: 2026-03-13
-- Descrição: Adiciona coluna fator_correcao para calcular per capita líquido

-- Adicionar coluna fator_correcao (padrão 1.0 = sem perda)
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS fator_correcao DECIMAL(5,3) DEFAULT 1.000 NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN produtos.fator_correcao IS 'Fator de correção para calcular per capita líquido. Exemplo: 1.15 = 15% de perda no preparo';

-- Exemplos de fatores de correção comuns:
-- 1.000 = Sem perda (produtos industrializados, já limpos)
-- 1.10 = 10% de perda (frutas com casca fina)
-- 1.15 = 15% de perda (legumes)
-- 1.20 = 20% de perda (verduras folhosas)
-- 1.30 = 30% de perda (frutas com casca grossa)
-- 1.50 = 50% de perda (carnes com osso)

-- Atualizar alguns produtos com fatores de correção típicos
UPDATE produtos SET fator_correcao = 1.15 WHERE nome ILIKE '%tomate%';
UPDATE produtos SET fator_correcao = 1.20 WHERE nome ILIKE '%alface%';
UPDATE produtos SET fator_correcao = 1.20 WHERE nome ILIKE '%couve%';
UPDATE produtos SET fator_correcao = 1.10 WHERE nome ILIKE '%banana%';
UPDATE produtos SET fator_correcao = 1.30 WHERE nome ILIKE '%abacaxi%';
UPDATE produtos SET fator_correcao = 1.30 WHERE nome ILIKE '%melancia%';
UPDATE produtos SET fator_correcao = 1.50 WHERE nome ILIKE '%frango%' AND nome ILIKE '%osso%';
UPDATE produtos SET fator_correcao = 1.15 WHERE nome ILIKE '%batata%';
UPDATE produtos SET fator_correcao = 1.15 WHERE nome ILIKE '%cenoura%';
UPDATE produtos SET fator_correcao = 1.20 WHERE nome ILIKE '%cebola%';

-- Índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_produtos_fator_correcao ON produtos(fator_correcao);
