-- Migração para otimização de performance de queries de estoque
-- Adiciona índices compostos específicos e otimizações de query
-- Data: 2024-11-04

-- ============================================================================
-- ANÁLISE DE PERFORMANCE E ÍNDICES OTIMIZADOS
-- ============================================================================

-- Verificar se as tabelas existem antes de criar índices
DO $$
BEGIN
    -- Verificar se a tabela estoque_escolas existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_escolas') THEN
        
        -- Índices otimizados para estoque_escolas
        -- Índice para queries de listagem por escola e tenant (mais comum)
        CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola_otimizado 
        ON estoque_escolas(tenant_id, escola_id, quantidade_atual DESC) 
        WHERE quantidade_atual > 0;
        
        -- Índice para queries de produtos específicos por tenant
        CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_produto_otimizado 
        ON estoque_escolas(tenant_id, produto_id, quantidade_atual DESC) 
        WHERE quantidade_atual > 0;
        
        -- Índice para queries de resumo (agregações)
        CREATE INDEX IF NOT EXISTS idx_estoque_escolas_resumo_otimizado 
        ON estoque_escolas(tenant_id, produto_id, escola_id, quantidade_atual) 
        INCLUDE (updated_at);
        
        -- Índice para queries de matriz (escola x produto)
        CREATE INDEX IF NOT EXISTS idx_estoque_escolas_matriz_otimizado 
        ON estoque_escolas(tenant_id, escola_id, produto_id) 
        INCLUDE (quantidade_atual, updated_at);
        
        RAISE NOTICE 'Índices otimizados criados para estoque_escolas';
    END IF;
    
    -- Verificar se a tabela estoque_lotes existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_lotes') THEN
        
        -- Índices otimizados para estoque_lotes
        -- Índice para queries de lotes ativos por produto e tenant
        CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_produto_ativo_otimizado 
        ON estoque_lotes(tenant_id, produto_id, status, quantidade_atual DESC) 
        WHERE status = 'ativo' AND quantidade_atual > 0;
        
        -- Índice para queries de validade (crítico para performance)
        CREATE INDEX IF NOT EXISTS idx_estoque_lotes_validade_otimizado 
        ON estoque_lotes(tenant_id, data_validade ASC, quantidade_atual DESC) 
        WHERE status = 'ativo' AND data_validade IS NOT NULL AND quantidade_atual > 0;
        
        -- Índice para queries de lotes por escola
        CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_escola_otimizado 
        ON estoque_lotes(tenant_id, escola_id, produto_id, status) 
        INCLUDE (quantidade_atual, data_validade);
        
        -- Índice para agregações de lotes
        CREATE INDEX IF NOT EXISTS idx_estoque_lotes_agregacao_otimizado 
        ON estoque_lotes(tenant_id, produto_id, escola_id, status) 
        INCLUDE (quantidade_atual) 
        WHERE status = 'ativo';
        
        RAISE NOTICE 'Índices otimizados criados para estoque_lotes';
    END IF;
    
    -- Verificar se a tabela estoque_escolas_historico existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_escolas_historico') THEN
        
        -- Índices otimizados para estoque_escolas_historico
        -- Índice para queries de histórico por data (mais comum)
        CREATE INDEX IF NOT EXISTS idx_historico_tenant_data_otimizado 
        ON estoque_escolas_historico(tenant_id, data_movimentacao DESC) 
        INCLUDE (escola_id, produto_id, tipo_movimentacao);
        
        -- Índice para queries de histórico por escola
        CREATE INDEX IF NOT EXISTS idx_historico_tenant_escola_otimizado 
        ON estoque_escolas_historico(tenant_id, escola_id, data_movimentacao DESC) 
        INCLUDE (produto_id, tipo_movimentacao, quantidade_movimentada);
        
        -- Índice para queries de histórico por produto
        CREATE INDEX IF NOT EXISTS idx_historico_tenant_produto_otimizado 
        ON estoque_escolas_historico(tenant_id, produto_id, data_movimentacao DESC) 
        INCLUDE (escola_id, tipo_movimentacao, quantidade_movimentada);
        
        -- Índice para queries de histórico por tipo de movimentação
        CREATE INDEX IF NOT EXISTS idx_historico_tenant_tipo_otimizado 
        ON estoque_escolas_historico(tenant_id, tipo_movimentacao, data_movimentacao DESC);
        
        RAISE NOTICE 'Índices otimizados criados para estoque_escolas_historico';
    END IF;
    
END $$;

-- ============================================================================
-- ÍNDICES PARA TABELAS RELACIONADAS (PRODUTOS E ESCOLAS)
-- ============================================================================

