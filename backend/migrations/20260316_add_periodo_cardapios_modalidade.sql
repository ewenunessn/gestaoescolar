-- Migração: Adicionar coluna periodo_id em cardapios_modalidade
-- Data: 16/03/2026
-- Descrição: Adiciona coluna periodo_id e trigger para atribuição automática

-- Adicionar coluna periodo_id
ALTER TABLE cardapios_modalidade 
ADD COLUMN IF NOT EXISTS periodo_id INTEGER REFERENCES periodos(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_cardapios_modalidade_periodo 
ON cardapios_modalidade(periodo_id);

-- Função para atribuir período automaticamente baseado no ano
CREATE OR REPLACE FUNCTION atribuir_periodo_cardapio_modalidade()
RETURNS TRIGGER AS $$
DECLARE
  v_periodo_id INTEGER;
BEGIN
  -- Buscar período correspondente ao ano do cardápio
  SELECT id INTO v_periodo_id
  FROM periodos
  WHERE ano = NEW.ano
  LIMIT 1;
  
  -- Se encontrou período, atribuir
  IF v_periodo_id IS NOT NULL THEN
    NEW.periodo_id := v_periodo_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_atribuir_periodo_cardapio_modalidade ON cardapios_modalidade;

CREATE TRIGGER trigger_atribuir_periodo_cardapio_modalidade
  BEFORE INSERT OR UPDATE ON cardapios_modalidade
  FOR EACH ROW
  EXECUTE FUNCTION atribuir_periodo_cardapio_modalidade();

-- Atualizar registros existentes
UPDATE cardapios_modalidade cm
SET periodo_id = p.id
FROM periodos p
WHERE cm.ano = p.ano
  AND cm.periodo_id IS NULL;

-- Verificar resultado
SELECT 
  cm.id,
  cm.nome,
  cm.ano,
  cm.mes,
  cm.periodo_id,
  p.ano as periodo_ano,
  CASE 
    WHEN cm.periodo_id IS NOT NULL THEN '✅ OK'
    ELSE '⚠️ Sem período'
  END as status
FROM cardapios_modalidade cm
LEFT JOIN periodos p ON cm.periodo_id = p.id
ORDER BY cm.ano DESC, cm.mes DESC;
