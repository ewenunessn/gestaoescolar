-- Migration: Ajustar constraint de nome de escola para ser única por tenant
-- Data: 2024
-- Descrição: Permite que o mesmo nome de escola exista em tenants diferentes,
--            mas não permite duplicação dentro do mesmo tenant

-- Remover constraint antiga (nome único globalmente)
ALTER TABLE escolas 
DROP CONSTRAINT IF EXISTS escolas_nome_unique;

-- Remover índice único antigo (se existir)
DROP INDEX IF EXISTS escolas_nome_unique;

-- Adicionar nova constraint (nome + tenant_id)
ALTER TABLE escolas 
ADD CONSTRAINT escolas_nome_tenant_key 
UNIQUE (nome, tenant_id);

-- Verificar constraints criadas
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'escolas'::regclass
  AND contype = 'u'
ORDER BY conname;
