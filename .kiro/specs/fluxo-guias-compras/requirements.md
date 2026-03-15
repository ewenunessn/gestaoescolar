# Documento de Requisitos

## Introdução

Esta feature reestrutura o fluxo de trabalho do sistema de gestão escolar para que as **Guias de Demanda** sejam o elo central entre o cardápio aprovado e os pedidos de compra. Atualmente, os dois módulos (Guias de Demanda e Planejamento de Compras) operam de forma independente: o planejamento calcula a demanda diretamente do cardápio sem passar pelas guias, e as guias são criadas manualmente sem vínculo com pedidos.

O novo fluxo unifica esses módulos em uma cadeia contínua:

```
Cardápio aprovado
    ↓
Gerar Guias de Demanda (calculadas do cardápio, por escola e período)
    ↓
Consolidar demanda total (soma de todas as escolas via guias)
    ↓
Gerar Pedido de Compra (baseado na demanda consolidada das guias)
    ↓
Programar entregas por escola (usando as guias como referência)
    ↓
Registrar entrega / Faturamento
    ↓
Guia vira comprovante de entrega
```

## Glossário

- **Sistema**: O sistema de gestão escolar (backend + frontend).
- **Guia**: Registro na tabela `guias` que representa a demanda de produtos para um período (mês/ano), servindo como elo entre cardápio e pedido de compra.
- **Guia_Item**: Registro na tabela `guia_produto_escola` que representa a quantidade de um produto destinada a uma escola dentro de uma guia.
- **Pedido**: Registro na tabela `pedidos` que representa uma ordem de compra gerada a partir da demanda consolidada das guias.
- **Pedido_Item**: Registro na tabela `pedido_itens` que representa um produto dentro de um pedido, com quantidade total consolidada.
- **Programacao_Entrega**: Registro na tabela `pedido_item_programacoes` que representa a data de entrega de um item do pedido.
- **Cardapio**: Conjunto de refeições planejadas para uma competência (mês/ano), armazenado nas tabelas `cardapios_modalidade` e `cardapio_refeicoes_dia`.
- **Competencia**: Par mês/ano que identifica o período de planejamento.
- **Consolidacao**: Soma das quantidades de todas as escolas para um mesmo produto dentro de uma competência.
- **Gerador_Guias**: Componente do sistema responsável por calcular e criar guias a partir do cardápio.
- **Gerador_Pedidos**: Componente do sistema responsável por criar pedidos a partir da demanda consolidada das guias.
- **Modalidade**: Tipo de atendimento escolar (ex: Ensino Fundamental, EJA, Creche), que determina o per capita dos produtos.
- **Per_Capita**: Quantidade de produto por aluno por refeição, podendo variar por modalidade.
- **Fator_Correcao**: Multiplicador aplicado ao per capita para compensar perdas no preparo.

---

## Requisitos

### Requisito 1: Geração de Guias a partir do Cardápio

**User Story:** Como nutricionista, quero gerar as guias de demanda automaticamente a partir do cardápio aprovado, para que as quantidades por escola sejam calculadas com base no per capita real e no número de alunos.

#### Critérios de Aceitação

1. WHEN o usuário solicita a geração de guias para uma competência, THE Gerador_Guias SHALL calcular as quantidades de cada produto por escola com base nos cardápios ativos da competência, no per capita por modalidade, no fator de correção do produto e no número de alunos de cada escola.
2. WHEN o usuário solicita a geração de guias para uma competência, THE Gerador_Guias SHALL criar ou atualizar registros na tabela `guias` para a competência informada.
3. WHEN o Gerador_Guias calcula a demanda por escola, THE Gerador_Guias SHALL criar registros em `guia_produto_escola` com `quantidade`, `produto_id`, `escola_id` e `guia_id` preenchidos.
4. WHEN o usuário informa um período (data_inicio, data_fim) dentro da competência, THE Gerador_Guias SHALL restringir o cálculo aos dias do cardápio que estejam dentro do período informado.
5. IF não existir cardápio ativo para a competência informada, THEN THE Gerador_Guias SHALL retornar uma mensagem de erro indicando a ausência de cardápio.
6. IF uma guia para a competência já existir com itens, THEN THE Sistema SHALL exibir aviso ao usuário antes de sobrescrever os dados existentes.
7. WHERE o usuário selecionar escolas específicas, THE Gerador_Guias SHALL restringir o cálculo às escolas selecionadas.
8. THE Gerador_Guias SHALL registrar no campo `status` da guia o valor `'aberta'` ao criar uma nova guia.

---

### Requisito 2: Vínculo entre Guia e Pedido de Compra

**User Story:** Como gestor de compras, quero que os pedidos de compra sejam gerados a partir das guias de demanda, para que haja rastreabilidade completa entre o que foi planejado no cardápio e o que foi comprado.

#### Critérios de Aceitação

1. THE Sistema SHALL armazenar a referência da guia de origem em cada pedido gerado, por meio de um campo `guia_id` na tabela `pedidos`.
2. WHEN o Gerador_Pedidos cria um pedido a partir de guias, THE Gerador_Pedidos SHALL consolidar as quantidades de `guia_produto_escola` somando todas as escolas para cada produto da competência.
3. WHEN o Gerador_Pedidos cria itens do pedido, THE Gerador_Pedidos SHALL registrar em `pedido_itens` a quantidade consolidada de cada produto, com referência ao `guia_id` de origem.
4. IF uma guia estiver com status `'cancelada'`, THEN THE Gerador_Pedidos SHALL excluir os itens dessa guia da consolidação.
5. THE Sistema SHALL impedir a geração de pedido para uma competência que não possua guias com status `'aberta'` ou `'fechada'`.
6. WHEN um pedido é gerado a partir de guias, THE Sistema SHALL atualizar o status das guias vinculadas para `'fechada'`.

