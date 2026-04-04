-- Script simples para tornar um usuário admin
-- Isso dá acesso total ao sistema

-- Atualizar usuário Brenda Aleixo (ID 31) para admin
UPDATE usuarios 
SET tipo = 'admin'
WHERE id = 31;

-- Verificar a mudança
SELECT id, nome, email, tipo, ativo 
FROM usuarios 
WHERE id = 31;
