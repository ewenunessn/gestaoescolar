# Implementação: Gerar Guia de Demanda na Tela de Listagem

## Resumo
Implementado modal para gerar guias de demanda diretamente da página de listagem de guias, similar ao fluxo da tela de planejamento de compras.

## Funcionalidades Implementadas

### 1. Botão "Gerar Guia de Demanda"
- Adicionado botão azul ao lado do botão "Nova Competência"
- Ícone: `TableChartIcon`
- Cor: `#1d4ed8` (azul)

### 2. Modal de Geração
O modal permite:
- **Selecionar Competência**: Dropdown com últimos 12 meses + próximos 3 meses
- **Selecionar Períodos**: Usando o componente `SeletorPeriodoCalendario`
  - Permite adicionar múltiplos períodos
  - Cada período é exibido como um chip removível
  - Calendário visual para seleção de datas
  - Validação de períodos sobrepostos
- **Gerar Guias**: Botão que chama a API para criar as guias

### 3. Fluxo de Uso
1. Usuário clica em "Gerar Guia de Demanda"
2. Seleciona a competência (mês/ano)
3. Clica em "Selecionar Período" para abrir o calendário
4. Seleciona data inicial e final no calendário
5. Pode adicionar mais períodos se necessário
6. Clica em "Gerar Guia(s)" para criar
7. Visualiza resultado com links para as guias criadas

### 4. Componentes Utilizados
- `SeletorPeriodoCalendario`: Calendário visual para seleção de períodos
- `gerarGuiasDemanda`: Função da API de planejamento de compras
- `GerarGuiasResponse`: Interface de resposta da API

### 5. Feedback ao Usuário
- **Sucesso**: Alert verde com link "Ver Guia" para cada guia criada
- **Erro**: Alert vermelho com mensagem de erro
- **Loading**: Botão mostra "Gerando..." com spinner
- **Validação**: Aviso se competência ou período não foram selecionados

## Arquivos Modificados

### `frontend/src/pages/GuiasDemandaLista.tsx`
- Adicionados imports: `SeletorPeriodoCalendario`, `gerarGuiasDemanda`, `GerarGuiasResponse`
- Novos estados:
  - `openGerarGuia`: Controla abertura do modal
  - `competenciaGerar`: Competência selecionada
  - `periodosGerar`: Lista de períodos selecionados
  - `seletorOpen`: Controla abertura do calendário
  - `gerandoGuias`: Estado de loading
  - `resultadoGuias`: Resultado da geração
- Novas funções:
  - `gerarCompetenciasDisponiveis()`: Gera lista de competências
  - `handleGerarGuias()`: Chama API para gerar guias
  - `handleFecharModalGerar()`: Fecha modal e limpa estados
- Novo botão "Gerar Guia de Demanda"
- Novo modal com seleção de competência e períodos
- Integração com `SeletorPeriodoCalendario`

## Benefícios
1. **Fluxo Unificado**: Mesmo padrão da tela de planejamento
2. **Experiência Visual**: Calendário interativo para seleção de períodos
3. **Flexibilidade**: Permite múltiplos períodos em uma única operação
4. **Feedback Claro**: Resultado detalhado com links diretos para as guias
5. **Validação**: Previne períodos sobrepostos e seleções inválidas

## Próximos Passos Sugeridos
- [ ] Adicionar filtro de escolas no modal (opcional)
- [ ] Permitir editar nome da guia antes de gerar
- [ ] Adicionar preview das quantidades antes de gerar
- [ ] Implementar geração em lote com múltiplas competências
