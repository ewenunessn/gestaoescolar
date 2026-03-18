-- Migration: Adicionar suporte para usuários de secretaria de escola
-- Permite associar usuários a escolas específicas e definir tipo de secretaria

-- Adicionar coluna escola_id para associar usuário a uma escola
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS escola_id INTEGER REFERENCES escolas(id) ON DELETE SET NULL;

-- Adicionar coluna tipo_secretaria para diferenciar secretaria de educação e secretaria de escola
-- Valores: 'educacao' (secretaria de educação - acesso total), 'escola' (secretaria de escola - acesso limitado à sua escola)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo_secretaria VARCHAR(20) DEFAULT 'educacao';

-- Índice para melhorar performance de consultas por escola
CREATE INDEX IF NOT EXISTS idx_usuarios_escola ON usuarios(escola_id);

-- Comentários
COMMENT ON COLUMN usuarios.escola_id IS 'ID da escola associada ao usuário (para secretaria de escola)';
COMMENT ON COLUMN usuarios.tipo_secretaria IS 'Tipo de secretaria: educacao (acesso total) ou escola (acesso limitado)';

