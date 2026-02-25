-- Migration: Adicionar campos isolados do contrato_produtos em pedido_itens
-- Isso permite que os pedidos mantenham os dados mesmo se o contrato-produto for alterado ou excluído

-- Adicionar colunas para isolar dados do contrato-produto
ALTER TABLE pedido_itens 
ADD COLUMN IF NOT EXISTS unidade VARCHAR(50),
ADD COLUMN IF NOT EXISTS marca VARCHAR(255),
ADD COLUMN IF NOT EXISTS peso NUMERIC(10, 3);

-- Copiar dados existentes do contrato_produtos para pedido_itens
UPDATE pedido_itens pi
SET 
  unidade = cp.unidade,
  marca = cp.marca,
  peso = cp.peso
FROM contrato_produtos cp
WHERE pi.contrato_produto_id = cp.id
  AND pi.unidade IS NULL;

-- Comentários
COMMENT ON COLUMN pedido_itens.unidade IS 'Unidade do produto no momento do pedido (isolado do contrato)';
COMMENT ON COLUMN pedido_itens.marca IS 'Marca do produto no momento do pedido (isolado do contrato)';
COMMENT ON COLUMN pedido_itens.peso IS 'Peso do produto no momento do pedido (isolado do contrato)';
