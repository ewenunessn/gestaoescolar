# Sistema de Importação e Exportação de Produtos

## ✅ Campos Sincronizados

O sistema agora exporta e importa **exatamente os mesmos campos**:

### Campos (10 no total):

1. **nome** (obrigatório) - Nome do produto
2. **descricao** - Descrição detalhada do produto
3. **categoria** - Categoria do produto
4. **marca** - Marca do produto
5. **unidade** - Unidade de medida (kg, litro, unidade, etc.)
6. **peso** - Peso em gramas
7. **fator_divisao** - Fator de divisão
8. **tipo_processamento** - Tipo de processamento (in natura, minimamente processado, processado, ultraprocessado)
9. **perecivel** - Indica se o produto é perecível (true/false)
10. **ativo** - Status do produto (true/false)

## 📤 Exportação

### Função: `handleExportarProdutos()`
- Exporta todos os produtos filtrados
- Formato: Excel (.xlsx)
- Nome do arquivo: `produtos_exportacao_DD-MM-AAAA.xlsx`
- Campos exportados: 10 campos listados acima

### Função: `handleExportarModelo()`
- Gera um modelo de importação com exemplo
- Formato: Excel (.xlsx) com 2 abas
  - Aba 1: Modelo com exemplo
  - Aba 2: Instruções detalhadas
- Nome do arquivo: `modelo_importacao_produtos_DD-MM-AAAA.xlsx`

## 📥 Importação

### Componente: `ImportacaoProdutos`
- Aceita arquivos CSV e Excel (.xlsx, .xls)
- Validação automática dos dados
- Importação inteligente:
  - Produtos com nomes iguais são **atualizados**
  - Produtos com nomes novos são **inseridos**
  - Nunca haverá duplicação de produtos
  - O sistema identifica produtos pelo nome

### Validações:
- ✅ Nome obrigatório (mínimo 2 caracteres)
- ✅ Tipo de processamento válido (in natura, minimamente processado, processado, ultraprocessado)
- ✅ Peso maior que zero (se informado)
- ✅ Valores booleanos para perecivel e ativo

### Função Backend: `importarProdutosLote()`
- Endpoint: `POST /produtos/importar-lote`
- Aceita array de produtos
- Retorna:
  ```typescript
  {
    success: boolean;
    message: string;
    resultados: {
      sucesso: number;
      erros: number;
      insercoes: number;
      atualizacoes: number;
      detalhes: Array<{
        sucesso: boolean;
        acao?: string;
        produto?: Produto;
        erro?: string;
      }>;
    };
  }
  ```

## 🔄 Fluxo Completo

### Exportação:
1. Usuário clica em "Exportar Excel"
2. Sistema gera arquivo com todos os produtos filtrados
3. Arquivo é baixado automaticamente

### Importação:
1. Usuário clica em "Importar em Lote"
2. Seleciona arquivo CSV ou Excel
3. Sistema valida os dados
4. Mostra preview com status de cada produto
5. Usuário confirma importação
6. Sistema processa:
   - Verifica se produto existe pelo nome
   - Insere novos produtos
   - Atualiza produtos existentes
7. Mostra resultado: X inseridos, Y atualizados, Z erros

## 📋 Exemplo de Arquivo de Importação

```csv
nome,descricao,categoria,marca,unidade,peso,fator_divisao,tipo_processamento,perecivel,ativo
Arroz Branco Tipo 1,Arroz branco polido tipo 1,Cereais,Tio João,kg,1000,1,processado,false,true
Feijão Carioca,Feijão carioca tipo 1,Leguminosas,Camil,kg,1000,1,in natura,false,true
Banana Prata,Banana prata fresca,Frutas,,kg,150,1,in natura,true,true
```

## ✅ Status de Implementação

- ✅ Backend: Função de importação implementada
- ✅ Frontend: Componente de importação implementado
- ✅ Frontend: Função de exportação implementada
- ✅ Frontend: Função de exportar modelo implementada
- ✅ Interfaces TypeScript: Atualizadas
- ✅ Validações: Implementadas
- ✅ Sincronização: Campos de exportação = campos de importação
- ✅ Build: Sem erros

## 🎯 Próximos Passos

1. Testar importação com arquivo real
2. Testar exportação e reimportação
3. Verificar se a atualização de produtos existentes funciona corretamente
4. Validar mensagens de sucesso e erro
