-- Otimização de índices para performance multi-tenant
-- Cria índices compostos com tenant_id para melhor performance

-- ============================================================================
-- ÍNDICES COMPOSTOS PARA TABELAS PRINCIPAIS
-- ============================================================================

-- Índices para tabela escolas
CREATE INDEX IF NOT EXISTS idx_escolas_tenant_ativo 
ON escolas(tenant_id, ativo) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_escolas_tenant_nome 
ON escolas(tenant_id, nome) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_escolas_tenant_created 
ON escolas(tenant_id, created_at DESC) WHERE ativo = true;

-- Índices para tabela produtos
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_ativo 
ON produtos(tenant_id, ativo) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_produtos_tenant_categoria 
ON produtos(tenant_id, categoria) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_produtos_tenant_nome 
ON produtos(tenant_id, nome) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_produtos_tenant_categoria_nome 
ON produtos(tenant_id, categoria, nome) WHERE ativo = true;

-- Índices para tabela usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_ativo 
ON usuarios(tenant_id, ativo) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_tipo 
ON usuarios(tenant_id, tipo) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_email 
ON usuarios(tenant_id, email) WHERE ativo = true;

-- ============================================================================
-- ÍNDICES PARA ESTOQUE ESCOLAR
-- ============================================================================

-- Índices para estoque_escolas (tabela crítica para performance)
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola 
ON estoque_escolas(tenant_id, escola_id);

CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_produto 
ON estoque_escolas(tenant_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola_produto 
ON estoque_escolas(tenant_id, escola_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_quantidade 
ON estoque_escolas(tenant_id, quantidade_atual) WHERE quantidade_atual > 0;

CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_updated 
ON estoque_escolas(tenant_id, updated_at DESC);

-- Índices para estoque_lotes
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_produto 
ON estoque_lotes(tenant_id, produto_id) WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_escola 
ON estoque_lotes(tenant_id, escola_id) WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_validade 
ON estoque_lotes(tenant_id, data_validade) WHERE status = 'ativo' AND data_validade IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_status_quantidade 
ON estoque_lotes(tenant_id, status, quantidade_atual) WHERE status = 'ativo' AND quantidade_atual > 0;

CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_produto_validade 
ON estoque_lotes(tenant_id, produto_id, data_validade) WHERE status = 'ativo' AND data_validade IS NOT NULL;

-- ============================================================================
-- ÍNDICES PARA HISTÓRICO E AUDITORIA
-- ============================================================================

-- Índices para estoque_escolas_historico
CREATE INDEX IF NOT EXISTS idx_historico_tenant_escola_data 
ON estoque_escolas_historico(tenant_id, escola_id, data_movimentacao DESC);

CREATE INDEX IF NOT EXISTS idx_historico_tenant_produto_data 
ON estoque_escolas_historico(tenant_id, produto_id, data_movimentacao DESC);

CREATE INDEX IF NOT EXISTS idx_historico_tenant_data 
ON estoque_escolas_historico(tenant_id, data_movimentacao DESC);

CREATE INDEX IF NOT EXISTS idx_historico_tenant_tipo_data 
ON estoque_escolas_historico(tenant_id, tipo_movimentacao, data_movimentacao DESC);

-- ============================================================================
-- ÍNDICES PARA CONTRATOS E PEDIDOS
-- ============================================================================

-- Índices para contratos
CREATE INDEX IF NOT EXISTS idx_contratos_tenant_status 
ON contratos(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_contratos_tenant_data_inicio 
ON contratos(tenant_id, data_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_contratos_tenant_data_fim 
ON contratos(tenant_id, data_fim DESC);

-- Índices para pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_status 
ON pedidos(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_data 
ON pedidos(tenant_id, data_pedido DESC);

CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_escola 
ON pedidos(tenant_id, escola_id);

-- ============================================================================
-- ÍNDICES PARA TENANT MANAGEMENT
-- ============================================================================

-- Índices para tenant_users (associações usuário-tenant)
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_role 
ON tenant_users(tenant_id, role) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_tenant 
ON tenant_users(user_id, tenant_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_status 
ON tenant_users(tenant_id, status);

-- Índices para tenant_configurations
CREATE INDEX IF NOT EXISTS idx_tenant_config_tenant_category 
ON tenant_configurations(tenant_id, category);

CREATE INDEX IF NOT EXISTS idx_tenant_config_tenant_key 
ON tenant_configurations(tenant_id, category, key);

-- ============================================================================
-- ÍNDICES PARA QUERIES DE RELATÓRIOS
-- ============================================================================

-- Índice para queries de resumo de estoque
CREATE INDEX IF NOT EXISTS idx_estoque_resumo_tenant 
ON estoque_escolas(tenant_id, produto_id, quantidade_atual) 
WHERE quantidade_atual > 0;

-- Índice para queries de matriz de estoque
CREATE INDEX IF NOT EXISTS idx_matriz_estoque_tenant 
ON estoque_escolas(tenant_id, escola_id, produto_id, quantidade_atual);

-- Índice para queries de validade
CREATE INDEX IF NOT EXISTS idx_validade_tenant_critico 
ON estoque_lotes(tenant_id, data_validade, quantidade_atual) 
WHERE status = 'ativo' AND data_validade IS NOT NULL AND quantidade_atual > 0;

-- ============================================================================
-- ESTATÍSTICAS E ANÁLISE
-- ============================================================================

-- Atualizar estatísticas das tabelas após criação dos índices
ANALYZE escolas;
ANALYZE produtos;
ANALYZE usuarios;
ANALYZE estoque_escolas;
ANALYZE estoque_lotes;
ANALYZE estoque_escolas_historico;
ANALYZE contratos;
ANALYZE pedidos;
ANALYZE tenant_users;
ANALYZE tenant_configurations;

-- ============================================================================
-- VIEWS MATERIALIZADAS PARA PERFORMANCE
-- ============================================================================

-- View materializada para resumo de estoque por tenant
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_estoque_resumo_tenant AS
SELECT 
  ee.tenant_id,
  p.id as produto_id,
  p.nome as produto_nome,
  p.categoria,
  p.unidade,
  COUNT(DISTINCT ee.escola_id) as total_escolas,
  COUNT(DISTINCT ee.escola_id) FILTER (WHERE ee.quantidade_atual > 0) as escolas_com_estoque,
  COALESCE(SUM(ee.quantidade_atual), 0) as quantidade_total,
  AVG(ee.quantidade_atual) FILTER (WHERE ee.quantidade_atual > 0) as media_por_escola,
  MAX(ee.updated_at) as ultima_atualizacao
FROM estoque_escolas ee
JOIN produtos p ON p.id = ee.produto_id
WHERE p.ativo = true
GROUP BY ee.tenant_id, p.id, p.nome, p.categoria, p.unidade;

-- Índice para a view materializada
CREATE INDEX IF NOT EXISTS idx_mv_estoque_resumo_tenant 
ON mv_estoque_resumo_tenant(tenant_id, categoria, produto_nome);

-- View materializada para estatísticas por tenant
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_estatisticas_tenant AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  COUNT(DISTINCT e.id) as total_escolas,
  COUNT(DISTINCT p.id) as total_produtos,
  COUNT(DISTINCT u.id) as total_usuarios,
  COUNT(DISTINCT ee.id) FILTER (WHERE ee.quantidade_atual > 0) as itens_com_estoque,
  COALESCE(SUM(ee.quantidade_atual), 0) as quantidade_total_estoque,
  COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'ativo' AND el.quantidade_atual > 0) as lotes_ativos,
  MAX(ee.updated_at) as ultima_movimentacao
FROM tenants t
LEFT JOIN escolas e ON (e.tenant_id = t.id AND e.ativo = true)
LEFT JOIN produtos p ON (p.tenant_id = t.id AND p.ativo = true)
LEFT JOIN usuarios u ON (u.tenant_id = t.id AND u.ativo = true)
LEFT JOIN estoque_escolas ee ON (ee.tenant_id = t.id)
LEFT JOIN estoque_lotes el ON (el.tenant_id = t.id)
WHERE t.status = 'active'
GROUP BY t.id, t.name;

-- Índice para a view de estatísticas
CREATE INDEX IF NOT EXISTS idx_mv_estatisticas_tenant 
ON mv_estatisticas_tenant(tenant_id);

-- ============================================================================
-- FUNÇÕES PARA REFRESH DAS VIEWS MATERIALIZADAS
-- ============================================================================

-- Função para refresh das views materializadas
CREATE OR REPLACE FUNCTION refresh_tenant_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_estoque_resumo_tenant;
  REFRESH MATERIALIZED VIEW mv_estatisticas_tenant;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON INDEX idx_escolas_tenant_ativo IS 'Índice otimizado para listagem de escolas ativas por tenant';
COMMENT ON INDEX idx_produtos_tenant_categoria_nome IS 'Índice otimizado para busca de produtos por categoria e nome dentro do tenant';
COMMENT ON INDEX idx_estoque_escolas_tenant_escola_produto IS 'Índice crítico para queries de estoque específico escola-produto';
COMMENT ON INDEX idx_estoque_lotes_tenant_validade IS 'Índice otimizado para queries de produtos próximos ao vencimento';
COMMENT ON INDEX idx_historico_tenant_data IS 'Índice otimizado para consultas de histórico ordenadas por data';

COMMENT ON MATERIALIZED VIEW mv_estoque_resumo_tenant IS 'View materializada para performance de consultas de resumo de estoque';
COMMENT ON MATERIALIZED VIEW mv_estatisticas_tenant IS 'View materializada para dashboard e estatísticas gerais por tenant';

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE 'Otimização de índices multi-tenant concluída com sucesso!';
  RAISE NOTICE 'Views materializadas criadas para melhor performance de consultas.';
  RAISE NOTICE 'Execute refresh_tenant_materialized_views() periodicamente para manter dados atualizados.';
END $$;