DO $$
BEGIN
    -- Índices otimizados para produtos (para JOINs eficientes)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
        
        CREATE INDEX IF NOT EXISTS idx_produtos_tenant_categoria_nome_otimizado 
        ON produtos(tenant_id, categoria, nome) 
        WHERE ativo = true;
        
        CREATE INDEX IF NOT EXISTS idx_produtos_tenant_ativo_otimizado 
        ON produtos(tenant_id, ativo, categoria NULLS LAST, nome) 
        WHERE ativo = true;
        
        RAISE NOTICE 'Índices otimizados criados para produtos';
    END IF;
    
    -- Índices otimizados para escolas (para JOINs eficientes)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escolas') THEN
        
        CREATE INDEX IF NOT EXISTS idx_escolas_tenant_ativo_nome_otimizado 
        ON escolas(tenant_id, ativo, nome) 
        WHERE ativo = true;
        
        RAISE NOTICE 'Índices otimizados criados para escolas';
    END IF;
    
END $$;

-- ============================================================================
-- ESTATÍSTICAS E ANÁLISE DE PERFORMANCE
-- ============================================================================

-- Atualizar estatísticas das tabelas para o otimizador de queries
DO $$
BEGIN
    -- Atualizar estatísticas para melhor planejamento de queries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_escolas') THEN
        ANALYZE estoque_escolas;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_lotes') THEN
        ANALYZE estoque_lotes;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_escolas_historico') THEN
        ANALYZE estoque_escolas_historico;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
        ANALYZE produtos;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escolas') THEN
        ANALYZE escolas;
    END IF;
    
    RAISE NOTICE 'Estatísticas atualizadas para todas as tabelas de estoque';
END $$;

-- ============================================================================
-- CONFIGURAÇÕES DE PERFORMANCE
-- ============================================================================

-- Configurar parâmetros de performance para queries de estoque (se permitido)
DO $$
BEGIN
    -- Aumentar work_mem para queries complexas de estoque (se possível)
    -- Nota: Isso pode não funcionar em todos os ambientes
    BEGIN
        -- Configurações específicas para sessão (não persistentes)
        SET work_mem = '32MB';
        SET random_page_cost = 1.1; -- Para SSDs
        RAISE NOTICE 'Configurações de performance aplicadas para a sessão';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Privilégios insuficientes para alterar configurações de performance';
    END;
END $$;

-- ============================================================================
-- VIEWS MATERIALIZADAS PARA PERFORMANCE (OPCIONAL)
-- ============================================================================

-- Criar view materializada para resumo de estoque (se não existir)
DO $$
BEGIN
    -- Verificar se a view materializada já existe
    IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_estoque_resumo_tenant_otimizado') THEN
        
        CREATE MATERIALIZED VIEW mv_estoque_resumo_tenant_otimizado AS
        WITH estoque_agregado AS (
            SELECT 
                p.tenant_id,
                p.id as produto_id,
                p.nome as produto_nome,
                p.categoria,
                p.unidade,
                COUNT(DISTINCT e.id) as total_escolas,
                COUNT(DISTINCT ee.escola_id) FILTER (WHERE ee.quantidade_atual > 0) as escolas_com_estoque,
                COALESCE(SUM(ee.quantidade_atual), 0) as quantidade_total_estoque,
                COALESCE(SUM(el.quantidade_atual), 0) as quantidade_total_lotes,
                COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'ativo' AND el.quantidade_atual > 0) as lotes_ativos,
                MIN(el.data_validade) FILTER (WHERE el.status = 'ativo' AND el.quantidade_atual > 0) as proxima_validade,
                MAX(COALESCE(ee.updated_at, el.updated_at)) as ultima_atualizacao
            FROM produtos p
            LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.tenant_id = p.tenant_id)
            LEFT JOIN escolas e ON (e.id = ee.escola_id AND e.tenant_id = p.tenant_id AND e.ativo = true)
            LEFT JOIN estoque_lotes el ON (el.produto_id = p.id AND el.tenant_id = p.tenant_id)
            WHERE p.ativo = true
            GROUP BY p.tenant_id, p.id, p.nome, p.categoria, p.unidade
        )
        SELECT *,
            (quantidade_total_estoque + quantidade_total_lotes) as quantidade_total_geral,
            CASE 
                WHEN (quantidade_total_estoque + quantidade_total_lotes) = 0 THEN 'sem_estoque'
                WHEN escolas_com_estoque = 0 THEN 'sem_distribuicao'
                WHEN escolas_com_estoque < (total_escolas * 0.5) THEN 'distribuicao_parcial'
                ELSE 'bem_distribuido'
            END as status_distribuicao,
            CASE 
                WHEN proxima_validade IS NULL THEN 'sem_validade'
                WHEN proxima_validade < CURRENT_DATE THEN 'vencido'
                WHEN proxima_validade <= CURRENT_DATE + INTERVAL '7 days' THEN 'critico'
                WHEN proxima_validade <= CURRENT_DATE + INTERVAL '30 days' THEN 'atencao'
                ELSE 'normal'
            END as status_validade
        FROM estoque_agregado;
        
        -- Criar índice na view materializada
        CREATE INDEX idx_mv_estoque_resumo_tenant_otimizado 
        ON mv_estoque_resumo_tenant_otimizado(tenant_id, categoria, produto_nome);
        
        CREATE INDEX idx_mv_estoque_resumo_status_otimizado 
        ON mv_estoque_resumo_tenant_otimizado(tenant_id, status_distribuicao, status_validade);
        
        RAISE NOTICE 'View materializada mv_estoque_resumo_tenant_otimizado criada com sucesso';
    ELSE
        RAISE NOTICE 'View materializada mv_estoque_resumo_tenant_otimizado já existe';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar view materializada: %', SQLERRM;
