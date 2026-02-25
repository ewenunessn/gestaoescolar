-- Schema essencial para Guia/Demanda no Neon (idempotente)
-- Tabelas: escolas, guias, guia_produto_escola, rotas_entrega, rota_escolas

CREATE TABLE IF NOT EXISTS escolas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT,
  codigo_acesso TEXT,
  endereco TEXT,
  municipio TEXT,
  endereco_maps TEXT,
  telefone TEXT,
  email TEXT,
  nome_gestor TEXT,
  administracao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guias (
  id SERIAL PRIMARY KEY,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  nome TEXT,
  observacao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','fechada','cancelada')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guia_produto_escola (
  id SERIAL PRIMARY KEY,
  guia_id INTEGER NOT NULL,
  produto_id INTEGER,
  escola_id INTEGER,
  quantidade DECIMAL(12,3) DEFAULT 0,
  unidade TEXT,
  lote TEXT,
  observacao TEXT,
  para_entrega BOOLEAN DEFAULT TRUE,
  entrega_confirmada BOOLEAN DEFAULT FALSE,
  quantidade_entregue DECIMAL(12,3),
  data_entrega TIMESTAMP,
  nome_quem_recebeu TEXT,
  nome_quem_entregou TEXT,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rotas_entrega (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rota_escolas (
  id SERIAL PRIMARY KEY,
  rota_id INTEGER NOT NULL,
  escola_id INTEGER,
  ordem INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reforço opcional de FKs (só se as tabelas base existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_gpe_guia') THEN
    ALTER TABLE guia_produto_escola
      ADD CONSTRAINT fk_gpe_guia
      FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='produtos')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_gpe_produto') THEN
    ALTER TABLE guia_produto_escola
      ADD CONSTRAINT fk_gpe_produto
      FOREIGN KEY (produto_id) REFERENCES produtos(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='escolas')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_gpe_escola') THEN
    ALTER TABLE guia_produto_escola
      ADD CONSTRAINT fk_gpe_escola
      FOREIGN KEY (escola_id) REFERENCES escolas(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_re_rota') THEN
    ALTER TABLE rota_escolas
      ADD CONSTRAINT fk_re_rota
      FOREIGN KEY (rota_id) REFERENCES rotas_entrega(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='escolas')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_re_escola') THEN
    ALTER TABLE rota_escolas
      ADD CONSTRAINT fk_re_escola
      FOREIGN KEY (escola_id) REFERENCES escolas(id);
  END IF;
END
$$;

