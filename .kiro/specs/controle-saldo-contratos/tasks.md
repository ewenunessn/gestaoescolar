# Implementation Plan

- [x] 1. Criar estrutura de dados para movimentações de consumo





  - Criar tabela movimentacoes_consumo_contratos no banco de dados
  - Implementar índices para otimização de consultas
  - Criar view para cálculo de saldos dos itens de contratos
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Implementar modelo de dados MovimentacaoConsumoContrato





  - Criar interface TypeScript para MovimentacaoConsumoContrato
  - Implementar funções de criação, leitura, atualização e exclusão
  - Adicionar validações de negócio (quantidade disponível, data, justificativa)
  - Implementar função para calcular saldos de itens de contratos
  - _Requirements: 2.1, 2.2, 2.3, 3.5_

- [x] 3. Criar controller para gerenciar movimentações de consumo















  - Implementar endpoint POST para registrar nova movimentação de consumo
  - Implementar endpoint GET para listar histórico de movimentações por item
  - Implementar endpoint PUT para editar movimentações (apenas observações)
  - Implementar endpoint DELETE para remover movimentações com validações
  - Adicionar tratamento de erros específicos (quantidade insuficiente, contrato vencido)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3_
-

- [x] 4. Implementar controller para consulta de saldos de contratos




  - Criar endpoint GET para listar todos os itens de contratos de um fornecedor com saldos
  - Implementar endpoint GET para itens específicos de um contrato
  - Adicionar endpoint GET para detalhes do saldo de um item específico
  - Implementar filtros por status (disponível, baixo estoque, esgotado)
  - Adicionar suporte a pesquisa por nome do produto
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1, 5.2, 5.3, 5.4, 5.5_
-

- [x] 5. Criar serviço frontend para comunicação com API




  - Implementar funções para buscar saldos de contratos de fornecedor
  - Criar funções para registrar, editar e excluir movimentações de consumo
  - Implementar função para buscar histórico de movimentações
  - Adicionar tratamento de erros e loading states
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_
-

- [x] 6. Desenvolver página principal SaldoContratosPage












  - Criar componente de página para exibir saldos de contratos por fornecedor
  - Implementar seleção de fornecedor e navegação
  - Adicionar indicadores visuais de resumo (total de contratos, itens disponíveis, esgotados)
  - Implementar filtros por contrato, status e período
  - Adicionar campo de pesquisa por nome do produto
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_

- [x] 7. Implementar tabela de itens de contratos ContratoItensTable





  - Criar componente de tabela para exibir itens dos contratos com informações de saldo
  - Mostrar colunas: contrato, produto, qtd original, qtd aditivos, qtd total, qtd utilizada, qtd disponível, valor unitário, valor disponível, status
  - Implementar indicadores visuais para status (disponível, baixo estoque, esgotado)
  - Adicionar botões de ação para registrar consumo e visualizar histórico
  - Implementar ordenação por colunas
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.3, 6.4_

- [-] 8. Criar modal RegistrarConsumoDialog








  - Implementar modal para registro de movimentações de consumo
  - Adicionar campos: quantidade/valor a consumir, justificativa, data, documento referência, observações
  - Implementar validações: quantidade não pode exceder disponível, justificativa obrigatória, data não pode ser futura
  - Mostrar informações do item (nome, unidade, quantidade disponível)
  - Adicionar confirmação antes de salvar
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 9. Desenvolver modal HistoricoMovimentacoesDialog
  - Criar modal para exibir histórico de movimentações de um item
  - Implementar tabela com colunas: data, tipo, quantidade, justificativa, usuário, observações
  - Adicionar filtros por data e tipo de movimentação
  - Implementar paginação para históricos grandes
  - Mostrar totais e resumo das movimentações
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 10. Implementar sistema de alertas para baixo estoque
  - Criar lógica para identificar itens com menos de 10% do saldo total
  - Implementar marcação visual de itens com baixo estoque na tabela
  - Adicionar destaque em vermelho para itens esgotados
  - Criar contador de itens com baixo estoque na tela principal
  - Implementar notificações visuais para alertas
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 11. Integrar nova funcionalidade com sistema de navegação
  - Adicionar nova rota para página de saldo de contratos
  - Atualizar menu de navegação para incluir acesso ao controle de saldo de contratos
  - Modificar página de detalhes do fornecedor para incluir link para saldo de contratos
  - Implementar breadcrumbs para navegação entre páginas
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 12. Criar testes unitários para modelos e controllers
  - Escrever testes para modelo MovimentacaoConsumoContrato (CRUD e validações)
  - Criar testes para cálculo de saldos de itens de contratos
  - Implementar testes para controllers de movimentações e saldos
  - Testar cenários de erro (quantidade insuficiente, dados inválidos)
  - Adicionar testes para filtros e pesquisas
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 13. Implementar testes de integração para fluxo completo
  - Testar fluxo: criar contrato → adicionar aditivo → registrar consumo → verificar saldo
  - Criar testes para múltiplas movimentações no mesmo item
  - Testar estorno de movimentações e recálculo de saldos
  - Implementar testes de performance para consultas com muitos contratos
  - Testar filtros e pesquisas com grandes volumes de dados
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_