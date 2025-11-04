-- SCRIPT DE VERIFICAÇÃO DE INTEGRIDADE REFERENCIAL DO ESTOQUE
-- Data: 2025-11-03
-- Descrição: Verifica e reporta problemas de integridade referencial nas tabelas de estoque

-- ========================================
-- 1. VERIFICAÇÕES DE FOREIGN KEYS
-- ========================================

-- Verificar estoque_escolas -> escolas
SELECT 
    'FOREIGN KEY - estoque_escolas.escola_id' as verificacao,
    COUNT(*) as total_registros,
    COUNT(e.id) as referencias_validas,
    COUNT(*) - COUNT(e.id) as referencias_invalidas,
    CASE 
        WHEN COUNT(*) = COUNT(e.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_escolas ee
LEFT JOIN escolas e ON e.id = ee.escola_id;

-- Verificar estoque_escolas -> produtos
SELECT 
    'FOREIGN KEY - estoque_escolas.produto_id' as verificacao,
    COUNT(*) as total_registros,
    COUNT(p.id) as referencias_validas,
    COUNT(*) - COUNT(p.id) as referencias_invalidas,
    CASE 
        WHEN COUNT(*) = COUNT(p.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_escolas ee
LEFT JOIN produtos p ON p.id = ee.produto_id;

-- Verificar estoque_lotes -> produtos
SELECT 
    'FOREIGN KEY - estoque_lotes.produto_id' as verificacao,
    COUNT(*) as total_registros,
    COUNT(p.id) as referencias_validas,
    COUNT(*) - COUNT(p.id) as referencias_invalidas,
    CASE 
        WHEN COUNT(*) = COUNT(p.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_lotes el
LEFT JOIN produtos p ON p.id = el.produto_id;

-- Verificar estoque_lotes -> escolas (se escola_id existir)
SELECT 
    'FOREIGN KEY - estoque_lotes.escola_id' as verificacao,
    COUNT(*) as total_registros,
    COUNT(el.escola_id) as com_escola_id,
    COUNT(e.id) as referencias_validas,
    COUNT(el.escola_id) - COUNT(e.id) as referencias_invalidas,
    CASE 
        WHEN COUNT(el.escola_id) = COUNT(e.id) THEN '✅ VÁLIDA'
        WHEN COUNT(el.escola_id) = 0 THEN '⚠️ COLUNA NÃO POPULADA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_lotes el
LEFT JOIN escolas e ON e.id = el.escola_id;

-- Verificar estoque_escolas_historico -> estoque_escolas
SELECT 
    'FOREIGN KEY - estoque_escolas_historico.estoque_escola_id' as verificacao,
    COUNT(*) as total_registros,
    COUNT(ee.id) as referencias_validas,
    COUNT(*) - COUNT(ee.id) as referencias_invalidas,
    CASE 
        WHEN COUNT(*) = COUNT(ee.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_escolas_historico eeh
LEFT JOIN estoque_escolas ee ON ee.id = eeh.estoque_escola_id;

-- Verificar estoque_escolas_historico -> escolas
SELECT 
    'FOREIGN KEY - estoque_escolas_historico.escola_id' as verificacao,
    COUNT(*) as total_registros,
    COUNT(e.id) as referencias_validas,
    COUNT(*) - COUNT(e.id) as referencias_invalidas,
    CASE 
        WHEN COUNT(*) = COUNT(e.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_escolas_historico eeh
LEFT JOIN escolas e ON e.id = eeh.escola_id;

-- Verificar estoque_escolas_historico -> produtos
SELECT 
    'FOREIGN KEY - estoque_escolas_historico.produto_id' as verificacao,
    COUNT(*) as total_registros,
    COUNT(p.id) as referencias_validas,
    COUNT(*) - COUNT(p.id) as referencias_invalidas,
    CASE 
        WHEN COUNT(*) = COUNT(p.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_escolas_historico eeh
LEFT JOIN produtos p ON p.id = eeh.produto_id;

-- Verificar estoque_movimentacoes -> estoque_lotes
SELECT 
    'FOREIGN KEY - estoque_movimentacoes.lote_id' as verificacao,
    COUNT(*) as total_registros,
    COUNT(el.id) as referencias_validas,
    COUNT(*) - COUNT(el.id) as referencias_invalidas,
    CASE 
        WHEN COUNT(*) = COUNT(el.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_movimentacoes em
LEFT JOIN estoque_lotes el ON el.id = em.lote_id;

-- Verificar estoque_movimentacoes -> produtos
SELECT 
    'FOREIGN KEY - estoque_movimentacoes.produto_id' as verificacao,
    COUNT(*) as total_registros,
    COUNT(p.id) as referencias_validas,
    COUNT(*) - COUNT(p.id) as referencias_invalidas,
    CASE 
        WHEN COUNT(*) = COUNT(p.id) THEN '✅ VÁLIDA'
        ELSE '❌ INVÁLIDA'
    END as status
FROM estoque_movimentacoes em
LEFT JOIN produtos p ON p.id = em.produto_id;

-- ========================================
-- 2. VERIFICAÇÕES DE CONSISTÊNCIA DE DADOS
-- ========================================

-- Verificar se produtos em estoque_escolas existem em estoque_lotes
SELECT 
    'CONSISTÊNCIA - Produtos em estoque_escolas vs estoque_lotes' as verificacao,
    COUNT(DISTINCT ee.produto_id) as produtos_em_estoque_escolas,
    COUNT(DISTINCT el.produto_id) as produtos_em_estoque_lotes,
    COUNT(DISTINCT ee.produto_id) - COUNT(DISTINCT el.produto_id) as diferenca,
    CASE 
        WHEN COUNT(DISTINCT ee.produto_id) = COUNT(DISTINCT el.produto_id) THEN '✅ CONSISTENTE'
        ELSE '⚠️ INCONSISTENTE'
    END as status
FROM estoque_escolas ee
FULL OUTER JOIN estoque_lotes el ON el.produto_id = ee.produto_id;

-- Verificar se quantidades em estoque_escolas batem com soma dos lotes
WITH lotes_soma AS (
    SELECT 
        produto_id,
        escola_id,
        SUM(quantidade_atual) as total_lotes
    FROM estoque_lotes 
    WHERE status = 'ativo'
    GROUP BY produto_id, escola_id
),
comparacao AS (
    SELECT 
        ee.id,
        ee.escola_id,
        ee.produto_id,
        ee.quantidade_atual as quantidade_estoque,
        COALESCE(ls.total_lotes, 0) as quantidade_lotes,
        ABS(ee.quantidade_atual - COALESCE(ls.total_lotes, 0)) as diferenca
    FROM estoque_escolas ee
    LEFT JOIN lotes_soma ls ON (ls.produto_id = ee.produto_id AND ls.escola_id = ee.escola_id)
)
SELECT 
    'CONSISTÊNCIA - Quantidades estoque_escolas vs lotes' as verificacao,
    COUNT(*) as total_comparacoes,
    COUNT(CASE WHEN diferenca = 0 THEN 1 END) as quantidades_iguais,
    COUNT(CASE WHEN diferenca > 0 THEN 1 END) as quantidades_diferentes,
    ROUND(AVG(diferenca), 3) as diferenca_media,
    CASE 
        WHEN COUNT(CASE WHEN diferenca > 0.001 THEN 1 END) = 0 THEN '✅ CONSISTENTE'
        ELSE '⚠️ INCONSISTENTE'
    END as status
FROM comparacao;

-- ========================================
-- 3. VERIFICAÇÕES DE TENANT (SE APLICÁVEL)
-- ========================================

-- Verificar se tenant_id existe nas tabelas
DO $
DECLARE
    tenant_columns_exist BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'estoque_escolas' AND column_name = 'tenant_id'
    ) INTO tenant_columns_exist;
    
    IF tenant_columns_exist THEN
        -- Verificar consistência de tenant_id entre estoque_escolas e escolas
        RAISE NOTICE 'Verificando consistência de tenant_id...';
        
        PERFORM 1; -- Placeholder para as verificações de tenant que seguem
    ELSE
        RAISE NOTICE 'Colunas tenant_id não encontradas - pulando verificações de tenant';
    END IF;
END $;

-- Verificar tenant_id entre estoque_escolas e escolas (se tenant_id existir)
SELECT 
    'TENANT - Consistência estoque_escolas x escolas' as verificacao,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN ee.tenant_id = e.tenant_id OR (ee.tenant_id IS NULL AND e.tenant_id IS NULL) THEN 1 END) as tenant_consistente,
    COUNT(CASE WHEN ee.tenant_id != e.tenant_id OR (ee.tenant_id IS NULL) != (e.tenant_id IS NULL) THEN 1 END) as tenant_inconsistente,
    CASE 
        WHEN COUNT(CASE WHEN ee.tenant_id != e.tenant_id OR (ee.tenant_id IS NULL) != (e.tenant_id IS NULL) THEN 1 END) = 0 THEN '✅ CONSISTENTE'
        ELSE '❌ INCONSISTENTE'
    END as status
FROM estoque_escolas ee
JOIN escolas e ON e.id = ee.escola_id
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'estoque_escolas' AND column_name = 'tenant_id'
);

-- ========================================
-- 4. IDENTIFICAR REGISTROS PROBLEMÁTICOS
-- ========================================

-- Listar estoque_escolas com escola_id inválido
SELECT 
    'PROBLEMAS - estoque_escolas com escola_id inválido' as tipo_problema,
    ee.id,
    ee.escola_id,
    ee.produto_id,
    'Escola não existe' as descricao_problema
FROM estoque_escolas ee
LEFT JOIN escolas e ON e.id = ee.escola_id
WHERE e.id IS NULL
LIMIT 10;

-- Listar estoque_escolas com produto_id inválido
SELECT 
    'PROBLEMAS - estoque_escolas com produto_id inválido' as tipo_problema,
    ee.id,
    ee.escola_id,
    ee.produto_id,
    'Produto não existe' as descricao_problema
FROM estoque_escolas ee
LEFT JOIN produtos p ON p.id = ee.produto_id
WHERE p.id IS NULL
LIMIT 10;

-- Listar estoque_lotes com produto_id inválido
SELECT 
    'PROBLEMAS - estoque_lotes com produto_id inválido' as tipo_problema,
    el.id,
    el.produto_id,
    el.lote,
    'Produto não existe' as descricao_problema
FROM estoque_lotes el
LEFT JOIN produtos p ON p.id = el.produto_id
WHERE p.id IS NULL
LIMIT 10;

-- Listar estoque_lotes com escola_id inválido (se coluna existir)
SELECT 
    'PROBLEMAS - estoque_lotes com escola_id inválido' as tipo_problema,
    el.id,
    el.escola_id,
    el.produto_id,
    'Escola não existe' as descricao_problema
FROM estoque_lotes el
LEFT JOIN escolas e ON e.id = el.escola_id
WHERE el.escola_id IS NOT NULL AND e.id IS NULL
LIMIT 10;

-- Listar movimentações órfãs (sem lote correspondente)
SELECT 
    'PROBLEMAS - estoque_movimentacoes órfãs' as tipo_problema,
    em.id,
    em.lote_id,
    em.produto_id,
    'Lote não existe' as descricao_problema
FROM estoque_movimentacoes em
LEFT JOIN estoque_lotes el ON el.id = em.lote_id
WHERE el.id IS NULL
LIMIT 10;

-- ========================================
-- 5. ESTATÍSTICAS GERAIS
-- ========================================

-- Contagem geral de registros
SELECT 
    'ESTATÍSTICAS - Contagem de registros' as categoria,
    'estoque_escolas' as tabela,
    COUNT(*) as total_registros
FROM estoque_escolas

UNION ALL

SELECT 
    'ESTATÍSTICAS - Contagem de registros',
    'estoque_lotes',
    COUNT(*)
FROM estoque_lotes

UNION ALL

SELECT 
    'ESTATÍSTICAS - Contagem de registros',
    'estoque_escolas_historico',
    COUNT(*)
FROM estoque_escolas_historico

UNION ALL

SELECT 
    'ESTATÍSTICAS - Contagem de registros',
    'estoque_movimentacoes',
    COUNT(*)
FROM estoque_movimentacoes;

-- Distribuição por status nos lotes
SELECT 
    'ESTATÍSTICAS - Status dos lotes' as categoria,
    status,
    COUNT(*) as quantidade,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM estoque_lotes
GROUP BY status
ORDER BY quantidade DESC;

-- ========================================
-- 6. RESUMO FINAL
-- ========================================

WITH integrity_summary AS (
    SELECT 
        -- Contar problemas de foreign key
        (SELECT COUNT(*) FROM estoque_escolas ee LEFT JOIN escolas e ON e.id = ee.escola_id WHERE e.id IS NULL) +
        (SELECT COUNT(*) FROM estoque_escolas ee LEFT JOIN produtos p ON p.id = ee.produto_id WHERE p.id IS NULL) +
        (SELECT COUNT(*) FROM estoque_lotes el LEFT JOIN produtos p ON p.id = el.produto_id WHERE p.id IS NULL) +
        (SELECT COUNT(*) FROM estoque_movimentacoes em LEFT JOIN estoque_lotes el ON el.id = em.lote_id WHERE el.id IS NULL) +
        (SELECT COUNT(*) FROM estoque_escolas_historico eeh LEFT JOIN estoque_escolas ee ON ee.id = eeh.estoque_escola_id WHERE ee.id IS NULL)
        as total_problemas
)
SELECT 
    'RESUMO FINAL' as categoria,
    CASE 
        WHEN total_problemas = 0 THEN '✅ INTEGRIDADE PERFEITA'
        WHEN total_problemas < 10 THEN '⚠️ PROBLEMAS MENORES'
        WHEN total_problemas < 100 THEN '❌ PROBLEMAS MODERADOS'
        ELSE '🚨 PROBLEMAS GRAVES'
    END as status_geral,
    total_problemas as total_problemas_encontrados,
    CASE 
        WHEN total_problemas = 0 THEN 'Banco de dados íntegro'
        WHEN total_problemas < 10 THEN 'Poucos problemas encontrados - revisar'
        WHEN total_problemas < 100 THEN 'Problemas moderados - correção necessária'
        ELSE 'Muitos problemas - correção urgente necessária'
    END as recomendacao
FROM integrity_summary;