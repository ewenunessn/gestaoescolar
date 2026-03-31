-- ========================================
-- SNAPSHOT DE DADOS DA ESCOLA NAS GUIAS
-- ========================================
-- 
-- Problema: Quando dados da escola mudam (nome, endereço, modalidades, 
-- quantidade de alunos), as guias antigas ficam com informações inconsistentes
-- 
-- Solução: Armazenar snapshot dos dados da escola no momento da geração da guia
-- Similar ao que foi feito com comprovantes de entrega
-- 
-- Data: 31/03/2026
-- ========================================

-- Adicionar campos de snapshot na tabela guia_produto_escola
ALTER TABLE guia_produto_escola
ADD COLUMN IF NOT EXISTS escola_nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS escola_endereco TEXT,
ADD COLUMN IF NOT EXISTS escola_municipio VARCHAR(100),
ADD COLUMN IF NOT EXISTS escola_total_alunos INTEGER,
ADD COLUMN IF NOT EXISTS escola_modalidades JSONB,
ADD COLUMN IF NOT EXISTS escola_snapshot_data TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_snapshot 
ON guia_produto_escola(guia_id, escola_id, escola_snapshot_data);

-- Comentários para documentação
COMMENT ON COLUMN guia_produto_escola.escola_nome IS 'Snapshot do nome da escola no momento da geração da guia';
COMMENT ON COLUMN guia_produto_escola.escola_endereco IS 'Snapshot do endereço da escola no momento da geração da guia';
COMMENT ON COLUMN guia_produto_escola.escola_municipio IS 'Snapshot do município da escola no momento da geração da guia';
COMMENT ON COLUMN guia_produto_escola.escola_total_alunos IS 'Snapshot do total de alunos da escola no momento da geração da guia';
COMMENT ON COLUMN guia_produto_escola.escola_modalidades IS 'Snapshot das modalidades da escola (JSON) no momento da geração da guia';
COMMENT ON COLUMN guia_produto_escola.escola_snapshot_data IS 'Data/hora em que o snapshot foi criado';

-- Preencher dados históricos com informações atuais das escolas
-- (para guias já existentes)
UPDATE guia_produto_escola gpe
SET 
  escola_nome = e.nome,
  escola_endereco = e.endereco,
  escola_municipio = e.municipio,
  escola_total_alunos = (
    SELECT SUM(em.quantidade_alunos)
    FROM escola_modalidades em
    WHERE em.escola_id = e.id
  ),
  escola_modalidades = (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'modalidade_id', em.modalidade_id,
          'modalidade_nome', m.nome,
          'quantidade_alunos', em.quantidade_alunos
        )
        ORDER BY m.nome
      ),
      '[]'::jsonb
    )
    FROM escola_modalidades em
    LEFT JOIN modalidades m ON em.modalidade_id = m.id
    WHERE em.escola_id = e.id
  ),
  escola_snapshot_data = COALESCE(gpe.created_at, CURRENT_TIMESTAMP)
FROM escolas e
WHERE gpe.escola_id = e.id
  AND gpe.escola_nome IS NULL;

-- Verificar quantos registros foram atualizados
DO $$
DECLARE
  total_registros INTEGER;
  registros_atualizados INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_registros FROM guia_produto_escola;
  SELECT COUNT(*) INTO registros_atualizados FROM guia_produto_escola WHERE escola_nome IS NOT NULL;
  
  RAISE NOTICE '✅ Total de registros em guia_produto_escola: %', total_registros;
  RAISE NOTICE '✅ Registros com snapshot preenchido: %', registros_atualizados;
  RAISE NOTICE '✅ Migração concluída com sucesso!';
END $$;
