-- Corrige a vigencia do snapshot inicial do historico de alunos.
--
-- A primeira carga foi criada a partir do estado atual de escola_modalidades.
-- Como ela representa o baseline legado antes do versionamento existir, precisa
-- valer para competencias anteriores a data da migracao. Caso contrario, guias
-- geradas para cardapios anteriores ao dia da migracao ficam sem alunos.

UPDATE escola_modalidades_historico
SET vigente_de = DATE '1900-01-01',
    observacao = CASE
      WHEN observacao IS NULL OR observacao = '' THEN
        'Snapshot inicial criado a partir de escola_modalidades; vigencia ajustada para baseline legado'
      WHEN observacao NOT ILIKE '%baseline legado%' THEN
        observacao || '; vigencia ajustada para baseline legado'
      ELSE observacao
    END
WHERE operacao = 'bootstrap'
  AND origem = 'migration'
  AND vigente_de > DATE '1900-01-01';
