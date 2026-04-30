# Gaps de Revisao - gestaoescolar

> Gerado pelo Revisor em 2026-04-30.

## Critico

1. Nenhum gap critico permanece aberto na Onda 1 de hardening RBAC apos a implementacao de 2026-04-30.
2. Nenhum gap critico permanece aberto na autenticacao dos endpoints de perfil/permissoes do usuario atual apos a implementacao de 2026-04-30.

## Moderado

1. A cobertura OpenAPI ainda deve ser revisada modulo a modulo contra todos os endpoints reais antes de congelar contrato publico, embora o agregado de sistema ja cubra SSE, calendario, notificacoes e bootstrap HTTP.
2. Itens relacionados a `tenant_id` foram descontinuados por decisao do produto e nao devem bloquear o preparo para producao.

## Cosmetico

1. Algumas specs ainda dependem de nomes de modulo historicos diferentes do nome exibido nas telas, o que dificulta leitura por novos times.
2. A cobertura OpenAPI esta boa para os fluxos centrais, mas ainda heterogenea no modulo sistema em comparacao com os demais agregados.
