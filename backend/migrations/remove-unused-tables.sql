-- ============================================================================
-- MIGRATION: Remover Tabelas Não Utilizadas
-- Data: 26/03/2026
-- Descrição: Remove 39 tabelas que não são utilizadas no sistema
-- ============================================================================

-- ATENÇÃO: Este script remove tabelas permanentemente!
-- Certifique-se de ter um backup antes de executar!

BEGIN;

-- ============================================================================
-- 1. MÓDULO DE ADITIVOS DE CONTRATOS (não implementado)
-- ============================================================================
DROP TABLE IF EXISTS aditivos_contratos_itens CASCADE;
DROP TABLE IF EXISTS aditivos_contratos CASCADE;

-- ============================================================================
-- 2. MÓDULO DE AGRUPAMENTOS (não implementado)
-- ============================================================================
DROP TABLE IF EXISTS agrupamentos_faturamentos CASCADE;
DROP TABLE IF EXISTS agrupamentos_pedidos CASCADE;
DROP TABLE IF EXISTS agrupamentos_mensais CASCADE;

-- ============================================================================
-- 3. MÓDULO DE ALERTAS (substituído por notificações)
-- ============================================================================
DROP TABLE IF EXISTS alertas CASCADE;
DROP TABLE IF EXISTS estoque_alertas CASCADE;

-- ============================================================================
-- 4. MÓDULO DE ANÁLISES DE QUALIDADE (não implementado)
-- ============================================================================
DROP TABLE IF EXISTS analises_qualidade CASCADE;
DROP TABLE IF EXISTS controle_qualidade CASCADE;

-- ============================================================================
-- 5. MÓDULO DE BACKUPS MANUAIS (substituído por backups automáticos)
-- ============================================================================
DROP TABLE IF EXISTS backup_movimentacoes_estoque CASCADE;
DROP TABLE IF EXISTS backup_estoque_escolas CASCADE;

-- ============================================================================
-- 6. MÓDULO DE CÁLCULOS DE ENTREGA (não implementado)
-- ============================================================================
DROP TABLE IF EXISTS calculos_resultados CASCADE;
DROP TABLE IF EXISTS calculos_entrega CASCADE;

-- ============================================================================
-- 7. MÓDULO DE CARRINHO DE COMPRAS (não implementado)
-- ============================================================================
DROP TABLE IF EXISTS carrinho_itens CASCADE;

-- ============================================================================
-- 8. MÓDULO DE CONFIGURAÇÃO DE ENTREGAS (não implementado)
-- ============================================================================
DROP TABLE IF EXISTS configuracao_entregas CASCADE;

-- ============================================================================
-- 9. MÓDULO DE GÁS (não utilizado)
-- ============================================================================
DROP TABLE IF EXISTS gas_movimentacoes CASCADE;
DROP TABLE IF EXISTS gas_estoque CASCADE;
DROP TABLE IF EXISTS gas_controle CASCADE;

-- ============================================================================
-- 10. MÓDULO DE GESTOR DE ESCOLA (substituído por tabela usuarios)
-- ============================================================================
DROP TABLE IF EXISTS gestor_escola CASCADE;

-- ============================================================================
-- 11. MÓDULO DE HISTÓRICO DE SALDOS (calculado dinamicamente)
-- ============================================================================
DROP TABLE IF EXISTS historico_saldos CASCADE;

-- ============================================================================
-- 12. MÓDULO DE ITENS DE PEDIDO (duplicado)
-- ============================================================================
DROP TABLE IF EXISTS itens_pedido CASCADE;

-- ============================================================================
-- 13. MÓDULO DE LOGS DO SISTEMA (substituído por logs_auditoria)
-- ============================================================================
DROP TABLE IF EXISTS logs_sistema CASCADE;

-- ============================================================================
-- 14. MÓDULO DE MOVIMENTAÇÕES DE ESTOQUE (duplicados)
-- ============================================================================
DROP TABLE IF EXISTS movimentacoes_estoque_escolas CASCADE;
DROP TABLE IF EXISTS movimentacoes_estoque CASCADE;
DROP TABLE IF EXISTS estoque_escolar_movimentacoes CASCADE;

-- ============================================================================
-- 15. MÓDULO DE PLANEJAMENTO DE COMPRAS (não implementado)
-- ============================================================================
DROP TABLE IF EXISTS planejamento_compras_itens CASCADE;
DROP TABLE IF EXISTS planejamento_compras CASCADE;

-- ============================================================================
-- 16. MÓDULO DE PREPARAÇÃO DE CARDÁPIOS (substituído por cardapios)
-- ============================================================================
DROP TABLE IF EXISTS preparacao_itens CASCADE;
DROP TABLE IF EXISTS preparacao_cardapios CASCADE;

-- ============================================================================
-- 17. MÓDULO DE CATEGORIAS E UNIDADES DE PRODUTOS (integrado em produtos)
-- ============================================================================
DROP TABLE IF EXISTS produtos_unidades CASCADE;
DROP TABLE IF EXISTS produtos_categorias CASCADE;

-- ============================================================================
-- 18. MÓDULO DE RECEBIMENTOS ITENS (estrutura diferente)
-- ============================================================================
DROP TABLE IF EXISTS recebimentos_itens CASCADE;

-- ============================================================================
-- 19. MÓDULO DE RELATÓRIOS AGENDADOS (não implementado)
-- ============================================================================
DROP TABLE IF EXISTS relatorios_agendados CASCADE;

-- ============================================================================
-- 20. MÓDULO DE ROMANEIOS (substituído por rotas e guias)
-- ============================================================================
DROP TABLE IF EXISTS romaneios_itens CASCADE;
DROP TABLE IF EXISTS romaneios CASCADE;

-- ============================================================================
-- 21. MÓDULO DE ROTAS DE ESCOLAS (não utilizado)
-- ============================================================================
DROP TABLE IF EXISTS rotas_escolas CASCADE;

-- ============================================================================
-- 22. MÓDULO DE SALDO DE CONTRATOS POR MODALIDADE (calculado dinamicamente)
-- ============================================================================
DROP TABLE IF EXISTS saldo_contratos_modalidades CASCADE;

-- ============================================================================
-- 23. MÓDULO DE SESSÕES (substituído por JWT)
-- ============================================================================
DROP TABLE IF EXISTS sessoes CASCADE;

-- ============================================================================
-- 24. MÓDULO DE FATURAMENTO ITENS MODALIDADES (integrado em faturamento_itens)
-- ============================================================================
DROP TABLE IF EXISTS faturamento_itens_modalidades CASCADE;

-- ============================================================================
-- COMMIT
-- ============================================================================

-- Se chegou até aqui sem erros, commit
COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-REMOÇÃO
-- ============================================================================

-- Listar tabelas restantes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Contar tabelas restantes
SELECT COUNT(*) as total_tabelas_restantes
FROM pg_tables
WHERE schemaname = 'public';
