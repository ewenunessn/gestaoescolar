-- Script para limpar registros de consumo e histórico no banco LOCAL
-- ⚠️ ATENÇÃO: Este script irá APAGAR dados! Use com cuidado!

-- 1. Limpar histórico de movimentações de consumo
DELETE FROM movimentacoes_consumo_modalidade;

-- 2. Resetar consumo registrado nos itens de faturamento
UPDATE faturamento_itens 
SET consumo_registrado = false,
    data_consumo = NULL;

-- 3. Resetar quantidade consumida nos contratos
UPDATE contrato_produtos_modalidades 
SET quantidade_consumida = 0;

-- 4. Resetar status dos faturamentos
UPDATE faturamentos 
SET status = 'gerado' 
WHERE status = 'consumido';

-- Verificar resultados
SELECT 'Movimentações apagadas' as acao, COUNT(*) as total FROM movimentacoes_consumo_modalidade;
SELECT 'Itens resetados' as acao, COUNT(*) as total FROM faturamento_itens WHERE consumo_registrado = false;
SELECT 'Contratos resetados' as acao, COUNT(*) as total FROM contrato_produtos_modalidades WHERE quantidade_consumida = 0;
SELECT 'Faturamentos resetados' as acao, COUNT(*) as total FROM faturamentos WHERE status = 'gerado';

-- Mensagem final
SELECT '✅ Limpeza concluída com sucesso!' as resultado;
