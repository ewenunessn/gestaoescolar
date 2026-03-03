-- Migration: Remover coluna unidade de contrato_produtos
-- Data: 2026-03-03
-- Descrição: Remove a coluna unidade de contrato_produtos pois agora a unidade vem direto da tabela produtos

-- ============================================
-- PARTE 1: BACKUP (Opcional - para segurança)
-- ============================================

-- Criar tabela temporária com backup dos dados
CREATE TABLE IF NOT EXISTS contrato_produtos_backup_unidade AS
SELECT id, contrato_id, produto_id, unidade
FROM contrato_produtos
WHERE unidade IS NOT NULL;

-- ============================================
-- PARTE 2: REMOVER COLUNA UNIDADE
-- ============================================

-- Remover coluna unidade de contrato_produtos
ALTER TABLE contrato_produtos DROP COLUMN IF EXISTS unidade;

-- Remover coluna marca de contrato_produtos (também migrada para produtos)
ALTER TABLE contrato_produtos DROP COLUMN IF EXISTS marca;

-- Remover coluna peso de contrato_produtos (também migrada para produtos)
ALTER TABLE contrato_produtos DROP COLUMN IF EXISTS peso;

-- ============================================
-- PARTE 3: ATUALIZAR COMENTÁRIOS
-- ============================================

COMMENT ON TABLE contrato_produtos IS 'Produtos associados a contratos com preços e quantidades. Unidade, marca e peso agora vêm da tabela produtos.';

-- ============================================
-- PARTE 4: VERIFICAÇÃO
-- ============================================

-- Verificar que a coluna foi removida
DO $$
DECLARE
    col_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'contrato_produtos' 
        AND column_name = 'unidade'
    ) INTO col_exists;
    
    IF col_exists THEN
        RAISE EXCEPTION 'ERRO: Coluna unidade ainda existe em contrato_produtos';
    ELSE
        RAISE NOTICE '✅ Coluna unidade removida com sucesso de contrato_produtos';
    END IF;
END $$;

-- Verificar que todos os produtos têm unidade
DO $$
DECLARE
    produtos_sem_unidade integer;
BEGIN
    SELECT COUNT(*) INTO produtos_sem_unidade
    FROM produtos
    WHERE unidade IS NULL OR unidade = '';
    
    IF produtos_sem_unidade > 0 THEN
        RAISE WARNING 'ATENÇÃO: % produtos sem unidade definida', produtos_sem_unidade;
    ELSE
        RAISE NOTICE '✅ Todos os produtos têm unidade definida';
    END IF;
END $$;

-- ============================================
-- PARTE 5: ESTATÍSTICAS
-- ============================================

SELECT 
    'Migração concluída' as status,
    (SELECT COUNT(*) FROM contrato_produtos) as total_contrato_produtos,
    (SELECT COUNT(*) FROM produtos WHERE unidade IS NOT NULL) as produtos_com_unidade,
    (SELECT COUNT(*) FROM contrato_produtos_backup_unidade) as registros_backup;
