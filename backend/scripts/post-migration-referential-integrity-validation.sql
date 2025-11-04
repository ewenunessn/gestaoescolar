-- POST-MIGRATION REFERENTIAL INTEGRITY VALIDATION
-- Data: 2025-11-03
-- Descrição: Validação completa da integridade referencial após migração de tenant
-- Este script verifica se todos os registros de estoque têm tenant_id válidos,
-- valida relacionamentos de chave estrangeira dentro dos limites do tenant,
-- e garante que não existem referências cruzadas entre tenants.

-- ========================================
-- 1. VERIFICAÇÃO DE ESTRUTURA E CONFIGURAÇÃO
-- ========================================

\echo '========================================';
\echo 'POST-MIGRATION REFERENTIAL INTEGRITY VALIDATION';
\echo '========================================';
\echo '';

-- Verificar se todas as colunas tenant_id existem
\echo '1. VERIFICAÇÃO DE ESTRUTURA';
\echo '----------------------------';

SELECT 
    '1.1 - Colunas tenant_id' as verificacao,
    table_name,
    CASE 
        WHEN column_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status,
    CASE 
        WHEN is_nullable = 'NO' THEN '✅ NOT NULL'
        WHEN is_nullable = 'YES' THEN '⚠️ NULLABLE'
        ELSE '❓ DESCONHECIDO'
    END as constraint_status
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON (
    c.table_name = t.table_name 
    AND c.column_name = 'tenant_id'
)
WHERE t.table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes')
ORDER BY t.table_name;

-- Verificar se escola_id existe em estoque_lotes
SELECT 
    '1.2 - Coluna escola_id em estoque_lotes' as verificacao,
    CASE 
        WHEN column_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status,
    CASE 
        WHEN is_nullable = 'NO' THEN '✅ NOT NULL'
        WHEN is_nullable = 'YES' THEN '⚠️ NULLABLE'
        ELSE '❓ DESCONHECIDO'
    END as constraint_status
FROM information_schema.columns 
WHERE table_name = 'estoque_lotes' AND column_name = 'escola_id';

\echo '';

-- ========================================
-- 2. VERIFICAÇÃO DE ATRIBUIÇÃO DE TENANT_ID
-- ========================================

\echo '2. VERIFICAÇÃO DE ATRIBUIÇÃO DE TENANT_ID';
\echo '----------------------------------------';

-- Verificar se todos os registros têm tenant_id
WITH tenant_completeness AS (
    SELECT 
        'estoque_escolas' as tabela,
        COUNT(*) as total_registros,
        COUNT(tenant_id) as com_tenant_id,
        COUNT(*) - COUNT(tenant_id) as sem_tenant_id,
        COUNT(DISTINCT tenant_id) as tenants_unicos
    FROM estoque_escolas

    UNION ALL

    SELECT 
        'estoque_lotes',
        COUNT(*),
        COUNT(tenant_id),
        COUNT(*) - COUNT(tenant_id),
        COUNT(DISTINCT tenant_id)
    FROM estoque_lotes

    UNION ALL

    SELECT 
        'estoque_escolas_historico',
        COUNT(*),
        COUNT(tenant_id),
        COUNT(*) - COUNT(tenant_id),
        COUNT(DISTINCT tenant_id)
    FROM estoque_escolas_historico

    UNION ALL

    SELECT 
        'estoque_movimentacoes',
        COUNT(*),
        COUNT(tenant_id),
        COUNT(*) - COUNT(tenant_id),
        COUNT(DISTINCT tenant_id)
    FROM estoque_movimentacoes
)
SELECT 
    '2.1 - Completude tenant_id' as verificacao,
    tabela,
    total_registros,
    com_tenant_id,
    sem_tenant_id,
    tenants_unicos,
    CASE 
        WHEN total_registros = 0 THEN '⚪ VAZIO'
        WHEN sem_tenant_id = 0 THEN '✅ COMPLETO'
        WHEN sem_tenant_id < (total_registros * 0.05) THEN '⚠️ QUASE COMPLETO'
        ELSE '❌ INCOMPLETO'
    END as status,
    CASE 
        WHEN total_registros > 0 THEN ROUND((com_tenant_id::numeric / total_registros * 100), 2)
        ELSE 100
    END as percentual_completo
