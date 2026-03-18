-- Migration: Permitir múltiplas modalidades por cardápio
-- Cria tabela de junção para relacionamento N:N entre cardápios e modalidades

-- 1. Criar tabela de junção cardapio_modalidades
CREATE TABLE IF NOT EXISTS cardapio_modalidades (
  id SERIAL PRIMARY KEY,
  cardapio_id INTEGER NOT NULL REFERENCES cardapios_modalidade(id) ON DELETE CASCADE,
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cardapio_id, modalidade_id)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cardapio_modalidades_cardapio ON cardapio_modalidades(cardapio_id);
CREATE INDEX IF NOT EXISTS idx_cardapio_modalidades_modalidade ON cardapio_modalidades(modalidade_id);

-- 3. Migrar dados existentes para a nova tabela
-- Copiar relacionamentos atuais de cardapios_modalidade.modalidade_id
INSERT INTO cardapio_modalidades (cardapio_id, modalidade_id, created_at)
SELECT 
  id as cardapio_id,
  modalidade_id,
  created_at
FROM cardapios_modalidade
WHERE modalidade_id IS NOT NULL
ON CONFLICT (cardapio_id, modalidade_id) DO NOTHING;

-- 4. Comentários
COMMENT ON TABLE cardapio_modalidades IS 'Tabela de junção N:N entre cardápios e modalidades - permite um cardápio ser usado por múltiplas modalidades';
COMMENT ON COLUMN cardapio_modalidades.cardapio_id IS 'ID do cardápio';
COMMENT ON COLUMN cardapio_modalidades.modalidade_id IS 'ID da modalidade';

-- NOTA: A coluna modalidade_id em cardapios_modalidade será mantida por compatibilidade
-- mas o sistema deve usar a tabela cardapio_modalidades para consultas
