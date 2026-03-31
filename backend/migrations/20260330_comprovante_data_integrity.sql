-- ============================================================================
-- INTEGRIDADE DE DADOS DOS COMPROVANTES DE ENTREGA
-- ============================================================================
-- Objetivo: Garantir que comprovantes mantenham dados históricos mesmo após
-- exclusão/alteração de guias, itens ou entregas
-- ============================================================================

-- 1. Adicionar campos desnormalizados na tabela comprovante_itens
-- Estes campos armazenam uma cópia dos dados no momento da entrega
ALTER TABLE comprovante_itens
ADD COLUMN IF NOT EXISTS guia_demanda_id INTEGER,
ADD COLUMN IF NOT EXISTS mes_referencia INTEGER,
ADD COLUMN IF NOT EXISTS ano_referencia INTEGER,
ADD COLUMN IF NOT EXISTS data_entrega_original TIMESTAMP;

-- 2. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_comprovante_itens_guia 
ON comprovante_itens(guia_demanda_id);

CREATE INDEX IF NOT EXISTS idx_comprovante_itens_referencia 
ON comprovante_itens(mes_referencia, ano_referencia);

-- 3. Adicionar campo de status no comprovante para rastreamento
ALTER TABLE comprovantes_entrega
ADD COLUMN IF NOT EXISTS itens_cancelados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS observacao_cancelamento TEXT;

-- 4. Criar tabela de auditoria para cancelamentos
CREATE TABLE IF NOT EXISTS comprovante_cancelamentos (
  id SERIAL PRIMARY KEY,
  comprovante_id INTEGER NOT NULL REFERENCES comprovantes_entrega(id),
  historico_entrega_id INTEGER,
  motivo TEXT,
  usuario_id INTEGER,
  data_cancelamento TIMESTAMP DEFAULT NOW(),
  dados_originais JSONB -- Backup dos dados antes do cancelamento
);

CREATE INDEX IF NOT EXISTS idx_cancelamentos_comprovante 
ON comprovante_cancelamentos(comprovante_id);

-- 5. Modificar a constraint de historico_entrega_id para SET NULL
-- Isso permite que o comprovante continue existindo mesmo se o histórico for deletado
ALTER TABLE comprovante_itens
DROP CONSTRAINT IF EXISTS comprovante_itens_historico_entrega_id_fkey;

ALTER TABLE comprovante_itens
ADD CONSTRAINT comprovante_itens_historico_entrega_id_fkey
FOREIGN KEY (historico_entrega_id)
REFERENCES historico_entregas(id)
ON DELETE SET NULL; -- Mantém o item do comprovante, apenas remove a referência

-- 6. Adicionar trigger para popular campos desnormalizados automaticamente
CREATE OR REPLACE FUNCTION popular_dados_comprovante_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar dados da guia através do histórico de entrega
  IF NEW.historico_entrega_id IS NOT NULL THEN
    SELECT 
      gpe.guia_id,
      g.mes,
      g.ano,
      he.data_entrega
    INTO 
      NEW.guia_demanda_id,
      NEW.mes_referencia,
      NEW.ano_referencia,
      NEW.data_entrega_original
    FROM historico_entregas he
    JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
    JOIN guias g ON gpe.guia_id = g.id
    WHERE he.id = NEW.historico_entrega_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_popular_dados_comprovante_item ON comprovante_itens;
CREATE TRIGGER trg_popular_dados_comprovante_item
BEFORE INSERT ON comprovante_itens
FOR EACH ROW
EXECUTE FUNCTION popular_dados_comprovante_item();

-- 7. Atualizar registros existentes com dados desnormalizados
UPDATE comprovante_itens ci
SET 
  guia_demanda_id = gpe.guia_id,
  mes_referencia = g.mes,
  ano_referencia = g.ano,
  data_entrega_original = he.data_entrega
FROM historico_entregas he
JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
JOIN guias g ON gpe.guia_id = g.id
WHERE ci.historico_entrega_id = he.id
  AND ci.guia_demanda_id IS NULL;

