# Auditoria - Alunos por Modalidade, Fluxo Operacional e Banco Neon

Data: 2026-04-24

Atualizacao: as correcoes de integridade e consolidacao abaixo foram aplicadas em 2026-04-24/2026-04-25 e revalidadas diretamente no Neon.

## Escopo

Esta auditoria cobre a segunda parte do pedido inicial: entender o contexto dos modulos, suas integracoes e validar se o banco Neon esta coerente com o fluxo de trabalho.

Fontes usadas:

- Codigo local em `backend/src` e `frontend/src`.
- Diagnostico direto no Neon com `backend/scripts/diagnose-db-architecture.js`.
- Nova migracao aplicada: `backend/migrations/20260424_escola_modalidades_historico.sql`.

## Resumo Executivo

- O versionamento de alunos por escola/modalidade foi implementado em `escola_modalidades_historico`.
- O relatorio historico usa a ultima versao vigente ate a data de referencia e ja tem filtro de escolas ativas/inativas/todas.
- O banco Neon tem a tabela historica com 53 registros iniciais e `escola_modalidades` foi corrigida com FKs, check de quantidade e unicidade por escola/modalidade.
- Os caminhos ativos de faturamento, demanda e sistema foram consolidados para o schema real do Neon.
- Os registros orfaos encontrados foram movidos para `data_integrity_quarantine` antes da remocao das tabelas operacionais.

## Modelo Oficial Recomendado

`escola_modalidades` deve continuar sendo o estado atual da quantidade de alunos por escola/modalidade.

`escola_modalidades_historico` deve ser a fonte para relatorios por data, auditoria e comparacao de mudancas.

Consultas operacionais atuais podem continuar em `escola_modalidades`. Consultas retroativas devem receber `data_referencia` ou competencia e buscar o historico.

## Schema Real no Neon

Tabelas centrais encontradas:

- `escolas`: 54 registros.
- `modalidades`: 7 registros.
- `escola_modalidades`: 54 registros.
- `escola_modalidades_historico`: 53 registros.
- `cardapios_modalidade`: 2 registros.
- `cardapio_modalidades`: 7 registros.
- `cardapio_refeicoes_dia`: 2 registros.
- `contratos`: 10 registros.
- `contrato_produtos`: 44 registros.
- `contrato_produtos_modalidades`: 3 registros.
- `pedidos`: 1 registro.
- `pedido_itens`: 12 registros.
- `faturamentos`: 0 registros.
- `faturamentos_pedidos`: existe.
- `faturamentos_itens`: 58 registros.
- `instituicoes`: 1 registro.
- `usuarios`: 3 registros.

Tabelas referenciadas por algum codigo, mas inexistentes no Neon:

- `escolas_modalidades`
- `cardapios`
- `cardapio_refeicoes`
- `estoque_escola`
- `estoque_escolar_movimentacoes`
- `pedidos_itens`
- `faturamento_itens`
- `institutions`

Views de faturamento existem no Neon:

- `vw_faturamentos_detalhados`
- `vw_faturamentos_resumo_modalidades`
- `vw_faturamento_tipo_fornecedor_modalidade`
- `vw_pedido_resumo_tipo_fornecedor`

## Fluxo por Modulo

### Escolas e modalidades

Fluxo ativo:

- Frontend altera alunos em `GerenciarAlunosModalidades.tsx` e `EscolaDetalhes.tsx`.
- Backend escreve em `/api/escola-modalidades`.
- Estado atual fica em `escola_modalidades`.
- Historico fica em `escola_modalidades_historico`.

Integracao nova:

- `GET /api/escola-modalidades/historico`
- `GET /api/escola-modalidades/relatorio-alunos`
- Tela `/modalidades/relatorio-alunos`.

### Cardapios

Fluxo atual usa:

- `cardapios_modalidade`
- `cardapio_modalidades`
- `cardapio_refeicoes_dia`
- `escola_modalidades.quantidade_alunos` para custo atual.

Impacto:

- Custo calculado hoje usa alunos atuais.
- Para recalcular um cardapio antigo com fidelidade historica, sera necessario passar competencia/data e usar `escola_modalidades_historico`.

