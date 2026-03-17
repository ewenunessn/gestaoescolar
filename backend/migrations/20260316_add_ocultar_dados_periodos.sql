-- Adicionar coluna ocultar_dados na tabela periodos
-- Esta coluna permite ocultar dados de períodos inativos nas listagens

ALTER TABLE periodos 
ADD COLUMN IF NOT EXISTS ocultar_dados BOOLEAN DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN periodos.ocultar_dados IS 'Quando true, oculta pedidos, guias e cardápios deste período nas listagens gerais';

-- Atualizar períodos inativos para ocultar dados por padrão
UPDATE periodos 
SET ocultar_dados = true 
WHERE ativo = false AND fechado = false;