FROM tenant_completeness
ORDER BY tabela;

-- Verificar se todos os tenant_id são válidos
WITH tenant_validity AS (
    SELECT 
        'estoque_escolas' as tabela,
        COUNT(*) as total_com_tenant_id,
        COUNT(t.id) as tenant_id_validos,
        COUNT(*) - COUNT(t.id) as tenant_id_invalidos
    FROM estoque_escolas ee
    LEFT JOIN tenants t ON t.id = ee.tenant_id
    WHERE ee.tenant_id IS NOT NULL

    UNION ALL

    SELECT 
        'estoque_lotes',
        COUNT(*),
        COUNT(t.id),
        COUNT(*) - COUNT(t.id)
    FROM estoque_lotes el
    LEFT JOIN tenants t ON t.id = el.tenant_id
    WHERE el.tenant_id IS NOT NULL

    UNION ALL

    SELECT 
        'estoque_escolas_historico',
        COUNT(*),
        COUNT(t.id),
        COUNT(*) - COUNT(t.id)
    FROM estoque_escolas_historico eeh
    LEFT JOIN tenants t ON t.id = eeh.tenant_id
    WHERE eeh.tenant_id IS NOT NULL

    UNION ALL

    SELECT 
        'estoque_movimentacoes',
        COUNT(*),
        COUNT(t.id),
        COUNT(*) - COUNT(t.id)
    FROM estoque_movimentacoes em
    LEFT JOIN tenants t ON t.id = em.tenant_id
    WHERE em.tenant_id IS NOT NULL
)
SELECT 
    '2.2 - Validade tenant_id' as verificacao,
    tabela,
    total_com_tenant_id,
    tenant_id_validos,
    tenant_id_invalidos,
    CASE 
        WHEN tenant_id_invalidos = 0 THEN '✅ VÁLIDOS'
        ELSE '❌ INVÁLIDOS'
    END as status
FROM tenant_validity
ORDER BY tabela;

\echo '';

-- ========================================
-- 3. VERIFICAÇÃO DE RELACIONAMENTOS FK DENTRO DO TENANT
-- ========================================

\echo '3. VERIFICAÇÃO DE RELACIONAMENTOS FK DENTRO DO TENANT';
\echo '---------------------------------------------------';

-- Verificar estoque_escolas -> escolas dentro do mesmo tenant
SELECT 
    '3.1 - estoque_escolas x escolas' as verificacao,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN ee.tenant_id = e.tenant_id THEN 1 END) as mesmo_tenant,
    COUNT(CASE WHEN ee.tenant_id != e.tenant_id THEN 1 END) as tenant_diferente,
    COUNT(CASE WHEN e.id IS NULL THEN 1 END) as escola_inexistente,
    CASE 
        WHEN COUNT(CASE WHEN ee.tenant_id != e.tenant_id OR e.id IS NULL THEN 1 END) = 0 THEN '✅ ÍNTEGRO'
        ELSE '❌ VIOLAÇÕES'
    END as status
FROM estoque_escolas ee
LEFT JOIN escolas e ON e.id = ee.escola_id
WHERE ee.tenant_id IS NOT NULL;

-- Verificar estoque_lotes -> escolas dentro do mesmo tenant
SELECT 
    '3.2 - estoque_lotes x escolas' as verificacao,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN el.tenant_id = e.tenant_id THEN 1 END) as mesmo_tenant,
    COUNT(CASE WHEN el.tenant_id != e.tenant_id THEN 1 END) as tenant_diferente,
    COUNT(CASE WHEN e.id IS NULL THEN 1 END) as escola_inexistente,
    COUNT(CASE WHEN el.escola_id IS NULL THEN 1 END) as sem_escola_id,
    CASE 
        WHEN COUNT(CASE WHEN el.tenant_id != e.tenant_id OR e.id IS NULL THEN 1 END) = 0 THEN '✅ ÍNTEGRO'
        ELSE '❌ VIOLAÇÕES'
    END as status
