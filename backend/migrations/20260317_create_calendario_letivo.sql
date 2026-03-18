-- Criação das tabelas para o Sistema de Calendário Letivo

-- Tabela principal do calendário letivo
CREATE TABLE IF NOT EXISTS calendario_letivo (
  id SERIAL PRIMARY KEY,
  ano_letivo INTEGER NOT NULL UNIQUE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  total_dias_letivos_obrigatorio INTEGER DEFAULT 200,
  divisao_ano VARCHAR(20) DEFAULT 'bimestral' CHECK (divisao_ano IN ('bimestral', 'trimestral', 'semestral')),
  dias_semana_letivos JSONB DEFAULT '["seg","ter","qua","qui","sex"]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_datas CHECK (data_fim > data_inicio)
);

-- Tabela de eventos do calendário
CREATE TABLE IF NOT EXISTS eventos_calendario (
  id SERIAL PRIMARY KEY,
  calendario_letivo_id INTEGER REFERENCES calendario_letivo(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN (
    'dia_letivo',
    'feriado_nacional',
    'feriado_estadual', 
    'feriado_municipal',
    'feriado_escolar',
    'evento_escolar',
    'recesso',
    'ferias',
    'reuniao_pedagogica',
    'conselho_classe',
    'formacao',
    'avaliacao',
    'entrega_boletim',
    'matricula',
    'outro'
  )),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  hora_inicio TIME,
  hora_fim TIME,
  local VARCHAR(255),
  responsavel VARCHAR(255),
  cor VARCHAR(7) DEFAULT '#3788d8', -- cor em hexadecimal
  recorrente BOOLEAN DEFAULT false,
  recorrencia_config JSONB, -- {tipo: 'semanal', intervalo: 1, dias: ['seg','qua'], ate: '2024-12-31'}
  observacoes TEXT,
  anexos JSONB, -- [{nome: 'arquivo.pdf', url: '/uploads/...'}]
  criado_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_datas_evento CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- Tabela de períodos avaliativos (bimestres, trimestres, semestres)
CREATE TABLE IF NOT EXISTS periodos_avaliativos (
  id SERIAL PRIMARY KEY,
  calendario_letivo_id INTEGER REFERENCES calendario_letivo(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL, -- '1º Bimestre', '2º Trimestre', etc
  numero_periodo INTEGER NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  data_entrega_notas DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_datas_periodo CHECK (data_fim > data_inicio),
  CONSTRAINT unique_periodo_calendario UNIQUE (calendario_letivo_id, numero_periodo)
);

-- Tabela de exceções de dias letivos
-- Permite marcar um dia específico como letivo ou não letivo, sobrescrevendo a regra padrão
CREATE TABLE IF NOT EXISTS dias_letivos_excecoes (
  id SERIAL PRIMARY KEY,
  calendario_letivo_id INTEGER REFERENCES calendario_letivo(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  eh_letivo BOOLEAN NOT NULL, -- true = tornar letivo (ex: sábado letivo), false = tornar não letivo (ex: feriado)
  motivo VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_data_calendario UNIQUE (calendario_letivo_id, data)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_letivo ON eventos_calendario(calendario_letivo_id);
CREATE INDEX IF NOT EXISTS idx_eventos_data_inicio ON eventos_calendario(data_inicio);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos_calendario(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_periodos_calendario ON periodos_avaliativos(calendario_letivo_id);
CREATE INDEX IF NOT EXISTS idx_excecoes_calendario ON dias_letivos_excecoes(calendario_letivo_id);
CREATE INDEX IF NOT EXISTS idx_excecoes_data ON dias_letivos_excecoes(data);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendario_letivo_updated_at BEFORE UPDATE ON calendario_letivo
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eventos_calendario_updated_at BEFORE UPDATE ON eventos_calendario
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_periodos_avaliativos_updated_at BEFORE UPDATE ON periodos_avaliativos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE calendario_letivo IS 'Configuração do ano letivo';
COMMENT ON TABLE eventos_calendario IS 'Eventos do calendário escolar (feriados, eventos, recessos, etc)';
COMMENT ON TABLE periodos_avaliativos IS 'Períodos avaliativos (bimestres, trimestres, semestres)';
COMMENT ON TABLE dias_letivos_excecoes IS 'Exceções para dias letivos (sábados letivos, feriados, etc)';

-- Dados iniciais de exemplo (opcional - comentado)
/*
INSERT INTO calendario_letivo (ano_letivo, data_inicio, data_fim, divisao_ano) 
VALUES (2024, '2024-02-05', '2024-12-20', 'bimestral');

INSERT INTO periodos_avaliativos (calendario_letivo_id, nome, numero_periodo, data_inicio, data_fim, data_entrega_notas)
VALUES 
  (1, '1º Bimestre', 1, '2024-02-05', '2024-04-12', '2024-04-19'),
  (1, '2º Bimestre', 2, '2024-04-15', '2024-06-28', '2024-07-05'),
  (1, '3º Bimestre', 3, '2024-07-29', '2024-10-04', '2024-10-11'),
  (1, '4º Bimestre', 4, '2024-10-07', '2024-12-20', '2024-12-27');
*/
