-- Criar tabela de períodos/exercícios do sistema
-- Cada período representa um ano letivo com data de abertura e fechamento

CREATE TABLE IF NOT EXISTS periodos (
  id SERIAL PRIMARY KEY,
  ano INTEGER NOT NULL UNIQUE,
  descricao VARCHAR(255),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativo BOOLEAN DEFAULT false,
  fechado BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Validações
  CONSTRAINT check_data_fim_maior CHECK (data_fim > data_inicio),
  CONSTRAINT check_ano_valido CHECK (ano >= 2020 AND ano <= 2100)
);

-- Índices
CREATE INDEX idx_periodos_ano ON periodos(ano);
CREATE INDEX idx_periodos_ativo ON periodos(ativo);
CREATE INDEX idx_periodos_datas ON periodos(data_inicio, data_fim);

-- Comentários
COMMENT ON TABLE periodos IS 'Períodos/exercícios do sistema para controle de dados por ano letivo';
COMMENT ON COLUMN periodos.ano IS 'Ano do período (ex: 2026)';
COMMENT ON COLUMN periodos.ativo IS 'Período ativo no momento (apenas um pode estar ativo)';
COMMENT ON COLUMN periodos.fechado IS 'Período fechado (não permite mais alterações)';
COMMENT ON COLUMN periodos.data_inicio IS 'Data de início do período letivo';
COMMENT ON COLUMN periodos.data_fim IS 'Data de fim do período letivo';

-- Trigger para garantir apenas um período ativo
CREATE OR REPLACE FUNCTION fn_apenas_um_periodo_ativo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ativo = true THEN
    -- Desativa todos os outros períodos
    UPDATE periodos SET ativo = false WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apenas_um_periodo_ativo
  BEFORE INSERT OR UPDATE ON periodos
  FOR EACH ROW
  WHEN (NEW.ativo = true)
  EXECUTE FUNCTION fn_apenas_um_periodo_ativo();

-- Inserir períodos padrão
INSERT INTO periodos (ano, descricao, data_inicio, data_fim, ativo) VALUES
  (2024, 'Ano Letivo 2024', '2024-01-01', '2024-12-31', false),
  (2025, 'Ano Letivo 2025', '2025-01-01', '2025-12-31', false),
  (2026, 'Ano Letivo 2026', '2026-01-01', '2026-12-31', true)
ON CONFLICT (ano) DO NOTHING;

-- Adicionar coluna periodo_id nas tabelas relevantes
-- Isso permite filtrar dados por período

-- Pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS periodo_id INTEGER REFERENCES periodos(id);
CREATE INDEX IF NOT EXISTS idx_pedidos_periodo ON pedidos(periodo_id);

-- Guias
ALTER TABLE guias ADD COLUMN IF NOT EXISTS periodo_id INTEGER REFERENCES periodos(id);
CREATE INDEX IF NOT EXISTS idx_guias_periodo ON guias(periodo_id);

-- Cardápios
ALTER TABLE cardapios ADD COLUMN IF NOT EXISTS periodo_id INTEGER REFERENCES periodos(id);
CREATE INDEX IF NOT EXISTS idx_cardapios_periodo ON cardapios(periodo_id);

-- Faturamentos
ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS periodo_id INTEGER REFERENCES periodos(id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_periodo ON faturamentos(periodo_id);

-- Função para preencher periodo_id automaticamente baseado na data
CREATE OR REPLACE FUNCTION fn_atribuir_periodo()
RETURNS TRIGGER AS $$
DECLARE
  v_periodo_id INTEGER;
BEGIN
  -- Se periodo_id não foi informado, tenta encontrar baseado na data
  IF NEW.periodo_id IS NULL THEN
    -- Para pedidos, usa data_pedido
    IF TG_TABLE_NAME = 'pedidos' AND NEW.data_pedido IS NOT NULL THEN
      SELECT id INTO v_periodo_id
      FROM periodos
      WHERE NEW.data_pedido BETWEEN data_inicio AND data_fim
      LIMIT 1;
      
      NEW.periodo_id = v_periodo_id;
    END IF;
    
    -- Para guias, usa data_criacao
    IF TG_TABLE_NAME = 'guias' AND NEW.created_at IS NOT NULL THEN
      SELECT id INTO v_periodo_id
      FROM periodos
      WHERE NEW.created_at::DATE BETWEEN data_inicio AND data_fim
      LIMIT 1;
      
      NEW.periodo_id = v_periodo_id;
    END IF;
    
    -- Para cardápios, usa data_inicio
    IF TG_TABLE_NAME = 'cardapios' AND NEW.data_inicio IS NOT NULL THEN
      SELECT id INTO v_periodo_id
      FROM periodos
      WHERE NEW.data_inicio BETWEEN data_inicio AND data_fim
      LIMIT 1;
      
      NEW.periodo_id = v_periodo_id;
    END IF;
    
    -- Se ainda não encontrou, usa o período ativo
    IF NEW.periodo_id IS NULL THEN
      SELECT id INTO v_periodo_id
      FROM periodos
      WHERE ativo = true
      LIMIT 1;
      
      NEW.periodo_id = v_periodo_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DROP TRIGGER IF EXISTS trg_pedidos_atribuir_periodo ON pedidos;
CREATE TRIGGER trg_pedidos_atribuir_periodo
  BEFORE INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION fn_atribuir_periodo();

DROP TRIGGER IF EXISTS trg_guias_atribuir_periodo ON guias;
CREATE TRIGGER trg_guias_atribuir_periodo
  BEFORE INSERT ON guias
  FOR EACH ROW
  EXECUTE FUNCTION fn_atribuir_periodo();

DROP TRIGGER IF EXISTS trg_cardapios_atribuir_periodo ON cardapios;
CREATE TRIGGER trg_cardapios_atribuir_periodo
  BEFORE INSERT ON cardapios
  FOR EACH ROW
  EXECUTE FUNCTION fn_atribuir_periodo();

-- Atualizar registros existentes com periodo_id
UPDATE pedidos p
SET periodo_id = per.id
FROM periodos per
WHERE p.periodo_id IS NULL
  AND p.data_pedido BETWEEN per.data_inicio AND per.data_fim;

UPDATE guias g
SET periodo_id = per.id
FROM periodos per
WHERE g.periodo_id IS NULL
  AND g.created_at::DATE BETWEEN per.data_inicio AND per.data_fim;

UPDATE cardapios c
SET periodo_id = per.id
FROM periodos per
WHERE c.periodo_id IS NULL
  AND c.data_inicio BETWEEN per.data_inicio AND per.data_fim;

-- Se ainda houver registros sem período, atribui ao período ativo
UPDATE pedidos SET periodo_id = (SELECT id FROM periodos WHERE ativo = true LIMIT 1)
WHERE periodo_id IS NULL;

UPDATE guias SET periodo_id = (SELECT id FROM periodos WHERE ativo = true LIMIT 1)
WHERE periodo_id IS NULL;

UPDATE cardapios SET periodo_id = (SELECT id FROM periodos WHERE ativo = true LIMIT 1)
WHERE periodo_id IS NULL;

COMMENT ON COLUMN pedidos.periodo_id IS 'Período/exercício ao qual o pedido pertence';
COMMENT ON COLUMN guias.periodo_id IS 'Período/exercício ao qual a guia pertence';
COMMENT ON COLUMN cardapios.periodo_id IS 'Período/exercício ao qual o cardápio pertence';
