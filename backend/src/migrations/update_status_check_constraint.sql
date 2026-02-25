
-- Migration: Update status check constraint to include 'programada'
-- Description: Updates the check constraint to allow 'programada' status

ALTER TABLE guia_produto_escola 
DROP CONSTRAINT IF EXISTS guia_produto_escola_status_check;

ALTER TABLE guia_produto_escola
ADD CONSTRAINT guia_produto_escola_status_check 
CHECK (status IN ('pendente', 'entregue', 'cancelado', 'em_rota', 'programada'));
