# Solução Final: Erro ao Editar Cardápios

## Problema Identificado

Ao tentar editar um cardápio, aparecia o erro:
```
Cannot read properties of undefined (reading 'success')
```

## Causa Raiz

O problema estava no uso incorreto do hook `useToast` no componente `CardapiosModalidade.tsx`. O código estava usando:

```typescript
toast.toast.success('Mensagem')  // ❌ ERRADO
toast.toast.error('Mensagem')    // ❌ ERRADO
```

Quando deveria ser:

```typescript
toast.success('Mensagem')  // ✅ CORRETO
toast.error('Mensagem')    // ✅ CORRETO
```

## Por que isso aconteceu?

Durante a migração do sistema de notificações antigo para o `react-toastify`, houve uma confusão na API. O hook `useToast` retorna um objeto com métodos diretos (`success`, `error`, etc.), mas o código estava tentando acessar `toast.toast.success`, o que resultava em `undefined.success`.

## Correções Aplicadas

### 1. Corrigido uso do toast em CardapiosModalidade.tsx

**Arquivo:** `frontend/src/pages/CardapiosModalidade.tsx`

```typescript
// ANTES
const toast = useToast();
toast.toast.error('Erro ao carregar modalidades');
toast.toast.success('Cardápio atualizado!');
toast.toast.success('Cardápio criado!');
toast.toast.success('Cardápio removido!');
toast.toast.error('Erro ao remover cardápio');

// DEPOIS
const toast = useToast();
toast.error('Erro ao carregar modalidades');
toast.success('Cardápio atualizado!');
toast.success('Cardápio criado!');
toast.success('Cardápio removido!');
toast.error('Erro ao remover cardápio');
```

### 2. Corrigido formato de data

Também foi corrigido o formato da data de aprovação do nutricionista, que estava vindo no formato ISO completo (`2026-03-17T12:00:00.000Z`) quando o input type="date" espera apenas `yyyy-MM-dd`:

```typescript
const handleOpenDialog = (cardapio?: CardapioModalidade) => {
  // ...
  if (cardapio) {
    // Converter data ISO para formato yyyy-MM-dd se necessário
    let dataAprovacao = cardapio.data_aprovacao_nutricionista || '';
    if (dataAprovacao && dataAprovacao.includes('T')) {
      dataAprovacao = dataAprovacao.split('T')[0];
    }
    
    const formInicial = {
      // ...
      data_aprovacao_nutricionista: dataAprovacao,
      // ...
    };
  }
}
```

### 3. Melhorias adicionais aplicadas anteriormente

- Corrigido tipo de valor no Select de modalidades (string vs number)
- Removido filtro restritivo no backend que impedia listar modalidades inativas
- Adicionado tratamento robusto de erros nos serviços
- Corrigido tratamento de respostas da API em múltiplos formatos

## Como Testar

1. Acesse a página de Cardápios
2. Clique em "Editar" em qualquer cardápio
3. Verifique que:
   - O dialog abre sem erros
   - As modalidades aparecem no seletor
   - A data de aprovação (se houver) aparece corretamente
   - Ao salvar, aparece a mensagem de sucesso
   - Não aparece mais o erro "Cannot read properties of undefined"

## Lições Aprendidas

1. **Sempre verificar a API do hook antes de usar**: O `useToast` retorna métodos diretos, não um objeto aninhado
2. **Cuidado com migrações**: Ao migrar de um sistema para outro, verificar todos os usos
3. **Formatos de data**: Sempre converter datas ISO para o formato esperado pelos inputs HTML
4. **Logs de debug**: Adicionar logs temporários ajuda a identificar problemas rapidamente

## Arquivos Modificados

1. `frontend/src/pages/CardapiosModalidade.tsx` - Corrigido uso do toast e formato de data
2. `frontend/src/services/modalidades.ts` - Adicionado tratamento robusto de erros
3. `frontend/src/services/modalidadeService.ts` - Adicionado parâmetro opcional para filtrar por status
4. `frontend/src/services/cardapiosModalidade.ts` - Melhorado tratamento de respostas da API
5. `backend/src/modules/cardapios/controllers/modalidadeController.ts` - Removido filtro fixo de modalidades ativas
6. `frontend/src/services/api.ts` - Corrigido makeRequestWithRetry para sempre retornar ou lançar erro

## Status

✅ Problema resolvido
✅ Modalidades carregando corretamente
✅ Edição de cardápios funcionando
✅ Mensagens de toast aparecendo corretamente
✅ Sem erros no console
