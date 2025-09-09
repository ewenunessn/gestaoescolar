-- Migração para adicionar a coluna quantidade_contratada à tabela contrato_produtos

-- Verificar se a coluna existe e adicionar se necessário
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'contrato_produtos' 
        AND column_name = 'quantidade_contratada'
    ) THEN
        ALTER TABLE contrato_produtos ADD COLUMN quantidade_contratada DECIMAL(15,2) DEFAULT NULL;
        
        -- Atualizar os registros existentes para usar o valor da coluna quantidade
        UPDATE contrato_produtos SET quantidade_contratada = quantidade WHERE quantidade_contratada IS NULL;
        
        RAISE NOTICE 'Coluna quantidade_contratada adicionada com sucesso à tabela contrato_produtos';
    ELSE
        RAISE NOTICE 'Coluna quantidade_contratada já existe na tabela contrato_produtos';
    END IF;
END;
$$;