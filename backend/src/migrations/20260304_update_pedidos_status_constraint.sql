-- Migration: Atualizar constraint de status dos pedidos
-- Data: 04/03/2026
-- Descrição: Atualizar constraint para aceitar novos status simplificados

-- Remover constraint antiga
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;

-- Adicionar nova constraint com status simplificados
ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check 
  CHECK (status IN ('pendente', 'recebido_parcial', 'concluido', 'suspenso', 'cancelado'));

-- Verificar se há algum status inválido
SELECT id, numero, status 
FROM pedidos 
WHERE status NOT IN ('pendente', 'recebido_parcial', 'concluido', 'suspenso', 'cancelado');
