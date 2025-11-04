-- Debug do isolamento de tenant
-- Execute este script para verificar se o isolamento está funcionando

-- 1. Verificar todos os tenants
SELECT '=== TENANTS DISPONÍVEIS ===' as debug_info;
SELECT 
    name as tenant_name,
    slug,
    status,
    id
FROM tenants 
ORDER BY name;

-- 2. Verificar distribuição de dados por tenant
SELECT '=== DISTRIBUIÇÃO DE DADOS ===' as debug_info;

SELECT 
    'PRODUTOS' as tipo_dado,
    COALESCE(t.name, 'SEM TENANT') as tenant_name,
    COUNT(p.id) as total_registros
FROM produtos p
LEFT JOIN tenants t ON t.id = p.tenant_id
GROUP BY t.id, t.name
ORDER BY total_registros DESC;

SELECT 
    'ESCOLAS' as tipo_dado,
    COALESCE(t.name, 'SEM TENANT') as tenant_name,
    COUNT(e.id) as total_registros
FROM escolas e
LEFT JOIN tenants t ON t.id = e.tenant_id
GROUP BY t.id, t.name
ORDER BY total_registros DESC;

SELECT 
    'ESTOQUE' as tipo_dado,
    COALESCE(t.name, 'SEM TENANT') as tenant_name,
    COUNT(ee.id) as total_registros
FROM estoque_escolas ee
LEFT JOIN tenants t ON t.id = ee.tenant_id
GROUP BY t.id, t.name
ORDER BY total_registros DESC;

-- 3. Verificar se há isolamento real
SELECT '=== ANÁLISE DO ISOLAMENTO ===' as debug_info;

SELECT 
    'DIAGNÓSTICO' as tipo,
    CASE 
        WHEN COUNT(DISTINCT COALESCE(p.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)) = 1 
        THEN '❌ TODOS OS PRODUTOS NO MESMO TENANT - SEM ISOLAMENTO'
        ELSE '✅ PRODUTOS DISTRIBUÍDOS ENTRE TENANTS'
    END as status_produtos,
    CASE 
        WHEN COUNT(DISTINCT COALESCE(e.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)) = 1 
        THEN '❌ TODAS AS ESCOLAS NO MESMO TENANT - SEM ISOLAMENTO'
        ELSE '✅ ESCOLAS DISTRIBUÍDAS ENTRE TENANTS'
    END as status_escolas
FROM produtos p
CROSS JOIN escolas e;

-- 4. Verificar produtos específicos que você mencionou
SELECT '=== PRODUTOS ESPECÍFICOS MENCIONADOS ===' as debug_info;

SELECT 
    p.nome as produto,
    COALESCE(t.name, 'SEM TENANT') as tenant_atual,
    p.tenant_id,
    COALESCE(SUM(ee.quantidade_atual), 0) as quantidade_total_estoque,
    COUNT(ee.id) as escolas_com_estoque
FROM produtos p
LEFT JOIN tenants t ON t.id = p.tenant_id
LEFT JOIN estoque_escolas ee ON ee.produto_id = p.id
WHERE p.nome IN ('Arroz Branco', 'Banana', 'Carne Bovina Moída', 'Feijão Carioca', 'Frango', 'Leite Integral', 'Maçã', 'Óleo de Soja')
GROUP BY p.id, p.nome, t.name, p.tenant_id
ORDER BY p.nome;

-- 5. Verificar se o problema é que todos estão no "Escola de Teste"
SELECT '=== VERIFICAÇÃO TENANT ESCOLA DE TESTE ===' as debug_info;

SELECT 
    'Escola de Teste' as tenant_verificado,
    COUNT(DISTINCT p.id) as total_produtos,
    COUNT(DISTINCT e.id) as total_escolas,
    COUNT(DISTINCT ee.id) as total_itens_estoque
FROM tenants t
LEFT JOIN produtos p ON p.tenant_id = t.id
LEFT JOIN escolas e ON e.tenant_id = t.id
LEFT JOIN estoque_escolas ee ON ee.tenant_id = t.id
WHERE t.slug = 'escola-de-teste';

-- 6. Mostrar o que cada tenant deveria ter para isolamento funcionar
SELECT '=== COMO DEVERIA SER O ISOLAMENTO ===' as debug_info;

SELECT 
    'IDEAL' as cenario,
    'Cada tenant deveria ter produtos e escolas diferentes' as explicacao,
    'Se todos têm os mesmos dados, não há isolamento' as problema;

-- 7. Solução recomendada
SELECT '=== SOLUÇÃO RECOMENDADA ===' as debug_info;

SELECT 
    'PASSO 1' as etapa,
    'Execute: backend/force-tenant-isolation.sql' as acao,
    'Isso vai distribuir os dados entre tenants diferentes' as resultado
UNION ALL
SELECT 
    'PASSO 2' as etapa,
    'Reinicie o backend' as acao,
    'Para aplicar as mudanças no controller' as resultado
UNION ALL
SELECT 
    'PASSO 3' as etapa,
    'Limpe cache do frontend (localStorage.clear())' as acao,
    'Para forçar recarregamento dos dados' as resultado
UNION ALL
SELECT 
    'PASSO 4' as etapa,
    'Teste mudando entre tenants no TenantSelector' as acao,
    'Você deve ver dados diferentes para cada tenant' as resultado;

-- 8. Verificação final - contar tenants únicos
SELECT '=== VERIFICAÇÃO FINAL ===' as debug_info;

SELECT 
    COUNT(DISTINCT p.tenant_id) as tenants_com_produtos,
    COUNT(DISTINCT e.tenant_id) as tenants_com_escolas,
    COUNT(DISTINCT ee.tenant_id) as tenants_com_estoque,
    CASE 
        WHEN COUNT(DISTINCT p.tenant_id) > 1 AND COUNT(DISTINCT e.tenant_id) > 1 
        THEN '✅ ISOLAMENTO FUNCIONANDO'
        ELSE '❌ TODOS OS DADOS NO MESMO TENANT - EXECUTE force-tenant-isolation.sql'
    END as status_final
FROM produtos p
CROSS JOIN escolas e  
CROSS JOIN estoque_escolas ee
WHERE p.tenant_id IS NOT NULL 
  AND e.tenant_id IS NOT NULL 
  AND ee.tenant_id IS NOT NULL;