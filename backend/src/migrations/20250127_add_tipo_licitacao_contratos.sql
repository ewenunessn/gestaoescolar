-- Adicionar campo tipo_licitacao à tabela contratos
-- Para especificar a modalidade de licitação utilizada

ALTER TABLE contratos 
ADD COLUMN IF NOT EXISTS tipo_licitacao VARCHAR(50) DEFAULT 'pregao_eletronico';

-- Comentário para documentar os valores possíveis
COMMENT ON COLUMN contratos.tipo_licitacao IS 'Modalidade de licitação: pregao_eletronico, pregao_presencial, chamada_publica_pnae, dispensa_licitacao, inexigibilidade, concorrencia, tomada_precos, convite';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_contratos_tipo_licitacao ON contratos(tipo_licitacao);