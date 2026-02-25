
-- Migration: Add 'suspenso' status to guia_produto_escola
-- Description: Updates the check constraint to allow 'suspenso' status

ALTER TABLE guia_produto_escola 
DROP CONSTRAINT IF EXISTS guia_produto_escola_status_check;

ALTER TABLE guia_produto_escola
ADD CONSTRAINT guia_produto_escola_status_check 
CHECK (status IN ('pendente', 'entregue', 'cancelado', 'em_rota', 'programada', 'suspenso'));
