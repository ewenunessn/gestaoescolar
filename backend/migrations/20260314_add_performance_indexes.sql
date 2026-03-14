-- Migration: Adicionar Índices de Performance
-- Data: 2026-03-14
-- Descrição: Índices para otimizar queries frequentes do sistema

-- Índices para cardapio_refeicoes_dia
CREATE INDEX IF NOT EXISTS idx_cardapio_refeicoes_dia_cardapio_modalidade 
ON cardapio_refeicoes_dia(cardapio_modalidade_id);

CREATE INDEX IF NOT EXISTS idx_cardapio_refeicoes_dia_refeicao 
ON cardapio_refeicoes_dia(refeicao_id);

CREATE INDEX IF NOT EXISTS idx_cardapio_refeicoes_dia_dia 
ON cardapio_refeicoes_dia(dia);

-- Índices para escola_modalidades
CREATE INDEX IF NOT EXISTS idx_escola_modalidades_escola 
ON escola_modalidades(escola_id);

CREATE INDEX IF NOT EXISTS idx_escola_modalidades_modalidade 
ON escola_modalidades(modalidade_id);

-- Índices para refeicao_produtos
CREATE INDEX IF NOT EXISTS idx_refeicao_produtos_refeicao 
ON refeicao_produtos(refeicao_id);

CREATE INDEX IF NOT EXISTS idx_refeicao_produtos_produto 
ON refeicao_produtos(produto_id);

-- Índices para refeicao_produto_modalidade (per capita ajustado)
CREATE INDEX IF NOT EXISTS idx_refeicao_produto_modalidade_refeicao_produto 
ON refeicao_produto_modalidade(refeicao_produto_id);

CREATE INDEX IF NOT EXISTS idx_refeicao_produto_modalidade_modalidade 
ON refeicao_produto_modalidade(modalidade_id);

-- Índices para cardapios_modalidade
CREATE INDEX IF NOT EXISTS idx_cardapios_modalidade_modalidade 
ON cardapios_modalidade(modalidade_id);

CREATE INDEX IF NOT EXISTS idx_cardapios_modalidade_competencia 
ON cardapios_modalidade(ano, mes);

CREATE INDEX IF NOT EXISTS idx_cardapios_modalidade_ativo 
ON cardapios_modalidade(ativo);
