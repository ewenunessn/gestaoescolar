-- ========================================
-- CÓDIGO ÚNICO E QR CODE PARA GUIAS
-- ========================================
-- 
-- Adiciona código único para cada guia de entrega
-- Similar ao sistema de comprovantes
-- Formato: GUIA-YYYY-MM-NNNNN
-- 
-- Data: 31/03/2026
-- ========================================

-- Adicionar campo codigo_guia na tabela guias
ALTER TABLE guias
ADD COLUMN IF NOT EXISTS codigo_guia VARCHAR(50) UNIQUE;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_guias_codigo ON guias(codigo_guia);

-- Comentário para documentação
COMMENT ON COLUMN guias.codigo_guia IS 'Código único da guia (formato: GUIA-YYYY-MM-NNNNN)';

-- Função para gerar código de guia
CREATE OR REPLACE FUNCTION gerar_codigo_guia(p_mes INTEGER, p_ano INTEGER)
RETURNS VARCHAR AS $$
DECLARE
  sequencia INTEGER;
  mes_str VARCHAR(2);
  ano_str VARCHAR(4);
  codigo VARCHAR(50);
BEGIN
  -- Formatar mês e ano
  mes_str := LPAD(p_mes::TEXT, 2, '0');
  ano_str := p_ano::TEXT;
  
  -- Buscar o último número do mês/ano
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo_guia FROM 'GUIA-[0-9]{4}-[0-9]{2}-([0-9]{5})') AS INTEGER)
  ), 0) + 1
  INTO sequencia
  FROM guias
  WHERE codigo_guia LIKE 'GUIA-' || ano_str || '-' || mes_str || '-%';
  
  -- Gerar código no formato GUIA-YYYY-MM-NNNNN
  codigo := 'GUIA-' || ano_str || '-' || mes_str || '-' || LPAD(sequencia::TEXT, 5, '0');
  
  RETURN codigo;
END;
$$ LANGUAGE plpgsql;

-- Preencher códigos para guias existentes
DO $$
DECLARE
  guia_record RECORD;
  novo_codigo VARCHAR(50);
BEGIN
  FOR guia_record IN 
    SELECT g.id, g.mes, g.ano 
    FROM guias g
    WHERE g.codigo_guia IS NULL
    ORDER BY g.ano, g.mes, g.id
  LOOP
    novo_codigo := gerar_codigo_guia(guia_record.mes, guia_record.ano);
    
    UPDATE guias 
    SET codigo_guia = novo_codigo 
    WHERE id = guia_record.id;
    
    RAISE NOTICE 'Guia ID % recebeu código %', guia_record.id, novo_codigo;
  END LOOP;
END $$;

-- Tornar o campo obrigatório após preencher dados existentes
ALTER TABLE guias
ALTER COLUMN codigo_guia SET NOT NULL;

-- Verificar resultado
DO $$
DECLARE
  total_guias INTEGER;
  guias_com_codigo INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_guias FROM guias;
  SELECT COUNT(*) INTO guias_com_codigo FROM guias WHERE codigo_guia IS NOT NULL;
  
  RAISE NOTICE '✅ Total de guias: %', total_guias;
  RAISE NOTICE '✅ Guias com código: %', guias_com_codigo;
  RAISE NOTICE '✅ Migração concluída com sucesso!';
END $$;
