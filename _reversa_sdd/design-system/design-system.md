# Design System

## Resumo executivo

O sistema possui um design system funcional, concentrado principalmente em `frontend/src/theme/theme.ts` e aplicado sobre componentes MUI com overrides densos. A identidade principal atual e um dashboard operacional em tema escuro, com espacamento compacto, bordas discretas e foco em leitura de tabelas, indicadores e acoes transacionais. `🟢`

Ao mesmo tempo, ha drift visual em partes do frontend: alguns componentes e telas mantem cores hardcoded, variacoes locais de status e, em especial, uma experiencia de login mais clara e menos alinhada ao shell principal. `🟡`

## Principios visuais observados

1. Interface operacional, nao promocional. `🟡`
2. Densidade informacional alta, com tabelas, KPIs e filtros compactos. `🟡`
3. Navegacao lateral como ancora estrutural da aplicacao. `🟡`
4. Estados e acoes diferenciados mais por cor semantica e contraste do que por ornamentacao. `🟡`
5. Raios pequenos e superfices contidas; nao ha uso dominante de cards grandes ou layouts ilustrativos. `🟢`

## Shell e composicao

### Layout principal

- `LayoutModerno` define o shell canonico: sidebar lateral, topbar compacta, busca global, seletor de ano letivo e acoes de usuario. `🟢`
- O menu lateral recolhe de `248px` para `78px`, preservando o fluxo de navegacao por icones e secoes. `🟢`
- O tema escuro e confirmado tanto no codigo quanto nas screenshots de dashboard, escolas, cardapios, entregas e estoque. `🟡`

### Containers de pagina

- `PageContainer` e `PageHeader` estabelecem uma moldura consistente para titulos, breadcrumbs e acoes principais. `🟢`
- Os paineis usam radius pequeno, borda suave e sem sombra pesada. `🟢`

## Biblioteca de componentes percebida

| Componente / padrao | Papel | Evidencia |
| --- | --- | --- |
| `LayoutModerno` | shell de navegacao e estrutura global | codigo `🟢`, screenshots `🟡` |
| `PageHeader` | cabecalho de pagina com breadcrumb e CTA | codigo `🟢` |
| `PageContainer` | moldura e espacamento padrao | codigo `🟢` |
| `DataTable` | tabela densa com busca, acoes e responsividade | codigo `🟢`, screenshots `🟡` |
| `BaseDialog` | modal padronizado com radius `12px` | codigo `🟢` |
| `SafeButton` | camada comportamental para acao segura | codigo `🟢` |
| `StatusIndicator` | representacao simplificada de estado | codigo `🟢`, paleta paralela `🟡` |
| chips / pills | badges de modalidade, contadores e filtros | screenshots `🟡`, tokens `🟢` |
| cards KPI | indicadores numericos e resumo de status | screenshots `🟡` |
| calendario / grade semanal | visualizacao de cardapio por periodo | screenshots `🟡` |

## Movimento e interacao

- As transicoes sao curtas e previsiveis, em geral entre `0.15s` e `0.3s`. `🟢`
- O CSS global adiciona animacoes de entrada (`fade`, `slide`, `page transition`) e respeita `prefers-reduced-motion`. `🟢`
- Hover em cards e botoes existe, mas com linguagem contida. `🟡`

## Consistencia e lacunas

### O que esta consolidado

- Paleta principal light/dark. `🟢`
- Escala tipografica principal. `🟢`
- Raios, bordas e comportamento de superficies. `🟢`
- Shell de aplicacao e navegacao lateral. `🟢`

### O que ainda esta fragmentado

- Cores de status fora do tema central. `🟡`
- Experiencia de login com identidade propria. `🟡`
- Possiveis variacoes locais de azul, verde e cinza hardcoded em paginas e widgets. `🟡`
- Breakpoints dependentes do padrao MUI, sem contrato explicito no tema. `🟡`

## Recomendacao de leitura para reconstrucao

Para reimplementar a interface com alta fidelidade, a ordem mais segura e:

1. Recriar `theme.ts` como fonte canonica de cor, tipografia e shape. `🟢`
2. Reproduzir o shell de `LayoutModerno` com suas larguras, alturas e padroes de navegacao. `🟢`
3. Reaplicar `PageContainer`, `PageHeader`, `DataTable` e `BaseDialog` como primitives de composicao. `🟢`
4. Isolar e reabsorver cores hardcoded em tokens semanticos unificados. `🟡`

## Arquivos desta entrega

- `color-palette.md`
- `typography.md`
- `spacing.md`
- `tokens.md`
- `design-system.md`
