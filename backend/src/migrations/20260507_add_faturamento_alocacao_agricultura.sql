CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(255) UNIQUE NOT NULL,
  valor TEXT,
  descricao TEXT,
  tipo VARCHAR(50) DEFAULT 'string',
  categoria VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE faturamentos_pedidos
  ADD COLUMN IF NOT EXISTS alocacao_agricultura_snapshot JSONB;

INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria)
VALUES (
  'faturamento_alocacao_agricultura',
  '{"ativo":true,"percentual_agricultura":45,"modalidade_base_ids":[],"fornecedor_tipos_agricultura":["cooperativa","individual"],"distribuir_excedente":true}',
  'Configuracao da reserva de agricultura familiar no faturamento',
  'json',
  'faturamento'
)
ON CONFLICT (chave) DO NOTHING;

UPDATE configuracoes_sistema
SET valor = (
  SELECT jsonb_set(
    valor::jsonb - 'modalidade_base_id',
    '{modalidade_base_ids}',
    CASE
      WHEN valor::jsonb ? 'modalidade_base_ids' THEN valor::jsonb->'modalidade_base_ids'
      WHEN NULLIF(valor::jsonb->>'modalidade_base_id', '') IS NOT NULL THEN jsonb_build_array((valor::jsonb->>'modalidade_base_id')::int)
      ELSE '[]'::jsonb
    END,
    true
  )::text
),
updated_at = CURRENT_TIMESTAMP
WHERE chave = 'faturamento_alocacao_agricultura'
  AND valor IS NOT NULL
  AND valor::jsonb ? 'modalidade_base_id';
