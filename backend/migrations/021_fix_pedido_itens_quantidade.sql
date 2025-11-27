-- Migration: Corrigir precisão da coluna quantidade em pedido_itens
-- De DECIMAL(10,3) para DECIMAL(10,2) para evitar 3 casas decimais

-- Alterar a coluna quantidade para ter apenas 2 casas decimais
ALTER TABLE pedido_itens 
ALTER COLUMN quantidade TYPE DECIMAL(10, 2);

-- Comentário explicativo
COMMENT ON COLUMN pedido_itens.quantidade IS 'Quantidade do produto (máximo 2 casas decimais)';
