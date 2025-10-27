-- Migration para adicionar controle de validade simples ao estoque
-- Sem sistema de lotes, apenas data de validade por item

-- Criar tabela estoque_escolas se não existir
CREATE TABLE IF NOT EXISTS estoque_escolas (
  id SERIAL PRIMARY KEY,
  escola_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade_atual DECIMAL(10,3) DEFAULT 0,
  data_validade DATE NULL, -- Campo para validade do item
  data_entrada DATE DEFAULT CURRENT_DATE, -- Quando o item foi adicionado
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(escola_id, produto_id)
);

-- Criar tabela de histórico de movimentações se não existir
CREATE TABLE IF NOT EXISTS historico_estoque (
  id SERIAL PRIMARY KEY,
  estoque_escola_id INTEGER,
  escola_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  tipo_movimentacao VARCHAR(20) NOT NULL, -- 'entrada', 'saida', 'ajuste'
  quantidade_anterior DECIMAL(10,3) DEFAULT 0,
  quantidade_movimentada DECIMAL(10,3) NOT NULL,
  quantidade_posterior DECIMAL(10,3) DEFAULT 0,
  data_validade DATE NULL, -- Validade do item na movimentação
  motivo TEXT,
  documento_referencia VARCHAR(100),
  usuario_id INTEGER NULL, -- Campo opcional
  data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar campos de validade se não existirem
DO $$ 
BEGIN
  -- Adicionar data_validade se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'estoque_escolas' AND column_name = 'data_validade') THEN
    ALTER TABLE estoque_escolas ADD COLUMN data_validade DATE NULL;
  END IF;
  
  -- Adicionar data_entrada se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'estoque_escolas' AND column_name = 'data_entrada') THEN
    ALTER TABLE estoque_escolas ADD COLUMN data_entrada DATE DEFAULT CURRENT_DATE;
  END IF;
  
  -- Adicionar observacoes se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'estoque_escolas' AND column_name = 'observacoes') THEN
    ALTER TABLE estoque_escolas ADD COLUMN observacoes TEXT;
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_escola ON estoque_escolas(escola_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_produto ON estoque_escolas(produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_validade ON estoque_escolas(data_validade);
CREATE INDEX IF NOT EXISTS idx_historico_estoque_escola ON historico_estoque(escola_id);
CREATE INDEX IF NOT EXISTS idx_historico_estoque_produto ON historico_estoque(produto_id);