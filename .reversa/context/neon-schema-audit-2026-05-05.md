# Auditoria de schema Neon - 2026-05-05

## Escopo

Auditoria em modo somente leitura comparando:

- Banco configurado em `backend/.env` via `DATABASE_URL`.
- Objetos do schema `public` no Neon.
- Referencias SQL encontradas em `backend/`, `frontend/` e migrations.

Nenhum `DROP`, `ALTER` ou atualizacao de dados foi executado no banco.

## Conclusao

O banco Neon e o codigo nao estao totalmente alinhados.

O schema `public` contem objetos operacionais atuais, objetos de apoio e sobras legadas. A limpeza e viavel, mas deve ser feita em duas fases: primeiro quarentena por `RENAME`, depois remocao definitiva apenas apos teste e backup.

## Evidencias principais

- O Neon possui 107 objetos no schema `public`, entre tabelas e views.
- As 8 tabelas candidatas abaixo nao possuem FKs de entrada nem views dependentes no Neon no momento da auditoria.
- `vw_recebimentos_detalhados` e referenciada pelo backend, mas nao existe no Neon.
- `990_prune_schema.sql` esta desatualizada e nao deve ser executada: a allowlist dela nao cobre corretamente a estrutura atual.

## Mismatch que deve ser corrigido antes da limpeza

### View ausente usada pelo backend

O controller de recebimentos consulta:

```sql
SELECT * FROM vw_recebimentos_detalhados
WHERE pedido_id = $1
ORDER BY data_recebimento DESC
```

Referencia: `backend/src/modules/recebimentos/controllers/recebimentoController.ts`.

No Neon, `vw_recebimentos_detalhados` nao existe. A migration `backend/src/migrations/20260304_create_recebimentos.sql` define essa view, mas o banco atual tem apenas `vw_resumo_recebimentos_pedido`.

Acao recomendada:

1. Recriar `vw_recebimentos_detalhados` com a definicao compativel com o schema atual; ou
2. Alterar o controller para consultar tabelas base / view existente, se a semantica esperada for outra.

## Tabelas candidatas a quarentena

| Objeto | Linhas | Classificacao | Motivo |
| --- | ---: | --- | --- |
| `demandas` | 0 | Legado provavel | A rota atual `/api/demandas` usa `demandas_escolas` via `demandaModel.ts`; `demandas` aparece principalmente em migrations antigas. |
| `movimentacoes_consumo_contrato` | 0 | Legado provavel | Sem referencia ativa em controller/service atual; fluxo atual de saldo usa estruturas de contrato/saldo/historico mais novas. |
| `movimentacoes_consumo_modalidade` | 0 | Legado provavel | Sem referencia ativa em controller/service atual; criada por fluxo antigo de saldo por modalidade. |
| `performance_monitoring` | 0 | Legado provavel | Sem uso ativo encontrado no runtime. |
| `sistema_configuracao_robusta` | 0 | Legado provavel | Ligada a utilitarios antigos de sistema robusto; sem uso ativo encontrado. |
| `solicitacoes_alimentos` | 0 | Legado provavel | O fluxo atual usa `solicitacoes` e `solicitacoes_itens`; o nome aparece em eventos realtime e migrations antigas. |
| `schema_prune_log` | 35 | Arquivar antes | Log de prune antigo. Nao e runtime, mas possui historico administrativo. |
| `data_integrity_quarantine` | 4 | Arquivar antes | Quarentena de integridade criada por migration operacional. Preservar/inspecionar payload antes de remover. |

## Views candidatas a quarentena

Estas views existem no Neon, mas nao apareceram como referencias ativas no runtime durante a varredura. Por serem views, a quarentena por rename e uma forma segura de expor dependencia oculta antes de remover.

| View | Classificacao | Observacao |
| --- | --- | --- |
| `view_saldo_contratos_modalidades` | Verificar/quarentenar | Pode ser substituida por endpoints/queries atuais de saldo. |
| `vw_comprovantes_detalhados` | Verificar/quarentenar | Sem uso ativo encontrado; validar relatorios antigos. |
| `vw_entregas_programadas` | Verificar/quarentenar | Comentario indica uso operacional historico; validar mobile/romaneio antes de remover. |
| `vw_faturamento_detalhado_tipo_fornecedor` | Verificar/quarentenar | Pode ser view antiga de relatorio. |
| `vw_faturamentos_detalhados` | Verificar/quarentenar | Pode ser view antiga de relatorio. |
| `vw_refeicao_produtos_com_modalidade` | Verificar/quarentenar | View de nutricao; validar telas de preparacoes/cardapio antes de remover. |
| `vw_resumo_recebimentos_pedido` | Verificar/quarentenar | Existe no Neon, mas a rota de historico usa outra view ausente. |

## Objetos que nao devem entrar na limpeza agora

| Objeto | Motivo |
| --- | --- |
| `demandas_escolas` | Usada pelo model ativo de demandas. |
| `schema_migrations` | Infraestrutura de migrations. |
| `solicitacoes` | Usada no fluxo atual de solicitacoes. |
| `solicitacoes_itens` | Usada no fluxo atual de solicitacoes. |
| `vw_estoque_saldo_central` | Criada/relacionada ao ledger de estoque; manter ate validar todo fluxo de estoque. |
| `vw_estoque_saldo_escola` | Criada/relacionada ao ledger de estoque; manter ate validar todo fluxo de estoque. |

## Codigo legado com referencias a objetos ausentes

Foram encontradas referencias em codigo pouco ou nada conectado ao runtime atual para objetos que nao aparecem no Neon, como:

- `logs_auditoria`
- `configuracoes_notificacao`
- `escolas_modalidades`
- `auditoria`
- `performance_logs`
- `backup_logs`
- `configuracoes`

Acao recomendada: classificar esses arquivos como legado/deprecado ou reativar as tabelas apenas se as features correspondentes ainda forem planejadas. Manter codigo morto apontando para tabelas inexistentes aumenta a confusao.

## Plano seguro de limpeza

1. Criar backup ou branch do Neon antes de qualquer alteracao.
2. Corrigir `vw_recebimentos_detalhados` ou ajustar o controller de recebimentos.
3. Rodar o SQL de quarentena em ambiente de teste/branch Neon.
4. Testar backend, frontend e fluxos principais.
5. Se nada quebrar, manter os objetos renomeados por alguns dias.
6. Exportar os objetos arquivados que possuem dados.
7. Fazer `DROP` definitivo em uma segunda migration.

## Artefato gerado

- SQL para reparar a view ausente: `.reversa/context/neon-repair-vw-recebimentos-detalhados-2026-05-05.sql`.
- SQL de quarentena: `.reversa/context/neon-schema-quarantine-2026-05-05.sql`.
