-- Remove o trigger de pedidos que está causando erro
-- A tabela pedidos não possui coluna periodo_id

DROP TRIGGER IF EXISTS trg_pedidos_atribuir_periodo ON pedidos;

-- Atualizar a função para não processar pedidos
CREATE OR REPLACE FUNCTION fn_atribuir_periodo()
RETURNS TRIGGER AS $$
DECLARE
  v_periodo_id INTEGER;
BEGIN
  -- Se periodo_id não foi informado, tenta encontrar baseado na data
  IF NEW.periodo_id IS NULL THEN
    -- Para guias, usa created_at
    IF TG_TABLE_NAME = 'guias' AND NEW.created_at IS NOT NULL THEN
      SELECT id INTO v_periodo_id
      FROM periodos
      WHERE NEW.created_at::DATE BETWEEN data_inicio AND data_fim
      LIMIT 1;
      
      NEW.periodo_id = v_periodo_id;
    END IF;
    
    -- Para cardápios, usa data_inicio
    IF TG_TABLE_NAME = 'cardapios' AND NEW.data_inicio IS NOT NULL THEN
      SELECT id INTO v_periodo_id
      FROM periodos
      WHERE NEW.data_inicio BETWEEN data_inicio AND data_fim
      LIMIT 1;
      
      NEW.periodo_id = v_periodo_id;
    END IF;
    
    -- Se ainda não encontrou, usa o período ativo
    IF NEW.periodo_id IS NULL THEN
      SELECT id INTO v_periodo_id
      FROM periodos
      WHERE ativo = true
      LIMIT 1;
      
      NEW.periodo_id = v_periodo_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
