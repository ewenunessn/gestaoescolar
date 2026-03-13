-- Criar tabela de nutricionistas
CREATE TABLE IF NOT EXISTS nutricionistas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  crn VARCHAR(20) NOT NULL UNIQUE, -- Conselho Regional de Nutrição
  crn_regiao VARCHAR(10) NOT NULL, -- Ex: CRN-3, CRN-5
  cpf VARCHAR(14) UNIQUE,
  email VARCHAR(255),
  telefone VARCHAR(20),
  especialidade VARCHAR(100), -- Ex: Nutrição Escolar, Clínica, Esportiva
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE nutricionistas IS 'Cadastro de nutricionistas responsáveis pelos cardápios';
COMMENT ON COLUMN nutricionistas.crn IS 'Número do registro no Conselho Regional de Nutrição';
COMMENT ON COLUMN nutricionistas.crn_regiao IS 'Região do CRN (ex: CRN-3 para SP/MS)';

-- Adicionar campo nutricionista_id na tabela cardapios_modalidade
ALTER TABLE cardapios_modalidade 
ADD COLUMN IF NOT EXISTS nutricionista_id INTEGER REFERENCES nutricionistas(id),
ADD COLUMN IF NOT EXISTS data_aprovacao_nutricionista TIMESTAMP,
ADD COLUMN IF NOT EXISTS observacoes_nutricionista TEXT;

COMMENT ON COLUMN cardapios_modalidade.nutricionista_id IS 'Nutricionista responsável pela elaboração/aprovação do cardápio';
COMMENT ON COLUMN cardapios_modalidade.data_aprovacao_nutricionista IS 'Data em que o nutricionista aprovou o cardápio';
COMMENT ON COLUMN cardapios_modalidade.observacoes_nutricionista IS 'Observações do nutricionista sobre o cardápio';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_nutricionistas_ativo ON nutricionistas(ativo);
CREATE INDEX IF NOT EXISTS idx_nutricionistas_crn ON nutricionistas(crn);
CREATE INDEX IF NOT EXISTS idx_cardapios_modalidade_nutricionista ON cardapios_modalidade(nutricionista_id);

-- Inserir nutricionista padrão (exemplo)
INSERT INTO nutricionistas (nome, crn, crn_regiao, email, especialidade, ativo)
VALUES ('Nutricionista Responsável', '00000', 'CRN-0', 'nutricao@exemplo.com', 'Nutrição Escolar', true)
ON CONFLICT (crn) DO NOTHING;
