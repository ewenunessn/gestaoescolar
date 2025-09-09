# Requirements Document

## Introduction

Esta funcionalidade reformula o controle de saldo de fornecedores para ser baseado nos contratos individuais, permitindo um controle granular por item contratado com sistema de movimentações para registrar o uso dos produtos. O sistema deve mostrar quantidade atual, quantidade total do contrato (incluindo aditivos), quantidade já utilizada e permitir registrar movimentações de consumo com justificativa e data.

## Requirements

### Requirement 1

**User Story:** Como administrador do sistema, eu quero visualizar o saldo detalhado de todos os contratos de um fornecedor, para que eu possa ter controle granular sobre cada item contratado.

#### Acceptance Criteria

1. WHEN o usuário acessa a tela de saldo de fornecedor THEN o sistema SHALL exibir uma lista de todos os contratos ativos do fornecedor
2. WHEN o sistema exibe os contratos THEN cada contrato SHALL mostrar número, data de início, data de fim e status
3. WHEN o usuário seleciona um contrato THEN o sistema SHALL exibir todos os itens desse contrato com suas informações de saldo

### Requirement 2

**User Story:** Como administrador, eu quero ver as informações detalhadas de saldo de cada item do contrato, para que eu possa acompanhar o consumo e disponibilidade.

#### Acceptance Criteria

1. WHEN o sistema exibe os itens do contrato THEN cada item SHALL mostrar nome do produto, unidade de medida
2. WHEN o sistema exibe os itens THEN SHALL mostrar quantidade original do contrato
3. WHEN o sistema exibe os itens THEN SHALL mostrar quantidade total atual (contrato + aditivos)
4. WHEN o sistema exibe os itens THEN SHALL mostrar quantidade já utilizada/esgotada
5. WHEN o sistema exibe os itens THEN SHALL mostrar quantidade disponível atual (total - utilizada)
6. WHEN o sistema exibe os itens THEN SHALL mostrar valor unitário e valor total disponível

### Requirement 3

**User Story:** Como administrador, eu quero registrar movimentações de consumo de produtos, para que eu possa manter o saldo atualizado conforme o uso real.

#### Acceptance Criteria

1. WHEN o usuário clica no botão de ação de um item THEN o sistema SHALL abrir um modal de registro de movimentação
2. WHEN o modal de movimentação é aberto THEN SHALL permitir inserir quantidade ou valor a ser abatido
3. WHEN o usuário registra uma movimentação THEN SHALL ser obrigatório informar justificativa
4. WHEN o usuário registra uma movimentação THEN SHALL ser obrigatório informar data da movimentação
5. WHEN o usuário confirma a movimentação THEN o sistema SHALL validar se a quantidade não excede o saldo disponível
6. WHEN a movimentação é válida THEN o sistema SHALL atualizar o saldo do item automaticamente

### Requirement 4

**User Story:** Como administrador, eu quero visualizar o histórico de movimentações de cada item, para que eu possa auditar o uso dos produtos contratados.

#### Acceptance Criteria

1. WHEN o usuário acessa os detalhes de um item THEN o sistema SHALL mostrar histórico de movimentações
2. WHEN o sistema exibe o histórico THEN cada movimentação SHALL mostrar data, quantidade/valor, justificativa e usuário responsável
3. WHEN o sistema exibe o histórico THEN as movimentações SHALL estar ordenadas por data (mais recente primeiro)
4. WHEN há muitas movimentações THEN o sistema SHALL implementar paginação no histórico

### Requirement 5

**User Story:** Como administrador, eu quero filtrar e pesquisar itens nos contratos, para que eu possa encontrar rapidamente produtos específicos.

#### Acceptance Criteria

1. WHEN o usuário está na tela de saldo THEN SHALL haver campo de pesquisa por nome do produto
2. WHEN o usuário digita no campo de pesquisa THEN o sistema SHALL filtrar os itens em tempo real
3. WHEN o usuário aplica filtros THEN SHALL poder filtrar por status (disponível, esgotado, baixo estoque)
4. WHEN o usuário aplica filtros THEN SHALL poder filtrar por faixa de datas do contrato
5. WHEN há filtros aplicados THEN o sistema SHALL mostrar indicador visual dos filtros ativos

### Requirement 6

**User Story:** Como administrador, eu quero receber alertas sobre itens com baixo estoque, para que eu possa tomar ações preventivas.

#### Acceptance Criteria

1. WHEN um item atinge menos de 10% do saldo total THEN o sistema SHALL marcar como "baixo estoque"
2. WHEN um item está com baixo estoque THEN SHALL ser destacado visualmente na lista
3. WHEN um item está esgotado THEN SHALL ser marcado como "esgotado" e destacado em vermelho
4. WHEN há itens com baixo estoque THEN o sistema SHALL mostrar contador na tela principal