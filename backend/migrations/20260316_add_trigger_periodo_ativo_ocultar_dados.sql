-- Migração: Garantir que período ativo sempre tenha ocultar_dados = false
-- Data: 16/03/2026
-- Descrição: Adiciona trigger para forçar ocultar_dados = false quando período é ativado

-- Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION garantir_periodo_ativo_visivel()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o período está sendo ativado, forçar ocultar_dados = false
  IF NEW.ativo = true THEN
    NEW.ocultar_dados := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger que executa antes de INSERT ou UPDATE
DROP TRIGGER IF EXISTS trigger_periodo_ativo_visivel ON periodos;

CREATE TRIGGER trigger_periodo_ativo_visivel
  BEFORE INSERT OR UPDATE ON periodos
  FOR EACH ROW
  EXECUTE FUNCTION garantir_periodo_ativo_visivel();

-- Corrigir dados existentes: garantir que período ativo tenha ocultar_dados = false
UPDATE periodos 
SET ocultar_dados = false 
WHERE ativo = true AND ocultar_dados = true;

-- Verificar resultado
SELECT 
  id, 
  ano, 
  ativo, 
  ocultar_dados,
  CASE 
    WHEN ativo = true AND ocultar_dados = false THEN '✅ OK'
    WHEN ativo = true AND ocultar_dados = true THEN '❌ ERRO'
    ELSE '✅ OK'
  END as status
FROM periodos
ORDER BY ano DESC;
