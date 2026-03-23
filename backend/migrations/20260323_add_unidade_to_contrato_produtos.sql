-- Migration: Adicionar unidade em contrato_produtos
-- Data: 2026-03-23
-- Motivo: peso, marca e unidade devem ser definidos por contrato, pois o mesmo produto
--         pode ter embalagens diferentes em contratos distintos (ex: biscoito 500g vs 345g)

BEGIN;

-- Garantir que marca existe em contrato_produtos
ALTER TABLE contrato_produtos
  ADD COLUMN IF NOT EXISTS marca VARCHAR(255);

-- Garantir que peso existe em contrato_produtos
ALTER TABLE contrato_produtos
  ADD COLUMN IF NOT EXISTS peso DECIMAL(10,3);

-- Adicionar unidade em contrato_produtos (por contrato)
ALTER TABLE contrato_produtos
  ADD COLUMN IF NOT EXISTS unidade VARCHAR(50);

-- Migrar unidade existente de produtos para contrato_produtos onde ainda não preenchida
UPDATE contrato_produtos cp
SET unidade = p.unidade
FROM produtos p
WHERE cp.produto_id = p.id
  AND cp.unidade IS NULL
  AND p.unidade IS NOT NULL;

-- Migrar marca existente de produtos para contrato_produtos onde ainda não preenchida
UPDATE contrato_produtos cp
SET marca = p.marca
FROM produtos p
WHERE cp.produto_id = p.id
  AND cp.marca IS NULL
  AND p.marca IS NOT NULL;

-- Migrar peso existente de produtos para contrato_produtos onde ainda não preenchido
UPDATE contrato_produtos cp
SET peso = p.peso
FROM produtos p
WHERE cp.produto_id = p.id
  AND cp.peso IS NULL
  AND p.peso IS NOT NULL;

COMMENT ON COLUMN contrato_produtos.unidade IS 'Unidade de medida específica deste produto neste contrato (ex: PCT 500g vs PCT 345g)';
COMMENT ON COLUMN contrato_produtos.marca IS 'Marca específica deste produto neste contrato';
COMMENT ON COLUMN contrato_produtos.peso IS 'Peso em gramas específico deste produto neste contrato';

COMMIT;
