-- Migração: Criar tabela de instituições
-- Data: 2026-01-22
-- Descrição: Tabela para armazenar informações da instituição (secretaria, escola, etc.)

CREATE TABLE IF NOT EXISTS instituicoes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18),
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(255),
  site VARCHAR(255),
  logo_url TEXT,
  secretario_nome VARCHAR(255),
  secretario_cargo VARCHAR(255) DEFAULT 'Secretário(a) de Educação',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_instituicoes_ativo ON instituicoes(ativo);

-- Inserir registro padrão se não existir
INSERT INTO instituicoes (nome, ativo) 
SELECT 'Secretaria Municipal de Educação', true
WHERE NOT EXISTS (SELECT 1 FROM instituicoes WHERE ativo = true);

-- Comentários na tabela
COMMENT ON TABLE instituicoes IS 'Informações da instituição para uso em documentos e relatórios';
COMMENT ON COLUMN instituicoes.logo_url IS 'URL do arquivo ou string base64 da logo da instituição';
COMMENT ON COLUMN instituicoes.secretario_nome IS 'Nome do secretário de educação para assinatura de documentos';
COMMENT ON COLUMN instituicoes.secretario_cargo IS 'Cargo do responsável pela secretaria';