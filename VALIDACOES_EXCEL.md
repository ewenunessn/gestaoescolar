# ✅ Validações de Dados no Excel

## 📋 Resumo

Adicionamos **Data Validation** (Validação de Dados) nos arquivos Excel exportados para facilitar o preenchimento e evitar erros.

## 🎯 Campos com Validação

### 1. Tipo de Processamento (Coluna H)
**Opções disponíveis:**
- `in natura`
- `minimamente processado`
- `processado`
- `ultraprocessado`

**Comportamento:**
- ✅ Campo opcional (pode ficar vazio)
- 📝 Ao clicar na célula, aparece uma lista suspensa
- ⚠️ Se digitar um valor diferente, mostra erro
- 💡 Mensagem de ajuda: "Selecione uma das opções"

### 2. Perecível (Coluna I)
**Opções disponíveis:**
- `true` (Sim, é perecível)
- `false` (Não é perecível)

**Comportamento:**
- ✅ Campo obrigatório
- 📝 Ao clicar na célula, aparece uma lista suspensa
- ⚠️ Se digitar um valor diferente, mostra erro
- 💡 Mensagem de ajuda: "Selecione true ou false"

### 3. Ativo (Coluna J)
**Opções disponíveis:**
- `true` (Produto ativo)
- `false` (Produto inativo)

**Comportamento:**
- ✅ Campo obrigatório
- 📝 Ao clicar na célula, aparece uma lista suspensa
- ⚠️ Se digitar um valor diferente, mostra erro
- 💡 Mensagem de ajuda: "Selecione true ou false"

## 📤 Onde as Validações Estão Aplicadas

### 1. Exportação de Produtos (`handleExportarProdutos`)
- Aplica validação em **todas as linhas** de produtos exportados
- Cada linha tem sua própria validação
- Facilita a edição dos produtos existentes

### 2. Exportação de Modelo (`handleExportarModelo`)
- Aplica validação nas **linhas 2 a 100**
- Permite adicionar até 99 produtos novos
- Ideal para importação em lote

### 3. Modelo de Importação (`gerarModeloExcel`)
- Aplica validação nas **linhas 2 a 100**
- Vem com 5 exemplos pré-preenchidos
- Facilita o entendimento do formato

## 🎨 Como Funciona no Excel

### Ao Clicar na Célula:
```
┌─────────────────────────────────┐
│ tipo_processamento              │
├─────────────────────────────────┤
│ ▼ in natura                     │
│   minimamente processado        │
│   processado                    │
│   ultraprocessado               │
└─────────────────────────────────┘
```

### Ao Digitar Valor Inválido:
```
┌─────────────────────────────────┐
│ ⚠️ Valor Inválido               │
├─────────────────────────────────┤
│ Escolha: in natura,             │
│ minimamente processado,         │
│ processado ou ultraprocessado   │
│                                 │
│         [ OK ]                  │
└─────────────────────────────────┘
```

## 💡 Benefícios

### Para o Usuário:
- ✅ Não precisa decorar os valores válidos
- ✅ Evita erros de digitação
- ✅ Interface mais amigável
- ✅ Feedback imediato de erros

### Para o Sistema:
- ✅ Menos erros na importação
- ✅ Dados mais consistentes
- ✅ Menos validações necessárias no backend
- ✅ Melhor experiência do usuário

## 🔧 Implementação Técnica

### Estrutura da Validação:
```javascript
ws['!dataValidation'].push({
  type: 'list',                    // Tipo: lista suspensa
  allowBlank: true,                // Permite vazio
  sqref: 'H2:H100',               // Células afetadas
  formulas: ['"opção1,opção2"'],  // Opções disponíveis
  promptTitle: 'Título',          // Título da ajuda
  prompt: 'Mensagem de ajuda',    // Texto de ajuda
  errorTitle: 'Erro',             // Título do erro
  error: 'Mensagem de erro'       // Texto do erro
});
```

### Colunas do Excel:
- **A**: nome
- **B**: descricao
- **C**: categoria
- **D**: marca
- **E**: unidade
- **F**: peso
- **G**: fator_divisao
- **H**: tipo_processamento ✅ **COM VALIDAÇÃO**
- **I**: perecivel ✅ **COM VALIDAÇÃO**
- **J**: ativo ✅ **COM VALIDAÇÃO**

## 📝 Exemplo de Uso

### 1. Exportar Produtos:
```
1. Clicar em "Exportar Excel"
2. Abrir arquivo no Excel
3. Editar campo "tipo_processamento"
4. Clicar na célula → aparece lista suspensa
5. Selecionar opção desejada
6. Salvar e reimportar
```

### 2. Usar Modelo:
```
1. Clicar em "Exportar Modelo"
2. Abrir arquivo no Excel
3. Preencher dados dos produtos
4. Usar listas suspensas para campos validados
5. Salvar e importar
```

## ⚠️ Observações Importantes

1. **Compatibilidade**: As validações funcionam no Microsoft Excel, LibreOffice Calc e Google Sheets
2. **Formato**: O arquivo deve ser salvo como `.xlsx` para manter as validações
3. **Importação**: Mesmo com validações, o sistema ainda valida os dados na importação
4. **Opcional**: O campo `tipo_processamento` pode ficar vazio (allowBlank: true)
5. **Obrigatório**: Os campos `perecivel` e `ativo` não podem ficar vazios (allowBlank: false)

## 🎯 Próximos Passos

1. ✅ Testar exportação com validações
2. ✅ Verificar se as listas suspensas aparecem
3. ✅ Testar digitação de valores inválidos
4. ✅ Verificar mensagens de erro
5. ✅ Testar importação de arquivo editado