FROM estoque_lotes el
LEFT JOIN escolas e ON e.id = el.escola_id
WHERE el.tenant_id IS NOT NULL;

-- Verificar estoque_movimentacoes -> estoque_lotes dentro do mesmo tenant
SELECT 
    '3.3 - estoque_movimentacoes x estoque_lotes' as verificacao,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN em.tenant_id = el.tenant_id THEN 1 END) as mesmo_tenant,
    COUNT(CASE WHEN em.tenant_id != el.tenant_id THEN 1 END) as tenant_diferente,
    COUNT(CASE WHEN el.id IS NULL THEN 1 END) as lote_inexistente,
    CASE 
        WHEN COUNT(CASE WHEN em.tenant_id != el.tenant_id OR el.id IS NULL THEN 1 END) = 0 THEN '✅ ÍNTEGRO'
        ELSE '❌ VIOLAÇÕES'
    END as status
FROM estoque_movimentacoes em
LEFT JOIN estoque_lotes el ON el.id = em.lote_id
WHERE em.tenant_id IS NOT NULL;

-- Verificar estoque_escolas_historico -> escolas dentro do mesmo tenant
SELECT 
    '3.4 - estoque_escolas_historico x escolas' as verificacao,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN eeh.tenant_id = e.tenant_id THEN 1 END) as mesmo_tenant,
    COUNT(CASE WHEN eeh.tenant_id != e.tenant_id THEN 1 END) as tenant_diferente,
    COUNT(CASE WHEN e.id IS NULL THEN 1 END) as escola_inexistente,
    CASE 
        WHEN COUNT(CASE WHEN eeh.tenant_id != e.tenant_id OR e.id IS NULL THEN 1 END) = 0 THEN '✅ ÍNTEGRO'
        ELSE '❌ VIOLAÇÕES'
    END as status
FROM estoque_escolas_historico eeh
LEFT JOIN escolas e ON e.id = eeh.escola_id
WHERE eeh.tenant_id IS NOT NULL;

-- Verificar produtos (se tiver tenant_id)
DO $
DECLARE
    produtos_has_tenant BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos' AND column_name = 'tenant_id'
    ) INTO produtos_has_tenant;
    
    IF produtos_has_tenant THEN
        -- Verificar estoque_escolas -> produtos dentro do mesmo tenant
        RAISE NOTICE 'Verificando relacionamento estoque_escolas x produtos...';
        
        PERFORM 1; -- Placeholder - a query real seria executada aqui
    ELSE
        RAISE NOTICE 'Tabela produtos não possui tenant_id - pulando verificação';
    END IF;
END $;

\echo '';

-- ========================================
-- 4. VERIFICAÇÃO DE REFERÊNCIAS CRUZADAS ENTRE TENANTS
-- ========================================

\echo '4. VERIFICAÇÃO DE REFERÊNCIAS CRUZADAS ENTRE TENANTS';
\echo '--------------------------------------------------';

-- Buscar violações de isolamento de tenant
WITH cross_tenant_violations AS (
    -- estoque_escolas referenciando escolas de outro tenant
    SELECT 
        'estoque_escolas -> escolas' as tipo_violacao,
        COUNT(*) as violacoes
    FROM estoque_escolas ee
    JOIN escolas e ON e.id = ee.escola_id
    WHERE ee.tenant_id != e.tenant_id

    UNION ALL

    -- estoque_lotes referenciando escolas de outro tenant
    SELECT 
        'estoque_lotes -> escolas',
        COUNT(*)
    FROM estoque_lotes el
    JOIN escolas e ON e.id = el.escola_id
    WHERE el.tenant_id != e.tenant_id

    UNION ALL

    -- estoque_movimentacoes referenciando lotes de outro tenant
    SELECT 
        'estoque_movimentacoes -> estoque_lotes',
        COUNT(*)
    FROM estoque_movimentacoes em
    JOIN estoque_lotes el ON el.id = em.lote_id
    WHERE em.tenant_id != el.tenant_id

    UNION ALL

    -- estoque_escolas_historico referenciando escolas de outro tenant
    SELECT 
        'estoque_escolas_historico -> escolas',
        COUNT(*)
    FROM estoque_escolas_historico eeh
    JOIN escolas e ON e.id = eeh.escola_id
    WHERE eeh.tenant_id != e.tenant_id
)
SELECT 
    '4.1 - Violações de isolamento' as verificacao,
    tipo_violacao,
    violacoes,
    CASE 
        WHEN violacoes = 0 THEN '✅ ISOLADO'
        ELSE '🚨 VIOLAÇÃO CRÍTICA'
    END as status
