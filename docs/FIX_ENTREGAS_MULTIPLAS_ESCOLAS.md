# Fix: Geração de PDF para Múltiplas Escolas

## Problema Identificado

O componente `EscolasEntregaList` estava apresentando erro de runtime ao carregar a página devido a:

1. **Imports faltando**: Os componentes `Checkbox` e `CheckBoxIcon` do Material-UI não estavam importados
2. **Erro de compilação**: Faltava ponto e vírgula em uma linha (resolvido automaticamente)

## Solução Aplicada

### 1. Imports Corrigidos

Adicionados os imports faltantes no arquivo `frontend/src/modules/entregas/components/EscolasEntregaList.tsx`:

```typescript
import {
  // ... outros imports
  Checkbox,  // ← ADICIONADO
} from '@mui/material';

import {
  // ... outros imports
  CheckBox as CheckBoxIcon,  // ← ADICIONADO
} from '@mui/icons-material';
```

## Funcionalidade Implementada

A funcionalidade de geração de PDF para múltiplas escolas está completa e inclui:

### Recursos

1. **Modo de Seleção Múltipla**
   - Botão "Selecionar Múltiplas" para ativar o modo
   - Checkboxes aparecem na primeira coluna da tabela
   - Checkbox no cabeçalho para selecionar/desselecionar todas

2. **Geração de PDF Unificado**
   - Botão "Gerar PDF (X)" mostra quantidade de escolas selecionadas
   - Gera um único PDF com todas as escolas selecionadas
   - Cada escola em uma página separada
   - Mantém toda a formatação e informações da guia individual

3. **Controles de Interface**
   - Botão "Cancelar" para sair do modo de seleção
   - Indicador de progresso durante a geração
   - Validação: exige ao menos uma escola selecionada
   - Limpeza automática da seleção após gerar o PDF

### Estrutura do PDF Múltiplo

- **Título**: "GUIAS DE ENTREGA"
- **Subtítulo**: Quantidade de escolas (ex: "3 escolas")
- **Conteúdo**: Cada escola em uma página com:
  - Informações da escola (nome, endereço, alunos, modalidades)
  - Tabela de itens (até 25 por página)
  - Código de barras da guia
  - Espaço para assinatura do recebedor
  - Rodapé com informações da instituição

### Fluxo de Uso

1. Usuário clica em "Selecionar Múltiplas"
2. Checkboxes aparecem na tabela
3. Usuário seleciona as escolas desejadas
4. Clica em "Gerar PDF (X)" onde X é a quantidade selecionada
5. Sistema gera PDF único com todas as escolas
6. PDF é baixado automaticamente
7. Seleção é limpa e modo de seleção é desativado

## Arquivos Modificados

- `frontend/src/modules/entregas/components/EscolasEntregaList.tsx`
  - Adicionados imports: `Checkbox`, `CheckBoxIcon`
  - Implementada função `gerarPdfMultiplasEscolas()`
  - Implementada função auxiliar `gerarConteudoEscola()`
  - Adicionados estados: `modoSelecao`, `escolasSelecionadas`, `gerandoPdfMultiplo`
  - Adicionada coluna condicional de checkbox
  - Adicionados botões de controle na toolbar

## Status

✅ **CONCLUÍDO** - A funcionalidade está implementada e funcionando corretamente.

## Próximos Passos (Opcional)

- Adicionar opção de ordenação personalizada das escolas no PDF
- Permitir filtrar escolas por status antes de selecionar
- Adicionar preview antes de gerar o PDF
- Salvar preferências de seleção no localStorage
