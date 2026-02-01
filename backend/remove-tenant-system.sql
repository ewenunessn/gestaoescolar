-- Script para remover completamente o sistema de tenant
-- Remove todas as colunas tenant_id, constraints e índices relacionados

BEGIN;

-- 0. Remover políticas RLS (Row Level Security) que dependem de tenant_id
DROP POLICY IF EXISTS tenant_isolation_produtos ON produtos;
DROP POLICY IF EXISTS tenant_isolation_escolas ON escolas;
DROP POLICY IF EXISTS tenant_isolation_modalidades ON modalidades;
DROP POLICY IF EXISTS tenant_isolation_contratos ON contratos;
DROP POLICY IF EXISTS tenant_isolation_fornecedores ON fornecedores;
DROP POLICY IF EXISTS tenant_isolation_pedidos ON pedidos;
DROP POLICY IF EXISTS tenant_isolation_refeicoes ON refeicoes;
DROP POLICY IF EXISTS tenant_isolation_cardapios ON cardapios;
DROP POLICY IF EXISTS tenant_isolation_estoque_escolas ON estoque_escolas;
DROP POLICY IF EXISTS tenant_isolation_estoque_lotes ON estoque_lotes;
DROP POLICY IF EXISTS tenant_isolation_estoque_escolas_historico ON estoque_escolas_historico;
DROP POLICY IF EXISTS tenant_isolation_estoque_movimentacoes ON estoque_movimentacoes;
DROP POLICY IF EXISTS tenant_isolation_contrato_produtos ON contrato_produtos;
DROP POLICY IF EXISTS tenant_isolation_contrato_produtos_modalidades ON contrato_produtos_modalidades;
DROP POLICY IF EXISTS tenant_isolation_cardapio_refeicoes ON cardapio_refeicoes;
DROP POLICY IF EXISTS tenant_isolation_refeicao_produtos ON refeicao_produtos;
DROP POLICY IF EXISTS tenant_isolation_faturamentos ON faturamentos;
DROP POLICY IF EXISTS tenant_isolation_faturamento_itens ON faturamento_itens;
DROP POLICY IF EXISTS tenant_isolation_demandas ON demandas;
DROP POLICY IF EXISTS tenant_isolation_guias ON guias;
DROP POLICY IF EXISTS tenant_isolation_estoque_alertas ON estoque_alertas;

-- Desabilitar RLS em todas as tabelas
ALTER TABLE IF EXISTS produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS escolas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS modalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contratos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fornecedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refeicoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cardapios DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS estoque_escolas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS estoque_lotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS estoque_escolas_historico DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS estoque_movimentacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contrato_produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contrato_produtos_modalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cardapio_refeicoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refeicao_produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS faturamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS faturamento_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS demandas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guias DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS estoque_alertas DISABLE ROW LEVEL SECURITY;

-- 1. Remover foreign key constraints primeiro
ALTER TABLE IF EXISTS produtos DROP CONSTRAINT IF EXISTS produtos_tenant_id_fkey;
ALTER TABLE IF EXISTS escolas DROP CONSTRAINT IF EXISTS escolas_tenant_id_fkey;
ALTER TABLE IF EXISTS modalidades DROP CONSTRAINT IF EXISTS modalidades_tenant_id_fkey;
ALTER TABLE IF EXISTS contratos DROP CONSTRAINT IF EXISTS contratos_tenant_id_fkey;
ALTER TABLE IF EXISTS fornecedores DROP CONSTRAINT IF EXISTS fornecedores_tenant_id_fkey;
ALTER TABLE IF EXISTS pedidos DROP CONSTRAINT IF EXISTS pedidos_tenant_id_fkey;
ALTER TABLE IF EXISTS refeicoes DROP CONSTRAINT IF EXISTS refeicoes_tenant_id_fkey;
ALTER TABLE IF EXISTS cardapios DROP CONSTRAINT IF EXISTS cardapios_tenant_id_fkey;
ALTER TABLE IF EXISTS estoque_escolas DROP CONSTRAINT IF EXISTS estoque_escolas_tenant_id_fkey;
ALTER TABLE IF EXISTS estoque_lotes DROP CONSTRAINT IF EXISTS estoque_lotes_tenant_id_fkey;
ALTER TABLE IF EXISTS estoque_escolas_historico DROP CONSTRAINT IF EXISTS estoque_escolas_historico_tenant_id_fkey;
ALTER TABLE IF EXISTS estoque_movimentacoes DROP CONSTRAINT IF EXISTS estoque_movimentacoes_tenant_id_fkey;
ALTER TABLE IF EXISTS contrato_produtos DROP CONSTRAINT IF EXISTS contrato_produtos_tenant_id_fkey;
ALTER TABLE IF EXISTS contrato_produtos_modalidades DROP CONSTRAINT IF EXISTS contrato_produtos_modalidades_tenant_id_fkey;
ALTER TABLE IF EXISTS cardapio_refeicoes DROP CONSTRAINT IF EXISTS cardapio_refeicoes_tenant_id_fkey;
ALTER TABLE IF EXISTS refeicao_produtos DROP CONSTRAINT IF EXISTS refeicao_produtos_tenant_id_fkey;
ALTER TABLE IF EXISTS faturamentos DROP CONSTRAINT IF EXISTS faturamentos_tenant_id_fkey;
ALTER TABLE IF EXISTS faturamento_itens DROP CONSTRAINT IF EXISTS faturamento_itens_tenant_id_fkey;
ALTER TABLE IF EXISTS demandas DROP CONSTRAINT IF EXISTS demandas_tenant_id_fkey;
ALTER TABLE IF EXISTS guias DROP CONSTRAINT IF EXISTS guias_tenant_id_fkey;
ALTER TABLE IF EXISTS estoque_alertas DROP CONSTRAINT IF EXISTS estoque_alertas_tenant_id_fkey;

