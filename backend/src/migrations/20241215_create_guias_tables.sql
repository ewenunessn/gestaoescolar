-- Migration: Create guias de demanda tables
-- Created: 2024-12-15

-- Create guias table
CREATE TABLE IF NOT EXISTS guias (
    id SERIAL PRIMARY KEY,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2020),
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create guia_produto_escola table
CREATE TABLE IF NOT EXISTS guia_produto_escola (
    id SERIAL PRIMARY KEY,
    guia_id INTEGER NOT NULL REFERENCES guias(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    escola_id INTEGER NOT NULL REFERENCES escolas(id),
    quantidade DECIMAL(10,3) NOT NULL CHECK (quantidade > 0),
    unidade VARCHAR(20) NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guia_id, produto_id, escola_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guias_mes_ano ON guias(mes, ano);
CREATE INDEX IF NOT EXISTS idx_guias_status ON guias(status);
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_guia ON guia_produto_escola(guia_id);
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_produto ON guia_produto_escola(produto_id);
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_escola ON guia_produto_escola(escola_id);

-- Insert trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guias_updated_at BEFORE UPDATE ON guias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guia_produto_escola_updated_at BEFORE UPDATE ON guia_produto_escola
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();