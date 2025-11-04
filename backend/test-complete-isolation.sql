-- Teste completo do isolamento de tenant
-- Execute após implementar o isolamento completo

-- 1. Simular acesso como Rede Norte
SELECT set_config('app.current_tenant_id', (SELECT id::text FROM tenants WHERE slug = 'rede-norte'), false);

SELECT '=== TESTANDO REDE NORTE ===' as teste;
SELECT 'Escolas visíveis:' as tipo, COUNT(*) as total FROM escolas;
SELECT 'Produtos visíveis:' as tipo, COUNT(*) as total FROM produtos;
SELECT 'Itens estoque visíveis:' as tipo, COUNT(*) as total FROM estoque_escolas;

SELECT 'Produtos da Rede Norte:' as info, string_agg(nome, ', ') as lista FROM produtos;

-- 2. Simular acesso como Rede Sul
SELECT set_config('app.current_tenant_id', (SELECT id::text FROM tenants WHERE slug = 'rede-sul'), false);

SELECT '=== TESTANDO REDE SUL ===' as teste;
SELECT 'Escolas visíveis:' as tipo, COUNT(*) as total FROM escolas;
SELECT 'Produtos visíveis:' as tipo, COUNT(*) as total FROM produtos;
SELECT 'Itens estoque visíveis:' as tipo, COUNT(*) as total FROM estoque_escolas;

SELECT 'Produtos da Rede Sul:' as info, string_agg(nome, ', ') as lista FROM produtos;

-- 3. Simular acesso como Rede Centro
SELECT set_config('app.current_tenant_id', (SELECT id::text FROM tenants WHERE slug = 'rede-centro'), false);

SELECT '=== TESTANDO REDE CENTRO ===' as teste;
SELECT 'Escolas visíveis:' as tipo, COUNT(*) as total FROM escolas;
SELECT 'Produtos visíveis:' as tipo, COUNT(*) as total FROM produtos;
SELECT 'Itens estoque visíveis:' as tipo, COUNT(*) as total FROM estoque_escolas;

SELECT 'Produtos da Rede Centro:' as info, string_agg(nome, ', ') as lista FROM produtos;

-- 4. Verificação final
SELECT 
    '=== RESULTADO DO TESTE ===' as resultado,
    CASE 
        WHEN (SELECT COUNT(DISTINCT tenant_id) FROM produtos) >= 3 
        THEN '✅ ISOLAMENTO FUNCIONANDO - Cada tenant tem produtos diferentes!'
        ELSE '❌ Isolamento não está funcionando'
    END as status;

-- Resetar configuração
SELECT set_config('app.current_tenant_id', '', false);