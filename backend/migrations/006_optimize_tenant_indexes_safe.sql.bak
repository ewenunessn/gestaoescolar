-- Otimização de índices para performance multi-tenant (versão segura)
-- Cria apenas índices para colunas que existem

-- ============================================================================
-- VERIFICAR E CRIAR ÍNDICES APENAS SE AS COLUNAS EXISTIREM
-- ============================================================================

-- Função para criar índice apenas se a coluna existir
CREATE OR REPLACE FUNCTION create_index_if_column_exists(
    index_name text,
    table_name text,
    column_names text,
    where_clause text DEFAULT NULL
) RETURNS void AS $$
DECLARE
    columns_array text[];
    col text;
    column_exists boolean;
    sql_statement text;
BEGIN
    -- Dividir nomes das colunas
    columns_array := string_to_array(column_names, ',');
    
    -- Verificar se todas as colunas existem
    FOREACH col IN ARRAY columns_array LOOP
        col := trim(col);
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE information_schema.columns.table_name = create_index_if_column_exists.table_name 
            AND information_schema.columns.column_name = col
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            RAISE NOTICE 'Coluna % não existe na tabela %. Pulando criação do índice %.', col, table_name, index_name;
            RETURN;
        END IF;
    END LOOP;
    
    -- Se chegou até aqui, todas as colunas existem
    sql_statement := 'CREATE INDEX IF NOT EXISTS ' || index_name || ' ON ' || table_name || '(' || column_names || ')';
    
    IF where_clause IS NOT NULL THEN
        sql_statement := sql_statement || ' WHERE ' || where_clause;
    END IF;
    
    EXECUTE sql_statement;
    RAISE NOTICE 'Índice % criado com sucesso.', index_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ÍNDICES PARA TABELAS EXISTENTES (SEM TENANT_ID)
-- ============================================================================

-- Índices para tabela escolas
SELECT create_index_if_column_exists('idx_escolas_ativo_perf', 'escolas', 'ativo', 'ativo = true');
SELECT create_index_if_column_exists('idx_escolas_nome_perf', 'escolas', 'nome');
SELECT create_index_if_column_exists('idx_escolas_created_perf', 'escolas', 'created_at');

-- Índices para tabela produtos
SELECT create_index_if_column_exists('idx_produtos_ativo_perf', 'produtos', 'ativo', 'ativo = true');
SELECT create_index_if_column_exists('idx_produtos_categoria_perf', 'produtos', 'categoria');
SELECT create_index_if_column_exists('idx_produtos_nome_perf', 'produtos', 'nome');
SELECT create_index_if_column_exists('idx_produtos_categoria_nome_perf', 'produtos', 'categoria, nome');

-- Índices para tabela usuarios
SELECT create_index_if_column_exists('idx_usuarios_ativo_perf', 'usuarios', 'ativo', 'ativo = true');
SELECT create_index_if_column_exists('idx_usuarios_tipo_perf', 'usuarios', 'tipo');
SELECT create_index_if_column_exists('idx_usuarios_email_perf', 'usuarios', 'email');

-- ============================================================================
-- ÍNDICES PARA ESTOQUE ESCOLAR (CRÍTICOS PARA PERFORMANCE)
-- ============================================================================

-- Índices para estoque_escolas
SELECT create_index_if_column_exists('idx_estoque_escolas_escola_perf', 'estoque_escolas', 'escola_id');
SELECT create_index_if_column_exists('idx_estoque_escolas_produto_perf', 'estoque_escolas', 'produto_id');
SELECT create_index_if_column_exists('idx_estoque_escolas_escola_produto_perf', 'estoque_escolas', 'escola_id, produto_id');
SELECT create_index_if_column_exists('idx_estoque_escolas_quantidade_perf', 'estoque_escolas', 'quantidade_atual', 'quantidade_atual > 0');
SELECT create_index_if_column_exists('idx_estoque_escolas_updated_perf', 'estoque_escolas', 'updated_at');

-- Índices para estoque_lotes
SELECT create_index_if_column_exists('idx_estoque_lotes_produto_perf', 'estoque_lotes', 'produto_id', 'status = ''ativo''');
SELECT create_index_if_column_exists('idx_estoque_lotes_validade_perf', 'estoque_lotes', 'data_validade', 'status = ''ativo'' AND data_validade IS NOT NULL');
SELECT create_index_if_column_exists('idx_estoque_lotes_status_quantidade_perf', 'estoque_lotes', 'status, quantidade_atual', 'status = ''ativo'' AND quantidade_atual > 0');
SELECT create_index_if_column_exists('idx_estoque_lotes_produto_validade_perf', 'estoque_lotes', 'produto_id, data_validade', 'status = ''ativo'' AND data_validade IS NOT NULL');

-- ============================================================================
-- ÍNDICES PARA HISTÓRICO E AUDITORIA
-- ============================================================================

-- Índices para estoque_escolas_historico
SELECT create_index_if_column_exists('idx_historico_escola_data_perf', 'estoque_escolas_historico', 'escola_id, data_movimentacao');
SELECT create_index_if_column_exists('idx_historico_produto_data_perf', 'estoque_escolas_historico', 'produto_id, data_movimentacao');
SELECT create_index_if_column_exists('idx_historico_data_perf', 'estoque_escolas_historico', 'data_movimentacao');
SELECT create_index_if_column_exists('idx_historico_tipo_data_perf', 'estoque_escolas_historico', 'tipo_movimentacao, data_movimentacao');