### Demandas

Ha dois caminhos:

- Caminho ativo em `/api/demandas`: CRUD de `demandas_escolas` e listagem de cardapios disponiveis usando tabelas atuais.
- Caminho legado em `backend/src/modules/estoque/routes/demandaRoutes.ts`: nao esta montado em `registerApiRoutes.ts` e ainda usa `cardapios`/`cardapio_refeicoes`, que nao existem no Neon.

Risco adicional:

- `frontend/src/services/demandas.ts` ainda expoe `gerarDemandaMensal`, `gerarDemandaMultiplosCardapios` e `exportarDemandaExcel` chamando `/demandas/gerar`, `/demandas/gerar-multiplos` e `/demandas/exportar-excel`; essas rotas nao existem no roteador ativo.

### Compras e planejamento

`PlanejamentoComprasService.ts` usa tabelas atuais de cardapio e `escola_modalidades` para calcular demanda por competencia.

Ponto positivo:

- O planejamento ja grava snapshot de escola/modalidades em guias/pedidos gerados, o que preserva parte do contexto.

Ponto pendente:

- Reprocessar competencias antigas ainda tende a usar aluno atual se nao for adaptado para historico.

### Faturamento

Ha dois modelos concorrentes:

- Modelo atual: `/api/faturamentos`, `faturamentos_pedidos`, `faturamentos_itens` e views `vw_*`.
- Modelo antigo: rotas dentro de `/api/compras/:pedido_id/faturamento` usando `backend/src/modules/compras/services/FaturamentoService.ts` e `backend/src/modules/compras/models/Faturamento.ts`, que referenciam `faturamento_itens` no singular, inexistente no Neon.

Risco:

- Telas que usam `frontend/src/services/faturamento.ts` chamam o caminho antigo de compras para previa/geracao/busca por pedido.
- Telas que usam `frontend/src/services/faturamentos.ts` chamam o caminho novo.
- Isso pode causar falhas intermitentes dependendo da tela acessada.

### Guias e entregas

`Guia.ts` e `PlanejamentoComprasService.ts` gravam snapshot de escola, total de alunos e modalidades no momento da geracao.

Ponto positivo:

- Guias ja geradas nao dependem totalmente da quantidade atual.

Ponto pendente:

- Relatorios comparativos entre guia antiga e cadastro atual devem explicitar se usam snapshot ou cadastro vigente.

### Sistema, dashboard e notificacoes

Dashboards usam totais atuais de `escola_modalidades`.

`adminDataController.ts` e `healthController.ts` ainda referenciam `institutions`/`plans`; no Neon existe `instituicoes`, nao `institutions`.

## Achados Priorizados

### P0 - `escola_modalidades` sem integridade referencial real

PROBLEMA: no Neon, `escola_modalidades` tem apenas PK e indices simples. Nao ha FK para `escolas`, FK para `modalidades` nem `UNIQUE (escola_id, modalidade_id)`.

Risco: totais de alunos podem aceitar escola/modalidade inexistente, duplicidade futura e divergencia em relatorios.

Evidencia:

- `orfaos_escola_modalidades`: 1 registro.
- `duplicados_escola_modalidades`: 0 registros hoje.

Correcao segura:

```sql
SELECT em.*
FROM escola_modalidades em
LEFT JOIN escolas e ON e.id = em.escola_id
LEFT JOIN modalidades m ON m.id = em.modalidade_id
WHERE e.id IS NULL OR m.id IS NULL;
```

Depois de revisar o registro orfao:

```sql
DELETE FROM escola_modalidades em
WHERE NOT EXISTS (SELECT 1 FROM escolas e WHERE e.id = em.escola_id)
   OR NOT EXISTS (SELECT 1 FROM modalidades m WHERE m.id = em.modalidade_id);
```

Em seguida:

```sql
ALTER TABLE escola_modalidades
  ADD CONSTRAINT escola_modalidades_escola_id_fkey
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE escola_modalidades
  ADD CONSTRAINT escola_modalidades_modalidade_id_fkey
  FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE RESTRICT NOT VALID;

ALTER TABLE escola_modalidades VALIDATE CONSTRAINT escola_modalidades_escola_id_fkey;
ALTER TABLE escola_modalidades VALIDATE CONSTRAINT escola_modalidades_modalidade_id_fkey;
```

