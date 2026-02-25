-- Migration: Add status to guia_produto_escola
-- Description: Adds status column to track item status individually

ALTER TABLE guia_produto_escola
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'entregue', 'cancelado', 'em_rota'));

CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_status ON guia_produto_escola(status);
