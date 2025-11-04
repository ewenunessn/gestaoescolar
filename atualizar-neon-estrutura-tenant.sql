-- ATUALIZAÇÃO DA ESTRUTURA DO BANCO NEON PARA MULTI-TENANT
-- Este script atualiza a estrutura do banco Neon com tenant isolation
-- Sem enviar dados, apenas estrutura

-- 1. CRIAR TABELA DE TENANTS (se não existir)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    cnpj VARCHAR(14),
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(8),
    logo_url TEXT,
    config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tenants
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_cnpj ON tenants(cnpj);

-- 2. ADICIONAR COLUNA TENANT_ID ÀS TABELAS EXISTENTES
-- Verificar e adicionar tenant_id apenas se a coluna não existir

DO $$
DECLARE
    tabela TEXT;
    coluna_existe BOOLEAN;
BEGIN
    -- Lista de tabelas que devem ter tenant_id
    FOREACH tabela IN ARRAY ARRAY[
        'escolas', 'produtos', 'usuarios', 'fornecedores', 'contratos', 'modalidades',
        'refeicoes', 'cardapios', 'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico',
        'estoque_movimentacoes', 'estoque_alertas', 'pedidos', 'pedido_itens', 'guias',
        'guia_produto_escola', 'demandas', 'escola_modalidades', 'escolas_modalidades',
        'contrato_produtos', 'contrato_produtos_modalidades', 'cardapio_refeicoes',
        'refeicao_produtos', 'faturamentos', 'faturamento_itens'
    ]
    LOOP
        -- Verificar se a coluna tenant_id já existe
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = tabela AND column_name = 'tenant_id'
        ) INTO coluna_existe;
        
        IF NOT coluna_existe THEN
            EXECUTE format('
                ALTER TABLE %I ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
                CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON %I(tenant_id);
            ', tabela, tabela, tabela);
            
            RAISE NOTICE 'Adicionada coluna tenant_id à tabela %', tabela;
        ELSE
            RAISE NOTICE 'Coluna tenant_id já existe na tabela %', tabela;
        END IF;
    END LOOP;
END $$;

-- 3. CRIAR ÍNDICES COMPOSTOS PARA MELHOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_escolas_tenant_nome ON escolas(tenant_id, nome);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_nome ON produtos(tenant_id, nome);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_categoria ON produtos(tenant_id, categoria);
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_email ON usuarios(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_fornecedores_tenant_nome ON fornecedores(tenant_id, nome);
CREATE INDEX IF NOT EXISTS idx_contratos_tenant_numero ON contratos(tenant_id, numero);
CREATE INDEX IF NOT EXISTS idx_contratos_tenant_status ON contratos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_modalidades_tenant_nome ON modalidades(tenant_id, nome);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola_produto ON estoque_escolas(tenant_id, escola_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_status ON pedidos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_data ON pedidos(tenant_id, created_at);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS) NAS TABELAS
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapios ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE guias ENABLE ROW LEVEL SECURITY;
ALTER TABLE guia_produto_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE escola_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE escolas_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_produtos_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapio_refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE refeicao_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento_itens ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR POLÍTICAS DE ISOLAMENTO DE TENANT
-- Dropar políticas existentes antes de recriar
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' AND policyname LIKE 'tenant_isolation_%'
    LOOP
        EXECUTE format('DROP POLICY %I ON %I', policy_record.policyname, policy_record.tablename);
        RAISE NOTICE 'Política % removida da tabela %', policy_record.policyname, policy_record.tablename;
    END LOOP;
END $$;

-- Criar políticas de isolamento
CREATE POLICY tenant_isolation_escolas ON escolas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_produtos ON produtos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_usuarios ON usuarios
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_fornecedores ON fornecedores
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_contratos ON contratos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_modalidades ON modalidades
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_refeicoes ON refeicoes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_cardapios ON cardapios
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_estoque_escolas ON estoque_escolas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_estoque_lotes ON estoque_lotes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_estoque_escolas_historico ON estoque_escolas_historico
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_estoque_movimentacoes ON estoque_movimentacoes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_estoque_alertas ON estoque_alertas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_pedidos ON pedidos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_pedido_itens ON pedido_itens
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_guias ON guias
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_guia_produto_escola ON guia_produto_escola
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_demandas ON demandas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_escola_modalidades ON escola_modalidades
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_escolas_modalidades ON escolas_modalidades
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_contrato_produtos ON contrato_produtos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_contrato_produtos_modalidades ON contrato_produtos_modalidades
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_cardapio_refeicoes ON cardapio_refeicoes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_refeicao_produtos ON refeicao_produtos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_faturamentos ON faturamentos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_faturamento_itens ON faturamento_itens
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 6. CRIAR FUNÇÕES DE CONTEXTO DE TENANT
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Validar que o tenant existe e está ativo
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = tenant_uuid AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Tenant inválido ou inativo: %', tenant_uuid;
    END IF;
    
    -- Definir o contexto do tenant
    PERFORM set_config('app.current_tenant_id', tenant_uuid::TEXT, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', '', false);
END;
$$ LANGUAGE plpgsql;

-- 7. CRIAR VIEW PARA MONITORAMENTO DE TENANTS
CREATE OR REPLACE VIEW view_tenant_summary AS
SELECT 
    t.id,
    t.nome,
    t.slug,
    t.status,
    t.created_at,
    COUNT(DISTINCT e.id) as total_escolas,
    COUNT(DISTINCT p.id) as total_produtos,
    COUNT(DISTINCT u.id) as total_usuarios,
    COUNT(DISTINCT f.id) as total_fornecedores,
    COUNT(DISTINCT c.id) as total_contratos
FROM tenants t
LEFT JOIN escolas e ON e.tenant_id = t.id
LEFT JOIN produtos p ON p.tenant_id = t.id
LEFT JOIN usuarios u ON u.tenant_id = t.id
LEFT JOIN fornecedores f ON f.tenant_id = t.id
LEFT JOIN contratos c ON c.tenant_id = t.id
GROUP BY t.id, t.nome, t.slug, t.status, t.created_at;

-- 8. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON TABLE tenants IS 'Tabela principal de tenants - multi-tenant isolation';
COMMENT ON COLUMN escolas.tenant_id IS 'Isolamento de tenant - vincula escola ao tenant específico';
COMMENT ON COLUMN produtos.tenant_id IS 'Isolamento de tenant - vincula produto ao tenant específico';
COMMENT ON COLUMN usuarios.tenant_id IS 'Isolamento de tenant - vincula usuário ao tenant específico';
COMMENT ON COLUMN contratos.tenant_id IS 'Isolamento de tenant - vincula contrato ao tenant específico';
COMMENT ON COLUMN modalidades.tenant_id IS 'Isolamento de tenant - vincula modalidade ao tenant específico';

-- 9. CRIAR TRIGGER PARA ATUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar trigger de updated_at para tenants
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionar constraint única para evitar duplicatas
ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS tenants_nome_unique UNIQUE (nome);
ALTER TABLE tenants ADD CONSTRAINT IF NOT EXISTS tenants_slug_unique UNIQUE (slug);

-- 10. CRIAR TENANT DEFAULT (se não existir)
INSERT INTO tenants (id, nome, slug, status, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Tenant', 'default', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 11. VERIFICAÇÃO FINAL
SELECT 
    'Estrutura de tenant atualizada com sucesso!' as mensagem,
    (SELECT COUNT(*) FROM tenants) as total_tenants,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE column_name = 'tenant_id' 
     AND table_name IN (
        'escolas', 'produtos', 'usuarios', 'fornecedores', 'contratos', 'modalidades',
        'refeicoes', 'cardapios', 'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico',
        'estoque_movimentacoes', 'estoque_alertas', 'pedidos', 'pedido_itens', 'guias',
        'guia_produto_escola', 'demandas', 'escola_modalidades', 'escolas_modalidades',
        'contrato_produtos', 'contrato_produtos_modalidades', 'cardapio_refeicoes',
        'refeicao_produtos', 'faturamentos', 'faturamento_itens'
     )) as tabelas_com_tenant_id;