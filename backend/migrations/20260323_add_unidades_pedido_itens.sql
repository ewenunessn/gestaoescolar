-- Migration: Adicionar campos de unidades em pedido_itens
-- Data: 2026-03-23
-- Objetivo: Armazenar informações de conversão entre unidades de distribuição e compra

-- Adicionar campos para rastreabilidade de conversões
ALTER TABLE pedido_itens 
  ADD COLUMN IF NOT EXISTS quantidade_kg NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS unidade VARCHAR(50),
  ADD COLUMN IF NOT EXISTS quantidade_distribuicao NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS unidade_distribuicao VARCHAR(50);

-- Comentários explicativos
COMMENT ON COLUMN pedido_itens.quantidade IS 'Quantidade em unidade de compra (do contrato)';
COMMENT ON COLUMN pedido_itens.unidade IS 'Unidade de compra (ex: Caixa, Fardo)';
COMMENT ON COLUMN pedido_itens.quantidade_kg IS 'Quantidade original em kg (para auditoria)';
COMMENT ON COLUMN pedido_itens.quantidade_distribuicao IS 'Quantidade em unidade de distribuição (ex: pacotes)';
COMMENT ON COLUMN pedido_itens.unidade_distribuicao IS 'Unidade de distribuição (ex: Pacote)';

-- Atualizar registros existentes (definir kg como padrão)
UPDATE pedido_itens 
SET 
  quantidade_kg = quantidade,
  unidade = 'kg'
WHERE quantidade_kg IS NULL;

COMMENT ON TABLE pedido_itens IS 'Itens de pedidos de compra com conversão de unidades';
