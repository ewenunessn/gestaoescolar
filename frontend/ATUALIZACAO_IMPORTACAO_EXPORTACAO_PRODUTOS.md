# Atualização: Importação e Exportação de Produtos

## Mudanças Realizadas

Atualizado o sistema de importação/exportação de produtos para incluir TODOS os campos da tabela produtos.

## Campos Incluídos

### Estrutura Completa da Tabela Produtos

```sql
nome                    VARCHAR(255) NOT NULL
descricao               TEXT
tipo_processamento      VARCHAR(100)
categoria               VARCHAR(100)
validade_minima         INTEGER
perecivel               BOOLEAN DEFAULT false
ativo                   BOOLEAN DEFAULT true
estoque_minimo          INTEGER DEFAULT 0
fator_correcao          NUMERIC(5,3) NOT NULL DEFAULT 1.000
tipo_fator_correcao     VARCHAR(20) NOT NULL DEFAULT 'perda'
unidade_distribuicao    VARCHAR(50)
peso                    NUMERIC (em gramas)
```

## Arquivos Atualizados

### 1. `frontend/src/utils/produtoImportUtils.ts`

**Headers do Excel/CSV**:
```typescript
[
  'nome',
  'descricao',
  'tipo_processamento',
  'categoria',
  'validade_minima',
  'perecivel',
  'ativo',
  'estoque_minimo',
  'fator_correcao',
  'tipo_fator_correcao',
  'unidade_distribuicao',
  'peso'
]
```

**Exemplos Atualizados**:
- Arroz: 1000g, estoque mínimo 100, validade 180 dias
- Feijão: 1000g, estoque mínimo 50, validade 365 dias
- Banana: 120g, fator correção 1.4 (perda), validade 7 dias
- Ovo: 60g, estoque mínimo 200, validade 30 dias
- Óleo: 920g (1L), estoque mínimo 20, validade 365 dias

**Validações do Excel**:
- `tipo_processamento`: lista dropdown (in natura, minimamente processado, processado, ultraprocessado)
- `perecivel`: lista dropdown (true, false)
- `ativo`: lista dropdown (true, false)
- `tipo_fator_correcao`: lista dropdown (perda, rendimento)

**Instruções Detalhadas**:
- Explicação de cada campo
- Exemplos práticos
- Notas sobre peso em gramas
- Diferença entre perda e rendimento
- Exemplos de peso para diferentes produtos

### 2. `frontend/src/pages/Produtos.tsx`

**Função `handleExportarProdutos()`**:
- Exporta todos os 12 campos
- Formato compatível com importação
- Larguras de coluna ajustadas
- Removido campo `imagem_url` (não faz parte da estrutura)

## Campos Removidos

- ❌ `unidade` (substituído por `unidade_distribuicao`)
- ❌ `fator_divisao` (removido do schema)
- ❌ `marca` (movido para `contrato_produtos`)
- ❌ `imagem_url` (não faz parte da estrutura principal)

## Campos Novos Incluídos

- ✅ `validade_minima` (INTEGER) - Validade mínima em dias
- ✅ `estoque_minimo` (INTEGER) - Estoque mínimo para alerta
- ✅ `tipo_fator_correcao` (VARCHAR) - Tipo: perda ou rendimento
- ✅ `unidade_distribuicao` (VARCHAR) - Unidade de distribuição
- ✅ `peso` (NUMERIC) - Peso em gramas

## Observações Importantes

### Peso
- **Sempre em GRAMAS**
- Exemplos:
  - Arroz 1kg = 1000g
  - Ovo = 60g
  - Banana = 120g
  - Óleo 1L = 920g
  - Pão francês = 50g

### Fator de Correção
- **Perda**: >= 1.0 (ex: 1.4 para banana com casca)
- **Rendimento**: <= 1.0 (ex: 0.8 para arroz que rende 80%)

### Tipo Fator Correção
- `perda`: Para produtos que perdem peso no preparo (descascar, limpar)
- `rendimento`: Para produtos que ganham peso no preparo (arroz, macarrão)

### Unidade Distribuição
- Como o produto é distribuído/entregue
- Exemplos: KG, L, Unidade, Pacote, Caixa, Fardo, Saco

### Validade Mínima
- Em dias
- Exemplos:
  - Frutas: 7 dias
  - Arroz: 180 dias
  - Feijão: 365 dias
  - Ovos: 30 dias

## Compatibilidade

### Exportação → Importação
✅ Arquivo exportado pode ser importado diretamente
✅ Todos os campos são preservados
✅ Formato idêntico ao modelo

### Modelo → Importação
✅ Modelo gerado tem todos os campos
✅ Validações no Excel
✅ Instruções detalhadas na segunda aba

## Como Usar

### Exportar Produtos
1. Ir em Produtos
2. Clicar no menu de 3 pontos (⋮)
3. Selecionar "Exportar para Excel"
4. Arquivo baixado com todos os produtos e campos

### Importar Produtos
1. Baixar modelo (menu ⋮ → "Baixar Modelo Excel")
2. Preencher dados
3. Importar arquivo
4. Sistema valida e importa

### Atualizar Produtos em Massa
1. Exportar produtos atuais
2. Editar no Excel
3. Importar arquivo atualizado
4. Sistema identifica pelo nome e atualiza

## Validações

O Excel gerado inclui validações para:
- Tipo de processamento (dropdown)
- Perecível (dropdown true/false)
- Ativo (dropdown true/false)
- Tipo fator correção (dropdown perda/rendimento)

Isso evita erros de digitação e garante dados consistentes.

## Benefícios

- ✅ Importação/exportação completa
- ✅ Nenhum campo perdido
- ✅ Formato consistente
- ✅ Validações automáticas
- ✅ Instruções claras
- ✅ Exemplos práticos
- ✅ Compatibilidade total
