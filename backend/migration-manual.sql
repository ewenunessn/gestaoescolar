-- Migração: Adicionar unidade à tabela contrato_produtos
-- Execute este SQL no seu cliente de banco de dados

-- 1. Adicionar coluna unidade
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS unidade VARCHAR(50);

-- 2. Copiar unidades dos produtos para contratos existentes
UPDATE contrato_produtos 
SET unidade = p.unidade 
FROM produtos p 
WHERE contrato_produtos.produto_id = p.id AND contrato_produtos.unidade IS NULL;

-- 3. Definir unidade padrão para registros sem unidade
UPDATE contrato_produtos 
SET unidade = 'Kg' 
WHERE unidade IS NULL;

-- 4. Tornar coluna obrigatória
ALTER TABLE contrato_produtos ALTER COLUMN unidade SET NOT NULL;

-- 5. Adicionar documentação
COMMENT ON COLUMN contrato_produtos.unidade IS 'Unidade de medida específica para este produto neste contrato';

-- Verificação final
SELECT COUNT(*) as total_registros_com_unidade 
FROM contrato_produtos 
WHERE unidade IS NOT NULL;