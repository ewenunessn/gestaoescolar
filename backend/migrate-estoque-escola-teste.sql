-- Migração para mover todos os dados de estoque para o tenant "Escola de Teste"
-- Execute este script no seu banco de dados PostgreSQL

BEGIN;

-- 1. Criar o tenant "Escola de Teste" se não existir
INSERT INTO tenants (
    slug, 
    name, 
    subdomain, 
    status, 
    settings, 
    limits,
    created_at,
    updated_at
) VALUES (
    'escola-de-teste',
    'Escola de Teste',
    'escola-teste',
    'active',
    '{
        "features": {
            "inventory": true,
            "contracts": true,
            "deliveries": true,
            "reports": true
        },
        "branding": {
            "primaryColor": "#2e7d32",
            "secondaryColor": "#ff9800"
        }
    }',
    '{
        "maxUsers": 100,
        "maxSchools": 50,
        "maxProducts": 1000,
        "storageLimit": 5120,
        "apiRateLimit": 500
    }',
    NOW(),
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- 2. Obter o ID do tenant "Escola de Teste"
DO $$
DECLARE
    escola_teste_tenant_id UUID;
BEGIN
    -- Buscar o ID do tenant
    SELECT id INTO escola_teste_tenant_id 
    FROM tenants 
    WHERE slug = 'escola-de-teste';
    
    -- Verificar se encontrou o tenant
    IF escola_teste_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant "Escola de Teste" não encontrado!';
    END IF;
    
    RAISE NOTICE 'Tenant "Escola de Teste" ID: %', escola_teste_tenant_id;
    
    -- 3. Adicionar colunas tenant_id se não existirem
    BEGIN
        ALTER TABLE estoque_escolas ADD COLUMN tenant_id UUID;
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Coluna tenant_id já existe em estoque_escolas';
    END;
    
    BEGIN
        ALTER TABLE estoque_lotes ADD COLUMN tenant_id UUID;
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Coluna tenant_id já existe em estoque_lotes';
    END;
    
    BEGIN
        ALTER TABLE estoque_escolas_historico ADD COLUMN tenant_id UUID;
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Coluna tenant_id já existe em estoque_escolas_historico';
    END;
    
    -- 4. Migrar todas as escolas para o tenant "Escola de Teste"
    UPDATE escolas 
    SET tenant_id = escola_teste_tenant_id 
    WHERE tenant_id IS NULL OR tenant_id != escola_teste_tenant_id;
    
    RAISE NOTICE 'Escolas migradas para tenant "Escola de Teste"';
    
    -- 5. Migrar todos os produtos para o tenant "Escola de Teste"
    BEGIN
        ALTER TABLE produtos ADD COLUMN tenant_id UUID;
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Coluna tenant_id já existe em produtos';
    END;
    
    UPDATE produtos 
    SET tenant_id = escola_teste_tenant_id 
    WHERE tenant_id IS NULL OR tenant_id != escola_teste_tenant_id;
    
    RAISE NOTICE 'Produtos migrados para tenant "Escola de Teste"';
    
    -- 6. Migrar dados de estoque_escolas
    UPDATE estoque_escolas 
    SET tenant_id = escola_teste_tenant_id 
    WHERE tenant_id IS NULL OR tenant_id != escola_teste_tenant_id;
    
    RAISE NOTICE 'Registros de estoque_escolas migrados';
    
    -- 7. Migrar dados de estoque_lotes
    UPDATE estoque_lotes 
    SET tenant_id = escola_teste_tenant_id 
    WHERE tenant_id IS NULL OR tenant_id != escola_teste_tenant_id;
    
    RAISE NOTICE 'Registros de estoque_lotes migrados';
    
    -- 8. Migrar dados de estoque_escolas_historico
    UPDATE estoque_escolas_historico 
    SET tenant_id = escola_teste_tenant_id 
    WHERE tenant_id IS NULL OR tenant_id != escola_teste_tenant_id;
    
    RAISE NOTICE 'Registros de estoque_escolas_historico migrados';
    