---

### Requisito 3: Programação de Entregas Vinculada às Guias

**User Story:** Como operador logístico, quero programar as entregas por escola usando as guias como referência, para que cada entrega seja rastreada até o item da guia correspondente.

#### Critérios de Aceitação

1. WHEN o usuário programa uma entrega para um item do pedido, THE Sistema SHALL vincular a programação ao `guia_item_id` correspondente em `guia_produto_escola`.
2. THE Sistema SHALL armazenar o campo `guia_item_id` em `pedido_item_programacao_escolas` referenciando o registro em `guia_produto_escola`.
3. WHEN uma entrega é registrada como concluída, THE Sistema SHALL atualizar o campo `status` do registro em `guia_produto_escola` para `'entregue'`.
4. WHEN uma entrega parcial é registrada, THE Sistema SHALL atualizar o campo `status` do registro em `guia_produto_escola` para `'parcial'` e registrar a `quantidade_entregue`.
5. IF a quantidade entregue for igual à quantidade planejada na guia, THEN THE Sistema SHALL atualizar o status do Guia_Item para `'entregue'`.
6. IF a quantidade entregue for menor que a quantidade planejada na guia, THEN THE Sistema SHALL atualizar o status do Guia_Item para `'parcial'`.

---

### Requisito 4: Guia como Comprovante de Entrega

**User Story:** Como gestor escolar, quero que a guia de demanda funcione como comprovante de entrega, para que eu tenha um documento rastreável com GPS, assinatura e responsáveis.

#### Critérios de Aceitação

1. WHEN uma entrega é registrada, THE Sistema SHALL persistir em `guia_produto_escola` os campos: `data_entrega`, `nome_quem_recebeu`, `nome_quem_entregou`, `quantidade_entregue` e `entrega_confirmada`.
2. WHERE o dispositivo do entregador possuir GPS disponível, THE Sistema SHALL registrar `latitude`, `longitude` e `precisao_gps` no registro de entrega em `guia_produto_escola`.
3. THE Sistema SHALL permitir a geração de um documento PDF da guia contendo: escola, produtos, quantidades planejadas, quantidades entregues, data de entrega, responsáveis e status de cada item.
4. WHEN todos os itens de uma escola em uma guia estiverem com status `'entregue'`, THE Sistema SHALL atualizar o status geral da guia para `'fechada'` se todas as escolas estiverem completas.
5. THE Sistema SHALL manter o histórico de alterações de status dos itens da guia para fins de auditoria.

---

### Requisito 5: Consolidação de Demanda pelas Guias

**User Story:** Como gestor de compras, quero visualizar a demanda consolidada de todas as escolas a partir das guias, para que eu possa tomar decisões de compra com base em dados reais do planejamento.

#### Critérios de Aceitação

1. WHEN o usuário solicita a consolidação de uma competência, THE Sistema SHALL somar as quantidades de `guia_produto_escola` agrupadas por `produto_id` para todas as escolas da competência.
2. THE Sistema SHALL exibir a consolidação em uma tabela com colunas: produto, unidade, quantidade total consolidada e detalhamento por escola.
3. WHEN o usuário filtra a consolidação por escola, THE Sistema SHALL exibir apenas os itens da escola selecionada.
4. THE Sistema SHALL calcular e exibir o percentual de entrega de cada produto (quantidade_entregue / quantidade_planejada × 100) na visão consolidada.
5. IF nenhuma guia existir para a competência selecionada, THEN THE Sistema SHALL exibir mensagem informando que não há dados de demanda para o período.

---

### Requisito 6: Migração e Compatibilidade com Fluxo Existente

**User Story:** Como administrador do sistema, quero que a reestruturação não quebre os dados e fluxos existentes, para que pedidos e guias já criados continuem funcionando corretamente.

#### Critérios de Aceitação

1. THE Sistema SHALL manter compatibilidade com guias existentes que foram criadas manualmente, sem `guia_id` vinculado a pedidos.
2. THE Sistema SHALL manter compatibilidade com pedidos existentes que não possuem `guia_id`, tratando o campo como opcional (nullable).
3. WHEN o sistema exibe um pedido sem `guia_id`, THE Sistema SHALL indicar visualmente que o pedido foi criado pelo fluxo legado.
4. THE Sistema SHALL permitir que o usuário vincule manualmente uma guia existente a um pedido existente, desde que ambos sejam da mesma competência.
5. IF uma migração de dados for necessária, THEN THE Sistema SHALL executar a migração sem perda de dados e com rollback disponível.

---

### Requisito 7: Rastreabilidade Cardápio → Guia → Pedido → Entrega

**User Story:** Como auditor, quero rastrear todo o ciclo desde o cardápio até a entrega, para que eu possa verificar a conformidade do processo de compras públicas (PNAE).

#### Critérios de Aceitação

1. THE Sistema SHALL permitir consultar, a partir de um item de `guia_produto_escola`, qual cardápio originou aquele item (referência ao `cardapio_modalidade_id`).
2. THE Sistema SHALL permitir consultar, a partir de um `pedido_item`, qual guia originou aquele item (via `guia_id`).
3. THE Sistema SHALL permitir consultar, a partir de uma guia, quais pedidos foram gerados a partir dela.
4. THE Sistema SHALL exibir na tela de detalhe da guia o pedido vinculado, quando existir.
5. THE Sistema SHALL exibir na tela de detalhe do pedido a guia de origem, quando existir.
6. WHEN o usuário acessa o detalhe de um Guia_Item, THE Sistema SHALL exibir: produto, escola, quantidade planejada, quantidade entregue, status, data de entrega e responsáveis.
