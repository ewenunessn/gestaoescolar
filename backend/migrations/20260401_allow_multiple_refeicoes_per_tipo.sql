-- Permitir múltiplas preparações do mesmo tipo no mesmo dia
-- e atualizar os tipos aceitos para o novo padrão genérico

-- 1. Remover constraint UNIQUE que impede múltiplas preparações do mesmo tipo/dia
ALTER TABLE cardapio_refeicoes_dia
DROP CONSTRAINT IF EXISTS cardapio_refeicoes_dia_cardapio_modalidade_id_dia_tipo_refeicao_key;

-- 2. Remover CHECK constraint antiga com tipos específicos
ALTER TABLE cardapio_refeicoes_dia
DROP CONSTRAINT IF EXISTS cardapio_refeicoes_dia_tipo_refeicao_check;

-- 3. Adicionar nova CHECK constraint com tipos genéricos (mantendo compatibilidade com valores antigos)
ALTER TABLE cardapio_refeicoes_dia
ADD CONSTRAINT cardapio_refeicoes_dia_tipo_refeicao_check
CHECK (tipo_refeicao IN ('refeicao', 'lanche', 'cafe_manha', 'ceia', 'almoco', 'jantar', 'lanche_manha', 'lanche_tarde'));

-- 4. Manter UNIQUE apenas para evitar a mesma preparação duplicada no mesmo dia/tipo
-- (mesma refeição + mesmo tipo + mesmo dia = duplicata real)
ALTER TABLE cardapio_refeicoes_dia
ADD CONSTRAINT cardapio_refeicoes_dia_unique_refeicao_dia
UNIQUE(cardapio_modalidade_id, refeicao_id, dia, tipo_refeicao);
