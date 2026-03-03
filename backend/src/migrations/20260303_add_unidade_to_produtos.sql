-- Migration: Adicionar coluna unidade na tabela produtos
-- Data: 2026-03-03
-- Descrição: Adiciona coluna unidade diretamente na tabela produtos para consistência

-- Adicionar coluna unidade se não existir
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS unidade VARCHAR(20) DEFAULT 'UN';

-- Atualizar produtos existentes com unidades comuns
UPDATE produtos 
SET unidade = CASE 
  WHEN nome ILIKE '%arroz%' THEN 'KG'
  WHEN nome ILIKE '%feijão%' THEN 'KG'
  WHEN nome ILIKE '%macarrão%' THEN 'KG'
  WHEN nome ILIKE '%farinha%' THEN 'KG'
  WHEN nome ILIKE '%açúcar%' THEN 'KG'
  WHEN nome ILIKE '%sal%' THEN 'KG'
  WHEN nome ILIKE '%óleo%' THEN 'L'
  WHEN nome ILIKE '%leite%' THEN 'L'
  WHEN nome ILIKE '%suco%' THEN 'L'
  WHEN nome ILIKE '%ovo%' THEN 'DZ'
  WHEN nome ILIKE '%pão%' THEN 'UN'
  WHEN nome ILIKE '%biscoito%' THEN 'PCT'
  WHEN nome ILIKE '%bolacha%' THEN 'PCT'
  ELSE 'UN'
END
WHERE unidade IS NULL OR unidade = 'UN';

-- Adicionar comentário
COMMENT ON COLUMN produtos.unidade IS 'Unidade de medida do produto (KG, L, UN, DZ, PCT, etc)';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_produtos_unidade ON produtos(unidade);
