-- Script para criar isolamento REAL entre tenants
-- Este script vai distribuir os dados entre diferentes tenants para testar o isolamento

BEGIN;

-- 1. Criar tenants de teste se não existirem
INSERT INTO tenants (slug, name, subdomain, status, created_at, updated_at) VALUES
('tenant-a', 'Supermercado Norte', 'norte', 'active', NOW(), NOW()),
('tenant-b', 'Supermercado Sul', 'sul', 'active', NOW(), NOW()),
('tenant-c', 'Supermercado Centro', 'centro', 'active', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 2. Distribuir PRODUTOS entre tenants (cada tenant terá produtos diferentes)
DO $$
DECLARE
    tenant_a_id UUID;
    tenant_b_id UUID;
    tenant_c_id UUID;
    produto_record RECORD;
    contador INTEGER := 0;
BEGIN
    -- Buscar IDs dos tenants
    SELECT id INTO tenant_a_id FROM tenants WHERE slug = 'tenant-a';
    SELECT id INTO tenant_b_id FROM tenants WHERE slug = 'tenant-b';
    SELECT id INTO tenant_c_id FROM tenants WHERE slug = 'tenant-c';
    
    -- Distribuir produtos de forma alternada
    FOR produto_record IN SELECT id FROM produtos ORDER BY id LOOP
        contador := contador + 1;
        
        IF contador % 3 = 1 THEN
            UPDATE produtos SET tenant_id = tenant_a_id WHERE id = produto_record.id;
        ELSIF contador % 3 = 2 THEN
            UPDATE produtos SET tenant_id = tenant_b_id WHERE id = produto_record.id;
        ELSE
            UPDATE produtos SET tenant_id = tenant_c_id WHERE id = produto_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Produtos distribuídos entre % tenants', 3;
END $$;

-- 3. Distribuir ESCOLAS entre tenants (cada tenant terá escolas diferentes)
DO $$
DECLARE
    tenant_a_id UUID;
    tenant_b_id UUID;
    tenant_c_id UUID;
    escola_record RECORD;
    contador INTEGER := 0;
BEGIN
    -- Buscar IDs dos tenants
    SELECT id INTO tenant_a_id FROM tenants WHERE slug = 'tenant-a';
    SELECT id INTO tenant_b_id FROM tenants WHERE slug = 'tenant-b';
    SELECT id INTO tenant_c_id FROM tenants WHERE slug = 'tenant-c';
    
    -- Distribuir escolas de forma alternada
    FOR escola_record IN SELECT id FROM escolas ORDER BY id LOOP
        contador := contador + 1;
        
        IF contador % 3 = 1 THEN
            UPDATE escolas SET tenant_id = tenant_a_id WHERE id = escola_record.id;
        ELSIF contador % 3 = 2 THEN
            UPDATE escolas SET tenant_id = tenant_b_id WHERE id = escola_record.id;
        ELSE
            UPDATE escolas SET tenant_id = tenant_c_id WHERE id = escola_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Escolas distribuídas entre % tenants', 3;
END $$;

-- 4. Atualizar ESTOQUE baseado na combinação escola + produto
-- Só manter estoque onde escola e produto pertencem ao mesmo tenant
UPDATE estoque_escolas 
SET tenant_id = e.tenant_id
FROM escolas e, produtos p
WHERE estoque_escolas.escola_id = e.id 
  AND estoque_escolas.produto_id = p.id
  AND e.tenant_id = p.tenant_id;

-- Remover estoque onde escola e produto são de tenants diferentes
DELETE FROM estoque_escolas 
WHERE id IN (
    SELECT ee.id 
    FROM estoque_escolas ee
    JOIN escolas e ON e.id = ee.escola_id
    JOIN produtos p ON p.id = ee.produto_id
    WHERE e.tenant_id != p.tenant_id
);

-- 5. Atualizar LOTES baseado na escola
UPDATE estoque_lotes 
SET tenant_id = e.tenant_id
FROM escolas e
WHERE estoque_lotes.escola_id = e.id;

-- 6. Atualizar HISTÓRICO baseado na escola
UPDATE estoque_escolas_historico 
SET tenant_id = e.tenant_id
FROM escolas e
WHERE estoque_escolas_historico.escola_id = e.id;

-- 7. Criar dados de estoque para cada tenant (para garantir que cada um tenha dados)
DO $$
DECLARE
    tenant_record RECORD;
    escola_record RECORD;
    produto_record RECORD;
BEGIN
    -- Para cada tenant
    FOR tenant_record IN SELECT id, name FROM tenants WHERE slug IN ('tenant-a', 'tenant-b', 'tenant-c') LOOP
        
        -- Para cada escola do tenant
        FOR escola_record IN SELECT id FROM escolas WHERE tenant_id = tenant_record.id LIMIT 2 LOOP
            
            -- Para cada produto do tenant
            FOR produto_record IN SELECT id FROM produtos WHERE tenant_id = tenant_record.id LIMIT 3 LOOP
                
                -- Criar estoque se não existir
                INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual, tenant_id)
                VALUES (escola_record.id, produto_record.id, (RANDOM() * 100 + 10)::numeric, tenant_record.id)
                ON CONFLICT (escola_id, produto_id) DO UPDATE SET
                    quantidade_atual = EXCLUDED.quantidade_atual,
                    tenant_id = EXCLUDED.tenant_id;
                    
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Estoque criado para tenant: %', tenant_record.name;
    END LOOP;
END $$;

-- 8. Mostrar resultado da distribuição
SELECT 
    'RESULTADO DA DISTRIBUIÇÃO' as info,
    t.name as tenant_name,
    COUNT(DISTINCT p.id) as produtos,
    COUNT(DISTINCT e.id) as escolas,
    COUNT(DISTINCT ee.id) as itens_estoque
FROM tenants t
LEFT JOIN produtos p ON p.tenant_id = t.id
LEFT JOIN escolas e ON e.tenant_id = t.id
LEFT JOIN estoque_escolas ee ON ee.tenant_id = t.id
WHERE t.slug IN ('tenant-a', 'tenant-b', 'tenant-c')
GROUP BY t.id, t.name
ORDER BY t.name;

-- 9. Verificar isolamento
SELECT 
    'VERIFICAÇÃO DE ISOLAMENTO' as info,
    COUNT(DISTINCT p.tenant_id) as tenants_com_produtos,
    COUNT(DISTINCT e.tenant_id) as tenants_com_escolas,
    CASE 
        WHEN COUNT(DISTINCT p.tenant_id) > 1 AND COUNT(DISTINCT e.tenant_id) > 1 
        THEN '✅ ISOLAMENTO CRIADO COM SUCESSO!'
        ELSE '❌ AINDA SEM ISOLAMENTO'
    END as status
FROM produtos p
CROSS JOIN escolas e
WHERE p.tenant_id IS NOT NULL AND e.tenant_id IS NOT NULL;

COMMIT;

-- 10. Instruções finais
SELECT 
    'PRÓXIMOS PASSOS' as info,
    'Agora você deve ver dados diferentes para cada tenant!' as resultado,
    'Use o TenantSelector para alternar entre: Supermercado Norte, Sul e Centro' as como_testar;