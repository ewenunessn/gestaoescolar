# Componentes compartilhados

Esta pasta concentra componentes reutilizaveis do frontend. Novos arquivos devem entrar na subpasta que representa sua responsabilidade principal.

## Subpastas

- `layout/`: shells estruturais da aplicacao, chrome de janela desktop e identidade visual global.
- `navigation/`: busca global, selecao de periodo ativo e controles de navegacao transversal.
- `data-display/`: tabelas, listas densas e componentes compartilhados de exibicao de dados.
- `dialogs/`: dialogs reutilizaveis que nao pertencem a um modulo de negocio especifico.

Componentes especificos de um modulo devem permanecer em `frontend/src/modules/<modulo>/components` ou junto da pagina que os usa.
