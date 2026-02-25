# Páginas com estilo de inativo aplicado

## ✅ Concluído:
1. **ContratoDetalhe.tsx** - Produtos do contrato
2. **Produtos.tsx** - Lista de produtos

## 📝 Padrão aplicado:
```tsx
const isInativo = !item.ativo; // ou item.ativo === false

<TableRow 
  sx={{ 
    opacity: isInativo ? 0.5 : 1,
    backgroundColor: isInativo ? 'action.hover' : 'inherit'
  }}
>
  <TableCell>
    {item.nome}
    {isInativo && <Chip label="Inativo" size="small" color="default" sx={{ ml: 1 }} />}
  </TableCell>
</TableRow>
```

## 🎯 Próximas páginas a aplicar:
- Escolas.tsx
- Contratos.tsx  
- Fornecedores.tsx (se tiver campo ativo)
- Cardapios.tsx
- Outras listagens com campo `ativo`