-- ============================================================================
-- ÍNDICES PARA CONTRATOS E PEDIDOS
-- ============================================================================

-- Índices para contratos
SELECT create_index_if_column_exists('idx_contratos_status_perf', 'contratos', 'status');
SELECT create_index_if_column_exists('idx_contratos_data_inicio_perf', 'contratos', 'data_inicio');
SELECT create_index_if_column_exists('idx_contratos_data_fim_perf', 'contratos', 'data_fim');

-- Índices para pedidos
SELECT create_index_if_column_exists('idx_pedidos_status_perf', 'pedidos', 'status');
SELECT create_index_if_column_exists('idx_pedidos_data_perf', 'pedidos', 'data_pedido');
SELECT create_index_if_column_exists('idx_pedidos_escola_perf', 'pedidos', 'escola_id');

-- ============================================================================
-- ÍNDICES PARA QUERIES DE RELATÓRIOS
-- ============================================================================

-- Índice para queries de resumo de estoque
SELECT create_index_if_column_exists('idx_estoque_resumo_perf', 'estoque_escolas', 'produto_id, quantidade_atual', 'quantidade_atual > 0');

-- Índice para queries de matriz de estoque
SELECT create_index_if_column_exists('idx_matriz_estoque_perf', 'estoque_escolas', 'escola_id, produto_id, quantidade_atual');

-- Índice para queries de validade
SELECT create_index_if_column_exists('idx_validade_critico_perf', 'estoque_lotes', 'data_validade, quantidade_atual', 'status = ''ativo'' AND data_validade IS NOT NULL AND quantidade_atual > 0');

-- ============================================================================
-- VIEWS MATERIALIZADAS PARA PERFORMANCE (SEM TENANT_ID)
-- ============================================================================

-- View materializada para resumo de estoque
DROP MATERIALIZED VIEW IF EXISTS mv_estoque_resumo_performance;
CREATE MATERIALIZED VIEW mv_estoque_resumo_performance AS
SELECT 
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
GROUP BY p.id, p.nome, p.categoria, p.unidade;

-- Índice para a view materializada
CREATE INDEX IF NOT EXISTS idx_mv_estoque_resumo_performance 
ON mv_estoque_resumo_performance(categoria, produto_nome);

-- View materializada para estatísticas gerais
DROP MATERIALIZED VIEW IF EXISTS mv_estatisticas_performance;
CREATE MATERIALIZED VIEW mv_estatisticas_performance AS
SELECT 
  COUNT(DISTINCT e.id) as total_escolas,
  COUNT(DISTINCT p.id) as total_produtos,
  COUNT(DISTINCT u.id) as total_usuarios,
  COUNT(DISTINCT ee.id) FILTER (WHERE ee.quantidade_atual > 0) as itens_com_estoque,
  COALESCE(SUM(ee.quantidade_atual), 0) as quantidade_total_estoque,
  COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'ativo' AND el.quantidade_atual > 0) as lotes_ativos,
  MAX(ee.updated_at) as ultima_movimentacao
FROM escolas e
CROSS JOIN produtos p
LEFT JOIN usuarios u ON u.ativo = true
LEFT JOIN estoque_escolas ee ON (ee.escola_id = e.id AND ee.produto_id = p.id)
LEFT JOIN estoque_lotes el ON el.produto_id = p.id
WHERE e.ativo = true AND p.ativo = true;

-- ============================================================================
-- FUNÇÕES PARA REFRESH DAS VIEWS MATERIALIZADAS
-- ============================================================================

-- Função para refresh das views materializadas
CREATE OR REPLACE FUNCTION refresh_performance_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_estoque_resumo_performance;
  REFRESH MATERIALIZED VIEW mv_estatisticas_performance;
  RAISE NOTICE 'Views materializadas de performance atualizadas com sucesso.';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ANÁLISE DAS TABELAS
-- ============================================================================

-- Executar análise das tabelas principais
DO $$
DECLARE
    tables_to_analyze text[] := ARRAY[
        'escolas', 'produtos', 'usuarios',
        'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico',
        'contratos', 'pedidos', 'modalidades'
    ];
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY tables_to_analyze LOOP
        BEGIN
            EXECUTE 'ANALYZE ' || table_name;
            RAISE NOTICE 'Tabela % analisada com sucesso.', table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao analisar tabela %: %', table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- LIMPEZA
-- ============================================================================

-- Remover função auxiliar
DROP FUNCTION IF EXISTS create_index_if_column_exists(text, text, text, text);

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '=== OTIMIZAÇÃO DE PERFORMANCE CONCLUÍDA ===';
  RAISE NOTICE 'Índices de performance criados para tabelas existentes.';
  RAISE NOTICE 'Views materializadas criadas para consultas frequentes.';
  RAISE NOTICE 'Execute refresh_performance_materialized_views() periodicamente.';
  RAISE NOTICE 'Para aplicar otimizações multi-tenant, execute primeiro as migrações de tenant.';
END $$;