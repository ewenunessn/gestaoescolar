-- Migration: Optimize demandas queries performance
-- Created: 2024-11-25
-- Purpose: Add indexes to improve query performance and prevent timeouts

-- Índices compostos para otimizar as queries mais comuns
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_data_solicitacao 
  ON demandas(tenant_id, data_solicitacao DESC);

CREATE INDEX IF NOT EXISTS idx_demandas_tenant_created_at 
  ON demandas(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_demandas_tenant_status 
  ON demandas(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_demandas_tenant_escola_id 
  ON demandas(tenant_id, escola_id) WHERE escola_id IS NOT NULL;

-- Índice para otimizar o JOIN com escolas
CREATE INDEX IF NOT EXISTS idx_escolas_id_tenant 
  ON escolas(id, tenant_id);

-- Índice para otimizar o JOIN com usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_id 
  ON usuarios(id);

-- Índice para busca por escola_nome
CREATE INDEX IF NOT EXISTS idx_demandas_escola_nome 
  ON demandas(escola_nome) WHERE escola_nome IS NOT NULL;

-- Índice para busca por objeto
CREATE INDEX IF NOT EXISTS idx_demandas_objeto 
  ON demandas USING gin(to_tsvector('portuguese', objeto));

-- Índice para range de datas
CREATE INDEX IF NOT EXISTS idx_demandas_data_solicitacao 
  ON demandas(data_solicitacao);

-- Adicionar estatísticas para o otimizador
ANALYZE demandas;
ANALYZE escolas;
ANALYZE usuarios;

-- Comentários
COMMENT ON INDEX idx_demandas_tenant_data_solicitacao IS 'Otimiza listagem ordenada por data de solicitação';
COMMENT ON INDEX idx_demandas_tenant_created_at IS 'Otimiza listagem ordenada por data de criação';
COMMENT ON INDEX idx_demandas_tenant_status IS 'Otimiza filtros por status';
COMMENT ON INDEX idx_demandas_tenant_escola_id IS 'Otimiza filtros por escola';