END $$;

-- ============================================================================
-- FUNÇÃO PARA REFRESH DA VIEW MATERIALIZADA
-- ============================================================================

-- Criar função para atualizar a view materializada
CREATE OR REPLACE FUNCTION refresh_estoque_resumo_tenant()
RETURNS void AS $$
BEGIN
    -- Refresh da view materializada de forma concorrente (se possível)
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_estoque_resumo_tenant_otimizado;
        RAISE NOTICE 'View materializada atualizada com sucesso (CONCURRENTLY)';
    EXCEPTION
        WHEN OTHERS THEN
            -- Fallback para refresh normal
            REFRESH MATERIALIZED VIEW mv_estoque_resumo_tenant_otimizado;
            RAISE NOTICE 'View materializada atualizada com sucesso (normal)';
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS DOS ÍNDICES PARA DOCUMENTAÇÃO
-- ============================================================================

-- Adicionar comentários explicativos nos índices criados
DO $$
BEGIN
    -- Comentários para índices de estoque_escolas
    COMMENT ON INDEX idx_estoque_escolas_tenant_escola_otimizado IS 
    'Índice otimizado para queries de listagem de estoque por escola e tenant, incluindo filtro por quantidade > 0';
    
    COMMENT ON INDEX idx_estoque_escolas_tenant_produto_otimizado IS 
    'Índice otimizado para queries de estoque por produto específico e tenant';
    
    COMMENT ON INDEX idx_estoque_escolas_resumo_otimizado IS 
    'Índice otimizado para queries de resumo e agregações de estoque por tenant';
    
    COMMENT ON INDEX idx_estoque_escolas_matriz_otimizado IS 
    'Índice otimizado para queries de matriz estoque (escola x produto) com INCLUDE para evitar lookup';
    
    -- Comentários para índices de estoque_lotes
    COMMENT ON INDEX idx_estoque_lotes_tenant_produto_ativo_otimizado IS 
    'Índice otimizado para queries de lotes ativos por produto, ordenado por quantidade';
    
    COMMENT ON INDEX idx_estoque_lotes_validade_otimizado IS 
    'Índice crítico para performance de queries de produtos próximos ao vencimento';
    
    COMMENT ON INDEX idx_estoque_lotes_tenant_escola_otimizado IS 
    'Índice otimizado para queries de lotes por escola com INCLUDE para dados frequentemente acessados';
    
    -- Comentários para índices de histórico
    COMMENT ON INDEX idx_historico_tenant_data_otimizado IS 
    'Índice otimizado para queries de histórico ordenadas por data (mais comum)';
    
    COMMENT ON INDEX idx_historico_tenant_escola_otimizado IS 
    'Índice otimizado para queries de histórico filtradas por escola';
    
    COMMENT ON INDEX idx_historico_tenant_produto_otimizado IS 
    'Índice otimizado para queries de histórico filtradas por produto';
    
    RAISE NOTICE 'Comentários adicionados aos índices para documentação';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Alguns comentários podem não ter sido adicionados: %', SQLERRM;
END $$;

-- ============================================================================
-- VERIFICAÇÃO FINAL E RELATÓRIO
-- ============================================================================

-- Gerar relatório dos índices criados
DO $$
DECLARE
    index_count INTEGER;
    table_name TEXT;
BEGIN
    RAISE NOTICE '=== RELATÓRIO DE OTIMIZAÇÃO DE PERFORMANCE ===';
    
    -- Contar índices por tabela
    FOR table_name IN SELECT DISTINCT tablename FROM pg_indexes 
                     WHERE indexname LIKE '%_otimizado' 
    LOOP
        SELECT COUNT(*) INTO index_count 
        FROM pg_indexes 
        WHERE tablename = table_name AND indexname LIKE '%_otimizado';
        
        RAISE NOTICE 'Tabela %: % índices otimizados criados', table_name, index_count;
    END LOOP;
    
    -- Verificar view materializada
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_estoque_resumo_tenant_otimizado') THEN
        RAISE NOTICE 'View materializada: mv_estoque_resumo_tenant_otimizado ✓';
    END IF;
    
    -- Verificar função de refresh
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_estoque_resumo_tenant') THEN
        RAISE NOTICE 'Função de refresh: refresh_estoque_resumo_tenant() ✓';
    END IF;
    
    RAISE NOTICE '=== OTIMIZAÇÃO CONCLUÍDA COM SUCESSO ===';
    
END $$;