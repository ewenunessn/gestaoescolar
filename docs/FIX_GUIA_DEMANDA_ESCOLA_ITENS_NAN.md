# Fix: Erro NaN ao Adicionar Produto à Guia de Demanda

## Problema

Ao tentar adicionar um produto à guia de demanda de uma escola, ocorria o erro:
```
invalid input syntax for type integer: "NaN"
```

## Causa Raiz

O parâmetro `escolaId` estava chegando como `undefined` na página `GuiaDemandaEscolaItens`, resultando em `NaN` quando convertido para número.

### Análise

1. A rota está corretamente definida: `/guias-demanda/:guiaId/escola/:escolaId`
2. O `useParams` está correto: `const { guiaId, escolaId } = useParams<{ guiaId: string; escolaId: string }>()`
3. O problema é que o usuário está acessando uma URL que não inclui o `escolaId`

## Solução Implementada

Adicionado validação e redirecionamento automático no `useEffect`:

```typescript
useEffect(() => {
  console.log('📍 Params:', { guiaId, escolaId });
  console.log('📍 URL atual:', window.location.pathname);
  
  if (!guiaId) {
    toast.error('ID da guia não encontrado na URL');
    navigate('/guias-demanda');
    return;
  }
  
  if (!escolaId) {
    toast.error('ID da escola não encontrado na URL');
    navigate(`/guias-demanda/${guiaId}`);
    return;
  }
  
  loadData();
}, [guiaId, escolaId, navigate, toast]);
```

## Como Usar Corretamente

Para acessar a página de itens de uma escola, você deve:

1. Ir para a página de detalhes da guia: `/guias-demanda/:guiaId`
2. Na aba "Escolas", clicar no botão de editar (ícone de lápis) ao lado da escola desejada
3. Isso navegará para: `/guias-demanda/:guiaId/escola/:escolaId`

## Navegação Correta

A navegação deve ser feita assim (já implementado em `GuiaDemandaDetalhe.tsx`):

```typescript
navigate(`/guias-demanda/${guiaId}/escola/${row.original.id}`);
```

Onde `row.original.id` é o ID da escola retornado por `guiaService.listarStatusEscolas()`.

## Verificação

Se você ver a mensagem "ID da escola não encontrado na URL", significa que:
- Você está acessando a URL diretamente sem o parâmetro `escolaId`
- Ou a navegação de origem não está passando o ID corretamente

Verifique o console do navegador para ver:
- `📍 Params:` - mostra os parâmetros extraídos da URL
- `📍 URL atual:` - mostra a URL completa sendo acessada

## Arquivos Modificados

- `frontend/src/pages/GuiaDemandaEscolaItens.tsx` - Adicionada validação e redirecionamento
