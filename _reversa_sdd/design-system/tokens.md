# Tokens de Design

Este arquivo consolida os principais tokens extraidos do sistema por categoria.

## Cor

### Superficie

| Token | Dark | Light | Confianca |
| --- | --- | --- | --- |
| `bg` | `#0f1012` | `#f3f0e8` | 🟢 |
| `canvas` | `#17181c` | `#fbf8f2` | 🟢 |
| `canvasAlt` | `#1f2126` | `#f5efe4` | 🟢 |
| `sidebar` | `#090a0c` | `#ece4d5` | 🟢 |

### Texto

| Token | Dark | Light | Confianca |
| --- | --- | --- | --- |
| `text` | `#f3f4f6` | `#1f2430` | 🟢 |
| `muted` | `#a3a7b0` | `#5f6777` | 🟢 |
| `subtle` | `#767b86` | `#8b92a0` | 🟢 |

### Borda e divisao

| Token | Dark | Light | Confianca |
| --- | --- | --- | --- |
| `border` | `rgba(255,255,255,0.07)` | `rgba(40,48,68,0.10)` | 🟢 |
| `borderStrong` | `rgba(255,255,255,0.12)` | `rgba(40,48,68,0.18)` | 🟢 |

### Semantica

| Token | Dark | Light | Confianca |
| --- | --- | --- | --- |
| `primary` | `#58a6ff` | `#235c52` | 🟢 |
| `primaryHover` | `#7bb8ff` | `#1b4a42` | 🟢 |
| `primaryContrast` | `#07111f` | `#f7f4ee` | 🟢 |
| `success` | `#47c97e` | `#2f7d57` | 🟢 |
| `warning` | `#d1a24e` | `#b87828` | 🟢 |
| `danger` | `#ff7373` | `#bf4d43` | 🟢 |
| `info` | `#7fb6ff` | `#3b6a87` | 🟢 |

## Tipografia

| Token | Valor | Confianca |
| --- | --- | --- |
| `font.family.sans` | `Segoe UI Variable Text -> Segoe UI -> Inter -> sans-serif` | 🟢 |
| `font.family.display` | `Segoe UI Variable Display -> Segoe UI -> Inter -> sans-serif` | 🟢 |
| `font.family.mono` | `Cascadia Mono -> Cascadia Code -> Consolas -> monospace` | 🟢 |
| `font.size.h1` | `2rem` | 🟢 |
| `font.size.h2` | `1.6rem` | 🟢 |
| `font.size.h3` | `1.25rem` | 🟢 |
| `font.size.h4` | `1.05rem` | 🟢 |
| `font.size.body1` | `0.9rem` | 🟢 |
| `font.size.body2` | `0.82rem` | 🟢 |
| `font.size.button` | `0.82rem` | 🟢 |

## Forma

| Token | Valor | Confianca |
| --- | --- | --- |
| `radius.base` | `10px` | 🟢 |
| `radius.card` | `8px` | 🟢 |
| `radius.button` | `8px` | 🟢 |
| `radius.dialog` | `12px` | 🟢 |
| `radius.tabGroup` | `8px` | 🟢 |
| `radius.tab` | `6px` | 🟢 |
| `radius.pill` | `999px` | 🟢 |

## Dimensoes

| Token | Valor | Confianca |
| --- | --- | --- |
| `size.drawer.expanded` | `248px` | 🟢 |
| `size.drawer.collapsed` | `78px` | 🟢 |
| `size.titlebar.desktop` | `32px` | 🟢 |
| `size.appbar.desktop` | `68px` aprox. | 🟢 |
| `size.appbar.mobile` | `60px` aprox. | 🟢 |
| `size.button.minHeight` | `36px` | 🟢 |
| `size.navItem.minHeight` | `44px` | 🟢 |
| `size.category.minHeight` | `40px` | 🟢 |
| `size.search.minHeight` | `38px` | 🟢 |

## Movimento

| Token | Valor | Confianca |
| --- | --- | --- |
| `motion.fast` | `0.15s ease` | 🟢 |
| `motion.drawer` | `0.22s ease` | 🟢 |
| `motion.iconRotate` | `0.18s ease` | 🟢 |
| `motion.page` | `300ms ease-in-out` | 🟢 |
| `motion.cardHover` | `0.3s cubic-bezier(0.4, 0, 0.2, 1)` | 🟢 |
| `motion.buttonScale` | `0.2s ease-in-out` | 🟢 |
| `motion.fadeIn` | `0.6s ease-out` | 🟢 |
| `motion.slideIn` | `0.5s ease-out` | 🟢 |

## Elevacao e camadas

| Token | Valor | Confianca |
| --- | --- | --- |
| `shadow.surface.dark` | `0 10px 24px rgba(0,0,0,0.16)` | 🟢 |
| `shadow.surface.light` | `0 10px 24px rgba(31,36,48,0.05)` | 🟢 |
| `shadow.dialog.dark` | `0 16px 36px rgba(0,0,0,0.22)` | 🟢 |
| `shadow.dialog.light` | `0 14px 32px rgba(31,36,48,0.08)` | 🟢 |
| `z.toast` | `9999` | 🟢 |
| `z.searchOverlay` | `1000` | 🟢 |
| `z.drawerRelative` | `theme.zIndex.drawer + 1/+2` | 🟡 |
| `z.modalRelative` | `theme.zIndex.modal + 1` | 🟡 |

## Tokens ausentes ou fragmentados

| Area | Situacao | Confianca |
| --- | --- | --- |
| breakpoints | herdados do MUI, nao explicitados no tema | 🟡 |
| status locais | ainda usam paletas hardcoded fora do tema | 🟡 |
| tela de login | linguagem de cor paralela ao shell principal | 🟡 |
| foco global | `2px solid #1976d2` em CSS, fora da paleta semantica central | 🟡 |
