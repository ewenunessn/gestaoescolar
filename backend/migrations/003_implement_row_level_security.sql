-- Migration: Implement Row Level Security (RLS) for multi-tenant isolation
-- Description: Enables RLS and creates policies for tenant isolation
-- Date: 2025-01-27

-- Enable Row Level Security on all multi-tenant tables
-- This ensures that users can only see data from their own tenant

-- Core business tables
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapios ENABLE ROW LEVEL SECURITY;

-- Estoque tables
ALTER TABLE estoque_escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_alertas ENABLE ROW LEVEL SECURITY;

-- Pedidos tables
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;

-- Guias tables
ALTER TABLE guias ENABLE ROW LEVEL SECURITY;
ALTER TABLE guia_produto_escola ENABLE ROW LEVEL SECURITY;

-- Demandas tables
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;

-- Relationship tables
ALTER TABLE escola_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE escolas_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_produtos_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapio_refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE refeicao_produtos ENABLE ROW LEVEL SECURITY;

-- Faturamento tables
ALTER TABLE faturamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento_itens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
-- These policies ensure that users can only access data from their own tenant

-- Policy for ESCOLAS (Schools)
CREATE POLICY tenant_isolation_escolas ON escolas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy for PRODUTOS (Products)
CREATE POLICY tenant_isolation_produtos ON produtos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy for USUARIOS (Users)
CREATE POLICY tenant_isolation_usuarios ON usuarios
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy for FORNECEDORES (Suppliers)
CREATE POLICY tenant_isolation_fornecedores ON fornecedores
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy for CONTRATOS (Contracts)
CREATE POLICY tenant_isolation_contratos ON contratos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy for MODALIDADES (Modalities)
CREATE POLICY tenant_isolation_modalidades ON modalidades
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy for REFEICOES (Meals)
CREATE POLICY tenant_isolation_refeicoes ON refeicoes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy for CARDAPIOS (Menus)
CREATE POLICY tenant_isolation_cardapios ON cardapios
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policies for ESTOQUE tables
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

-- Policies for PEDIDOS tables
CREATE POLICY tenant_isolation_pedidos ON pedidos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_pedido_itens ON pedido_itens
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policies for GUIAS tables
CREATE POLICY tenant_isolation_guias ON guias
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_guia_produto_escola ON guia_produto_escola
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy for DEMANDAS
CREATE POLICY tenant_isolation_demandas ON demandas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policies for relationship tables
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

-- Policies for FATURAMENTO tables
CREATE POLICY tenant_isolation_faturamentos ON faturamentos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_faturamento_itens ON faturamento_itens
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Create a function to set tenant context safely
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

-- Create a function to get current tenant context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', '', false);
END;
$$ LANGUAGE plpgsql;

-- Create a view to check RLS status
CREATE OR REPLACE VIEW rls_status AS
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

-- Grant necessary permissions
-- Allow the application user to use the tenant functions
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION clear_tenant_context() TO PUBLIC;

-- Allow viewing RLS status
GRANT SELECT ON rls_status TO PUBLIC;

-- Comments for documentation
COMMENT ON FUNCTION set_tenant_context(UUID) IS 'Sets the tenant context for the current session. Validates tenant exists and is active.';
COMMENT ON FUNCTION get_current_tenant_id() IS 'Returns the current tenant ID from session context, or NULL if not set.';
COMMENT ON FUNCTION clear_tenant_context() IS 'Clears the tenant context from the current session.';
COMMENT ON VIEW rls_status IS 'Shows RLS status and policy count for all multi-tenant tables.';

-- Set default tenant context for existing sessions
-- This ensures that existing data is accessible during the transition
SELECT set_tenant_context('00000000-0000-0000-0000-000000000000');