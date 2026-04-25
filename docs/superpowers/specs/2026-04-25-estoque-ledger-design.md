# Redesign Do Estoque Com Ledger Operacional

## Contexto

O módulo de estoque atual mistura saldos editáveis, históricos separados e telas orientadas por tabela. O resultado é um fluxo difícil para usuários leigos, com risco de erro operacional, baixa rastreabilidade e múltiplos pontos de inconsistência entre estoque central, estoque escolar, recebimentos e entregas.

O modelo operacional aprovado para a próxima iteração é:

- O almoxarifado central controla os produtos recebidos de fornecedores.
- O estoque escolar pode ser lançado pela própria escola no portal.
- A equipe central também pode lançar no estoque escolar.
- Algumas escolas operam por conta própria, outras dependem da central e outras ficam em modo híbrido.
- No modo híbrido, lançamentos da escola entram como efetivos imediatos.

## Objetivos

- Transformar o estoque em um sistema auditável por eventos, em vez de saldos editados diretamente.
- Reduzir erros de uso para operadores leigos com fluxos guiados por tarefa.
- Tornar saldo, histórico e origem de cada movimentação fáceis de entender.
- Integrar recebimentos de fornecedor e entregas às escolas ao mesmo modelo operacional.
- Permitir operação por escola, por central ou em modo híbrido sem sobrescrever histórico.

## Não Objetivos

- Não reescrever todos os módulos do sistema nesta etapa.
- Não criar operação offline.
- Não eliminar de imediato todas as tabelas legadas.
- Não depender de conciliação manual como mecanismo principal do sistema.

## Direção Recomendada

O estoque passa a ser modelado como um ledger operacional único. Cada ação relevante gera um evento imutável e o saldo passa a ser uma projeção derivada desses eventos.

O sistema deixa de tratar estoque como "valor atual a ser corrigido em vários lugares" e passa a tratar estoque como "sequência auditável do que aconteceu".

## Modelo Operacional

Eventos principais:

- `recebimento_central`: entrada no almoxarifado a partir de fornecedor.
- `transferencia_para_escola`: saída do central com destino a uma escola.
- `entrada_manual_escola`: entrada local registrada pela escola ou pela central fora de transferência formal.
- `saida_escola`: consumo, uso, perda, descarte ou devolução.
- `ajuste_estoque`: correção excepcional com motivo obrigatório.
- `estorno_evento`: reversão explícita de um evento anterior, sem apagar histórico.

Regras de verdade:

- O saldo do estoque central é derivado apenas de eventos do escopo central.
- O saldo de cada escola é derivado apenas dos eventos daquela escola.
- Nenhum operador edita o saldo final diretamente.
- Toda alteração registra usuário, origem, motivo, data, contexto e referência externa quando existir.

## Fluxo Operacional

### Recebimento no Almoxarifado Central

1. O usuário registra o recebimento do fornecedor.
2. O sistema cria evento `recebimento_central`.
3. O saldo do central é atualizado por projeção.
4. Lote, validade, documento e fornecedor ficam associados ao evento.

### Envio Do Central Para A Escola

1. A central registra a transferência para a escola.
2. O sistema cria o evento `transferencia_para_escola`.
3. O saldo do central é reduzido e o saldo escolar é aumentado.
4. A movimentação mantém vínculo com produto, escola, lote e operador.

### Operação Escolar No Portal

1. A escola registra entrada, saída ou ajuste.
2. O sistema grava o evento escolar correspondente com origem `portal_escola`.
3. A movimentação entra como efetiva imediata.
4. O saldo escolar é recalculado a partir da projeção.

### Operação Escolar Pela Equipe Central

1. A central registra entrada, saída ou ajuste em nome da escola.
2. O sistema grava o mesmo tipo de evento escolar, mas com origem `central_operador`.
3. O histórico deixa explícito quem lançou e de onde o lançamento veio.

### Correção De Erro

1. O operador localiza o evento incorreto.
2. O sistema permite estorno ou ajuste corretivo conforme a regra do caso.
3. O histórico é preservado integralmente.
4. O saldo resultante passa a refletir a correção sem apagar o passado.

## Modos De Operação Da Escola

Cada escola terá um modo operacional configurável:

- `escola`: a própria escola lança as movimentações.
- `central`: a central lança as movimentações pela escola.
- `hibrido`: os dois podem lançar no mesmo estoque escolar.

No modo híbrido, não existe sobrescrita automática de um lado sobre o outro. O sistema assume que a operação já conhece quais escolas controlam o próprio estoque e quais dependem da central. O requisito principal é rastreabilidade, não arbitragem automática.

## UX E Design De Frontend

O frontend deve abandonar a lógica de "tela principal = tabela completa com vários ícones". A interface será orientada por ação operacional.

Estrutura recomendada para estoque escolar e central:

- `Visão geral`: alertas, itens críticos, últimas movimentações e atalhos.
- `Registrar entrada`: fluxo guiado.
- `Registrar saída`: fluxo guiado.
- `Registrar ajuste`: fluxo restrito e explícito.
- `Histórico`: consulta filtrável e auditável.
- `Conciliação`: área secundária para supervisão e exceções.

Princípios de UX:

- Exibir sempre `saldo antes`, `quantidade informada` e `saldo depois`.
- Dar destaque visual à unidade, ao contexto do produto e ao motivo da operação.
- Usar verbos operacionais claros: `Confirmar entrada`, `Confirmar saída`, `Aplicar ajuste`.
- Esconder ações raras atrás de áreas secundárias.
- Pedir confirmação extra para ajustes e para saídas que zeram estoque.
- Destacar a origem do lançamento: `escola`, `central`, `recebimento`, `transferência`, `estorno`.