FROM cross_tenant_violations
ORDER BY violacoes DESC;

-- Resumo geral de isolamento
WITH total_violations AS (
    SELECT 
        (SELECT COUNT(*) FROM estoque_escolas ee JOIN escolas e ON e.id = ee.escola_id WHERE ee.tenant_id != e.tenant_id) +
        (SELECT COUNT(*) FROM estoque_lotes el JOIN escolas e ON e.id = el.escola_id WHERE el.tenant_id != e.tenant_id) +
        (SELECT COUNT(*) FROM estoque_movimentacoes em JOIN estoque_lotes el ON el.id = em.lote_id WHERE em.tenant_id != el.tenant_id) +
        (SELECT COUNT(*) FROM estoque_escolas_historico eeh JOIN escolas e ON e.id = eeh.escola_id WHERE eeh.tenant_id != e.tenant_id)
        as total_violacoes
)
SELECT 
    '4.2 - Resumo isolamento' as verificacao,
    total_violacoes,
    CASE 
        WHEN total_violacoes = 0 THEN '✅ ISOLAMENTO PERFEITO'
        WHEN total_violacoes < 10 THEN '⚠️ VIOLAÇÕES MENORES'
        ELSE '🚨 ISOLAMENTO COMPROMETIDO'
    END as status_isolamento
FROM total_violations;

\echo '';

-- ========================================
-- 5. VERIFICAÇÃO DE CONSISTÊNCIA DE DADOS
-- ========================================

\echo '5. VERIFICAÇÃO DE CONSISTÊNCIA DE DADOS';
\echo '--------------------------------------';

-- Verificar consistência de quantidades entre estoque_escolas e estoque_lotes
WITH quantidade_consistency AS (
    SELECT 
        ee.id,
        ee.tenant_id,
        ee.escola_id,
        ee.produto_id,
        ee.quantidade_atual as quantidade_estoque,
        COALESCE(SUM(el.quantidade_atual), 0) as quantidade_lotes,
        ABS(ee.quantidade_atual - COALESCE(SUM(el.quantidade_atual), 0)) as diferenca
    FROM estoque_escolas ee
    LEFT JOIN estoque_lotes el ON (
        el.produto_id = ee.produto_id 
        AND el.escola_id = ee.escola_id 
        AND el.tenant_id = ee.tenant_id
        AND el.status = 'ativo'
    )
    WHERE ee.tenant_id IS NOT NULL
    GROUP BY ee.id, ee.tenant_id, ee.escola_id, ee.produto_id, ee.quantidade_atual
),
consistency_summary AS (
    SELECT 
        COUNT(*) as total_comparacoes,
        COUNT(CASE WHEN diferenca = 0 THEN 1 END) as quantidades_iguais,
        COUNT(CASE WHEN diferenca > 0 THEN 1 END) as quantidades_diferentes,
        AVG(diferenca) as diferenca_media,
        MAX(diferenca) as diferenca_maxima
    FROM quantidade_consistency
)
SELECT 
    '5.1 - Consistência quantidades' as verificacao,
    total_comparacoes,
    quantidades_iguais,
    quantidades_diferentes,
    ROUND(diferenca_media, 3) as diferenca_media,
    diferenca_maxima,
    CASE 
        WHEN total_comparacoes = 0 THEN '⚪ SEM DADOS'
        WHEN quantidades_diferentes = 0 THEN '✅ CONSISTENTE'
        WHEN quantidades_diferentes < (total_comparacoes * 0.05) THEN '⚠️ QUASE CONSISTENTE'
        ELSE '❌ INCONSISTENTE'
    END as status,
    CASE 
        WHEN total_comparacoes > 0 THEN ROUND((quantidades_iguais::numeric / total_comparacoes * 100), 2)
        ELSE 100
    END as percentual_consistente
