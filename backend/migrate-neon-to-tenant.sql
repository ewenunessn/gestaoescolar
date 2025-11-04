-- ============================================================================
-- MIGRAÇÃO COMPLETA PARA MULTI-TENANT NO NEON
-- ============================================================================
-- Este script atualiza a estrutura do banco Neon para suportar multi-tenant
-- e migra todos os dados existentes para um tenant padrão
-- ============================================================================

-- Definir tenant padrão para dados existentes
\set default_tenant_id '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f'

BEGIN;

-- ============================================================================
-- 1. CRIAR TABELA DE TENANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    dominio VARCHAR(255),
    configuracoes JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir tenant padrão se não existir
INSERT INTO tenants (id, nome, slug, dominio, ativo)
VALUES (:'default_tenant_id', 'Sistema Principal', 'sistema-principal', 'localhost', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. ADICIONAR COLUNAS TENANT_ID ÀS TABELAS PRINCIPAIS
-- ============================================================================

-- Tabela usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela escolas
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela fornecedores
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela modalidades
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela cardapios
ALTER TABLE cardapios ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela refeicoes
ALTER TABLE refeicoes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela entregas
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- ============================================================================
-- 3. ADICIONAR COLUNAS TENANT_ID ÀS TABELAS DE ESTOQUE
-- ============================================================================

-- Tabela estoque_escolas
ALTER TABLE estoque_escolas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela estoque_lotes
ALTER TABLE estoque_lotes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Tabela estoque_escolas_historico
ALTER TABLE estoque_escolas_historico ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- ============================================================================
-- 4. ADICIONAR COLUNAS TENANT_ID ÀS TABELAS RELACIONAIS
-- ============================================================================

-- Tabelas de relacionamento
ALTER TABLE produto_composicao ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE modalidade_produtos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE cardapio_refeicoes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE refeicao_produtos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE entrega_itens ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- ============================================================================
-- 5. MIGRAR DADOS EXISTENTES PARA O TENANT PADRÃO
-- ============================================================================

-- Atualizar tabelas principais
UPDATE usuarios SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE escolas SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE produtos SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE fornecedores SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE contratos SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE modalidades SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE cardapios SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE refeicoes SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE pedidos SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE entregas SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;

-- Atualizar tabelas de estoque
UPDATE estoque_escolas SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE estoque_lotes SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE estoque_escolas_historico SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;

-- Atualizar tabelas relacionais
UPDATE produto_composicao SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE contrato_produtos SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE modalidade_produtos SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE cardapio_refeicoes SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE refeicao_produtos SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE pedido_itens SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;
UPDATE entrega_itens SET tenant_id = :'default_tenant_id' WHERE tenant_id IS NULL;

-- ============================================================================
-- 6. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para tenant_id nas tabelas principais
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_id ON usuarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escolas_tenant_id ON escolas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_id ON produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_tenant_id ON fornecedores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contratos_tenant_id ON contratos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_modalidades_tenant_id ON modalidades(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cardapios_tenant_id ON cardapios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refeicoes_tenant_id ON refeicoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_id ON pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entregas_tenant_id ON entregas(tenant_id);

-- Índices para estoque
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_id ON estoque_escolas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_id ON estoque_lotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_estoque_historico_tenant_id ON estoque_escolas_historico(tenant_id);

-- Índices compostos para queries otimizadas
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_produto ON estoque_escolas(tenant_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola ON estoque_escolas(tenant_id, escola_id);
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_produto ON estoque_lotes(tenant_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_ativo ON produtos(tenant_id, ativo);
CREATE INDEX IF NOT EXISTS idx_escolas_tenant_ativo ON escolas(tenant_id, ativo);

-- ============================================================================
-- 7. IMPLEMENTAR ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapios ENABLE ROW LEVEL SECURITY;
ALTER TABLE refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS nas tabelas de estoque
ALTER TABLE estoque_escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas_historico ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS (exemplo para algumas tabelas principais)
-- Nota: As políticas serão aplicadas quando o sistema de autenticação estiver configurado

-- ============================================================================
-- 8. CRIAR TABELAS DE AUDITORIA E MONITORAMENTO
-- ============================================================================

-- Tabela de auditoria de tenant
CREATE TABLE IF NOT EXISTS tenant_audit_log (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações por tenant
CREATE TABLE IF NOT EXISTS tenant_configurations (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, config_key)
);

-- ============================================================================
-- 9. CRIAR FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para obter tenant atual (será usada pelas políticas RLS)
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true)::UUID,
        '00000000-0000-0000-0000-000000000000'::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar se um tenant existe
CREATE OR REPLACE FUNCTION validate_tenant(tenant_uuid UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM tenants WHERE id = tenant_uuid AND ativo = true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. CRIAR TRIGGERS PARA AUDITORIA
-- ============================================================================

-- Função de trigger para auditoria
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO tenant_audit_log (tenant_id, action, table_name, record_id, new_values)
        VALUES (NEW.tenant_id, TG_OP, TG_TABLE_NAME, NEW.id::TEXT, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO tenant_audit_log (tenant_id, action, table_name, record_id, old_values, new_values)
        VALUES (NEW.tenant_id, TG_OP, TG_TABLE_NAME, NEW.id::TEXT, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO tenant_audit_log (tenant_id, action, table_name, record_id, old_values)
        VALUES (OLD.tenant_id, TG_OP, TG_TABLE_NAME, OLD.id::TEXT, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. VALIDAR INTEGRIDADE DOS DADOS
-- ============================================================================

-- Verificar se todos os registros têm tenant_id
DO $$
DECLARE
    table_name TEXT;
    count_without_tenant INTEGER;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY['usuarios', 'escolas', 'produtos', 'fornecedores', 'contratos', 
                           'modalidades', 'cardapios', 'refeicoes', 'pedidos', 'entregas',
                           'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico'])
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id IS NULL', table_name) INTO count_without_tenant;
        
        IF count_without_tenant > 0 THEN
            RAISE WARNING 'Tabela % tem % registros sem tenant_id', table_name, count_without_tenant;
        ELSE
            RAISE NOTICE 'Tabela % - OK: todos os registros têm tenant_id', table_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 12. CRIAR CONSTRAINTS PARA GARANTIR INTEGRIDADE
-- ============================================================================

-- Adicionar constraints NOT NULL para tenant_id (após migração)
-- Nota: Descomente estas linhas após confirmar que todos os dados foram migrados

-- ALTER TABLE usuarios ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE escolas ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE produtos ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE fornecedores ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE contratos ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE modalidades ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE cardapios ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE refeicoes ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE pedidos ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE entregas ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE estoque_escolas ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE estoque_lotes ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE estoque_escolas_historico ALTER COLUMN tenant_id SET NOT NULL;

COMMIT;

-- ============================================================================
-- RELATÓRIO FINAL
-- ============================================================================

SELECT 
    'MIGRAÇÃO CONCLUÍDA' as status,
    (SELECT COUNT(*) FROM tenants) as total_tenants,
    (SELECT COUNT(*) FROM usuarios WHERE tenant_id = :'default_tenant_id') as usuarios_migrados,
    (SELECT COUNT(*) FROM escolas WHERE tenant_id = :'default_tenant_id') as escolas_migradas,
    (SELECT COUNT(*) FROM produtos WHERE tenant_id = :'default_tenant_id') as produtos_migrados,
    (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id = :'default_tenant_id') as estoque_migrado;