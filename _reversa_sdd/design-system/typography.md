# Tipografia

Fonte principal: `frontend/src/theme/theme.ts`, com confirmacao visual nas telas documentadas em `_reversa_sdd/ui/screens/`.

## Familias tipograficas

| Papel | Stack | Uso | Confianca |
| --- | --- | --- | --- |
| Sans base | `"Segoe UI Variable Text","Segoe UI Variable Static Text","Segoe UI","Inter",-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif` | corpo, labels, tabelas e formularios | 🟢 |
| Display | `"Segoe UI Variable Display","Segoe UI Variable Text","Segoe UI","Inter",-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif` | titulos e cabecalhos de tela | 🟢 |
| Mono | `"Cascadia Mono","Cascadia Code","Consolas","SFMono-Regular","Roboto Mono",monospace` | identificadores tecnicos e valores monoespacados | 🟢 |

## Escala tipografica canonica

| Token | Tamanho | Peso | Letter spacing | Uso | Confianca |
| --- | --- | --- | --- | --- | --- |
| `h1` | `2rem` | `700` | `-0.03em` | titulos principais | 🟢 |
| `h2` | `1.6rem` | `700` | `-0.03em` | secoes de alto destaque | 🟢 |
| `h3` | `1.25rem` | `700` | `-0.025em` | subtitulos e cards maiores | 🟢 |
| `h4` | `1.05rem` | `700` | `-0.02em` | cabecalhos compactos | 🟢 |
| `body1` | `0.9rem` | herdado | herdado | texto padrao da aplicacao | 🟢 |
| `body2` | `0.82rem` | herdado | herdado | labels, texto auxiliar e detalhes | 🟢 |
| `button` | `0.82rem` | `600` efetivo nos botoes | `-0.01em` | botoes e acoes compactas | 🟢 |

## Escalas complementares vistas nos componentes

| Contexto | Tamanho | Observacao | Confianca |
| --- | --- | --- | --- |
| `PageHeader` titulo | `1.2rem` a `1.42rem` | ajuste responsivo para cabecalhos de pagina | 🟢 |
| `PageHeader` subtitulo | `0.84rem` | subtitulo compacto | 🟢 |
| `EntityListTable` linhas desktop | `0.8125rem` | leitura de tabela densa | 🟢 |
| `EntityListTable` linhas mobile | `0.75rem` | compressao para telas menores | 🟢 |
| `EntityListTable` paginacao | `0.6875rem` | microtipografia operacional | 🟢 |

## Caracteristicas do estilo textual

- Titulos usam peso forte e espaco negativo leve para condensar o bloco visual. `🟢`
- Corpo e labels privilegiam legibilidade em dashboards, tabelas e formularios compactos. `🟡`
- A aplicacao evita headlines promocionais; a voz visual e de sistema operacional interno. `🟡`
- Em varias telas, o contraste entre `text`, `muted` e `subtle` organiza a hierarquia sem depender de tamanhos grandes. `🟡`

## Padrao percebido nas screenshots

- O dashboard usa um titulo grande de saudacao, mas ainda dentro de uma linguagem funcional. `🟡`
- Tabelas e indicadores priorizam numeros e nomes com baixa verbosidade e alta densidade informacional. `🟡`
- Labels de breadcrumb, secoes e cards seguem caixa alta discreta ou pesos fortes pequenos. `🟡`
