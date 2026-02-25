BEGIN;

DROP INDEX IF EXISTS idx_estoque_escolas_tenant_escola;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_produto;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_escola_produto;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_quantidade;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_updated;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_escola_otimizado;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_produto_otimizado;
DROP INDEX IF EXISTS idx_estoque_escolas_resumo_otimizado;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_escola_perf;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_produto_perf;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_escola_produto_perf;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_quantidade_perf;
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_updated_perf;

DROP INDEX IF EXISTS idx_estoque_historico_tenant_escola;
DROP INDEX IF EXISTS idx_estoque_historico_tenant_produto;
DROP INDEX IF EXISTS idx_estoque_historico_tenant_data;
DROP INDEX IF EXISTS idx_historico_tenant_data_otimizado;
DROP INDEX IF EXISTS idx_historico_tenant_escola_otimizado;
DROP INDEX IF EXISTS idx_historico_tenant_produto_otimizado;
DROP INDEX IF EXISTS idx_historico_tenant_escola_data;
DROP INDEX IF EXISTS idx_historico_tenant_produto_data;
DROP INDEX IF EXISTS idx_historico_tenant_data;
DROP INDEX IF EXISTS idx_historico_tenant_tipo_data;

DROP INDEX IF EXISTS idx_estoque_lotes_tenant_produto;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_escola;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_validade;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_status_quantidade;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_produto_validade;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_escola_produto;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_validade_ativo;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_status_quantidade_perf;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_produto_perf;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_escola_perf;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_validade_perf;
DROP INDEX IF EXISTS idx_estoque_lotes_agregacao_otimizado;

DROP INDEX IF EXISTS idx_estoque_movimentacoes_tenant_id;
DROP INDEX IF EXISTS idx_estoque_movimentacoes_tenant_lote_data;

DROP INDEX IF EXISTS idx_estoque_alertas_tenant_id;

ALTER TABLE estoque_escolas DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE estoque_escolas_historico DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE estoque_lotes DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE estoque_movimentacoes DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE estoque_alertas DROP COLUMN IF EXISTS tenant_id;

COMMIT;