END $$;

-- 9. Criar índices otimizados
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola ON estoque_escolas(tenant_id, escola_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_produto ON estoque_escolas(tenant_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola_produto ON estoque_escolas(tenant_id, escola_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_produto ON estoque_lotes(tenant_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_escola ON estoque_lotes(tenant_id, escola_id);
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_validade ON estoque_lotes(tenant_id, data_validade) WHERE data_validade IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_historico_tenant_escola ON estoque_escolas_historico(tenant_id, escola_id);
CREATE INDEX IF NOT EXISTS idx_estoque_historico_tenant_produto ON estoque_escolas_historico(tenant_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_historico_tenant_data ON estoque_escolas_historico(tenant_id, data_movimentacao);

-- 10. Criar função para definir tenant_id automaticamente
CREATE OR REPLACE FUNCTION set_tenant_id_estoque_escola_teste()
RETURNS TRIGGER AS $$
DECLARE
    escola_teste_tenant_id UUID;
BEGIN
    -- Buscar o ID do tenant "Escola de Teste"
    SELECT id INTO escola_teste_tenant_id 
    FROM tenants 
    WHERE slug = 'escola-de-teste';
    
    -- Se tenant_id não foi definido, usar o tenant "Escola de Teste"
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := escola_teste_tenant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Aplicar triggers nas tabelas
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_escolas ON estoque_escolas;
CREATE TRIGGER trigger_set_tenant_id_estoque_escolas
    BEFORE INSERT ON estoque_escolas
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_estoque_escola_teste();

DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_lotes ON estoque_lotes;
CREATE TRIGGER trigger_set_tenant_id_estoque_lotes
    BEFORE INSERT ON estoque_lotes
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_estoque_escola_teste();

DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_historico ON estoque_escolas_historico;
CREATE TRIGGER trigger_set_tenant_id_estoque_historico
    BEFORE INSERT ON estoque_escolas_historico
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_estoque_escola_teste();

-- 12. Mostrar resumo da migração
DO $$
DECLARE
    escola_teste_tenant_id UUID;
    total_estoque_escolas INTEGER;
    total_estoque_lotes INTEGER;
    total_estoque_historico INTEGER;
    total_escolas INTEGER;
    total_produtos INTEGER;
BEGIN
    -- Buscar o ID do tenant
    SELECT id INTO escola_teste_tenant_id 
    FROM tenants 
    WHERE slug = 'escola-de-teste';
    
    -- Contar registros migrados
    SELECT COUNT(*) INTO total_estoque_escolas 
    FROM estoque_escolas 
    WHERE tenant_id = escola_teste_tenant_id;
    
    SELECT COUNT(*) INTO total_estoque_lotes 
    FROM estoque_lotes 
    WHERE tenant_id = escola_teste_tenant_id;
    
    SELECT COUNT(*) INTO total_estoque_historico 
    FROM estoque_escolas_historico 
    WHERE tenant_id = escola_teste_tenant_id;
    
    SELECT COUNT(*) INTO total_escolas 
    FROM escolas 
    WHERE tenant_id = escola_teste_tenant_id;
    
    SELECT COUNT(*) INTO total_produtos 
    FROM produtos 
    WHERE tenant_id = escola_teste_tenant_id;
    
    -- Mostrar resumo
    RAISE NOTICE '=== RESUMO DA MIGRAÇÃO ===';
    RAISE NOTICE 'Tenant "Escola de Teste" ID: %', escola_teste_tenant_id;
    RAISE NOTICE 'Escolas migradas: %', total_escolas;
    RAISE NOTICE 'Produtos migrados: %', total_produtos;
    RAISE NOTICE 'Registros estoque_escolas: %', total_estoque_escolas;
    RAISE NOTICE 'Registros estoque_lotes: %', total_estoque_lotes;
    RAISE NOTICE 'Registros estoque_historico: %', total_estoque_historico;
    RAISE NOTICE '=== MIGRAÇÃO CONCLUÍDA ===';
END $$;

COMMIT;