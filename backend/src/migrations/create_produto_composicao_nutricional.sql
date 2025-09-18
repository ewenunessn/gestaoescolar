-- Criação da tabela de composição nutricional de produtos
-- Executar este script no banco de dados PostgreSQL

CREATE TABLE IF NOT EXISTS produto_composicao_nutricional (
    produto_id INTEGER PRIMARY KEY REFERENCES produtos(id) ON DELETE CASCADE,
    valor_energetico_kcal DECIMAL(10,2),
    valor_energetico_kj DECIMAL(10,2),
    carboidratos DECIMAL(10,2),
    proteinas DECIMAL(10,2),
    gorduras_totais DECIMAL(10,2),
    gorduras_saturadas DECIMAL(10,2),
    gorduras_trans DECIMAL(10,2),
    fibra_alimentar DECIMAL(10,2),
    sodio DECIMAL(10,2),
    acucares_totais DECIMAL(10,2),
    acucares_adicionados DECIMAL(10,2),
    colesterol DECIMAL(10,2),
    calcio DECIMAL(10,2),
    ferro DECIMAL(10,2),
    vitamina_c DECIMAL(10,2),
    porcao_referencia DECIMAL(10,2) DEFAULT 100,
    unidade_porcao VARCHAR(20) DEFAULT 'g',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_produto_composicao_produto_id 
ON produto_composicao_nutricional(produto_id);

-- Função para atualizar o timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_produto_composicao_updated_at ON produto_composicao_nutricional;
CREATE TRIGGER update_produto_composicao_updated_at
    BEFORE UPDATE ON produto_composicao_nutricional
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários das colunas
COMMENT ON TABLE produto_composicao_nutricional IS 'Composição nutricional dos produtos';
COMMENT ON COLUMN produto_composicao_nutricional.valor_energetico_kcal IS 'Valor energético em kcal por porção';
COMMENT ON COLUMN produto_composicao_nutricional.carboidratos IS 'Carboidratos em gramas por porção';
COMMENT ON COLUMN produto_composicao_nutricional.proteinas IS 'Proteínas em gramas por porção';
COMMENT ON COLUMN produto_composicao_nutricional.gorduras_totais IS 'Gorduras totais em gramas por porção';