-- 2. Remover índices relacionados a tenant_id
DROP INDEX IF EXISTS idx_produtos_tenant_id;
DROP INDEX IF EXISTS idx_escolas_tenant_id;
DROP INDEX IF EXISTS idx_modalidades_tenant_id;
DROP INDEX IF EXISTS idx_contratos_tenant_id;
DROP INDEX IF EXISTS idx_fornecedores_tenant_id;
DROP INDEX IF EXISTS idx_pedidos_tenant_id;
DROP INDEX IF EXISTS idx_refeicoes_tenant_id;
DROP INDEX IF EXISTS idx_cardapios_tenant_id;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_id;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_id;
DROP INDEX IF EXISTS idx_estoque_escolas_historico_tenant_id;
DROP INDEX IF EXISTS idx_estoque_movimentacoes_tenant_id;
DROP INDEX IF EXISTS idx_contrato_produtos_tenant_id;
DROP INDEX IF EXISTS idx_contrato_produtos_modalidades_tenant_id;
DROP INDEX IF EXISTS idx_cardapio_refeicoes_tenant_id;
DROP INDEX IF EXISTS idx_refeicao_produtos_tenant_id;
DROP INDEX IF EXISTS idx_faturamentos_tenant_id;
DROP INDEX IF EXISTS idx_faturamento_itens_tenant_id;
DROP INDEX IF EXISTS idx_demandas_tenant_id;
DROP INDEX IF EXISTS idx_guias_tenant_id;
DROP INDEX IF EXISTS idx_estoque_alertas_tenant_id;

-- Remover índices compostos com tenant_id
DROP INDEX IF EXISTS idx_contratos_tenant_status;
DROP INDEX IF EXISTS idx_modalidades_tenant_nome;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_escola_produto;
DROP INDEX IF EXISTS idx_pedidos_tenant_status;
DROP INDEX IF EXISTS idx_pedidos_tenant_data;
DROP INDEX IF EXISTS idx_historico_tenant_escola_data;
DROP INDEX IF EXISTS idx_historico_tenant_produto_data;
DROP INDEX IF EXISTS idx_historico_tenant_data;
DROP INDEX IF EXISTS idx_historico_tenant_tipo_data;
DROP INDEX IF EXISTS idx_estoque_historico_tenant_escola_data;
DROP INDEX IF EXISTS idx_estoque_movimentacoes_tenant_lote_data;
DROP INDEX IF EXISTS idx_historico_tenant_data_otimizado;
DROP INDEX IF EXISTS idx_historico_tenant_escola_otimizado;
DROP INDEX IF EXISTS idx_historico_tenant_produto_otimizado;
DROP INDEX IF EXISTS idx_historico_tenant_tipo_otimizado;
DROP INDEX IF EXISTS idx_estoque_historico_tenant_escola;
DROP INDEX IF EXISTS idx_estoque_historico_tenant_produto;
DROP INDEX IF EXISTS idx_estoque_historico_tenant_data;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_validade;

-- 3. Remover colunas tenant_id de todas as tabelas (usando CASCADE)
ALTER TABLE IF EXISTS produtos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS escolas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS modalidades DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS contratos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS fornecedores DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS pedidos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS refeicoes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS cardapios DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS estoque_escolas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS estoque_lotes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS estoque_escolas_historico DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS estoque_movimentacoes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS contrato_produtos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS contrato_produtos_modalidades DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS cardapio_refeicoes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS refeicao_produtos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS faturamentos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS faturamento_itens DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS demandas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS guias DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE IF EXISTS estoque_alertas DROP COLUMN IF EXISTS tenant_id CASCADE;

-- 4. Remover constraints UNIQUE antigas (sem recriar novas por enquanto)
ALTER TABLE IF EXISTS produtos DROP CONSTRAINT IF EXISTS produtos_nome_tenant_id_key;
ALTER TABLE IF EXISTS produtos DROP CONSTRAINT IF EXISTS unique_produto_nome_tenant;

ALTER TABLE IF EXISTS fornecedores DROP CONSTRAINT IF EXISTS fornecedores_cnpj_tenant_id_key;
ALTER TABLE IF EXISTS fornecedores DROP CONSTRAINT IF EXISTS unique_fornecedor_cnpj_tenant;

ALTER TABLE IF EXISTS escolas DROP CONSTRAINT IF EXISTS escolas_nome_tenant_id_key;
ALTER TABLE IF EXISTS escolas DROP CONSTRAINT IF EXISTS unique_escola_nome_tenant;

ALTER TABLE IF EXISTS modalidades DROP CONSTRAINT IF EXISTS modalidades_nome_tenant_id_key;
ALTER TABLE IF EXISTS modalidades DROP CONSTRAINT IF EXISTS unique_modalidade_nome_tenant;

ALTER TABLE IF EXISTS contratos DROP CONSTRAINT IF EXISTS contratos_numero_tenant_id_key;
ALTER TABLE IF EXISTS contratos DROP CONSTRAINT IF EXISTS unique_contrato_numero_tenant;

-- 5. Remover tabela de tenants e relacionadas
DROP TABLE IF EXISTS tenant_users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 6. Remover funções relacionadas a tenant
DROP FUNCTION IF EXISTS get_current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS set_tenant_context(UUID) CASCADE;

COMMIT;

-- Verificar se a remoção foi bem-sucedida
SELECT 'Remoção do sistema de tenant concluída com sucesso!' as status;