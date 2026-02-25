-- Migração para adicionar tenant_id às tabelas de estoque
-- Data: 2025-11-02

BEGIN;

-- 1. Verificar se as tabelas existem antes de alterar
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'escolas' AND column_name = 'tenant_id') THEN
        ALTER TABLE escolas ADD COLUMN tenant_id UUID;
    END IF;

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
UPDATE escolas
SET tenant_id = COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
WHERE tenant_id IS NULL;

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
CREATE INDEX IF NOT EXISTS idx_escolas_tenant_id ON escolas(tenant_id);
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
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_escolas ON estoque_escolas;
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_lotes ON estoque_lotes;
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_historico ON estoque_escolas_historico;
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_movimentacoes ON estoque_movimentacoes;
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_alertas ON estoque_alertas;
DROP FUNCTION IF EXISTS set_tenant_id_estoque() CASCADE;

DROP POLICY IF EXISTS tenant_isolation_escolas ON escolas;
DROP POLICY IF EXISTS tenant_isolation_produtos ON produtos;
DROP POLICY IF EXISTS tenant_isolation_usuarios ON usuarios;
DROP POLICY IF EXISTS tenant_isolation_fornecedores ON fornecedores;
DROP POLICY IF EXISTS tenant_isolation_contratos ON contratos;
DROP POLICY IF EXISTS tenant_isolation_modalidades ON modalidades;
DROP POLICY IF EXISTS tenant_isolation_refeicoes ON refeicoes;
DROP POLICY IF EXISTS tenant_isolation_cardapios ON cardapios;
DROP POLICY IF EXISTS tenant_isolation_estoque_escolas ON estoque_escolas;
DROP POLICY IF EXISTS tenant_isolation_estoque_lotes ON estoque_lotes;
DROP POLICY IF EXISTS tenant_isolation_estoque_escolas_historico ON estoque_escolas_historico;
DROP POLICY IF EXISTS tenant_isolation_estoque_movimentacoes ON estoque_movimentacoes;
DROP POLICY IF EXISTS tenant_isolation_estoque_alertas ON estoque_alertas;
DROP POLICY IF EXISTS tenant_isolation_pedidos ON pedidos;
DROP POLICY IF EXISTS tenant_isolation_pedido_itens ON pedido_itens;
DROP POLICY IF EXISTS tenant_isolation_guias ON guias;
DROP POLICY IF EXISTS tenant_isolation_guia_produto_escola ON guia_produto_escola;
DROP POLICY IF EXISTS tenant_isolation_demandas ON demandas;
DROP POLICY IF EXISTS tenant_isolation_escola_modalidades ON escola_modalidades;
DROP POLICY IF EXISTS tenant_isolation_escolas_modalidades ON escolas_modalidades;
DROP POLICY IF EXISTS tenant_isolation_contrato_produtos ON contrato_produtos;
DROP POLICY IF EXISTS tenant_isolation_contrato_produtos_modalidades ON contrato_produtos_modalidades;
DROP POLICY IF EXISTS tenant_isolation_cardapio_refeicoes ON cardapio_refeicoes;
DROP POLICY IF EXISTS tenant_isolation_refeicao_produtos ON refeicao_produtos;
DROP POLICY IF EXISTS tenant_isolation_faturamentos ON faturamentos;
DROP POLICY IF EXISTS tenant_isolation_faturamento_itens ON faturamento_itens;

ALTER TABLE escolas DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratos DISABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE refeicoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE cardapios DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas_historico DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_alertas DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE guias DISABLE ROW LEVEL SECURITY;
ALTER TABLE guia_produto_escola DISABLE ROW LEVEL SECURITY;
ALTER TABLE demandas DISABLE ROW LEVEL SECURITY;
ALTER TABLE escola_modalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE escolas_modalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_produtos_modalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE cardapio_refeicoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE refeicao_produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE faturamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento_itens DISABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS set_tenant_context(UUID);
DROP FUNCTION IF EXISTS get_current_tenant_id();
DROP FUNCTION IF EXISTS clear_tenant_context();
DROP VIEW IF EXISTS rls_status;

COMMIT;