-- 8. Criar view para comprovantes com informações completas
CREATE OR REPLACE VIEW vw_comprovantes_detalhados AS
SELECT 
  c.*,
  e.nome as escola_nome,
  e.endereco as escola_endereco,
  COUNT(ci.id) as total_itens_comprovante,
  COUNT(CASE WHEN ci.historico_entrega_id IS NULL THEN 1 END) as itens_com_referencia_perdida,
  json_agg(
    json_build_object(
      'id', ci.id,
      'produto_nome', ci.produto_nome,
      'quantidade_entregue', ci.quantidade_entregue,
      'unidade', ci.unidade,
      'lote', ci.lote,
      'guia_id', ci.guia_demanda_id,
      'mes', ci.mes_referencia,
      'ano', ci.ano_referencia,
      'referencia_ativa', CASE WHEN ci.historico_entrega_id IS NOT NULL THEN true ELSE false END
    )
  ) as itens_detalhados
FROM comprovantes_entrega c
JOIN escolas e ON c.escola_id = e.id
LEFT JOIN comprovante_itens ci ON c.id = ci.comprovante_id
GROUP BY c.id, e.nome, e.endereco;

-- 9. Comentários para documentação
COMMENT ON COLUMN comprovante_itens.guia_demanda_id IS 'ID da guia de demanda (desnormalizado para histórico)';
COMMENT ON COLUMN comprovante_itens.mes_referencia IS 'Mês de referência da entrega (desnormalizado)';
COMMENT ON COLUMN comprovante_itens.ano_referencia IS 'Ano de referência da entrega (desnormalizado)';
COMMENT ON COLUMN comprovante_itens.data_entrega_original IS 'Data original da entrega (backup)';
COMMENT ON COLUMN comprovantes_entrega.itens_cancelados IS 'Contador de itens cancelados neste comprovante';
COMMENT ON COLUMN comprovantes_entrega.observacao_cancelamento IS 'Observações sobre cancelamentos realizados';
COMMENT ON TABLE comprovante_cancelamentos IS 'Auditoria de cancelamentos de entregas';

-- 10. Função para cancelar item de entrega mantendo integridade
CREATE OR REPLACE FUNCTION cancelar_item_entrega(
  p_historico_entrega_id INTEGER,
  p_motivo TEXT DEFAULT NULL,
  p_usuario_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_comprovante_id INTEGER;
  v_dados_originais JSONB;
BEGIN
  -- Buscar comprovante relacionado
  SELECT ci.comprovante_id, 
         json_build_object(
           'historico_id', he.id,
           'quantidade', he.quantidade_entregue,
           'produto', ci.produto_nome,
           'data', he.data_entrega
         )
  INTO v_comprovante_id, v_dados_originais
  FROM comprovante_itens ci
  JOIN historico_entregas he ON ci.historico_entrega_id = he.id
  WHERE ci.historico_entrega_id = p_historico_entrega_id
  LIMIT 1;
  
  -- Registrar cancelamento na auditoria
  IF v_comprovante_id IS NOT NULL THEN
    INSERT INTO comprovante_cancelamentos (
      comprovante_id,
      historico_entrega_id,
      motivo,
      usuario_id,
      dados_originais
    ) VALUES (
      v_comprovante_id,
      p_historico_entrega_id,
      p_motivo,
      p_usuario_id,
      v_dados_originais
    );
    
    -- Atualizar contador no comprovante
    UPDATE comprovantes_entrega
    SET itens_cancelados = itens_cancelados + 1,
        observacao_cancelamento = COALESCE(observacao_cancelamento || E'\n', '') || 
                                  'Item cancelado em ' || NOW()::DATE || 
                                  COALESCE(': ' || p_motivo, '')
    WHERE id = v_comprovante_id;
  END IF;
  
  -- Cancelar a entrega (a referência no comprovante_itens será SET NULL automaticamente)
  DELETE FROM historico_entregas WHERE id = p_historico_entrega_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao cancelar item: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancelar_item_entrega IS 'Cancela uma entrega mantendo registro no comprovante e auditoria';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
