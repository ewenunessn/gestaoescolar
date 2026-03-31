-- Permitir adicionar a mesma preparação múltiplas vezes no mesmo dia/tipo
-- Exemplo: adicionar "Arroz com Feijão" 2x como "refeicao" no dia 15

-- 1. Remover constraint UNIQUE que impede a mesma preparação duplicada
ALTER TABLE cardapio_refeicoes_dia
DROP CONSTRAINT IF EXISTS cardapio_refeicoes_dia_unique_refeicao_dia;

-- 2. Remover constraint UNIQUE que impede múltiplas refeições do mesmo tipo no mesmo dia
ALTER TABLE cardapio_refeicoes_dia
DROP CONSTRAINT IF EXISTS cardapio_refeicoes_dia_cardapio_modalidade_id_dia_tipo_refe_key;

-- Agora é possível adicionar:
-- - Mesma preparação, mesmo tipo, mesmo dia (múltiplas vezes)
-- - Preparações diferentes, mesmo tipo, mesmo dia
-- - Qualquer combinação necessária