Portal escolar e tela administrativa devem compartilhar a mesma linguagem visual e a mesma lógica de fluxo, variando apenas permissões, contexto e profundidade de auditoria.

## Regras De Prevenção De Erro

- Bloquear quantidade negativa e campos vazios.
- Validar unidade e produto antes da confirmação.
- Impedir saída acima do saldo disponível.
- Exigir motivo obrigatório para ajuste.
- Exigir observação obrigatória em ações de maior risco quando necessário.
- Impedir duplicidade por clique duplo e por repetição idêntica em janela curta.
- Destacar visualmente quando a operação afeta lote, validade ou zera saldo.

## Arquitetura De Dados

### Tabela Principal De Eventos

Criar uma tabela de ledger como fonte principal de escrita:

`estoque_eventos`

Campos principais:

- `id`
- `tenant_id`
- `escopo` (`central` ou `escola`)
- `escola_id` opcional
- `produto_id`
- `lote_id` opcional
- `tipo_evento`
- `origem`
- `quantidade_delta`
- `quantidade_absoluta` opcional para ajustes absolutos
- `motivo`
- `observacao`
- `referencia_tipo`
- `referencia_id`
- `usuario_id`
- `usuario_nome_snapshot`
- `data_evento`
- `evento_estornado_id` opcional
- `created_at`

### Projeções De Leitura

O frontend não deve consultar o ledger bruto como fonte principal de leitura operacional. O backend expõe projeções derivadas:

- `saldo_central_por_produto`
- `saldo_escola_por_produto`
- `saldo_por_lote`
- `timeline_movimentacoes`
- `resumo_alertas_estoque`

Essas projeções podem ser implementadas como views, materialized views ou tabelas de projeção atualizadas por serviço transacional. A escolha final deve priorizar consistência e simplicidade operacional.

### Configuração Operacional Da Escola

Criar estrutura de apoio para definir como cada escola opera:

`estoque_operacao_escola`

Campos principais:

- `escola_id`
- `modo_operacao`
- `permite_ajuste_escola`
- `permite_lancamento_central`
- `updated_at`
- `updated_by`

## Integrações

### Recebimentos

O módulo de recebimentos deve deixar de apenas registrar recebimento administrativo. Ao confirmar um recebimento válido, o backend passa a gerar também o evento `recebimento_central`.

### Entregas

O módulo de entregas deve deixar explícito o momento em que a entrega vira evento de estoque escolar. A implementação recomendada é gerar `transferencia_para_escola` no ponto operacional definido para a confirmação efetiva da entrega.

### Estoque Escolar Manual

Entradas, saídas e ajustes registrados pela escola ou pela central para uma escola devem gerar sempre evento escolar. Atualização direta de saldo passa a ser proibida na camada de escrita nova.

## Compatibilidade Com Estruturas Legadas

As tabelas legadas podem continuar disponíveis em fase de transição para leitura histórica e compatibilidade, mas a nova escrita deve ser centralizada no ledger.

Tabelas e fluxos antigos devem ser classificados como:

- `legado leitura`
- `legado leitura e reconciliação`
- `descontinuado para escrita`

## Estratégia De Migração

1. Introduzir `estoque_eventos` e as projeções sem quebrar as telas atuais.
2. Adaptar o backend para gravar evento e atualizar projeções.
3. Migrar primeiro o estoque escolar para os novos endpoints e fluxos.
4. Integrar recebimentos ao evento `recebimento_central`.
5. Integrar entregas ao evento `transferencia_para_escola`.
6. Redesenhar o estoque central em cima da mesma lógica operacional.
7. Encerrar escrita direta nas estruturas antigas.

## Ordem Recomendada De Implementação

1. Backend do ledger e projeções.
2. Remodelação do estoque escolar.
3. Redesign do frontend com foco em tarefas e prevenção de erro.
4. Integração com recebimentos.
5. Integração com entregas.
6. Desativação progressiva da escrita legada.

## Estratégia De Testes

Cobertura mínima obrigatória:

- reconstrução correta de saldo por sequência de eventos;
- bloqueio de saída acima do saldo;
- ajuste absoluto e ajuste relativo com rastreabilidade;
- estorno correto sem apagar histórico;
- prevenção de duplicidade;
- distinção clara de origem entre portal escolar e central;
- integração `recebimento -> estoque central`;
- integração `entrega -> estoque escolar`;
- operação híbrida sem sobrescrita de histórico;
- projeções compatíveis com os eventos persistidos.

## Riscos E Mitigações

- Complexidade de transição entre legado e novo modelo.
  Mitigação: rollout por etapas e escrita nova concentrada em um ponto.
- Divergência entre módulos integrados e estoque.
  Mitigação: integração por evento transacional e testes de ponta a ponta.
- Resistência do usuário a mudanças no fluxo.
  Mitigação: telas orientadas por tarefa, linguagem simples e ações nomeadas pelo que realmente acontece.

## Resultado Esperado

Ao final da remodelação, o sistema deve permitir que qualquer operador entenda:

- o que entrou;
- o que saiu;
- quem lançou;
- de onde o lançamento veio;
- por que o saldo atual tem aquele valor.

O principal ganho não é apenas visual. O ganho central é transformar estoque em um fluxo confiável, explicável e difícil de usar errado.
