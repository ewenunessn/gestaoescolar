-- Migration: Fix RLS policies (create only if not exists)
-- Description: Creates RLS policies safely, checking if they already exist
-- Date: 2025-01-27

-- Drop existing policies if they exist to recreate them properly
DO $$
DECLARE
    policy_name TEXT;
    table_name TEXT;
    policies TEXT[] := ARRAY[
        'tenant_isolation_escolas:escolas',
        'tenant_isolation_produtos:produtos',
        'tenant_isolation_usuarios:usuarios',
        'tenant_isolation_fornecedores:fornecedores',
        'tenant_isolation_contratos:contratos',
        'tenant_isolation_modalidades:modalidades',
        'tenant_isolation_refeicoes:refeicoes',
        'tenant_isolation_cardapios:cardapios',
        'tenant_isolation_estoque_escolas:estoque_escolas',
        'tenant_isolation_estoque_lotes:estoque_lotes',
        'tenant_isolation_estoque_escolas_historico:estoque_escolas_historico',
        'tenant_isolation_estoque_movimentacoes:estoque_movimentacoes',
        'tenant_isolation_estoque_alertas:estoque_alertas',
        'tenant_isolation_pedidos:pedidos',
        'tenant_isolation_pedido_itens:pedido_itens',
        'tenant_isolation_guias:guias',
        'tenant_isolation_guia_produto_escola:guia_produto_escola',
        'tenant_isolation_demandas:demandas',
        'tenant_isolation_escola_modalidades:escola_modalidades',
        'tenant_isolation_escolas_modalidades:escolas_modalidades',
        'tenant_isolation_contrato_produtos:contrato_produtos',
        'tenant_isolation_contrato_produtos_modalidades:contrato_produtos_modalidades',
        'tenant_isolation_cardapio_refeicoes:cardapio_refeicoes',
        'tenant_isolation_refeicao_produtos:refeicao_produtos',
        'tenant_isolation_faturamentos:faturamentos',
        'tenant_isolation_faturamento_itens:faturamento_itens'
    ];
    policy_table TEXT[];
BEGIN
    FOREACH policy_table SLICE 1 IN ARRAY policies
    LOOP
        policy_name := split_part(policy_table[1], ':', 1);
        table_name := split_part(policy_table[1], ':', 2);
        
        -- Drop policy if exists
        IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = table_name 
            AND policyname = policy_name
        ) THEN
            EXECUTE format('DROP POLICY %I ON %I', policy_name, table_name);
            RAISE NOTICE 'Dropped existing policy % on table %', policy_name, table_name;
        END IF;
    END LOOP;
END $$;

-- Enable Row Level Security on all multi-tenant tables
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

-- Create RLS policies for tenant isolation
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

-- Create or replace functions
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Validate that the tenant exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = tenant_uuid AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Invalid or inactive tenant: %', tenant_uuid;
    END IF;
    
    -- Set the tenant context
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

-- Create or replace view
DROP VIEW IF EXISTS rls_status;
CREATE VIEW rls_status AS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
    AND tablename IN (
        'escolas', 'produtos', 'usuarios', 'fornecedores', 'contratos', 'modalidades',
        'refeicoes', 'cardapios', 'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico',
        'estoque_movimentacoes', 'estoque_alertas', 'pedidos', 'pedido_itens', 'guias',
        'guia_produto_escola', 'demandas', 'escola_modalidades', 'escolas_modalidades',
        'contrato_produtos', 'contrato_produtos_modalidades', 'cardapio_refeicoes',
        'refeicao_produtos', 'faturamentos', 'faturamento_itens'
    )
ORDER BY tablename;

-- Grant permissions
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION clear_tenant_context() TO PUBLIC;
GRANT SELECT ON rls_status TO PUBLIC;

-- Set default tenant context
SELECT set_tenant_context('00000000-0000-0000-0000-000000000000');