-- Script SQL para criar tabelas de controle de gás no Neon Database
-- Execute este script no console SQL do Neon

-- =====================================================
-- TABELAS DE CONTROLE DE GÁS
-- =====================================================

-- 1. Criar tabela gas_controle
CREATE TABLE IF NOT EXISTS gas_controle (
  id SERIAL PRIMARY KEY,
  escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  total_botijoes INTEGER NOT NULL DEFAULT 0,
  botijoes_cheios INTEGER NOT NULL DEFAULT 0,
  botijoes_vazios INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(escola_id),
  CONSTRAINT check_botijoes_validos CHECK (botijoes_cheios >= 0 AND botijoes_vazios >= 0 AND total_botijoes >= 0),
  CONSTRAINT check_soma_botijoes CHECK (botijoes_cheios + botijoes_vazios = total_botijoes)
);

-- 2. Criar tabela gas_movimentacoes
CREATE TABLE IF NOT EXISTS gas_movimentacoes (
  id SERIAL PRIMARY KEY,
  gas_controle_id INTEGER NOT NULL REFERENCES gas_controle(id) ON DELETE CASCADE,
  tipo_movimentacao VARCHAR(20) NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'troca')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  status_anterior VARCHAR(10) NOT NULL CHECK (status_anterior IN ('cheio', 'vazio')),
  status_novo VARCHAR(10) NOT NULL CHECK (status_novo IN ('cheio', 'vazio')),
  observacoes TEXT,
  usuario_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para busca por escola
CREATE INDEX IF NOT EXISTS idx_gas_controle_escola_id ON gas_controle(escola_id);

-- Índice para busca de movimentações por controle
CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_controle_id ON gas_movimentacoes(gas_controle_id);

-- Índice para ordenação por data (mais recentes primeiro)
CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_created_at ON gas_movimentacoes(created_at DESC);

-- =====================================================
-- TRIGGER PARA ATUALIZAR TIMESTAMP AUTOMATICAMENTE
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_gas_controle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a função
DROP TRIGGER IF EXISTS trigger_update_gas_controle_updated_at ON gas_controle;
CREATE TRIGGER trigger_update_gas_controle_updated_at
  BEFORE UPDATE ON gas_controle
  FOR EACH ROW
  EXECUTE FUNCTION update_gas_controle_updated_at();

-- =====================================================
-- COMENTÁRIOS DAS TABELAS
-- =====================================================

COMMENT ON TABLE gas_controle IS 'Controle principal de botijões de gás por escola';
COMMENT ON COLUMN gas_controle.escola_id IS 'ID da escola (referência à tabela escolas)';
COMMENT ON COLUMN gas_controle.total_botijoes IS 'Total de botijões da escola';
COMMENT ON COLUMN gas_controle.botijoes_cheios IS 'Quantidade de botijões cheios';
COMMENT ON COLUMN gas_controle.botijoes_vazios IS 'Quantidade de botijões vazios';

COMMENT ON TABLE gas_movimentacoes IS 'Histórico de movimentações de botijões de gás';
COMMENT ON COLUMN gas_movimentacoes.tipo_movimentacao IS 'Tipo: entrada, saida ou troca';
COMMENT ON COLUMN gas_movimentacoes.quantidade IS 'Quantidade de botijões movimentados';
COMMENT ON COLUMN gas_movimentacoes.status_anterior IS 'Status antes da movimentação: cheio ou vazio';
COMMENT ON COLUMN gas_movimentacoes.status_novo IS 'Status após a movimentação: cheio ou vazio';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('gas_controle', 'gas_movimentacoes')
ORDER BY table_name;

-- Verificar constraints
SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
  AND table_name IN ('gas_controle', 'gas_movimentacoes')
ORDER BY table_name, constraint_type;

-- Script executado com sucesso!
-- As tabelas de controle de gás estão prontas para uso.