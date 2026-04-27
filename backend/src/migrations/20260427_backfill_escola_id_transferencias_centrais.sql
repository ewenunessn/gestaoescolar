-- Backfill escola_id in central transfer events so history can show the destination school.
-- Older rows created the central and school mirror events, but only the school row had escola_id.

UPDATE estoque_eventos central
SET escola_id = (
  SELECT escola.escola_id
  FROM estoque_eventos escola
  WHERE escola.escopo = 'escola'
    AND escola.tipo_evento = 'transferencia_para_escola'
    AND escola.escola_id IS NOT NULL
    AND escola.produto_id = central.produto_id
    AND (
      (
        central.referencia_tipo IS NOT NULL
        AND central.referencia_id IS NOT NULL
        AND escola.referencia_tipo = central.referencia_tipo
        AND escola.referencia_id = central.referencia_id
      )
      OR (
        ABS(escola.quantidade_delta) = ABS(central.quantidade_delta)
        AND ABS(EXTRACT(EPOCH FROM (escola.data_evento - central.data_evento))) <= 60
      )
    )
  ORDER BY
    CASE
      WHEN central.referencia_tipo IS NOT NULL
       AND central.referencia_id IS NOT NULL
       AND escola.referencia_tipo = central.referencia_tipo
       AND escola.referencia_id = central.referencia_id
      THEN 0
      ELSE 1
    END,
    ABS(EXTRACT(EPOCH FROM (escola.data_evento - central.data_evento))),
    escola.id
  LIMIT 1
)
WHERE central.escopo = 'central'
  AND central.tipo_evento = 'transferencia_para_escola'
  AND central.escola_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM estoque_eventos escola
    WHERE escola.escopo = 'escola'
      AND escola.tipo_evento = 'transferencia_para_escola'
      AND escola.escola_id IS NOT NULL
      AND escola.produto_id = central.produto_id
      AND (
        (
          central.referencia_tipo IS NOT NULL
          AND central.referencia_id IS NOT NULL
          AND escola.referencia_tipo = central.referencia_tipo
          AND escola.referencia_id = central.referencia_id
        )
        OR (
          ABS(escola.quantidade_delta) = ABS(central.quantidade_delta)
          AND ABS(EXTRACT(EPOCH FROM (escola.data_evento - central.data_evento))) <= 60
        )
      )
  );
