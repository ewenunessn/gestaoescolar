# Organizacao do Frontend Go

Este frontend usa uma organizacao simples por responsabilidade, sem uma camada de arquitetura pesada.

- `app/`: composicao da aplicacao, shell logado, rotas e estado compartilhado leve.
- `api/`: cliente HTTP, configuracao de API e funcoes de carregamento de recursos.
- `components/`: componentes reutilizaveis e sem regra de negocio.
- `components/ui/`: componentes base no padrao shadcn/ui, estilizados com Tailwind CSS.
- `features/`: telas e fluxos por dominio funcional.
- `theme/`: temas visuais e tokens de design aplicados como variaveis CSS.
- `types/`: contratos TypeScript compartilhados entre telas.

## Como adicionar uma nova tela

1. Crie a pagina em `features/<dominio>/<NomeDaPagina>.tsx`.
2. Coloque chamadas de API comuns em `api/` se forem reutilizadas por mais de uma tela.
3. Reutilize `components/ui.tsx` para campos, cards, tabelas e seletores simples.
4. Registre a rota em `app/routes.ts`.
5. Adicione a rota no grupo de menu correto em `navItems`.
6. Componha a pagina em `app/App.tsx`, deixando o `App` apenas com estado compartilhado e navegacao.

## Menus e submenus

O menu lateral e definido por `navItems` em `app/routes.ts`. Cada item pode ter uma rota direta ou uma lista de submenus. Cadastros devem ter telas individuais por modulo, por exemplo `SchoolsPage`, `ModalitiesPage` e `ProductsPage`.

## Layout de paginas

As paginas internas devem usar `PageLayout` e `ResourceTable` de `components/ui.tsx`. Esse e o padrao visual operacional: breadcrumb no topo, titulo, acao principal a direita, contador de registros, toolbar da tabela, badges de status e acoes por linha.

## shadcn/ui + Tailwind

O projeto usa Tailwind CSS v4 com tokens CSS em `styles.css` e componentes locais no padrao shadcn em `components/ui/`. O arquivo `components/ui.tsx` funciona como uma camada de compatibilidade para os componentes compostos usados pelas telas atuais. Novos componentes base devem ser criados dentro de `components/ui/` e exportados por `components/ui/index.ts`.

## Temas

Os temas ficam centralizados em `theme/themes.ts`. Para alterar cores do claro ou escuro, edite os tokens do tema. Para criar um novo tema, adicione uma nova entrada em `themes`, exponha o nome em `ThemeName` e reutilize os mesmos tokens CSS.

## Regra pratica

Se o codigo pertence a uma tela especifica, fica em `features/`. Se mais de duas telas precisam dele, sobe para `components/`, `api/` ou `types/`.
