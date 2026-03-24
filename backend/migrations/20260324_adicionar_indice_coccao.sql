-- Migration: Adicionar Índice de Cocção aos Produtos
-- Data: 24/03/2026
-- Descrição: Adiciona o campo indice_coccao para calcular mudança de peso durante cozimento

-- 1. Adicionar coluna indice_coccao
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS indice_coccao NUMERIC(10, 3) DEFAULT 1.0;

-- 2. Comentários explicativos
COMMENT ON COLUMN produtos.fator_correcao IS 'Fator de Correção: Perda no pré-preparo (limpeza, descascamento). FC = Peso Bruto / Peso Líquido. Ex: Batata FC=1.18 (perde 18% ao descascar)';
COMMENT ON COLUMN produtos.indice_coccao IS 'Índice de Cocção: Mudança de peso no cozimento. IC = Peso Cozido / Peso Cru. Ex: Arroz IC=2.5 (ganha 150% ao cozinhar), Carne IC=0.7 (perde 30% ao cozinhar)';

-- 3. Exemplos de valores comuns
-- Arroz: IC = 2.5 (absorve água, aumenta peso)
-- Macarrão: IC = 2.0 (absorve água)
-- Feijão: IC = 2.2 (absorve água)
-- Carne bovina: IC = 0.7 (perde água)
-- Frango: IC = 0.75 (perde água)
-- Legumes cozidos: IC = 0.9 (perde pouca água)
-- Alimentos não cozidos: IC = 1.0 (sem mudança)

-- 4. Atualizar produtos existentes com valores padrão
UPDATE produtos SET indice_coccao = 1.0 WHERE indice_coccao IS NULL;

-- 5. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_produtos_indice_coccao ON produtos(indice_coccao);
