-- Migration: Create rotas de entregas tables
-- Created: 2024-12-16

-- Tabela para definir rotas de entrega
CREATE TABLE IF NOT EXISTS rotas_entrega (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    cor VARCHAR(7) DEFAULT '#1976d2', -- Cor para identificação visual
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para associar escolas às rotas
CREATE TABLE IF NOT EXISTS rota_escolas (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER NOT NULL REFERENCES rotas_entrega(id) ON DELETE CASCADE,
    escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    ordem INTEGER DEFAULT 1, -- Ordem de visita na rota
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rota_id, escola_id)
);

-- Tabela para planejamento de entregas por guia
CREATE TABLE IF NOT EXISTS planejamento_entregas (
    id SERIAL PRIMARY KEY,
    guia_id INTEGER NOT NULL REFERENCES guias(id) ON DELETE CASCADE,
    rota_id INTEGER NOT NULL REFERENCES rotas_entrega(id) ON DELETE CASCADE,
    data_planejada DATE,
    status VARCHAR(20) DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_andamento', 'concluido', 'cancelado')),
    responsavel VARCHAR(255), -- Nome do responsável pela rota
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guia_id, rota_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rota_escolas_rota ON rota_escolas(rota_id);
CREATE INDEX IF NOT EXISTS idx_rota_escolas_escola ON rota_escolas(escola_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_entregas_guia ON planejamento_entregas(guia_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_entregas_rota ON planejamento_entregas(rota_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_entregas_status ON planejamento_entregas(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rotas_entrega_updated_at BEFORE UPDATE ON rotas_entrega
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planejamento_entregas_updated_at BEFORE UPDATE ON planejamento_entregas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir rotas de exemplo
INSERT INTO rotas_entrega (nome, descricao, cor) VALUES
('Rota Centro', 'Escolas da região central da cidade', '#1976d2'),
('Rota Norte', 'Escolas da zona norte', '#388e3c'),
('Rota Sul', 'Escolas da zona sul', '#f57c00'),
('Rota Leste', 'Escolas da zona leste', '#7b1fa2'),
('Rota Oeste', 'Escolas da zona oeste', '#d32f2f')
ON CONFLICT DO NOTHING;