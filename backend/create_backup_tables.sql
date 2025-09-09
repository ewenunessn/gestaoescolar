-- Criar tabelas de backup para o sistema de reset do estoque

-- Tabela de backup para movimentações de estoque
CREATE TABLE IF NOT EXISTS backup_movimentacoes_estoque (
    id SERIAL PRIMARY KEY,
    escola_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    tipo_movimentacao VARCHAR(50) NOT NULL,
    quantidade DECIMAL(10,3) NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER,
    data_backup TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de backup para estoque das escolas
CREATE TABLE IF NOT EXISTS backup_estoque_escolas (
    id SERIAL PRIMARY KEY,
    escola_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    quantidade_atual DECIMAL(10,3) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_backup TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_backup_movimentacoes_data ON backup_movimentacoes_estoque(data_backup);
CREATE INDEX IF NOT EXISTS idx_backup_movimentacoes_escola ON backup_movimentacoes_estoque(escola_id);
CREATE INDEX IF NOT EXISTS idx_backup_estoque_data ON backup_estoque_escolas(data_backup);
CREATE INDEX IF NOT EXISTS idx_backup_estoque_escola ON backup_estoque_escolas(escola_id);

SELECT 'Tabelas de backup criadas com sucesso!' as resultado;