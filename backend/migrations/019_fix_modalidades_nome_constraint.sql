-- Migration: Ajustar constraint de nome de modalidade para ser única por tenant
-- Data: 2024
-- Descrição: Permite que o mesmo nome de modalidade exista em tenants diferentes,
--            mas não permite duplicação dentro do mesmo tenant

-- Remover constraint antiga (nome único globalmente)
ALTER TABLE modalidades 
DROP CONSTRAINT IF EXISTS modalidades_nome_key;

-- Remover índice único antigo (se existir)
DROP INDEX IF EXISTS modalidades_nome_key;

-- Adicionar nova constraint (nome + tenant_id)
ALTER TABLE modalidades 
ADD CONSTRAINT modalidades_nome_tenant_key 
UNIQUE (nome, tenant_id);

-- Verificar constraints criadas
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'modalidades'::regclass
  AND contype = 'u'
ORDER BY conname;
