# Espacamento e Layout

Fontes principais: `frontend/src/components/LayoutModerno.tsx`, `PageContainer.tsx`, `PageHeader.tsx`, `DataTable.tsx`, `BaseDialog.tsx` e `frontend/src/theme/theme.ts`.

## Medidas estruturais canonicas

| Elemento | Medida | Uso | Confianca |
| --- | --- | --- | --- |
| `drawerWidth` | `248px` | largura do menu lateral expandido | 🟢 |
| `collapsedDrawerWidth` | `78px` | largura do menu lateral recolhido | 🟢 |
| `desktopTitleBarHeight` | `32px` | faixa superior integrada ao shell desktop | 🟢 |
| topbar desktop | `68px` aprox. | cabecalho principal | 🟢 |
| topbar mobile | `60px` aprox. | cabecalho em telas pequenas | 🟢 |
| busca principal | `maxWidth 440px` a `500px` | campo de busca global | 🟢 |
| item de navegacao | `minHeight 44px` | links de menu | 🟢 |
| botao de categoria | `minHeight 40px` | grupos expansiveis na lateral | 🟢 |
| campo de busca interno | `minHeight 38px` | inputs compactos | 🟢 |

## Padding e gaps recorrentes

| Contexto | Valor | Observacao | Confianca |
| --- | --- | --- | --- |
| `PageContainer` horizontal | `xs: 2`, `md: 3` | moldura base de pagina | 🟢 |
| `PageContainer` vertical | `xs: 2`, `md: 2.5` | respiracao padrao da tela | 🟢 |
| `PageHeader` padding | `xs: 1.75`, `md: 2` | bloco de cabecalho | 🟢 |
| `BaseDialog` layout gap | `3` | composicao vertical de modais | 🟢 |
| cards e paineis | espacamento compacto a medio | utilitario, sem respiro excessivo | 🟡 |

## Raios e superfices

| Elemento | Valor | Observacao | Confianca |
| --- | --- | --- | --- |
| shape global | `10px` | raio base do tema | 🟢 |
| card | `8px` | cards e paineis | 🟢 |
| botao | `8px` | botoes principais e secundarios | 🟢 |
| tab root | `8px` | grupo de tabs | 🟢 |
| tab item | `6px` | aba individual | 🟢 |
| dialog | `12px` | modal principal | 🟢 |
| chip / pill | `999px` | contadores e badges em capsula | 🟢 |
| mobile data card | `6px` | versao compacta de tabela | 🟢 |

## Sombras e profundidade

| Elemento | Valor | Confianca |
| --- | --- | --- |
| shadow leve light | `0 10px 24px rgba(31,36,48,0.05)` | 🟢 |
| shadow leve dark | `0 10px 24px rgba(0,0,0,0.16)` | 🟢 |
| dialog light | `0 14px 32px rgba(31,36,48,0.08)` | 🟢 |
| dialog dark | `0 16px 36px rgba(0,0,0,0.22)` | 🟢 |
| cards do tema | `none` | 🟢 |

## Breakpoints

Nao ha redefinicao de breakpoints no tema. O comportamento observado sugere uso do padrao MUI.

| Breakpoint | Valor inferido | Confianca |
| --- | --- | --- |
| `xs` | `0` | 🟡 |
| `sm` | `600px` | 🟡 |
| `md` | `900px` | 🟡 |
| `lg` | `1200px` | 🟡 |
| `xl` | `1536px` | 🟡 |

## Leitura estrutural

- A interface foi desenhada para alta densidade de informacao, com espacamentos curtos e acoes sempre proximas do dado. `🟡`
- O sistema evita cards muito fofos ou layouts de marketing; a geometria e compacta e previsivel. `🟡`
- O menu lateral e um elemento estrutural dominante, ancorando navegacao e contexto de modulo. `🟡`
