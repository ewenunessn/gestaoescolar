-- ATUALIZAÇÃO DA ESTRUTURA DO BANCO NEON PARA MULTI-TENANT E MIGRAÇÃO DE DADOS
-- Este script atualiza a estrutura do banco Neon com tenant isolation
-- E migra todos os dados existentes para um tenant padrão

-- 1. CRIAR TENANT PADRÃO (executar primeiro)
INSERT INTO tenants (id, nome, slug, cnpj, email, status, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Escola Padrão',
    'escola-padrao',
    '00000000000000',
    'admin@escola.padrao',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    slug = EXCLUDED.slug,
    cnpj = EXCLUDED.cnpj,
    email = EXCLUDED.email,
    status = EXCLUDED.status,
    updated_at = NOW();

-- 2. ATUALIZAR TODAS AS TABELAS COM TENANT_ID PADRÃO
-- Atualizar apenas registros que não têm tenant_id
DO $$
DECLARE
    tabela TEXT;
    total_atualizados INTEGER;
BEGIN
    -- Lista de tabelas para atualizar
    FOREACH tabela IN ARRAY ARRAY[
        'escolas', 'produtos', 'usuarios', 'fornecedores', 'contratos', 'modalidades',
        'refeicoes', 'cardapios', 'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico',
        'estoque_movimentacoes', 'estoque_alertas', 'pedidos', 'pedido_itens', 'guias',
        'guia_produto_escola', 'demandas', 'escola_modalidades', 'escolas_modalidades',
        'contrato_produtos', 'contrato_produtos_modalidades', 'cardapio_refeicoes',
        'refeicao_produtos', 'faturamentos', 'faturamento_itens'
    ]
    LOOP
        EXECUTE format('
            UPDATE %I 
            SET tenant_id = ''00000000-0000-0000-0000-000000000001''
            WHERE tenant_id IS NULL;
        ', tabela);
        
        GET DIAGNOSTICS total_atualizados = ROW_COUNT;
        RAISE NOTICE 'Tabela %: % registros atualizados com tenant_id padrão', tabela, total_atualizados;
    END LOOP;
END $$;

-- 3. VERIFICAR MIGRAÇÃO
SELECT 
    'escolas' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000001') as tenant_padrao
FROM escolas
UNION ALL
SELECT 
    'produtos' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000001') as tenant_padrao
FROM produtos
UNION ALL
SELECT 
    'usuarios' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000001') as tenant_padrao
FROM usuarios
UNION ALL
SELECT 
    'fornecedores' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000001') as tenant_padrao
FROM fornecedores
UNION ALL
SELECT 
    'contratos' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000001') as tenant_padrao
FROM contratos
ORDER BY tabela;