-- Script para corrigir diferenças estruturais entre banco local e Neon

-- 1. Adicionar coluna tenant_id na tabela institutions (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institutions' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE institutions ADD COLUMN tenant_id UUID;
        RAISE NOTICE 'Coluna tenant_id adicionada à tabela institutions';
    ELSE
        RAISE NOTICE 'Coluna tenant_id já existe na tabela institutions';
    END IF;
END $$;

-- 2. Verificar tipo da coluna id em tenant_users
-- NOTA: Não vamos alterar o tipo, pois isso pode quebrar dados existentes
-- O sistema deve ser compatível com ambos os tipos (integer e UUID)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenant_users' 
        AND column_name = 'id'
        AND data_type = 'integer'
    ) THEN
        RAISE NOTICE 'Tabela tenant_users usa id INTEGER - mantendo para compatibilidade';
    ELSE
        RAISE NOTICE 'Tabela tenant_users usa id UUID';
    END IF;
END $$;

-- 3. Verificar estrutura da tabela tenants
-- Remover colunas extras que não existem no local (se necessário)
DO $$ 
BEGIN
    -- Verificar se as colunas extras existem
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        AND column_name IN ('cnpj', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'logo_url', 'config')
    ) THEN
        RAISE NOTICE 'Tabela tenants tem colunas extras - mantendo para compatibilidade';
        -- Não vamos remover, apenas adicionar as que faltam
    END IF;
    
    -- Adicionar colunas que faltam
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        AND column_name = 'domain'
    ) THEN
        ALTER TABLE tenants ADD COLUMN domain VARCHAR(255);
        RAISE NOTICE 'Coluna domain adicionada à tabela tenants';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        AND column_name = 'subdomain'
    ) THEN
        ALTER TABLE tenants ADD COLUMN subdomain VARCHAR(255);
        RAISE NOTICE 'Coluna subdomain adicionada à tabela tenants';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        AND column_name = 'settings'
    ) THEN
        ALTER TABLE tenants ADD COLUMN settings JSONB DEFAULT '{}';
        RAISE NOTICE 'Coluna settings adicionada à tabela tenants';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        AND column_name = 'limits'
    ) THEN
        ALTER TABLE tenants ADD COLUMN limits JSONB DEFAULT '{}';
        RAISE NOTICE 'Coluna limits adicionada à tabela tenants';
    END IF;
END $$;

-- 4. Verificar índices importantes
CREATE INDEX IF NOT EXISTS idx_institutions_tenant_id ON institutions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_institution_id ON tenants(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_users_institution_id ON institution_users(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_users_user_id ON institution_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);

-- 5. Verificar constraints
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_institution_id_fkey;
ALTER TABLE tenants ADD CONSTRAINT tenants_institution_id_fkey 
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

ALTER TABLE institution_users DROP CONSTRAINT IF EXISTS institution_users_institution_id_fkey;
ALTER TABLE institution_users ADD CONSTRAINT institution_users_institution_id_fkey 
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

ALTER TABLE institution_users DROP CONSTRAINT IF EXISTS institution_users_user_id_fkey;
ALTER TABLE institution_users ADD CONSTRAINT institution_users_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE tenant_users DROP CONSTRAINT IF EXISTS tenant_users_tenant_id_fkey;
ALTER TABLE tenant_users ADD CONSTRAINT tenant_users_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE tenant_users DROP CONSTRAINT IF EXISTS tenant_users_user_id_fkey;
ALTER TABLE tenant_users ADD CONSTRAINT tenant_users_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;

-- Verificação final
SELECT 
    'institutions' as tabela,
    COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_name = 'institutions'
UNION ALL
SELECT 
    'tenants' as tabela,
    COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_name = 'tenants'
UNION ALL
SELECT 
    'institution_users' as tabela,
    COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_name = 'institution_users'
UNION ALL
SELECT 
    'tenant_users' as tabela,
    COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_name = 'tenant_users';
