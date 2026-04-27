-- Vincula solicitações de alimentos a guias existentes ou guias emergenciais.

ALTER TABLE solicitacoes_itens
  DROP CONSTRAINT IF EXISTS solicitacoes_itens_status_check;

ALTER TABLE solicitacoes_itens
  ADD CONSTRAINT solicitacoes_itens_status_check
  CHECK (status IN ('pendente', 'aceito', 'recusado', 'contemplado'));

ALTER TABLE solicitacoes_itens
  ADD COLUMN IF NOT EXISTS quantidade_aprovada NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS data_entrega_prevista DATE,
  ADD COLUMN IF NOT EXISTS guia_id INTEGER REFERENCES guias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guia_produto_escola_id INTEGER REFERENCES guia_produto_escola(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS atendimento_tipo TEXT
    CHECK (atendimento_tipo IS NULL OR atendimento_tipo IN ('emergencial', 'guia_existente')),
  ADD COLUMN IF NOT EXISTS observacao_aprovacao TEXT;

CREATE INDEX IF NOT EXISTS idx_solicitacoes_itens_guia
  ON solicitacoes_itens(guia_id, guia_produto_escola_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_itens_atendimento
  ON solicitacoes_itens(atendimento_tipo);
