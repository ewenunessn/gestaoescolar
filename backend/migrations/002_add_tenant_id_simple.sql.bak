-- Migration: Add tenant_id to existing tables (simplified)
-- Description: Adds tenant_id column to core tables that exist
-- Date: 2025-01-27

-- Add tenant_id to core business tables that actually exist

-- 1. ESCOLAS (Schools)
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_escolas_tenant_id ON escolas(tenant_id);

-- 2. PRODUTOS (Products)  
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_id ON produtos(tenant_id);

-- 3. USUARIOS (Users)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_id ON usuarios(tenant_id);

-- 4. FORNECEDORES (Suppliers)
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_fornecedores_tenant_id ON fornecedores(tenant_id);

-- 5. CONTRATOS (Contracts)
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contratos_tenant_id ON contratos(tenant_id);

-- 6. MODALIDADES (Modalities)
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_modalidades_tenant_id ON modalidades(tenant_id);

-- 7. REFEICOES (Meals)
ALTER TABLE refeicoes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_refeicoes_tenant_id ON refeicoes(tenant_id);

-- 8. CARDAPIOS (Menus)
ALTER TABLE cardapios ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cardapios_tenant_id ON cardapios(tenant_id);

-- 9. ESTOQUE TABLES
ALTER TABLE estoque_escolas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_id ON estoque_escolas(tenant_id);

ALTER TABLE estoque_lotes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_id ON estoque_lotes(tenant_id);

ALTER TABLE estoque_escolas_historico ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_historico_tenant_id ON estoque_escolas_historico(tenant_id);

ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_tenant_id ON estoque_movimentacoes(tenant_id);

ALTER TABLE estoque_alertas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_estoque_alertas_tenant_id ON estoque_alertas(tenant_id);

-- 10. PEDIDOS (Orders)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_id ON pedidos(tenant_id);

ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pedido_itens_tenant_id ON pedido_itens(tenant_id);

-- 11. GUIAS (Delivery Guides)
ALTER TABLE guias ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_guias_tenant_id ON guias(tenant_id);

ALTER TABLE guia_produto_escola ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_tenant_id ON guia_produto_escola(tenant_id);

-- 12. DEMANDAS (Demands)
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_id ON demandas(tenant_id);

-- 13. RELATIONSHIP TABLES
ALTER TABLE escola_modalidades ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_escola_modalidades_tenant_id ON escola_modalidades(tenant_id);

ALTER TABLE escolas_modalidades ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_escolas_modalidades_tenant_id ON escolas_modalidades(tenant_id);

ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contrato_produtos_tenant_id ON contrato_produtos(tenant_id);

ALTER TABLE contrato_produtos_modalidades ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contrato_produtos_modalidades_tenant_id ON contrato_produtos_modalidades(tenant_id);

ALTER TABLE cardapio_refeicoes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cardapio_refeicoes_tenant_id ON cardapio_refeicoes(tenant_id);

ALTER TABLE refeicao_produtos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_refeicao_produtos_tenant_id ON refeicao_produtos(tenant_id);

-- 14. FATURAMENTO (Billing)
ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_faturamentos_tenant_id ON faturamentos(tenant_id);

ALTER TABLE faturamento_itens ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_faturamento_itens_tenant_id ON faturamento_itens(tenant_id);

-- Update existing data to use default tenant
UPDATE escolas SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE produtos SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE usuarios SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE fornecedores SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE contratos SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE modalidades SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE refeicoes SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE cardapios SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE estoque_escolas SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE estoque_lotes SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE estoque_escolas_historico SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE estoque_movimentacoes SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE estoque_alertas SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE pedidos SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE pedido_itens SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE guias SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE guia_produto_escola SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE demandas SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE escola_modalidades SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE escolas_modalidades SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE contrato_produtos SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE contrato_produtos_modalidades SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE cardapio_refeicoes SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE refeicao_produtos SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE faturamentos SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE faturamento_itens SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL for core tables (after data migration)
ALTER TABLE escolas ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE produtos ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE usuarios ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE fornecedores ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE contratos ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE modalidades ALTER COLUMN tenant_id SET NOT NULL;

-- Create composite indexes for better performance
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

-- Comments for documentation
COMMENT ON COLUMN escolas.tenant_id IS 'Tenant isolation - links school to specific tenant';
COMMENT ON COLUMN produtos.tenant_id IS 'Tenant isolation - links product to specific tenant';
COMMENT ON COLUMN usuarios.tenant_id IS 'Tenant isolation - links user to specific tenant';
COMMENT ON COLUMN fornecedores.tenant_id IS 'Tenant isolation - links supplier to specific tenant';
COMMENT ON COLUMN contratos.tenant_id IS 'Tenant isolation - links contract to specific tenant';
COMMENT ON COLUMN modalidades.tenant_id IS 'Tenant isolation - links modality to specific tenant';