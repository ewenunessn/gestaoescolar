-- Garante o modulo dedicado do Portal Escola para o RBAC do frontend.
INSERT INTO modulos (nome, slug, descricao, icone, ordem, ativo)
VALUES ('Portal Escola', 'portal_escola', 'Acesso ao portal restrito da escola', 'home_work', 12, true)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  ativo = true;
