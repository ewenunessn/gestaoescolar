-- ============================================================================
-- MIGRATION: Remover Tabelas Duplicadas e de Teste
-- Data: 26/03/2026
-- Descrição: Remove tabelas duplicadas, vazias e de teste
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABELAS DUPLICADAS (vazias)
-- ============================================================================

-- Remover escolas_modalidades (duplicada de escola_modalidades)
DROP TABLE IF EXISTS escolas_modalidades CASCADE;

-- Remover faturamento_itens (duplicada de faturamentos_itens)
DROP TABLE IF EXISTS faturamento_itens CASCADE;

-- ============================================================================
-- 2. TABELAS DE TESTE
-- ============================================================================

-- Remover tabela de teste do Neon
DROP TABLE IF EXISTS playing_with_neon CASCADE;

-- ============================================================================
-- 3. BACKUPS MANUAIS ANTIGOS
-- ============================================================================

-- Remover backup manual de março/2026
DROP TABLE IF EXISTS contrato_produtos_backup_20260324 CASCADE;

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;

-- Verificação
SELECT 
    'Tabelas removidas com sucesso!' as status,
    COUNT(*) as total_tabelas_restantes
FROM pg_tables
WHERE schemaname = 'public';
