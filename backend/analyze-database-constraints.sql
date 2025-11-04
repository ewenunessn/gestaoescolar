-- Análise de Constraints e Estrutura do Banco
-- Para identificar problemas antes da migração de tenant

-- 1. Verificar estrutura das tabelas de estoque
SELECT 
    'ESTRUTURA TABELAS ESTOQUE' as analise,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes', 'produtos', 'escolas')
ORDER BY table_name, ordinal_position;

-- 2. Verificar foreign keys existentes
SELECT 
    'FOREIGN KEYS EXISTENTES' as analise,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes')
ORDER BY tc.table_name;

-- 3. Verificar se tenant_id já existe nas tabelas
SELECT 
    'COLUNAS TENANT_ID EXISTENTES' as analise,
    table_name,
    CASE WHEN column_name IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_tenant_id
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON (
    c.table_name = t.table_name 
    AND c.column_name = 'tenant_id'
)
WHERE t.table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes', 'produtos', 'escolas')
ORDER BY t.table_name;

-- 4. Verificar se escola_id existe em estoque_lotes
SELECT 
    'COLUNA ESCOLA_ID EM ESTOQUE_LOTES' as analise,
    CASE WHEN column_name IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_escola_id
FROM information_schema.columns 
WHERE table_name = 'estoque_lotes' AND column_name = 'escola_id';

-- 5. Contar registros nas tabelas para entender o volume de dados
SELECT 'CONTAGEM DE REGISTROS' as analise, 'estoque_escolas' as tabela, COUNT(*) as total FROM estoque_escolas
UNION ALL
SELECT 'CONTAGEM DE REGISTROS', 'estoque_lotes', COUNT(*) FROM estoque_lotes
UNION ALL
SELECT 'CONTAGEM DE REGISTROS', 'estoque_escolas_historico', COUNT(*) FROM estoque_escolas_historico
UNION ALL
SELECT 'CONTAGEM DE REGISTROS', 'estoque_movimentacoes', COUNT(*) FROM estoque_movimentacoes
UNION ALL
SELECT 'CONTAGEM DE REGISTROS', 'produtos', COUNT(*) FROM produtos
UNION ALL
SELECT 'CONTAGEM DE REGISTROS', 'escolas', COUNT(*) FROM escolas;

-- 6. Verificar dependências críticas (movimentações que referenciam lotes)
SELECT 
    'DEPENDÊNCIAS CRÍTICAS' as analise,
    'estoque_movimentacoes -> estoque_lotes' as relacao,
    COUNT(DISTINCT em.lote_id) as lotes_referenciados,
    COUNT(*) as total_movimentacoes
FROM estoque_movimentacoes em
JOIN estoque_lotes el ON el.id = em.lote_id;

-- 7. Verificar se existem tenants na tabela
SELECT 
    'TENANTS EXISTENTES' as analise,
    COUNT(*) as total_tenants,
    string_agg(slug, ', ') as slugs_existentes
FROM tenants;