-- Migração para adicionar tenant_id às tabelas de estoque
-- Data: 2025-11-02

BEGIN;

-- 1. Verificar se as tabelas existem antes de alterar
DO $$
BEGIN
    -- Adicionar tenant_id às tabelas de estoque se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'estoque_escolas' AND column_name = 'tenant_id') THEN
        ALTER TABLE estoque_escolas ADD COLUMN tenant_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'estoque_lotes' AND column_name = 'tenant_id') THEN
        ALTER TABLE estoque_lotes ADD COLUMN tenant_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'estoque_escolas_historico' AND column_name = 'tenant_id') THEN
        ALTER TABLE estoque_escolas_historico ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- 2. Usar o tenant padrão que já existe (Sistema Principal)

-- 3. Atualizar tenant_id baseado na escola ou usar tenant padrão
UPDATE estoque_escolas 
SET tenant_id = COALESCE(
    (SELECT tenant_id FROM escolas WHERE id = estoque_escolas.escola_id),
    '00000000-0000-0000-0000-000000000000'::uuid
)
WHERE tenant_id IS NULL;

UPDATE estoque_lotes 
SET tenant_id = COALESCE(
    (SELECT tenant_id FROM escolas WHERE id = estoque_lotes.escola_id),
    '00000000-0000-0000-0000-000000000000'::uuid
)
WHERE tenant_id IS NULL;

UPDATE estoque_escolas_historico 
SET tenant_id = COALESCE(
    (SELECT tenant_id FROM escolas WHERE id = estoque_escolas_historico.escola_id),
    '00000000-0000-0000-0000-000000000000'::uuid
)
WHERE tenant_id IS NULL;

-- 4. Criar índices compostos com tenant_id para performance
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola ON estoque_escolas(tenant_id, escola_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_produto ON estoque_escolas(tenant_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola_produto ON estoque_escolas(tenant_id, escola_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_produto ON estoque_lotes(tenant_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_escola ON estoque_lotes(tenant_id, escola_id);
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_validade ON estoque_lotes(tenant_id, data_validade) WHERE data_validade IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_historico_tenant_escola ON estoque_escolas_historico(tenant_id, escola_id);
CREATE INDEX IF NOT EXISTS idx_estoque_historico_tenant_produto ON estoque_escolas_historico(tenant_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_historico_tenant_data ON estoque_escolas_historico(tenant_id, data_movimentacao);

-- 5. Criar função para definir tenant_id automaticamente
CREATE OR REPLACE FUNCTION set_tenant_id_estoque()
RETURNS TRIGGER AS $$
BEGIN
    -- Se tenant_id não foi definido, pegar da escola
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id 
        FROM escolas 
        WHERE id = NEW.escola_id;
        
        -- Se ainda não encontrou, usar tenant padrão
        IF NEW.tenant_id IS NULL THEN
            NEW.tenant_id := '00000000-0000-0000-0000-000000000000'::uuid;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Aplicar triggers nas tabelas
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_escolas ON estoque_escolas;
CREATE TRIGGER trigger_set_tenant_id_estoque_escolas
    BEFORE INSERT ON estoque_escolas
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_estoque();

DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_lotes ON estoque_lotes;
CREATE TRIGGER trigger_set_tenant_id_estoque_lotes
    BEFORE INSERT ON estoque_lotes
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_estoque();

DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_historico ON estoque_escolas_historico;
CREATE TRIGGER trigger_set_tenant_id_estoque_historico
    BEFORE INSERT ON estoque_escolas_historico
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_estoque();

COMMIT;