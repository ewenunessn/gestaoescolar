-- Verificar quantos produtos únicos existem em contratos ativos
SELECT COUNT(DISTINCT p.nome) as total_produtos
FROM contrato_produtos cp
JOIN contratos c ON cp.contrato_id = c.id
JOIN produtos p ON cp.produto_id = p.id
WHERE cp.ativo = true
  AND c.ativo = true;

-- Listar os primeiros 50 produtos
SELECT DISTINCT p.nome as produto_nome, 
       array_agg(DISTINCT cp.id) as contrato_produto_ids
FROM contrato_produtos cp
JOIN contratos c ON cp.contrato_id = c.id
JOIN produtos p ON cp.produto_id = p.id
JOIN fornecedores f ON c.fornecedor_id = f.id
WHERE cp.ativo = true
  AND c.ativo = true
GROUP BY p.nome
ORDER BY p.nome
LIMIT 50;
