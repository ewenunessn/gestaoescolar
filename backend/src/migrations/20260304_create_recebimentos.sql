-- Migration: Criar tabela de recebimentos de pedidos
-- Data: 04/03/2026
-- Descrição: Registrar recebimentos parciais ou totais de itens de pedidos

-- Tabela de recebimentos
CREATE TABLE IF NOT EXISTS recebimentos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  pedido_item_id INTEGER NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
  quantidade_recebida DECIMAL(10,3) NOT NULL CHECK (quantidade_recebida > 0),
  data_recebimento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacoes TEXT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_recebimentos_pedido ON recebimentos(pedido_id);
CREATE INDEX idx_recebimentos_item ON recebimentos(pedido_item_id);
CREATE INDEX idx_recebimentos_data ON recebimentos(data_recebimento);
CREATE INDEX idx_recebimentos_usuario ON recebimentos(usuario_id);

-- Comentários
COMMENT ON TABLE recebimentos IS 'Registros de recebimento de itens de pedidos';
COMMENT ON COLUMN recebimentos.quantidade_recebida IS 'Quantidade recebida neste registro';
COMMENT ON COLUMN recebimentos.data_recebimento IS 'Data e hora do recebimento';

-- View para facilitar consultas
CREATE OR REPLACE VIEW vw_recebimentos_detalhados AS
SELECT 
  r.id,
  r.pedido_id,
  r.pedido_item_id,
  r.quantidade_recebida,
  r.data_recebimento,
  r.observacoes,
  r.usuario_id,
  u.nome as usuario_nome,
  p.numero as pedido_numero,
  p.status as pedido_status,
  pi.quantidade as quantidade_pedida,
  pi.preco_unitario,
  pi.valor_total as valor_item,
  prod.nome as produto_nome,
  prod.unidade as produto_unidade,
  f.nome as fornecedor_nome,
  f.cnpj as fornecedor_cnpj,
  c.numero as contrato_numero,
  -- Calcular total recebido do item
  (SELECT COALESCE(SUM(quantidade_recebida), 0) 
   FROM recebimentos 
   WHERE pedido_item_id = r.pedido_item_id) as total_recebido_item,
  -- Calcular saldo pendente
  (pi.quantidade - (SELECT COALESCE(SUM(quantidade_recebida), 0) 
                     FROM recebimentos 
                     WHERE pedido_item_id = r.pedido_item_id)) as saldo_pendente
FROM recebimentos r
JOIN usuarios u ON r.usuario_id = u.id
JOIN pedidos p ON r.pedido_id = p.id
JOIN pedido_itens pi ON r.pedido_item_id = pi.id
JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
JOIN produtos prod ON cp.produto_id = prod.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN fornecedores f ON c.fornecedor_id = f.id;

-- View para resumo de recebimentos por pedido
CREATE OR REPLACE VIEW vw_resumo_recebimentos_pedido AS
SELECT 
  p.id as pedido_id,
  p.numero as pedido_numero,
  p.status as pedido_status,
  COUNT(DISTINCT r.id) as total_recebimentos,
  COUNT(DISTINCT pi.id) as total_itens,
  COUNT(DISTINCT CASE 
    WHEN (SELECT COALESCE(SUM(quantidade_recebida), 0) 
          FROM recebimentos 
          WHERE pedido_item_id = pi.id) >= pi.quantidade 
    THEN pi.id 
  END) as itens_completos,
  SUM(r.quantidade_recebida * pi.preco_unitario) as valor_recebido,
  MAX(r.data_recebimento) as ultimo_recebimento
FROM pedidos p
LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
LEFT JOIN recebimentos r ON pi.id = r.pedido_item_id
GROUP BY p.id, p.numero, p.status;
