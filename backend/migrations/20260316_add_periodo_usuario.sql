-- Migração: Adicionar período individual por usuário
-- Data: 16/03/2026
-- Descrição: Permite que cada usuário selecione seu próprio período de trabalho

-- Adicionar coluna periodo_selecionado_id na tabela usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS periodo_selecionado_id INTEGER REFERENCES periodos(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_periodo_selecionado 
ON usuarios(periodo_selecionado_id);

-- Comentário explicativo
COMMENT ON COLUMN usuarios.periodo_selecionado_id IS 
'Período selecionado pelo usuário. Se NULL, usa o período ativo global.';

-- Atualizar usuários existentes para usar o período ativo
UPDATE usuarios u
SET periodo_selecionado_id = (
  SELECT id FROM periodos WHERE ativo = true LIMIT 1
)
WHERE periodo_selecionado_id IS NULL;

-- Verificar resultado
SELECT 
  u.id,
  u.nome,
  u.periodo_selecionado_id,
  p.ano as periodo_ano,
  p.ativo as periodo_ativo,
  CASE 
    WHEN u.periodo_selecionado_id IS NOT NULL THEN '✅ Período selecionado'
    ELSE '⚠️ Usando período global'
  END as status
FROM usuarios u
LEFT JOIN periodos p ON u.periodo_selecionado_id = p.id
ORDER BY u.nome
LIMIT 10;
