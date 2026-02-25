-- Criar tabela para composição nutricional dos produtos
CREATE TABLE IF NOT EXISTS produto_composicao_nutricional (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    calorias DECIMAL(8,2),
    proteinas DECIMAL(8,2),
    carboidratos DECIMAL(8,2),
    gorduras DECIMAL(8,2),
    fibras DECIMAL(8,2),
    sodio DECIMAL(8,2),
    acucares DECIMAL(8,2),
    gorduras_saturadas DECIMAL(8,2),
    gorduras_trans DECIMAL(8,2),
    colesterol DECIMAL(8,2),
    calcio DECIMAL(8,2),
    ferro DECIMAL(8,2),
    vitamina_c DECIMAL(8,2),
    vitamina_a DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(produto_id)
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_produto_composicao_produto_id ON produto_composicao_nutricional(produto_id);

-- Comentários para documentação
COMMENT ON TABLE produto_composicao_nutricional IS 'Armazena informações nutricionais dos produtos';
COMMENT ON COLUMN produto_composicao_nutricional.produto_id IS 'Referência ao produto';
COMMENT ON COLUMN produto_composicao_nutricional.calorias IS 'Calorias por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.proteinas IS 'Proteínas em gramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.carboidratos IS 'Carboidratos em gramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.gorduras IS 'Gorduras totais em gramas por 100g';