Criar unicidade apos confirmar que nao ha duplicados:

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS escola_modalidades_escola_modalidade_uidx
  ON escola_modalidades (escola_id, modalidade_id);
```

### P0 - Dois caminhos de faturamento com schemas diferentes

PROBLEMA: o frontend usa tanto `services/faturamento.ts` quanto `services/faturamentos.ts`. Um chama `/api/compras/:pedido_id/faturamento` e outro chama `/api/faturamentos`.

Risco: geracao/listagem/consumo de faturamento pode quebrar porque o caminho antigo usa `faturamento_itens`, tabela inexistente no Neon.

Correcao recomendada:

- Escolher `/api/faturamentos` como API oficial.
- Migrar as telas que ainda usam `frontend/src/services/faturamento.ts` para `frontend/src/services/faturamentos.ts`.
- Remover ou reimplementar as rotas antigas de faturamento dentro de `/api/compras`.

### P1 - Geracao de demanda exposta no frontend, mas sem rota ativa compativel

PROBLEMA: o frontend chama `/demandas/gerar`, `/demandas/gerar-multiplos` e `/demandas/exportar-excel`; o roteador ativo `backend/src/modules/demandas/routes/demandaRoutes.ts` nao expoe essas rotas.

Risco: telas de demanda podem retornar 404. Se alguem montar o roteador legado de estoque sem corrigir, ele ainda consultaria `cardapios` e `cardapio_refeicoes`, que nao existem no Neon.

Correcao recomendada:

- Portar a logica de geracao para `backend/src/modules/demandas` usando `cardapios_modalidade`, `cardapio_modalidades` e `cardapio_refeicoes_dia`.
- So depois expor `/gerar`, `/gerar-multiplos` e `/exportar-excel`.
- Remover o controller legado de estoque ou marcar como deprecated.

### P1 - `contrato_produtos_modalidades` sem integridade e com orfaos

PROBLEMA: existem 3 registros em `contrato_produtos_modalidades` e todos aparecem como orfaos no diagnostico contra `contrato_produtos`/`modalidades`.

Risco: saldo por modalidade, faturamento e planejamento podem calcular modalidade errada ou carregar relacoes inexistentes.

Correcao segura:

```sql
SELECT cpm.*
FROM contrato_produtos_modalidades cpm
LEFT JOIN contrato_produtos cp ON cp.id = cpm.contrato_produto_id
LEFT JOIN modalidades m ON m.id = cpm.modalidade_id
WHERE cp.id IS NULL OR m.id IS NULL;
```

Depois da revisao:

```sql
DELETE FROM contrato_produtos_modalidades cpm
WHERE NOT EXISTS (SELECT 1 FROM contrato_produtos cp WHERE cp.id = cpm.contrato_produto_id)
   OR NOT EXISTS (SELECT 1 FROM modalidades m WHERE m.id = cpm.modalidade_id);
```

Adicionar FKs e unicidade conforme regra de negocio:

```sql
ALTER TABLE contrato_produtos_modalidades
  ADD CONSTRAINT contrato_produtos_modalidades_contrato_produto_fkey
  FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE contrato_produtos_modalidades
  ADD CONSTRAINT contrato_produtos_modalidades_modalidade_fkey
  FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE RESTRICT NOT VALID;
