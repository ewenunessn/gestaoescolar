-- Tabela de campanhas/disparos de notificação para escolas
CREATE TABLE IF NOT EXISTS disparos_notificacao (
  id            SERIAL PRIMARY KEY,
  titulo        VARCHAR(200) NOT NULL,
  mensagem      TEXT NOT NULL,
  link          VARCHAR(500),
  tipo          VARCHAR(50) NOT NULL DEFAULT 'info', -- info | aviso | sucesso | erro
  -- Alvo do disparo
  alvo          VARCHAR(20) NOT NULL DEFAULT 'todas', -- todas | modalidade | selecao
  modalidade_id INTEGER REFERENCES modalidades(id) ON DELETE SET NULL,
  escola_ids    INTEGER[],  -- para alvo='selecao'
  -- Agendamento
  agendado_para TIMESTAMPTZ,  -- NULL = imediato
  -- Status
  status        VARCHAR(20) NOT NULL DEFAULT 'pendente', -- pendente | processando | enviado | cancelado | erro
  total_enviado INTEGER DEFAULT 0,
  erro_msg      TEXT,
  -- Auditoria
  criado_por    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  enviado_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disparos_status ON disparos_notificacao(status);
CREATE INDEX IF NOT EXISTS idx_disparos_agendado ON disparos_notificacao(agendado_para) WHERE status = 'pendente';
