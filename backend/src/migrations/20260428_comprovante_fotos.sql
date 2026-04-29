CREATE TABLE IF NOT EXISTS comprovante_fotos (
  id SERIAL PRIMARY KEY,
  comprovante_id INTEGER NOT NULL REFERENCES comprovantes_entrega(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  content_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'expired')),
  uploaded_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (comprovante_id)
);

CREATE INDEX IF NOT EXISTS idx_comprovante_fotos_comprovante
  ON comprovante_fotos(comprovante_id);

CREATE INDEX IF NOT EXISTS idx_comprovante_fotos_status
  ON comprovante_fotos(status);

CREATE INDEX IF NOT EXISTS idx_comprovante_fotos_expires_at
  ON comprovante_fotos(expires_at);

CREATE OR REPLACE FUNCTION update_comprovante_fotos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comprovante_fotos_updated_at ON comprovante_fotos;

CREATE TRIGGER trigger_comprovante_fotos_updated_at
  BEFORE UPDATE ON comprovante_fotos
  FOR EACH ROW
  EXECUTE FUNCTION update_comprovante_fotos_updated_at();
