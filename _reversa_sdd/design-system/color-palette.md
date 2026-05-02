# Paleta de Cores

Fonte principal: `frontend/src/theme/theme.ts`. A maior parte dos tokens abaixo vem da funcao `createAppTheme(mode)` e representa a paleta canonica do sistema. O tema ativo por padrao e `dark`.

## Paleta canonica - modo dark

| Token | Valor | Uso observado | Confianca |
| --- | --- | --- | --- |
| `bg` | `#0f1012` | fundo global da aplicacao | 🟢 |
| `canvas` | `#17181c` | cards, superfices e containers | 🟢 |
| `canvasAlt` | `#1f2126` | superficies secundarias e destaques suaves | 🟢 |
| `sidebar` | `#090a0c` | menu lateral | 🟢 |
| `text` | `#f3f4f6` | texto principal | 🟢 |
| `muted` | `#a3a7b0` | texto secundario | 🟢 |
| `subtle` | `#767b86` | dicas, labels discretos, detalhes | 🟢 |
| `border` | `rgba(255, 255, 255, 0.07)` | bordas padrao | 🟢 |
| `borderStrong` | `rgba(255, 255, 255, 0.12)` | separadores mais visiveis | 🟢 |
| `primary` | `#58a6ff` | CTA, links, estados ativos | 🟢 |
| `primaryHover` | `#7bb8ff` | hover de acao primaria | 🟢 |
| `primaryContrast` | `#07111f` | texto sobre a cor primaria | 🟢 |
| `success` | `#47c97e` | sucesso, progresso concluido | 🟢 |
| `warning` | `#d1a24e` | alerta moderado, reservado | 🟢 |
| `danger` | `#ff7373` | erros, sem saldo, acoes destrutivas | 🟢 |
| `info` | `#7fb6ff` | informacao contextual | 🟢 |

## Paleta canonica - modo light

| Token | Valor | Uso observado | Confianca |
| --- | --- | --- | --- |
| `bg` | `#f3f0e8` | fundo global claro | 🟢 |
| `canvas` | `#fbf8f2` | superficies principais | 🟢 |
| `canvasAlt` | `#f5efe4` | superficies alternadas | 🟢 |
| `sidebar` | `#ece4d5` | menu lateral claro | 🟢 |
| `text` | `#1f2430` | texto principal | 🟢 |
| `muted` | `#5f6777` | texto secundario | 🟢 |
| `subtle` | `#8b92a0` | detalhes discretos | 🟢 |
| `border` | `rgba(40, 48, 68, 0.10)` | bordas padrao | 🟢 |
| `borderStrong` | `rgba(40, 48, 68, 0.18)` | separadores fortes | 🟢 |
| `primary` | `#235c52` | acao principal no tema claro | 🟢 |
| `primaryHover` | `#1b4a42` | hover da acao principal | 🟢 |
| `primaryContrast` | `#f7f4ee` | texto sobre a cor primaria | 🟢 |
| `success` | `#2f7d57` | sucesso | 🟢 |
| `warning` | `#b87828` | alerta | 🟢 |
| `danger` | `#bf4d43` | erro | 🟢 |
| `info` | `#3b6a87` | informacao | 🟢 |

## Cores semanticas adicionais

| Token / grupo | Valor | Uso observado | Confianca |
| --- | --- | --- | --- |
| `sidebarSelection` | derivado por `alpha(primary, 0.18)` | item ativo do menu lateral | 🟢 |
| `tableHover` | derivado por `alpha(primary, 0.06)` | hover de linha e acao contextual | 🟢 |
| `add.main` | `success` | botao de adicionar | 🟢 |
| `edit.main` | `info` | botao de editar | 🟢 |
| `delete.main` | `danger` | botao de excluir | 🟢 |
| progresso concluido | verde | barras e indicadores 100% | 🟡 |
| progresso pendente | vermelho | barras e indicadores zerados | 🟡 |
| status intermediario | amarelo | reservado, pendente e alertas | 🟡 |

## Cores locais fora do tema canonico

Essas cores aparecem em componentes especificos, mas nao foram definidas no tema central. Elas indicam drift visual ou areas ainda nao consolidadas pelo design system.

| Local | Cores vistas | Observacao | Confianca |
| --- | --- | --- | --- |
| `frontend/src/components/StatusIndicator.tsx` | `#ff9800`, `#2196f3`, `#4caf50`, `#f44336`, `#9e9e9e` | escala propria de status, paralela ao tema | 🟡 |
| `frontend/src/components/layout/AuthPageShell.tsx` | `#2563eb`, branco, cinzas claros | experiencia de login segue linguagem mais clara e promocional | 🟡 |
| paginas e widgets isolados | azuis e verdes hardcoded variados | coexistem tons nao tokenizados no frontend | 🟡 |

## Leitura visual consolidada

- O produto opera hoje com identidade principal escura, densa e utilitaria. `🟡`
- A acao primaria usa azul vivo no dark mode, mesmo com o tema claro manter um verde fechado como primaria. `🟢`
- Estados operacionais seguem triade verde/amarelo/vermelho, confirmada tanto em codigo quanto nas screenshots. `🟡`
- Existe um nucleo canonico bem definido em `theme.ts`, mas ainda ha fragmentacao de cor em componentes isolados. `🟡`
