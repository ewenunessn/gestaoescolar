-- Script para deletar guias no Neon
-- Execute este SQL diretamente no SQL Editor do Neon

-- 1. Ver todas as guias
SELECT id, mes, ano, nome, status, created_at 
FROM guias 
ORDER BY id DESC;

-- 2. Para deletar uma guia específica (substitua o ID)
-- DELETE FROM guias WHERE id = 123;

-- 3. Para deletar guias de um mês/ano específico
-- DELETE FROM guias WHERE mes = 3 AND ano = 2026;

-- 4. Para deletar todas as guias (CUIDADO!)
-- DELETE FROM guias;

-- 5. Verificar se a PRIMARY KEY existe
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'guias'::regclass
AND contype = 'p';

-- 6. Verificar replica identity
SELECT 
    relname,
    CASE relreplident
        WHEN 'd' THEN 'default (primary key)'
        WHEN 'n' THEN 'nothing'
        WHEN 'f' THEN 'full'
        WHEN 'i' THEN 'index'
    END as replica_identity
FROM pg_class
WHERE relname = 'guias';
