-- Migração: Remover tabela cardapios antiga
-- Data: 16/03/2026
-- Descrição: Remove tabela cardapios e cardapio_refeicoes (sistema antigo)
--            Mantém apenas cardapios_modalidade e cardapio_refeicoes_dia (sistema novo)

-- Verificar se há dados na tabela antiga
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM cardapios;
  
  IF v_count > 0 THEN
    RAISE NOTICE '⚠️  ATENÇÃO: Existem % cardápios na tabela antiga!', v_count;
    RAISE NOTICE '📋 Listando cardápios que serão removidos:';
  ELSE
    RAISE NOTICE '✅ Tabela cardapios está vazia, pode ser removida com segurança';
  END IF;
END $$;

-- Listar cardápios que serão removidos (se houver)
SELECT 
  id,
  nome,
  descricao,
  data_inicio,
  data_fim,
  ativo
FROM cardapios
ORDER BY created_at DESC;

-- Remover triggers relacionados
DROP TRIGGER IF EXISTS trg_cardapios_atribuir_periodo ON cardapios;
DROP TRIGGER IF EXISTS trigger_cardapios_updated_at ON cardapios;

-- Remover função relacionada (se não for usada por outras tabelas)
DROP FUNCTION IF EXISTS atribuir_periodo_cardapio();

-- Remover tabelas (CASCADE remove dependências)
DROP TABLE IF EXISTS cardapio_refeicoes CASCADE;
DROP TABLE IF EXISTS cardapios CASCADE;

-- Verificar se foram removidas
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cardapios') 
    THEN '✅ Tabela cardapios removida'
    ELSE '❌ Tabela cardapios ainda existe'
  END as status_cardapios,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cardapio_refeicoes') 
    THEN '✅ Tabela cardapio_refeicoes removida'
    ELSE '❌ Tabela cardapio_refeicoes ainda existe'
  END as status_cardapio_refeicoes;

-- Verificar tabelas que permanecem
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'cardapios_modalidade' THEN '✅ Sistema novo de cardápios'
    WHEN table_name = 'cardapio_refeicoes_dia' THEN '✅ Sistema novo de refeições'
    ELSE '📋 Outra tabela'
  END as descricao
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'cardapio%'
ORDER BY table_name;