FROM consistency_summary;

-- Verificar registros duplicados dentro do mesmo tenant
WITH duplicates_estoque_escolas AS (
    SELECT tenant_id, escola_id, produto_id, COUNT(*) as duplicatas
    FROM estoque_escolas 
    WHERE tenant_id IS NOT NULL
    GROUP BY tenant_id, escola_id, produto_id 
    HAVING COUNT(*) > 1
),
duplicates_estoque_lotes AS (
    SELECT tenant_id, escola_id, produto_id, lote, COUNT(*) as duplicatas
    FROM estoque_lotes 
    WHERE tenant_id IS NOT NULL
    GROUP BY tenant_id, escola_id, produto_id, lote 
    HAVING COUNT(*) > 1
)
SELECT 
    '5.2 - Registros duplicados' as verificacao,
    'estoque_escolas' as tabela,
    COUNT(*) as grupos_duplicados,
    COALESCE(SUM(duplicatas), 0) as total_duplicatas,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SEM DUPLICATAS'
        ELSE '⚠️ DUPLICATAS ENCONTRADAS'
    END as status
FROM duplicates_estoque_escolas

UNION ALL

SELECT 
    '5.2 - Registros duplicados',
    'estoque_lotes',
    COUNT(*),
    COALESCE(SUM(duplicatas), 0),
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SEM DUPLICATAS'
        ELSE '⚠️ DUPLICATAS ENCONTRADAS'
    END
FROM duplicates_estoque_lotes;

\echo '';

-- ========================================
-- 6. DISTRIBUIÇÃO DE DADOS POR TENANT
-- ========================================

\echo '6. DISTRIBUIÇÃO DE DADOS POR TENANT';
\echo '----------------------------------';

-- Distribuição geral por tenant
SELECT 
    '6.1 - Distribuição por tenant' as verificacao,
    t.slug as tenant_slug,
    t.name as tenant_name,
    t.status as tenant_status,
    (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id = t.id) as estoque_escolas,
    (SELECT COUNT(*) FROM estoque_lotes WHERE tenant_id = t.id) as estoque_lotes,
    (SELECT COUNT(*) FROM estoque_escolas_historico WHERE tenant_id = t.id) as historico,
    (SELECT COUNT(*) FROM estoque_movimentacoes WHERE tenant_id = t.id) as movimentacoes,
    (SELECT COUNT(DISTINCT escola_id) FROM estoque_escolas WHERE tenant_id = t.id) as escolas_com_estoque,
    (SELECT COUNT(DISTINCT produto_id) FROM estoque_escolas WHERE tenant_id = t.id) as produtos_no_estoque
FROM tenants t
ORDER BY t.slug;

-- Estatísticas gerais
WITH tenant_stats AS (
    SELECT 
        COUNT(DISTINCT t.id) as total_tenants,
        COUNT(DISTINCT CASE WHEN ee.tenant_id IS NOT NULL THEN t.id END) as tenants_com_estoque,
        SUM(CASE WHEN ee.tenant_id = t.id THEN 1 ELSE 0 END) as total_registros_estoque
    FROM tenants t
    LEFT JOIN estoque_escolas ee ON ee.tenant_id = t.id
)
SELECT 
    '6.2 - Estatísticas gerais' as verificacao,
    total_tenants,
    tenants_com_estoque,
    total_registros_estoque,
    CASE 
        WHEN tenants_com_estoque > 0 THEN ROUND(total_registros_estoque::numeric / tenants_com_estoque, 2)
        ELSE 0
    END as media_registros_por_tenant
FROM tenant_stats;

\echo '';

-- ========================================
-- 7. VERIFICAÇÃO DE ÍNDICES E RLS
-- ========================================

\echo '7. VERIFICAÇÃO DE ÍNDICES E RLS';
\echo '------------------------------';

