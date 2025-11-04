-- Script para verificar qual tenant está sendo usado e se os dados estão isolados
-- Execute este script para ver exatamente onde estão os dados

-- 1. Verificar todos os tenants disponíveis
SELECT 
    'TENANTS DISPONÍVEIS:' as info,
    id,
    name,
    slug,
    status
FROM tenants 
ORDER BY name;

-- 2. Verificar distribuição de produtos por tenant
SELECT 
    'PRODUTOS POR TENANT:' as info,
    t.name as tenant_name,
    COUNT(p.id) as total_produtos,
    string_agg(p.nome, ', ' ORDER BY p.nome) as produtos
FROM tenants t
LEFT JOIN produtos p ON p.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 3. Verificar distribuição de escolas por tenant
SELECT 
    'ESCOLAS POR TENANT:' as info,
    t.name as tenant_name,
    COUNT(e.id) as total_escolas,
    string_agg(e.nome, ', ' ORDER BY e.nome) as escolas
FROM tenants t
LEFT JOIN escolas e ON e.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 4. Verificar estoque por tenant
SELECT 
    'ESTOQUE POR TENANT:' as info,
    t.name as tenant_name,
    COUNT(ee.id) as total_itens_estoque,
    SUM(ee.quantidade_atual) as quantidade_total
FROM tenants t
LEFT JOIN estoque_escolas ee ON ee.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 5. Verificar produtos específicos que você mencionou
SELECT 
    'PRODUTOS ESPECÍFICOS:' as info,
    p.nome as produto_nome,
    t.name as tenant_name,
    p.tenant_id,
    SUM(ee.quantidade_atual) as quantidade_total_estoque
FROM produtos p
LEFT JOIN tenants t ON t.id = p.tenant_id
LEFT JOIN estoque_escolas ee ON ee.produto_id = p.id AND ee.tenant_id = p.tenant_id
WHERE p.nome IN ('Arroz Branco', 'Banana', 'Carne Bovina Moída', 'Feijão Carioca', 'Frango', 'Leite Integral', 'Maçã', 'Óleo de Soja')
GROUP BY p.id, p.nome, t.name, p.tenant_id
ORDER BY p.nome;

-- 6. Verificar registros órfãos (sem tenant_id)
SELECT 
    'REGISTROS ÓRFÃOS:' as info,
    'produtos' as tabela,
    COUNT(*) as total_sem_tenant,
    string_agg(nome, ', ') as itens_sem_tenant
FROM produtos 
WHERE tenant_id IS NULL

UNION ALL

SELECT 
    'REGISTROS ÓRFÃOS:' as info,
    'escolas' as tabela,
    COUNT(*) as total_sem_tenant,
    string_agg(nome, ', ') as itens_sem_tenant
FROM escolas 
WHERE tenant_id IS NULL

UNION ALL

SELECT 
    'REGISTROS ÓRFÃOS:' as info,
    'estoque_escolas' as tabela,
    COUNT(*) as total_sem_tenant,
    'N/A' as itens_sem_tenant
FROM estoque_escolas 
WHERE tenant_id IS NULL;

-- 7. Simular a query que o frontend está fazendo
-- Assumindo que está usando o tenant "Escola de Teste"
DO $$
DECLARE
    escola_teste_tenant_id UUID;
    primeira_escola_id INTEGER;
BEGIN
    -- Buscar ID do tenant "Escola de Teste"
    SELECT id INTO escola_teste_tenant_id FROM tenants WHERE slug = 'escola-de-teste';
    
    -- Buscar primeira escola do tenant
    SELECT id INTO primeira_escola_id FROM escolas WHERE tenant_id = escola_teste_tenant_id LIMIT 1;
    
    IF escola_teste_tenant_id IS NOT NULL AND primeira_escola_id IS NOT NULL THEN
        RAISE NOTICE 'SIMULANDO QUERY DO FRONTEND:';
        RAISE NOTICE 'Tenant: Escola de Teste (ID: %)', escola_teste_tenant_id;
        RAISE NOTICE 'Escola: % (ID: %)', (SELECT nome FROM escolas WHERE id = primeira_escola_id), primeira_escola_id;
        
        -- Executar query similar ao controller
        RAISE NOTICE 'Produtos que seriam retornados:';
        
        PERFORM 1; -- Placeholder para a query complexa
        
    ELSE
        RAISE NOTICE 'Tenant "Escola de Teste" ou escolas não encontrados';
    END IF;
END $$;

-- 8. Verificar se todos os dados estão no mesmo tenant
SELECT 
    'VERIFICAÇÃO FINAL:' as info,
    CASE 
        WHEN COUNT(DISTINCT COALESCE(p.tenant_id::text, 'NULL')) = 1 THEN 'TODOS OS PRODUTOS NO MESMO TENANT'
        ELSE 'PRODUTOS EM TENANTS DIFERENTES'
    END as status_produtos,
    CASE 
        WHEN COUNT(DISTINCT COALESCE(e.tenant_id::text, 'NULL')) = 1 THEN 'TODAS AS ESCOLAS NO MESMO TENANT'
        ELSE 'ESCOLAS EM TENANTS DIFERENTES'
    END as status_escolas
FROM produtos p
CROSS JOIN escolas e;