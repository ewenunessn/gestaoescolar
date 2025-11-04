-- Script para forçar isolamento de tenant no estoque
-- Execute este script para garantir que cada tenant veja apenas seus dados

BEGIN;

-- 1. Primeiro, vamos criar tenants de teste se não existirem
INSERT INTO tenants (slug, name, subdomain, status, created_at, updated_at) VALUES
('escola-a', 'Escola A', 'escola-a', 'active', NOW(), NOW()),
('escola-b', 'Escola B', 'escola-b', 'active', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 2. Separar dados por tenant baseado em algum critério
-- Vamos dividir as escolas entre os tenants

DO $$
DECLARE
    tenant_a_id UUID;
    tenant_b_id UUID;
    escola_teste_id UUID;
    sistema_principal_id UUID;
    total_escolas INTEGER;
    metade INTEGER;
BEGIN
    -- Buscar IDs dos tenants
    SELECT id INTO tenant_a_id FROM tenants WHERE slug = 'escola-a';
    SELECT id INTO tenant_b_id FROM tenants WHERE slug = 'escola-b';
    SELECT id INTO escola_teste_id FROM tenants WHERE slug = 'escola-de-teste';
    SELECT id INTO sistema_principal_id FROM tenants WHERE slug = 'sistema-principal';
    
    -- Contar total de escolas
    SELECT COUNT(*) INTO total_escolas FROM escolas;
    metade := total_escolas / 2;
    
    RAISE NOTICE 'Distribuindo % escolas entre tenants...', total_escolas;
    
    -- Atribuir primeira metade das escolas ao tenant A
    UPDATE escolas 
    SET tenant_id = tenant_a_id 
    WHERE id IN (
        SELECT id FROM escolas ORDER BY id LIMIT metade
    );
    
    -- Atribuir segunda metade das escolas ao tenant B
    UPDATE escolas 
    SET tenant_id = tenant_b_id 
    WHERE id IN (
        SELECT id FROM escolas ORDER BY id OFFSET metade
    );
    
    -- Atualizar produtos - dividir também
    UPDATE produtos 
    SET tenant_id = tenant_a_id 
    WHERE id IN (
        SELECT id FROM produtos ORDER BY id LIMIT (SELECT COUNT(*) FROM produtos) / 2
    );
    
    UPDATE produtos 
    SET tenant_id = tenant_b_id 
    WHERE tenant_id IS NULL;
    
    -- Atualizar estoque baseado na escola
    UPDATE estoque_escolas 
    SET tenant_id = e.tenant_id 
    FROM escolas e 
    WHERE estoque_escolas.escola_id = e.id;
    
    -- Atualizar lotes baseado na escola
    UPDATE estoque_lotes 
    SET tenant_id = e.tenant_id 
    FROM escolas e 
    WHERE estoque_lotes.escola_id = e.id;
    
    -- Atualizar histórico baseado na escola
    UPDATE estoque_escolas_historico 
    SET tenant_id = e.tenant_id 
    FROM escolas e 
    WHERE estoque_escolas_historico.escola_id = e.id;
    
    RAISE NOTICE 'Dados distribuídos entre tenants';
    
END $$;

-- 3. Verificar a distribuição
SELECT 
    t.name as tenant_name,
    'escolas' as tabela,
    COUNT(e.id) as total_registros
FROM tenants t
LEFT JOIN escolas e ON e.tenant_id = t.id
GROUP BY t.id, t.name

UNION ALL

SELECT 
    t.name as tenant_name,
    'produtos' as tabela,
    COUNT(p.id) as total_registros
FROM tenants t
LEFT JOIN produtos p ON p.tenant_id = t.id
GROUP BY t.id, t.name

UNION ALL

SELECT 
    t.name as tenant_name,
    'estoque_escolas' as tabela,
    COUNT(ee.id) as total_registros
FROM tenants t
LEFT JOIN estoque_escolas ee ON ee.tenant_id = t.id
GROUP BY t.id, t.name

ORDER BY tenant_name, tabela;

-- 4. Criar uma view para testar isolamento
CREATE OR REPLACE VIEW vw_estoque_por_tenant AS
SELECT 
    t.name as tenant_name,
    e.nome as escola_nome,
    p.nome as produto_nome,
    ee.quantidade_atual,
    ee.tenant_id
FROM tenants t
JOIN escolas e ON e.tenant_id = t.id
JOIN estoque_escolas ee ON ee.escola_id = e.id AND ee.tenant_id = t.id
JOIN produtos p ON p.id = ee.produto_id AND p.tenant_id = t.id
ORDER BY t.name, e.nome, p.nome;

-- 5. Mostrar exemplo de dados isolados
SELECT 
    tenant_name,
    COUNT(*) as total_itens_estoque
FROM vw_estoque_por_tenant
GROUP BY tenant_name;

COMMIT;

-- 6. Instruções para testar no frontend
SELECT 
    'Para testar no frontend:' as instrucao,
    'Mude o tenant no TenantSelector e verifique se os dados mudam' as acao;

SELECT 
    'Tenants disponíveis para teste:' as info,
    string_agg(name, ', ') as tenants
FROM tenants 
WHERE status = 'active';