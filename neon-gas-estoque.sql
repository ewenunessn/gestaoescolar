-- Script SQL para criar sistema de estoque de gás no Neon
-- Execute este script diretamente no console do Neon

-- Criar tabela gas_estoque
CREATE TABLE IF NOT EXISTS gas_estoque (
  id SERIAL PRIMARY KEY,
  escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  nome_local VARCHAR(255) NOT NULL,
  quantidade_total INTEGER NOT NULL DEFAULT 0,
  quantidade_em_uso INTEGER NOT NULL DEFAULT 0,
  quantidade_reserva INTEGER NOT NULL DEFAULT 0,
  quantidade_vazia INTEGER NOT NULL DEFAULT 0,
  status_estoque VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (status_estoque IN ('vazio', 'baixo', 'normal', 'alto')),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(escola_id, nome_local),
  CONSTRAINT check_quantidades_validas CHECK (
    quantidade_total >= 0 AND 
    quantidade_em_uso >= 0 AND 
    quantidade_reserva >= 0 AND 
    quantidade_vazia >= 0
  ),
  CONSTRAINT check_soma_quantidades CHECK (
    quantidade_em_uso + quantidade_reserva + quantidade_vazia = quantidade_total
  )
);

-- Criar nova tabela gas_movimentacoes_estoque (para não conflitar com a existente)
CREATE TABLE IF NOT EXISTS gas_movimentacoes_estoque (
  id SERIAL PRIMARY KEY,
  gas_estoque_id INTEGER NOT NULL REFERENCES gas_estoque(id) ON DELETE CASCADE,
  tipo_movimentacao VARCHAR(20) NOT NULL CHECK (tipo_movimentacao IN ('recarga', 'troca_uso', 'entrada', 'saida')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  quantidade_anterior_total INTEGER NOT NULL,
  quantidade_anterior_em_uso INTEGER NOT NULL,
  quantidade_anterior_reserva INTEGER NOT NULL,
  quantidade_anterior_vazia INTEGER NOT NULL,
  quantidade_nova_total INTEGER NOT NULL,
  quantidade_nova_em_uso INTEGER NOT NULL,
  quantidade_nova_reserva INTEGER NOT NULL,
  quantidade_nova_vazia INTEGER NOT NULL,
  observacoes TEXT,
  usuario_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_gas_estoque_escola_id ON gas_estoque(escola_id);
CREATE INDEX IF NOT EXISTS idx_gas_estoque_status ON gas_estoque(status_estoque);
CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_estoque_estoque_id ON gas_movimentacoes_estoque(gas_estoque_id);
CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_estoque_created_at ON gas_movimentacoes_estoque(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_estoque_tipo ON gas_movimentacoes_estoque(tipo_movimentacao);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_gas_estoque_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_gas_estoque_updated_at ON gas_estoque;
CREATE TRIGGER trigger_update_gas_estoque_updated_at
  BEFORE UPDATE ON gas_estoque
  FOR EACH ROW
  EXECUTE FUNCTION update_gas_estoque_updated_at();

-- Criar função para validar movimentações
CREATE OR REPLACE FUNCTION validate_gas_movimentacao_estoque()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar se as quantidades anteriores batem com o estoque atual
  IF NOT EXISTS (
    SELECT 1 FROM gas_estoque 
    WHERE id = NEW.gas_estoque_id 
    AND quantidade_total = NEW.quantidade_anterior_total
    AND quantidade_em_uso = NEW.quantidade_anterior_em_uso
    AND quantidade_reserva = NEW.quantidade_anterior_reserva
    AND quantidade_vazia = NEW.quantidade_anterior_vazia
  ) THEN
    RAISE EXCEPTION 'Quantidades anteriores não conferem com o estoque atual';
  END IF;
  
  -- Validar se as novas quantidades são válidas
  IF NEW.quantidade_nova_em_uso + NEW.quantidade_nova_reserva + NEW.quantidade_nova_vazia != NEW.quantidade_nova_total THEN
    RAISE EXCEPTION 'Soma das novas quantidades não confere com o total';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validar movimentações
DROP TRIGGER IF EXISTS trigger_validate_gas_movimentacao_estoque ON gas_movimentacoes_estoque;
CREATE TRIGGER trigger_validate_gas_movimentacao_estoque
  BEFORE INSERT ON gas_movimentacoes_estoque
  FOR EACH ROW
  EXECUTE FUNCTION validate_gas_movimentacao_estoque();

-- Inserir dados de exemplo (opcional)
-- INSERT INTO gas_estoque (escola_id, nome_local, quantidade_total, quantidade_em_uso, quantidade_reserva, quantidade_vazia)
-- VALUES (1, 'Cozinha Principal', 10, 3, 4, 3);

-- Verificar se as tabelas foram criadas
SELECT 'gas_estoque' as tabela, COUNT(*) as registros FROM gas_estoque
UNION ALL
SELECT 'gas_movimentacoes_estoque' as tabela, COUNT(*) as registros FROM gas_movimentacoes_estoque;

-- Mostrar estrutura das tabelas criadas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('gas_estoque', 'gas_movimentacoes_estoque')
ORDER BY table_name, ordinal_position;