```

### P1 - Sistema admin usa tabela inexistente

PROBLEMA: `adminDataController.ts` e `healthController.ts` referenciam `institutions` e `plans`, mas o Neon tem `instituicoes` e nao possui `institutions`.

Risco: endpoints administrativos e health checks podem falhar mesmo com o app principal funcionando.

Correcao recomendada:

- Trocar para `instituicoes` ou remover endpoints antigos de tenant/plano se nao fazem parte do produto atual.
- Validar se `plans` ainda e requisito real antes de recriar tabela.

### P2 - Schema local e migrations antigas nao refletem o Neon

PROBLEMA: arquivos antigos ainda citam `cardapios`, `cardapio_refeicoes`, `faturamento_itens`, `pedidos_itens`, `estoque_escola`, `escolas_modalidades` e `institutions`.

Risco: novas correcoes podem ser feitas contra uma fonte falsa de verdade.

Correcao recomendada:

- Gerar um schema-only atual a partir do Neon.
- Marcar migrations antigas como historicas/legadas.
- Usar `backend/scripts/diagnose-db-architecture.js` como checagem antes de qualquer migracao estrutural.

### P2 - FKs de `rota_escolas` estao `NOT VALID`

PROBLEMA: `fk_rota_escolas_escola` e `fk_rota_escolas_rota` existem, mas ainda estao `NOT VALID`.

Risco: dados antigos podem violar integridade sem o Postgres garantir a relacao completa.

Correcao recomendada:

```sql
ALTER TABLE rota_escolas VALIDATE CONSTRAINT fk_rota_escolas_escola;
ALTER TABLE rota_escolas VALIDATE CONSTRAINT fk_rota_escolas_rota;
```

Executar somente apos diagnostico de orfaos em `rota_escolas`.

### P2 - Modulos operacionais ainda usam aluno atual em recalculos retroativos

PROBLEMA: cardapios, custos, planejamento e compras usam `escola_modalidades` para dimensionamento atual.

Risco: relatorio historico de alunos estara correto, mas recalculo operacional de uma competencia antiga pode usar quantidade atual.

Correcao recomendada:

- Adicionar `data_referencia`/competencia nos endpoints de recalculo.
- Reusar a consulta historica por `(escola_id, modalidade_id, vigente_de <= data_ref)`.
- Manter snapshot em guias e pedidos para auditoria.

## Checklist de Seguranca, Performance e Qualidade

- Inputs e SQL: os fluxos analisados usam parametros (`$1`, `$2`) na maior parte. Evitar reintroduzir concatenacao de input em queries.
- Credenciais: conexao Neon vem de variavel de ambiente; nao hardcodar credenciais em codigo.
- Logs: ha logs de erro com stack/query em alguns servicos antigos. Evitar logar parametros sensiveis.
- Indices: historico tem indice composto adequado para consulta por escola/modalidade/data. Falta unicidade composta em `escola_modalidades`.
- Integridade: o maior gap atual esta nas FKs ausentes/orfas em tabelas de associacao.
- Paginacao: listagens grandes devem continuar limitadas; demanda e relatorios agregados devem evitar retornar tudo sem filtro.
- Testabilidade: o servico historico novo tem testes unitarios; faltam testes cobrindo os fluxos antigos de faturamento/demanda que hoje divergem.

## Proxima Ordem de Correcao

1. Concluido: limpar o orfao de `escola_modalidades` e adicionar FKs/unicidade.
2. Concluido: consolidar faturamento em `/api/faturamentos` e remover chamadas antigas por `/api/compras/:pedido_id/faturamento`.
3. Concluido: remover geracao/exportacao de demanda exposta sem rota ativa compativel.
4. Concluido: limpar `contrato_produtos_modalidades` e adicionar constraints.
5. Concluido: corrigir `institutions`/`plans` nos endpoints de sistema.
6. Concluido: validar FKs `NOT VALID` de `rota_escolas`.
7. Concluido: adaptar recalculos retroativos relevantes para usar `escola_modalidades_historico` por competencia/periodo.

## Validacao Apos Correcoes

- `orfaos_escola_modalidades`: 0.
- `duplicados_escola_modalidades`: 0.
- `orfaos_cardapio_modalidades`: 0.
- `orfaos_contrato_produtos_modalidades`: 0.
- `orfaos_guia_produto_escola`: 0.
- `escola_modalidades`, `contrato_produtos_modalidades` e `rota_escolas` possuem constraints validadas no Neon.
- Faturamento ativo usa `faturamentos_pedidos` e `faturamentos_itens`; o caminho legado por compras foi removido.
- Demanda/geracao de guias usa a quantidade de alunos vigente no inicio do periodo, e custo de cardapio usa a competencia do cardapio.
