-- Corrigir função fn_atribuir_periodo para não verificar campos que não existem

CREATE OR REPLACE FUNCTION fn_atribuir_periodo()
RETURNS TRIGGER AS $$
DECLARE
  v_periodo_id INTEGER;
  v_data_referencia DATE;
BEGIN
  -- Se periodo_id já foi informado, não faz nada
  IF NEW.periodo_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Determinar a data de referência baseado na tabela
  v_data_referencia := NULL;
  
  -- Para pedidos, usa data_pedido
  IF TG_TABLE_NAME = 'pedidos' THEN
    IF NEW.data_pedido IS NOT NULL THEN
      v_data_referencia := NEW.data_pedido;
    END IF;
  END IF;
  
  -- Para guias, usa created_at
  IF TG_TABLE_NAME = 'guias' THEN
    IF NEW.created_at IS NOT NULL THEN
      v_data_referencia := NEW.created_at::DATE;
    END IF;
  END IF;
  
  -- Para cardápios, usa data_inicio (apenas se o campo existir)
  IF TG_TABLE_NAME = 'cardapios' THEN
    -- Usar bloco de exceção para evitar erro se o campo não existir
    BEGIN
      v_data_referencia := (to_jsonb(NEW)->>'data_inicio')::DATE;
    EXCEPTION WHEN OTHERS THEN
      v_data_referencia := NULL;
    END;
  END IF;
  
  -- Tentar encontrar período baseado na data de referência
  IF v_data_referencia IS NOT NULL THEN
    SELECT id INTO v_periodo_id
    FROM periodos
    WHERE v_data_referencia BETWEEN data_inicio AND data_fim
    LIMIT 1;
  END IF;
  
  -- Se não encontrou período pela data, usa o período ativo
  IF v_periodo_id IS NULL THEN
    SELECT id INTO v_periodo_id
    FROM periodos
    WHERE ativo = true
    LIMIT 1;
  END IF;
  
  -- Atribuir o periodo_id encontrado
  NEW.periodo_id = v_periodo_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION fn_atribuir_periodo() IS 'Atribui automaticamente periodo_id baseado na data de referência da tabela ou no período ativo';