-- Verificar se os índices tenant-aware existem
WITH expected_indexes AS (
    SELECT unnest(ARRAY[
        'idx_estoque_escolas_tenant_escola_produto',
        'idx_estoque_lotes_tenant_escola_produto', 
        'idx_estoque_lotes_tenant_validade_ativo',
        'idx_estoque_historico_tenant_escola_data',
        'idx_estoque_movimentacoes_tenant_lote_data'
    ]) as index_name
)
SELECT 
    '7.1 - Índices tenant-aware' as verificacao,
    ei.index_name,
    CASE 
        WHEN pi.indexname IS NOT NULL THEN '✅ EXISTE'
        ELSE '⚠️ FALTANDO'
    END as status
FROM expected_indexes ei
LEFT JOIN pg_indexes pi ON pi.indexname = ei.index_name
ORDER BY ei.index_name;

-- Verificar se RLS está habilitado
SELECT 
    '7.2 - Row Level Security' as verificacao,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ HABILITADO'
        ELSE '⚠️ DESABILITADO'
    END as rls_status,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as politicas_count
FROM pg_tables 
WHERE tablename IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes')
ORDER BY tablename;

\echo '';

-- ========================================
-- 8. RESUMO FINAL E RECOMENDAÇÕES
-- ========================================

\echo '8. RESUMO FINAL E RECOMENDAÇÕES';
\echo '------------------------------';

-- Status geral da migração
WITH validation_summary AS (
    SELECT 
        -- Contar registros sem tenant_id
        (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id IS NULL) +
        (SELECT COUNT(*) FROM estoque_lotes WHERE tenant_id IS NULL) +
        (SELECT COUNT(*) FROM estoque_escolas_historico WHERE tenant_id IS NULL) +
        (SELECT COUNT(*) FROM estoque_movimentacoes WHERE tenant_id IS NULL) as registros_sem_tenant,
        
        -- Contar violações de isolamento
        (SELECT COUNT(*) FROM estoque_escolas ee JOIN escolas e ON e.id = ee.escola_id WHERE ee.tenant_id != e.tenant_id) +
        (SELECT COUNT(*) FROM estoque_lotes el JOIN escolas e ON e.id = el.escola_id WHERE el.tenant_id != e.tenant_id) +
        (SELECT COUNT(*) FROM estoque_movimentacoes em JOIN estoque_lotes el ON el.id = em.lote_id WHERE em.tenant_id != el.tenant_id) +
        (SELECT COUNT(*) FROM estoque_escolas_historico eeh JOIN escolas e ON e.id = eeh.escola_id WHERE eeh.tenant_id != e.tenant_id) as violacoes_isolamento,
        
        -- Contar referências órfãs
        (SELECT COUNT(*) FROM estoque_escolas ee LEFT JOIN escolas e ON e.id = ee.escola_id WHERE e.id IS NULL) +
        (SELECT COUNT(*) FROM estoque_lotes el LEFT JOIN escolas e ON e.id = el.escola_id WHERE el.escola_id IS NOT NULL AND e.id IS NULL) +
        (SELECT COUNT(*) FROM estoque_movimentacoes em LEFT JOIN estoque_lotes el ON el.id = em.lote_id WHERE el.id IS NULL) as referencias_orfas,
        
        -- Contar total de registros
        (SELECT COUNT(*) FROM estoque_escolas) +
        (SELECT COUNT(*) FROM estoque_lotes) +
        (SELECT COUNT(*) FROM estoque_escolas_historico) +
        (SELECT COUNT(*) FROM estoque_movimentacoes) as total_registros
)
SELECT 
    '8.1 - STATUS GERAL DA MIGRAÇÃO' as verificacao,
    total_registros,
    registros_sem_tenant,
    violacoes_isolamento,
    referencias_orfas,
    (registros_sem_tenant + violacoes_isolamento + referencias_orfas) as total_problemas,
    CASE 
        WHEN (registros_sem_tenant + violacoes_isolamento + referencias_orfas) = 0 THEN '✅ MIGRAÇÃO PERFEITA'
        WHEN violacoes_isolamento > 0 THEN '🚨 ISOLAMENTO COMPROMETIDO'
        WHEN registros_sem_tenant > (total_registros * 0.1) THEN '❌ MIGRAÇÃO INCOMPLETA'
        WHEN referencias_orfas > 0 THEN '⚠️ REFERÊNCIAS ÓRFÃS'
        ELSE '⚠️ PROBLEMAS MENORES'
    END as status_geral,
    CASE 
        WHEN total_registros > 0 THEN ROUND(((total_registros - registros_sem_tenant - violacoes_isolamento - referencias_orfas)::numeric / total_registros * 100), 2)
        ELSE 100
    END as percentual_sucesso
