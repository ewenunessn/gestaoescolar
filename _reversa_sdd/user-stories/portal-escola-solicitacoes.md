# User Story - Portal Escola e Solicitacoes

## Contexto

- 🟢 O portal escola restringe os dados ao `escola_id` do usuario autenticado.
- 🟢 A escola pode listar suas solicitacoes, criar nova solicitacao e cancelar solicitacao pendente.
- 🟢 O fluxo de criacao gera notificacao e realtime para acompanhamento administrativo.

## Persona

- Usuario de escola.

## Historia

Como usuario da escola,
quero solicitar alimentos e acompanhar minhas solicitacoes no portal,
para registrar necessidades da unidade sem depender de canais paralelos.

## Jornada Principal

1. 🟢 O usuario entra no portal escola.
2. 🟢 A tela `SolicitacoesPage` carrega `GET /api/solicitacoes-alimentos/minhas`.
3. 🟢 O usuario inicia uma nova solicitacao.
4. 🟢 Seleciona produtos e quantidades.
5. 🟢 O frontend bloqueia envio sem itens.
6. 🟢 O backend cria a solicitacao para `user.escola_id`.
7. 🟢 O backend insere os itens normalizados.
8. 🟢 O sistema gera notificacao e evento realtime.
9. 🟢 O usuario pode cancelar a solicitacao se ela ainda estiver pendente.

## Regras de Negocio

- 🟢 A listagem de solicitacoes usa o `escola_id` do usuario.
- 🟢 Criacao exige ao menos um item.
- 🟢 Cada item precisa de produto e quantidade positiva.
- 🟢 Cancelamento exige que a solicitacao pertença a mesma escola.
- 🟢 Cancelamento so e permitido em status `pendente`.

## Critérios de Aceitação

```gherkin
Cenario: Listar minhas solicitacoes
Dado um usuario autenticado com escola_id
Quando ele abre a pagina de solicitacoes
Entao o sistema deve retornar apenas as solicitacoes da sua escola

Cenario: Criar solicitacao valida
Dado um usuario escola autenticado
Quando ele envia ao menos um item com quantidade positiva
Entao o backend deve criar a solicitacao para user.escola_id
E deve gerar os itens normalizados

Cenario: Bloquear envio sem itens
Dado o formulario de nova solicitacao aberto
Quando o usuario tentar enviar sem produtos
Entao o frontend ou backend deve bloquear a operacao

Cenario: Cancelar solicitacao pendente da propria escola
Dado uma solicitacao pendente pertencente ao usuario
Quando ele solicitar cancelamento
Entao o sistema deve cancelar a solicitacao

Cenario: Bloquear cancelamento de outra escola ou status diferente
Dado uma solicitacao de outra escola ou nao pendente
Quando o usuario tentar cancelar
Entao o backend deve rejeitar a operacao
```

## Rastreabilidade

- 🟢 `backend/src/modules/solicitacoes/routes/solicitacoesAlimentosRoutes.ts`
- 🟢 `backend/src/modules/solicitacoes/controllers/solicitacoesAlimentosController.ts`
- 🟢 `frontend/src/modules/portal-escola/pages/SolicitacoesPage.tsx`
- 🟢 `frontend/src/services/solicitacoesAlimentos.ts`
- 🟡 `_reversa_sdd/flowcharts/portal-escola-solicitacoes.md`
- 🟡 `_reversa_sdd/sdd/escolas-portal.md`
