-- Migration: Drop unique constraint on guia_produto_escola
-- Description: Allow multiple entries for same product/school in the same guia (e.g. different dates)

ALTER TABLE guia_produto_escola
DROP CONSTRAINT IF EXISTS guia_produto_escola_guia_id_produto_id_escola_id_key;

-- If there was another constraint with lote, drop it too just in case (we want full flexibility)
-- But we should probably keep an index for performance
