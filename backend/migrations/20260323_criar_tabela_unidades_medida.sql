-- Migração: Sistema de Unidades de Medida
-- Baseado em como grandes ERPs (SAP, Oracle) gerenciam conversões

-- 1. Tabela de Unidades de Medida
CREATE TABLE IF NOT EXISTS unidades_medida (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(10) UNIQUE NOT NULL,  -- Ex: KG, G, L, ML, UN, CX
  nome VARCHAR(50) NOT NULL,            -- Ex: Quilograma, Grama, Litro
  tipo VARCHAR(20) NOT NULL,            -- massa, volume, unidade
  unidade_base_id INTEGER,              -- Referência para unidade base do tipo
  fator_conversao_base NUMERIC(15, 6) DEFAULT 1, -- Fator para converter para base
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unidade_base_id) REFERENCES unidades_medida(id)
);

-- 2. Índices
CREATE INDEX idx_unidades_medida_tipo ON unidades_medida(tipo);
CREATE INDEX idx_unidades_medida_codigo ON unidades_medida(codigo);

-- 3. Inserir unidades padrão

-- MASSA (base: grama)
INSERT INTO unidades_medida (codigo, nome, tipo, unidade_base_id, fator_conversao_base) VALUES
('G', 'Grama', 'massa', NULL, 1),  -- Base
('KG', 'Quilograma', 'massa', 1, 1000),
('MG', 'Miligrama', 'massa', 1, 0.001),
('T', 'Tonelada', 'massa', 1, 1000000);

-- VOLUME (base: mililitro)
INSERT INTO unidades_medida (codigo, nome, tipo, unidade_base_id, fator_conversao_base) VALUES
('ML', 'Mililitro', 'volume', NULL, 1),  -- Base
('L', 'Litro', 'volume', 5, 1000);

-- UNIDADE (base: unidade)
INSERT INTO unidades_medida (codigo, nome, tipo, unidade_base_id, fator_conversao_base) VALUES
('UN', 'Unidade', 'unidade', NULL, 1),  -- Base
('DZ', 'Dúzia', 'unidade', 7, 12),
('CX', 'Caixa', 'unidade', 7, 1),  -- Quantidade variável, definida por produto
('PCT', 'Pacote', 'unidade', 7, 1),
('FD', 'Fardo', 'unidade', 7, 1),
('SC', 'Saco', 'unidade', 7, 1),
('LT', 'Lata', 'unidade', 7, 1),
('GL', 'Galão', 'unidade', 7, 1),
('BD', 'Bandeja', 'unidade', 7, 1),
('MC', 'Maço', 'unidade', 7, 1),
('PT', 'Pote', 'unidade', 7, 1),
('VD', 'Vidro', 'unidade', 7, 1),
('SH', 'Sachê', 'unidade', 7, 1),
('BL', 'Balde', 'unidade', 7, 1);

-- 4. Atualizar tabela produtos para usar unidade_medida_id
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade_medida_id INTEGER;
ALTER TABLE produtos ADD CONSTRAINT fk_produtos_unidade_medida 
  FOREIGN KEY (unidade_medida_id) REFERENCES unidades_medida(id);

-- 5. Atualizar tabela contrato_produtos
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS unidade_medida_compra_id INTEGER;
ALTER TABLE contrato_produtos ADD CONSTRAINT fk_contrato_produtos_unidade_medida 
  FOREIGN KEY (unidade_medida_compra_id) REFERENCES unidades_medida(id);

-- 6. Migrar dados existentes (mapeamento de texto para ID)
-- Produtos
UPDATE produtos p SET unidade_medida_id = um.id
FROM unidades_medida um
WHERE UPPER(TRIM(p.unidade_distribuicao)) = um.codigo
  OR LOWER(TRIM(p.unidade_distribuicao)) = LOWER(um.nome);

-- Contratos
UPDATE contrato_produtos cp SET unidade_medida_compra_id = um.id
FROM unidades_medida um
WHERE UPPER(TRIM(cp.unidade_compra)) = um.codigo
  OR LOWER(TRIM(cp.unidade_compra)) = LOWER(um.nome);

-- 7. Comentários
COMMENT ON TABLE unidades_medida IS 'Tabela de unidades de medida padronizadas';
COMMENT ON COLUMN unidades_medida.codigo IS 'Código único da unidade (ex: KG, L, UN)';
COMMENT ON COLUMN unidades_medida.tipo IS 'Tipo: massa, volume ou unidade';
COMMENT ON COLUMN unidades_medida.unidade_base_id IS 'Referência para unidade base do mesmo tipo';
COMMENT ON COLUMN unidades_medida.fator_conversao_base IS 'Fator para converter para unidade base (ex: 1 KG = 1000 G)';
