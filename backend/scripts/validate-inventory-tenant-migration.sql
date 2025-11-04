-- SCRIPT DE VALIDAÇÃO DA MIGRAÇÃO DE TENANT PARA ESTOQUE
-- Data: 2025-11-03
-- Descrição: Valida a integridade dos dados após migração de tenant

-- ========================================
-- 1. VERIFICAÇÃO DE ESTRUTURA
-- ========================================

-- Verificar se todas as colunas tenant_id existem
SELECT 
    'ESTRUTURA - Colunas tenant_id' as verificacao,
    table_name,
    CASE 
        WHEN column_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON (
    c.table_name = t.table_name 
    AND c.column_name = 'tenant_id'
)
WHERE t.table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes')
ORDER BY t.table_name;

-- Verificar se escola_id existe em estoque_lotes
SELECT 
    'ESTRUTURA - Coluna escola_id em estoque_lotes' as verificacao,
    CASE 
        WHEN column_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM information_schema.columns 
WHERE table_name = 'estoque_lotes' AND column_name = 'escola_id';

-- ========================================
-- 2. VERIFICAÇÃO DE DADOS - COMPLETUDE
-- ========================================

-- Verificar se todos os registros têm tenant_id
SELECT 
    'DADOS - Completude tenant_id' as verificacao,
    'estoque_escolas' as tabela,
    COUNT(*) as total_registros,
    COUNT(tenant_id) as com_tenant_id,
    COUNT(*) - COUNT(tenant_id) as sem_tenant_id,
    CASE 
        WHEN COUNT(*) = COUNT(tenant_id) THEN '✅ COMPLETO'
        ELSE '❌ INCOMPLETO'
    END as status
FROM estoque_escolas

UNION ALL

SELECT 
    'DADOS - Completude tenant_id',
    'estoque_lotes',
    COUNT(*),
    COUNT(tenant_id),
    COUNT(*) - COUNT(tenant_id),
    CASE 
        WHEN COUNT(*) = COUNT(tenant_id) THEN '✅ COMPLETO'
        ELSE '❌ INCOMPLETO'
    END
FROM estoque_lotes

UNION ALL

SELECT 
    'DADOS - Completude tenant_id',
    'estoque_escolas_historico',
    COUNT(*),
    COUNT(tenant_id),
    COUNT(*) - COUNT(tenant_id),
    CASE 
        WHEN COUNT(*) = COUNT(tenant_id) THEN '✅ COMPLETO'
        ELSE '❌ INCOMPLETO'
    END
FROM estoque_escolas_historico

UNION ALL

SELECT 
    'DADOS - Completude tenant_id',
    'estoque_movimentacoes',
    COUNT(*),
    COUNT(tenant_id),
    COUNT(*) - COUNT(tenant_id),
    CASE 
        WHEN COUNT(*) = COUNT(tenant_id) THEN '✅ COMPLETO'
        ELSE '❌ INCOMPLETO'
    END
FROM estoque_movimentacoes;

-- ========================================
-- 3. VERIFICAÇÃO DE INTEGRIDADE REFERENCIAL
-- ========================================

