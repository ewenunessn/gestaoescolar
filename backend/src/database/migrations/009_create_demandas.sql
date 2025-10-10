-- Tabela de demandas das escolas
CREATE TABLE IF NOT EXISTS demandas (
  id SERIAL PRIMARY KEY,
  escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  numero_oficio VARCHAR(50) NOT NULL,
  data_solicitacao DATE NOT NULL,
  data_semead DATE, -- Opcional, pode ser preenchido depois
  objeto TEXT NOT NULL,
  descricao_itens TEXT NOT NULL,
  data_resposta_semead DATE,
  dias_solicitacao INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado_semead', 'atendido', 'nao_atendido')),
  observacoes TEXT,
  usuario_criacao_id INTEGER DEFAULT 1 REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX idx_demandas_escola ON demandas(escola_id);
CREATE INDEX idx_demandas_status ON demandas(status);
CREATE INDEX idx_demandas_data_solicitacao ON demandas(data_solicitacao);
CREATE INDEX idx_demandas_usuario_criacao ON demandas(usuario_criacao_id);

-- Comentários
COMMENT ON TABLE demandas IS 'Demandas das escolas e anexos da Secretaria Municipal de Educação';
COMMENT ON COLUMN demandas.numero_oficio IS 'Número do ofício solicitante';
COMMENT ON COLUMN demandas.data_solicitacao IS 'Data da solicitação';
COMMENT ON COLUMN demandas.data_semead IS 'Data de envio à SEMEAD';
COMMENT ON COLUMN demandas.objeto IS 'Objeto da solicitação';
COMMENT ON COLUMN demandas.descricao_itens IS 'Descrição dos itens solicitados';
COMMENT ON COLUMN demandas.data_resposta_semead IS 'Data da resposta da SEMEAD';
COMMENT ON COLUMN demandas.dias_solicitacao IS 'Quantidade de dias desde a solicitação';
COMMENT ON COLUMN demandas.status IS 'Status da demanda: pendente, enviado_semead, atendido, nao_atendido';