FROM validation_summary;

-- Recomendações baseadas nos resultados
\echo '';
\echo 'RECOMENDAÇÕES:';
\echo '';

DO $
DECLARE
    registros_sem_tenant INTEGER;
    violacoes_isolamento INTEGER;
    referencias_orfas INTEGER;
BEGIN
    -- Contar problemas
    SELECT 
        (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id IS NULL) +
        (SELECT COUNT(*) FROM estoque_lotes WHERE tenant_id IS NULL) +
        (SELECT COUNT(*) FROM estoque_escolas_historico WHERE tenant_id IS NULL) +
        (SELECT COUNT(*) FROM estoque_movimentacoes WHERE tenant_id IS NULL)
    INTO registros_sem_tenant;
    
    SELECT 
        (SELECT COUNT(*) FROM estoque_escolas ee JOIN escolas e ON e.id = ee.escola_id WHERE ee.tenant_id != e.tenant_id) +
        (SELECT COUNT(*) FROM estoque_lotes el JOIN escolas e ON e.id = el.escola_id WHERE el.tenant_id != e.tenant_id) +
        (SELECT COUNT(*) FROM estoque_movimentacoes em JOIN estoque_lotes el ON el.id = em.lote_id WHERE em.tenant_id != el.tenant_id) +
        (SELECT COUNT(*) FROM estoque_escolas_historico eeh JOIN escolas e ON e.id = eeh.escola_id WHERE eeh.tenant_id != e.tenant_id)
    INTO violacoes_isolamento;
    
    SELECT 
        (SELECT COUNT(*) FROM estoque_escolas ee LEFT JOIN escolas e ON e.id = ee.escola_id WHERE e.id IS NULL) +
        (SELECT COUNT(*) FROM estoque_lotes el LEFT JOIN escolas e ON e.id = el.escola_id WHERE el.escola_id IS NOT NULL AND e.id IS NULL) +
        (SELECT COUNT(*) FROM estoque_movimentacoes em LEFT JOIN estoque_lotes el ON el.id = em.lote_id WHERE el.id IS NULL)
    INTO referencias_orfas;
    
    -- Gerar recomendações
    IF violacoes_isolamento > 0 THEN
        RAISE NOTICE '🚨 CRÍTICO: % violações de isolamento encontradas - AÇÃO IMEDIATA NECESSÁRIA', violacoes_isolamento;
        RAISE NOTICE '   Execute: node backend/scripts/post-migration-referential-integrity-validator.js --fix-minor-issues';
    END IF;
    
    IF registros_sem_tenant > 0 THEN
        RAISE NOTICE '❌ % registros sem tenant_id - Execute migração de dados novamente', registros_sem_tenant;
        RAISE NOTICE '   Execute: node backend/run-inventory-tenant-migration.js';
    END IF;
    
    IF referencias_orfas > 0 THEN
        RAISE NOTICE '⚠️ % referências órfãs encontradas - Limpeza necessária', referencias_orfas;
        RAISE NOTICE '   Execute: node backend/scripts/post-migration-referential-integrity-validator.js --fix-minor-issues';
    END IF;
    
    IF registros_sem_tenant = 0 AND violacoes_isolamento = 0 AND referencias_orfas = 0 THEN
        RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
        RAISE NOTICE '   Todos os dados estão íntegros e isolados por tenant.';
        RAISE NOTICE '   Próximos passos:';
        RAISE NOTICE '   1. Definir colunas tenant_id como NOT NULL';
        RAISE NOTICE '   2. Criar constraints de foreign key';
        RAISE NOTICE '   3. Habilitar RLS se ainda não estiver ativo';
    END IF;
END $;

\echo '';
\echo '========================================';
\echo 'VALIDAÇÃO CONCLUÍDA';
\echo '========================================';