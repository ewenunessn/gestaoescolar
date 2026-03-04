# Instalação de Dependências para Geração de PDF

Para habilitar a funcionalidade de geração de PDFs nos relatórios, execute:

```bash
cd apps/entregador-native
npm install
```

Ou instale manualmente as bibliotecas:

```bash
npx expo install expo-print expo-sharing
```

## Funcionalidades Implementadas

A tela de relatórios agora permite gerar 3 tipos de PDFs:

1. **Relatório Geral**: Resumo completo com todos os produtos e suas quantidades
2. **Relatório de Lotes**: Lista detalhada de todos os lotes com datas de fabricação e validade
3. **Relatório de Movimentações**: Histórico de movimentações de um produto específico (selecionável)

Os PDFs são gerados e podem ser compartilhados diretamente do app.
