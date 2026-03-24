-- Migration: Simplificar contrato_produtos
-- Remove campos desnecessários que causam confusão
-- Agora o peso vem APENAS do produto

-- Backup dos dados antes de remover (caso precise reverter)
CREATE TABLE IF NOT EXISTS contrato_produtos_backup_20260324 AS 
SELECT * FROM contrato_produtos;

-- Remover campos desnecessários (CASCADE para remover dependências)
ALTER TABLE contrato_produtos 
  DROP COLUMN IF EXISTS peso_embalagem CASCADE,
  DROP COLUMN IF EXISTS unidade_compra CASCADE,
  DROP COLUMN IF EXISTS fator_conversao CASCADE;

-- Comentário explicativo
COMMENT ON TABLE contrato_produtos IS 
'Contratos de produtos. O peso e unidade vêm do produto, não do contrato. Isso elimina conversões complexas.';

-- Verificação
SELECT 
  'Simplificação concluída!' as status,
  COUNT(*) as total_contratos
FROM contrato_produtos;
