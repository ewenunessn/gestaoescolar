-- Script para verificar se a migração do estoque para "Escola de Teste" funcionou
-- Execute este script após a migração para verificar os resultados

-- 1. Verificar se o tenant "Escola de Teste" existe
SELECT 
    id,
    name,
    slug,
    status,
    created_at
FROM tenants 
WHERE slug = 'escola-de-teste';

-- 2. Verificar estrutura das tabelas (se têm tenant_id)
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'escolas', 'produtos')
  AND column_name = 'tenant_id'
ORDER BY table_name;

-- 3. Contar registros por tenant em cada tabela
WITH tenant_counts AS (
    SELECT 
        t.name as tenant_name,
        t.slug as tenant_slug,
        'escolas' as tabela,
        COUNT(e.id) as total_registros
    FROM tenants t
    LEFT JOIN escolas e ON e.tenant_id = t.id
    GROUP BY t.id, t.name, t.slug
    
    UNION ALL
    
    SELECT 
        t.name as tenant_name,
        t.slug as tenant_slug,
        'produtos' as tabela,
        COUNT(p.id) as total_registros
    FROM tenants t
    LEFT JOIN produtos p ON p.tenant_id = t.id
    GROUP BY t.id, t.name, t.slug
    
    UNION ALL
    
    SELECT 
        t.name as tenant_name,
        t.slug as tenant_slug,
        'estoque_escolas' as tabela,
        COUNT(ee.id) as total_registros
    FROM tenants t
    LEFT JOIN estoque_escolas ee ON ee.tenant_id = t.id
    GROUP BY t.id, t.name, t.slug
    
    UNION ALL
    
    SELECT 
        t.name as tenant_name,
        t.slug as tenant_slug,
        'estoque_lotes' as tabela,
        COUNT(el.id) as total_registros
    FROM tenants t
    LEFT JOIN estoque_lotes el ON el.tenant_id = t.id
    GROUP BY t.id, t.name, t.slug
    
    UNION ALL
    
    SELECT 
        t.name as tenant_name,
        t.slug as tenant_slug,
        'estoque_escolas_historico' as tabela,
        COUNT(eeh.id) as total_registros
    FROM tenants t
    LEFT JOIN estoque_escolas_historico eeh ON eeh.tenant_id = t.id
    GROUP BY t.id, t.name, t.slug
)
SELECT 
    tenant_name,
    tenant_slug,
    tabela,
    total_registros
FROM tenant_counts
WHERE total_registros > 0
ORDER BY tenant_name, tabela;

-- 4. Verificar especificamente o tenant "Escola de Teste"
WITH escola_teste_stats AS (
    SELECT 
        (SELECT id FROM tenants WHERE slug = 'escola-de-teste') as tenant_id
)
SELECT 
    'Escola de Teste' as tenant_name,
    'escolas' as tabela,
    COUNT(*) as total_registros
FROM escolas e, escola_teste_stats ets
WHERE e.tenant_id = ets.tenant_id

UNION ALL

SELECT 
    'Escola de Teste' as tenant_name,
    'produtos' as tabela,
    COUNT(*) as total_registros
FROM produtos p, escola_teste_stats ets
WHERE p.tenant_id = ets.tenant_id

UNION ALL

SELECT 
    'Escola de Teste' as tenant_name,
    'estoque_escolas' as tabela,
    COUNT(*) as total_registros
FROM estoque_escolas ee, escola_teste_stats ets
WHERE ee.tenant_id = ets.tenant_id

UNION ALL

SELECT 
    'Escola de Teste' as tenant_name,
    'estoque_lotes' as tabela,
    COUNT(*) as total_registros
FROM estoque_lotes el, escola_teste_stats ets
WHERE el.tenant_id = ets.tenant_id

UNION ALL

SELECT 
    'Escola de Teste' as tenant_name,
    'estoque_escolas_historico' as tabela,
    COUNT(*) as total_registros
FROM estoque_escolas_historico eeh, escola_teste_stats ets
WHERE eeh.tenant_id = ets.tenant_id;

-- 5. Verificar se existem registros sem tenant_id (órfãos)
SELECT 
    'estoque_escolas' as tabela,
    COUNT(*) as registros_sem_tenant
FROM estoque_escolas 
WHERE tenant_id IS NULL

UNION ALL

SELECT 
    'estoque_lotes' as tabela,
    COUNT(*) as registros_sem_tenant
FROM estoque_lotes 
WHERE tenant_id IS NULL

UNION ALL

SELECT 
    'estoque_escolas_historico' as tabela,
    COUNT(*) as registros_sem_tenant
FROM estoque_escolas_historico 
WHERE tenant_id IS NULL

UNION ALL

SELECT 
    'escolas' as tabela,
    COUNT(*) as registros_sem_tenant
FROM escolas 
WHERE tenant_id IS NULL

UNION ALL

SELECT 
    'produtos' as tabela,
    COUNT(*) as registros_sem_tenant
FROM produtos 
WHERE tenant_id IS NULL;

-- 6. Verificar índices criados
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico')
  AND indexname LIKE '%tenant%'
ORDER BY tablename, indexname;

-- 7. Verificar triggers criados
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico')
  AND trigger_name LIKE '%tenant%'
ORDER BY event_object_table, trigger_name;

-- 8. Exemplo de dados migrados (primeiros 5 registros de cada tabela)
SELECT 'estoque_escolas' as tabela, id, escola_id, produto_id, tenant_id, quantidade_atual
FROM estoque_escolas 
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'escola-de-teste')
LIMIT 5;

SELECT 'estoque_lotes' as tabela, id, produto_id, lote, tenant_id, quantidade_atual
FROM estoque_lotes 
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'escola-de-teste')
LIMIT 5;