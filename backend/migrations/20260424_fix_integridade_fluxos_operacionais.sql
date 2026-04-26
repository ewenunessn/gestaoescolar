-- Correcoes de integridade e consolidacao dos fluxos operacionais.
-- Mantem dados removidos em quarentena antes de limpar registros orfaos.

CREATE TABLE IF NOT EXISTS data_integrity_quarantine (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_pk TEXT NOT NULL,
  reason TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (table_name, row_pk, reason)
);

INSERT INTO data_integrity_quarantine (table_name, row_pk, reason, payload)
SELECT
  'escola_modalidades',
  em.id::text,
  'orphan escola_id or modalidade_id',
  to_jsonb(em)
FROM escola_modalidades em
LEFT JOIN escolas e ON e.id = em.escola_id
LEFT JOIN modalidades m ON m.id = em.modalidade_id
WHERE e.id IS NULL OR m.id IS NULL
ON CONFLICT (table_name, row_pk, reason) DO NOTHING;

DELETE FROM escola_modalidades em
WHERE NOT EXISTS (SELECT 1 FROM escolas e WHERE e.id = em.escola_id)
   OR NOT EXISTS (SELECT 1 FROM modalidades m WHERE m.id = em.modalidade_id);

INSERT INTO data_integrity_quarantine (table_name, row_pk, reason, payload)
SELECT
  'contrato_produtos_modalidades',
  cpm.id::text,
  'orphan contrato_produto_id or modalidade_id',
  to_jsonb(cpm)
FROM contrato_produtos_modalidades cpm
LEFT JOIN contrato_produtos cp ON cp.id = cpm.contrato_produto_id
LEFT JOIN modalidades m ON m.id = cpm.modalidade_id
WHERE cp.id IS NULL OR m.id IS NULL
ON CONFLICT (table_name, row_pk, reason) DO NOTHING;

DELETE FROM contrato_produtos_modalidades cpm
WHERE NOT EXISTS (SELECT 1 FROM contrato_produtos cp WHERE cp.id = cpm.contrato_produto_id)
   OR NOT EXISTS (SELECT 1 FROM modalidades m WHERE m.id = cpm.modalidade_id);

INSERT INTO data_integrity_quarantine (table_name, row_pk, reason, payload)
SELECT
  'rota_escolas',
  re.id::text,
  'orphan rota_id or escola_id',
  to_jsonb(re)
FROM rota_escolas re
LEFT JOIN rotas_entrega r ON r.id = re.rota_id
LEFT JOIN escolas e ON e.id = re.escola_id
WHERE r.id IS NULL OR e.id IS NULL
ON CONFLICT (table_name, row_pk, reason) DO NOTHING;

DELETE FROM rota_escolas re
WHERE NOT EXISTS (SELECT 1 FROM rotas_entrega r WHERE r.id = re.rota_id)
   OR NOT EXISTS (SELECT 1 FROM escolas e WHERE e.id = re.escola_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'escola_modalidades_escola_id_fkey'
  ) THEN
    ALTER TABLE escola_modalidades
      ADD CONSTRAINT escola_modalidades_escola_id_fkey
      FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'escola_modalidades_modalidade_id_fkey'
  ) THEN
    ALTER TABLE escola_modalidades
      ADD CONSTRAINT escola_modalidades_modalidade_id_fkey
      FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'escola_modalidades_quantidade_alunos_check'
  ) THEN
    ALTER TABLE escola_modalidades
      ADD CONSTRAINT escola_modalidades_quantidade_alunos_check
      CHECK (quantidade_alunos IS NULL OR quantidade_alunos >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'escola_modalidades_escola_id_modalidade_id_key'
  ) THEN
    ALTER TABLE escola_modalidades
      ADD CONSTRAINT escola_modalidades_escola_id_modalidade_id_key
      UNIQUE (escola_id, modalidade_id);
  END IF;
END $$;

ALTER TABLE escola_modalidades VALIDATE CONSTRAINT escola_modalidades_escola_id_fkey;
ALTER TABLE escola_modalidades VALIDATE CONSTRAINT escola_modalidades_modalidade_id_fkey;
ALTER TABLE escola_modalidades VALIDATE CONSTRAINT escola_modalidades_quantidade_alunos_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contrato_produtos_modalidades_contrato_produto_id_fkey'
  ) THEN
    ALTER TABLE contrato_produtos_modalidades
      ADD CONSTRAINT contrato_produtos_modalidades_contrato_produto_id_fkey
      FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contrato_produtos_modalidades_modalidade_id_fkey'
  ) THEN
    ALTER TABLE contrato_produtos_modalidades
      ADD CONSTRAINT contrato_produtos_modalidades_modalidade_id_fkey
      FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contrato_produtos_modalidades_quantidade_check'
  ) THEN
    ALTER TABLE contrato_produtos_modalidades
      ADD CONSTRAINT contrato_produtos_modalidades_quantidade_check
      CHECK (
        quantidade_inicial >= 0
        AND quantidade_consumida >= 0
        AND (quantidade_disponivel IS NULL OR quantidade_disponivel >= 0)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contrato_produtos_modalidades_contrato_produto_modalidade_key'
  ) THEN
    ALTER TABLE contrato_produtos_modalidades
      ADD CONSTRAINT contrato_produtos_modalidades_contrato_produto_modalidade_key
      UNIQUE (contrato_produto_id, modalidade_id);
  END IF;
END $$;

ALTER TABLE contrato_produtos_modalidades VALIDATE CONSTRAINT contrato_produtos_modalidades_contrato_produto_id_fkey;
ALTER TABLE contrato_produtos_modalidades VALIDATE CONSTRAINT contrato_produtos_modalidades_modalidade_id_fkey;
ALTER TABLE contrato_produtos_modalidades VALIDATE CONSTRAINT contrato_produtos_modalidades_quantidade_check;

ALTER TABLE rota_escolas VALIDATE CONSTRAINT fk_rota_escolas_escola;
ALTER TABLE rota_escolas VALIDATE CONSTRAINT fk_rota_escolas_rota;

ALTER TABLE faturamentos_pedidos
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'gerado';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'faturamentos_pedidos_status_check'
  ) THEN
    ALTER TABLE faturamentos_pedidos
      ADD CONSTRAINT faturamentos_pedidos_status_check
      CHECK (status IN ('gerado', 'consumido', 'cancelado')) NOT VALID;
  END IF;
END $$;

ALTER TABLE faturamentos_pedidos VALIDATE CONSTRAINT faturamentos_pedidos_status_check;

ALTER TABLE faturamentos_itens
  ADD COLUMN IF NOT EXISTS consumo_registrado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_consumo TIMESTAMP WITHOUT TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_faturamentos_itens_consumo
  ON faturamentos_itens (faturamento_pedido_id, consumo_registrado);
