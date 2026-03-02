-- Criar comprovante de demonstração
DO $$
DECLARE
  v_escola_id INTEGER;
  v_numero VARCHAR(50);
  v_comprovante_id INTEGER;
BEGIN
  -- Buscar primeira escola
  SELECT id INTO v_escola_id FROM escolas LIMIT 1;
  
  -- Gerar número
  SELECT gerar_numero_comprovante() INTO v_numero;
  
  -- Criar comprovante
  INSERT INTO comprovantes_entrega (
    numero_comprovante,
    escola_id,
    nome_quem_entregou,
    nome_quem_recebeu,
    cargo_recebedor,
    observacao,
    total_itens,
    status
  ) VALUES (
    v_numero,
    v_escola_id,
    'João Silva (Demo)',
    'Maria Santos (Demo)',
    'Diretora',
    'Comprovante de demonstração criado para testes',
    3,
    'finalizado'
  ) RETURNING id INTO v_comprovante_id;
  
  RAISE NOTICE 'Comprovante criado: % (ID: %)', v_numero, v_comprovante_id;
END $$;
