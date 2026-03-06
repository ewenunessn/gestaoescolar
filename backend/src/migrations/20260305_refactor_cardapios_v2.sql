-- Migration: Refatorar cardápios para sistema mensal com calendário
-- Data: 2026-03-05

-- Drop tabelas antigas se existirem
DROP TABLE IF EXISTS cardapio_refeicao_produtos CASCADE;
DROP TABLE IF EXISTS cardapio_refeicoes_dia CASCADE;
DROP TABLE IF EXISTS cardapios_modalidade CASCADE;

-- Tabela de cardápios mensais por modalidade
CREATE TABLE cardapios_modalidade (
  id SERIAL PRIMARY KEY,
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(modalidade_id, mes, ano)
);

-- Tabela de refeições do cardápio (vincula refeição cadastrada a um dia específico)
CREATE TABLE cardapio_refeicoes_dia (
  id SERIAL PRIMARY KEY,
  cardapio_modalidade_id INTEGER NOT NULL REFERENCES cardapios_modalidade(id) ON DELETE CASCADE,
  refeicao_id INTEGER NOT NULL REFERENCES refeicoes(id) ON DELETE CASCADE,
  dia INTEGER NOT NULL CHECK (dia >= 1 AND dia <= 31),
  tipo_refeicao VARCHAR(50) NOT NULL CHECK (tipo_refeicao IN ('cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar')),
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cardapio_modalidade_id, dia, tipo_refeicao)
);

-- Índices para performance
CREATE INDEX idx_cardapios_modalidade_modalidade ON cardapios_modalidade(modalidade_id);
CREATE INDEX idx_cardapios_modalidade_mes_ano ON cardapios_modalidade(mes, ano);
CREATE INDEX idx_cardapio_refeicoes_cardapio ON cardapio_refeicoes_dia(cardapio_modalidade_id);
CREATE INDEX idx_cardapio_refeicoes_dia ON cardapio_refeicoes_dia(dia);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cardapios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cardapios_modalidade_updated_at
  BEFORE UPDATE ON cardapios_modalidade
  FOR EACH ROW
  EXECUTE FUNCTION update_cardapios_updated_at();

CREATE TRIGGER trigger_cardapio_refeicoes_updated_at
  BEFORE UPDATE ON cardapio_refeicoes_dia
  FOR EACH ROW
  EXECUTE FUNCTION update_cardapios_updated_at();