-- Verificar se todos os lotes têm escola_id válida
SELECT 
    'INTEGRIDADE - estoque_lotes.escola_id' as verificacao,
    COUNT(*) as total_lotes,
    COUNT(el.escola_id) as com_escola_id,
    COUNT(e.id) as escola_id_valida,
    COUNT(*) - COUNT(e.id) as escola_id_invalida,
    CASE 
        WHEN COUNT(*) = COUNT(e.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_lotes el
LEFT JOIN escolas e ON e.id = el.escola_id;

-- Verificar se todas as movimentações têm lote_id válido
SELECT 
    'INTEGRIDADE - estoque_movimentacoes.lote_id' as verificacao,
    COUNT(*) as total_movimentacoes,
    COUNT(el.id) as lote_id_valida,
    COUNT(*) - COUNT(el.id) as lote_id_invalida,
    CASE 
        WHEN COUNT(*) = COUNT(el.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_movimentacoes em
LEFT JOIN estoque_lotes el ON el.id = em.lote_id;

-- Verificar se todos os tenant_id são válidos
SELECT 
    'INTEGRIDADE - tenant_id válidos' as verificacao,
    'estoque_escolas' as tabela,
    COUNT(*) as total_registros,
    COUNT(t.id) as tenant_id_valida,
    COUNT(*) - COUNT(t.id) as tenant_id_invalida,
    CASE 
        WHEN COUNT(*) = COUNT(t.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_escolas ee
LEFT JOIN tenants t ON t.id = ee.tenant_id

UNION ALL

SELECT 
    'INTEGRIDADE - tenant_id válidos',
    'estoque_lotes',
    COUNT(*),
    COUNT(t.id),
    COUNT(*) - COUNT(t.id),
    CASE 
        WHEN COUNT(*) = COUNT(t.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END
FROM estoque_lotes el
LEFT JOIN tenants t ON t.id = el.tenant_id

UNION ALL

SELECT 
    'INTEGRIDADE - tenant_id válidos',
    'estoque_escolas_historico',
    COUNT(*),
    COUNT(t.id),
    COUNT(*) - COUNT(t.id),
    CASE 
        WHEN COUNT(*) = COUNT(t.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END
FROM estoque_escolas_historico eeh
LEFT JOIN tenants t ON t.id = eeh.tenant_id

UNION ALL

SELECT 
    'INTEGRIDADE - tenant_id válidos',
    'estoque_movimentacoes',
    COUNT(*),
    COUNT(t.id),
    COUNT(*) - COUNT(t.id),
    CASE 
        WHEN COUNT(*) = COUNT(t.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END
FROM estoque_movimentacoes em
LEFT JOIN tenants t ON t.id = em.tenant_id;

-- ========================================
-- 4. VERIFICAÇÃO DE CONSISTÊNCIA DE TENANT
-- ========================================

-- Verificar se estoque_escolas e escolas têm o mesmo tenant_id
SELECT 
    'CONSISTÊNCIA - estoque_escolas x escolas' as verificacao,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN ee.tenant_id = e.tenant_id THEN 1 END) as tenant_consistente,
    COUNT(CASE WHEN ee.tenant_id != e.tenant_id THEN 1 END) as tenant_inconsistente,
    CASE 
        WHEN COUNT(CASE WHEN ee.tenant_id != e.tenant_id THEN 1 END) = 0 THEN '✅ CONSISTENTE'
        ELSE '❌ INCONSISTENTE'
    END as status
FROM estoque_escolas ee
JOIN escolas e ON e.id = ee.escola_id;

-- Verificar se estoque_lotes e escolas têm o mesmo tenant_id
SELECT 
    'CONSISTÊNCIA - estoque_lotes x escolas' as verificacao,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN el.tenant_id = e.tenant_id THEN 1 END) as tenant_consistente,
    COUNT(CASE WHEN el.tenant_id != e.tenant_id THEN 1 END) as tenant_inconsistente,
    CASE 
        WHEN COUNT(CASE WHEN el.tenant_id != e.tenant_id THEN 1 END) = 0 THEN '✅ CONSISTENTE'
        ELSE '❌ INCONSISTENTE'
    END as status
FROM estoque_lotes el
JOIN escolas e ON e.id = el.escola_id;

-- Verificar se estoque_movimentacoes e estoque_lotes têm o mesmo tenant_id
SELECT 
    'CONSISTÊNCIA - estoque_movimentacoes x estoque_lotes' as verificacao,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN em.tenant_id = el.tenant_id THEN 1 END) as tenant_consistente,
    COUNT(CASE WHEN em.tenant_id != el.tenant_id THEN 1 END) as tenant_inconsistente,
    CASE 
        WHEN COUNT(CASE WHEN em.tenant_id != el.tenant_id THEN 1 END) = 0 THEN '✅ CONSISTENTE'
        ELSE '❌ INCONSISTENTE'
    END as status
FROM estoque_movimentacoes em
JOIN estoque_lotes el ON el.id = em.lote_id;

-- ========================================
-- 5. VERIFICAÇÃO DE ÍNDICES
-- ========================================

-- Verificar se os índices tenant-aware foram criados
SELECT 
    'ÍNDICES - Tenant-aware' as verificacao,
    indexname,
    CASE 
        WHEN indexname IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (
    VALUES 
        ('idx_estoque_escolas_tenant_escola_produto'),
        ('idx_estoque_lotes_tenant_escola_produto'),
        ('idx_estoque_lotes_tenant_validade_ativo'),
        ('idx_estoque_historico_tenant_escola_data'),
        ('idx_estoque_movimentacoes_tenant_lote_data')
) AS expected_indexes(indexname)
LEFT JOIN pg_indexes pi ON pi.indexname = expected_indexes.indexname;

-- ========================================
-- 6. VERIFICAÇÃO DE RLS (ROW LEVEL SECURITY)
-- ========================================

-- Verificar se RLS está habilitado
SELECT 
    'RLS - Status' as verificacao,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ HABILITADO'
        ELSE '❌ DESABILITADO'
    END as status
FROM pg_tables 
WHERE tablename IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes')
ORDER BY tablename;

-- Verificar se as políticas RLS existem
SELECT 
    'RLS - Políticas' as verificacao,
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN policyname IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM pg_policies 
WHERE tablename IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes')
ORDER BY tablename, policyname;

-- ========================================
-- 7. VERIFICAÇÃO DE TRIGGERS
-- ========================================

-- Verificar se os triggers de tenant_id existem
SELECT 
    'TRIGGERS - Tenant ID' as verificacao,
    event_object_table as tabela,
    trigger_name,
    CASE 
        WHEN trigger_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM information_schema.triggers 
WHERE event_object_table IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes')
    AND trigger_name LIKE '%tenant%'
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 8. RELATÓRIO RESUMIDO
-- ========================================

-- Contagem geral por tenant
SELECT 
    'RESUMO - Distribuição por Tenant' as verificacao,
    t.slug as tenant_slug,
    t.name as tenant_name,
    (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id = t.id) as estoque_escolas,
    (SELECT COUNT(*) FROM estoque_lotes WHERE tenant_id = t.id) as estoque_lotes,
    (SELECT COUNT(*) FROM estoque_escolas_historico WHERE tenant_id = t.id) as historico,
    (SELECT COUNT(*) FROM estoque_movimentacoes WHERE tenant_id = t.id) as movimentacoes
FROM tenants t
ORDER BY t.slug;

-- Status geral da migração
WITH validation_summary AS (
    SELECT 
        COUNT(*) as total_checks,
        COUNT(CASE WHEN 
            (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id IS NULL) = 0 AND
            (SELECT COUNT(*) FROM estoque_lotes WHERE tenant_id IS NULL) = 0 AND
            (SELECT COUNT(*) FROM estoque_escolas_historico WHERE tenant_id IS NULL) = 0 AND
            (SELECT COUNT(*) FROM estoque_movimentacoes WHERE tenant_id IS NULL) = 0
        THEN 1 END) as passed_checks
)
SELECT 
    'STATUS GERAL DA MIGRAÇÃO' as verificacao,
    CASE 
        WHEN passed_checks = total_checks THEN '✅ SUCESSO COMPLETO'
        WHEN passed_checks > 0 THEN '⚠️ SUCESSO PARCIAL'
        ELSE '❌ FALHA'
    END as status,
    passed_checks || '/' || total_checks as detalhes
FROM validation_summary;