-- Migration: Remover sistema de cardápios antigo
-- Data: 2026-03-14
-- Descrição: Remove tabelas cardapios e cardapio_refeicoes antigas
--            O sistema agora usa apenas cardapios_modalidade e cardapio_refeicoes_dia

-- IMPORTANTE: Execute este script apenas após confirmar que:
-- 1. Todos os dados importantes foram migrados para o novo sistema
-- 2. Nenhum código está usando as tabelas antigas
-- 3. Foi feito backup do banco de dados

BEGIN;

-- 1. Verificar se há dados nas tabelas antigas
DO $$
DECLARE
  cardapios_count INTEGER;
  refeicoes_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cardapios_count FROM cardapios;
  SELECT COUNT(*) INTO refeicoes_count FROM cardapio_refeicoes;
  
  RAISE NOTICE 'Cardápios antigos: %', cardapios_count;
  RAISE NOTICE 'Refeições antigas: %', refeicoes_count;
  
  IF cardapios_count > 0 THEN
    RAISE WARNING 'Existem % cardápios na tabela antiga. Considere fazer backup antes de continuar.', cardapios_count;
  END IF;
END $$;

-- 2. Remover foreign key constraints
ALTER TABLE IF EXISTS cardapio_refeicoes 
  DROP CONSTRAINT IF EXISTS cardapio_refeicoes_cardapio_id_fkey;

ALTER TABLE IF EXISTS cardapio_refeicoes 
  DROP CONSTRAINT IF EXISTS cardapio_refeicoes_refeicao_id_fkey;

ALTER TABLE IF EXISTS cardapio_refeicoes 
  DROP CONSTRAINT IF EXISTS cardapio_refeicoes_modalidade_id_fkey;

-- 3. Remover índices
DROP INDEX IF EXISTS idx_cardapio_refeicoes_cardapio_id;
DROP INDEX IF EXISTS idx_cardapio_refeicoes_refeicao_id;
DROP INDEX IF EXISTS idx_cardapios_data_inicio;
DROP INDEX IF EXISTS idx_cardapios_data_fim;
DROP INDEX IF EXISTS idx_cardapios_ativo;

-- 4. Remover tabelas antigas
DROP TABLE IF EXISTS cardapio_refeicoes CASCADE;
DROP TABLE IF EXISTS cardapios CASCADE;

-- 5. Confirmar remoção
DO $$
BEGIN
  RAISE NOTICE '✅ Tabelas antigas removidas com sucesso!';
  RAISE NOTICE '✅ Sistema agora usa apenas:';
  RAISE NOTICE '   - cardapios_modalidade';
  RAISE NOTICE '   - cardapio_refeicoes_dia';
END $$;

COMMIT;
