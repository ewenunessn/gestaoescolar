# Módulo Portal Escola

Este módulo é dedicado exclusivamente ao Portal da Escola, separado do módulo de gestão de escolas do sistema principal.

## Estrutura

```
portal-escola/
├── pages/
│   ├── PortalEscolaHome.tsx    # Página principal com cards por categoria
│   ├── CardapioPage.tsx         # Cardápio semanal e do dia
│   ├── SolicitacoesPage.tsx     # Solicitações de alimentos
│   ├── ComprovantesPage.tsx     # Comprovantes de entrega
│   ├── AlunosPage.tsx           # Informações de alunos e modalidades
│   └── index.ts                 # Exportações
├── components/
│   └── CardapioSemanalPortal.tsx # Componente de cardápio semanal
└── README.md
```

## Rotas

- `/portal-escola` - Página principal com cards
- `/portal-escola/cardapio` - Cardápio semanal
- `/portal-escola/solicitacoes` - Solicitações de alimentos
- `/portal-escola/comprovantes` - Comprovantes de entrega
- `/portal-escola/alunos` - Alunos e modalidades

## Características

- Layout com cards organizados por categoria (Alimentação, Documentos, Estoque, Informações)
- Cada funcionalidade em arquivo separado para melhor organização
- Navegação intuitiva com botão "Voltar ao Portal" em cada página
- Separado do módulo de escolas do sistema principal

## Acesso

Este módulo é acessível apenas para usuários do tipo "escola" (secretaria de escola).
O redirecionamento automático é feito no login para usuários com `escola_id` definido.
