-- Migration: Refatoração do módulo de cardápios
-- Data: 2026-03-05
-- Descrição: Reestrutura cardápios para trabalhar por modalidade com múltiplas refeições por dia

-- 1. Criar tabela de cardápios por modalidade
CREATE TABLE IF NOT EXISTS cardapios_modalidade (
  id SERIAL PRIMARY KEY,
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_cardapio_modalidade_nome UNIQUE (modalidade_id, nome)
);

-- 2. Criar tabela de refeições do cardápio (múltiplas por dia)
CREATE TABLE IF NOT EXISTS cardapio_refeicoes_dia (
  id SERIAL PRIMARY KEY,
  cardapio_modalidade_id INTEGER NOT NULL REFERENCES cardapios_modalidade(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo_refeicao VARCHAR(50) NOT NULL CHECK (tipo_refeicao IN ('cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar')),
  descricao TEXT,
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Criar tabela de produtos da refeição
CREATE TABLE IF NOT EXISTS cardapio_refeicao_produtos (
  id SERIAL PRIMARY KEY,
  cardapio_refeicao_dia_id INTEGER NOT NULL REFERENCES cardapio_refeicoes_dia(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade DECIMAL(10, 3) NOT NULL,
  per_capita BOOLEAN DEFAULT false,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_refeicao_produto UNIQUE (cardapio_refeicao_dia_id, produto_id)
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cardapios_modalidade_modalidade ON cardapios_modalidade(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_cardapios_modalidade_datas ON cardapios_modalidade(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_cardapio_refeicoes_dia_cardapio ON cardapio_refeicoes_dia(cardapio_modalidade_id);
CREATE INDEX IF NOT EXISTS idx_cardapio_refeicoes_dia_data ON cardapio_refeicoes_dia(data);
CREATE INDEX IF NOT EXISTS idx_cardapio_refeicao_produtos_refeicao ON cardapio_refeicao_produtos(cardapio_refeicao_dia_id);
CREATE INDEX IF NOT EXISTS idx_cardapio_refeicao_produtos_produto ON cardapio_refeicao_produtos(produto_id);

-- 5. Comentários nas tabelas
COMMENT ON TABLE cardapios_modalidade IS 'Cardápios organizados por modalidade de ensino';
COMMENT ON TABLE cardapio_refeicoes_dia IS 'Refeições cadastradas por dia no cardápio (pode ter múltiplas refeições por dia)';
COMMENT ON TABLE cardapio_refeicao_produtos IS 'Produtos que compõem cada refeição do cardápio';

COMMENT ON COLUMN cardapio_refeicoes_dia.tipo_refeicao IS 'Tipo da refeição: cafe_manha, lanche_manha, almoco, lanche_tarde, jantar';
COMMENT ON COLUMN cardapio_refeicao_produtos.per_capita IS 'Se true, quantidade é por aluno; se false, quantidade é total';
