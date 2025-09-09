-- Criar tabela principal de controle de gás
CREATE TABLE IF NOT EXISTS gas_controle (
    id SERIAL PRIMARY KEY,
    escola_id INTEGER NOT NULL,
    total_botijoes INTEGER NOT NULL DEFAULT 0,
    botijoes_cheios INTEGER NOT NULL DEFAULT 0,
    botijoes_vazios INTEGER NOT NULL DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de movimentações de gás
CREATE TABLE IF NOT EXISTS gas_movimentacoes (
    id SERIAL PRIMARY KEY,
    gas_controle_id INTEGER NOT NULL,
    tipo_movimentacao VARCHAR(50) NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'troca')),
    quantidade INTEGER NOT NULL,
    status_anterior VARCHAR(20),
    status_novo VARCHAR(20),
    observacoes TEXT,
    usuario_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gas_controle_id) REFERENCES gas_controle(id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_gas_controle_escola_id ON gas_controle(escola_id);
CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_gas_controle_id ON gas_movimentacoes(gas_controle_id);
CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_created_at ON gas_movimentacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_tipo ON gas_movimentacoes(tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_data ON gas_movimentacoes(data_movimentacao);