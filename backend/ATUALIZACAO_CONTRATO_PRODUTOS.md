# Atualização da Tabela contrato_produtos

## Data: 2026-03-23

## Resumo
Adicionados novos campos na tabela `contrato_produtos` para armazenar informações específicas do produto por contrato.

## Campos Adicionados no Neon

✅ `marca` VARCHAR(255) - Marca do produto específica do contrato
✅ `peso_embalagem` NUMERIC - Peso da embalagem em gramas
✅ `unidade_compra` VARCHAR(50) - Unidade de compra (pct, cx, un, etc.)
✅ `fator_conversao` NUMERIC(12, 4) - Fator de conversão entre unidades

## Estrutura Final

```sql
CREATE TABLE contrato_produtos (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER NOT NULL REFERENCES contratos(id),
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  preco_unitario NUMERIC NOT NULL,
  quantidade_contratada NUMERIC DEFAULT 0,
  quantidade_consumida NUMERIC DEFAULT 0,
  quantidade_maxima NUMERIC,
  limite NUMERIC,
  preco NUMERIC,
  saldo NUMERIC,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  marca VARCHAR(255),
  peso_embalagem NUMERIC,
  unidade_compra VARCHAR(50),
  fator_conversao NUMERIC(12, 4)
);
```

## Arquivos Atualizados

✅ `backend/src/modules/contratos/controllers/contratoProdutoController.ts`
  - Atualizado `criarContratoProduto` para aceitar novos campos
  - Atualizado `editarContratoProduto` para permitir edição dos novos campos
  - Atualizado todas as queries SELECT para incluir novos campos

✅ `backend/database/schema.sql`
  - Documentada a estrutura atualizada da tabela

## Diferença entre produtos e contrato_produtos

### Tabela `produtos` (Produto Base)
Armazena informações gerais do produto:
- nome
- descricao
- categoria
- tipo_processamento
- validade_minima
- imagem_url
- perecivel
- ativo
- estoque_minimo
- fator_correcao
- tipo_fator_correcao
- unidade_distribuicao
- peso (peso padrão do produto)

### Tabela `contrato_produtos` (Produto no Contrato)
Armazena informações específicas do produto em cada contrato:
- preco_unitario (preço específico do contrato)
- quantidade_contratada
- **marca** (marca específica do fornecedor)
- **peso_embalagem** (peso da embalagem do fornecedor)
- **unidade_compra** (unidade de compra do fornecedor)
- **fator_conversao** (conversão entre unidades)

## Exemplo de Uso

Um mesmo produto (ex: "Arroz Branco") pode ter:
- Na tabela `produtos`: informações gerais (categoria: "Cereais", perecível: false)
- Na tabela `contrato_produtos`:
  - Contrato A: marca "Tio João", peso_embalagem: 5000g, unidade_compra: "pct", preço: R$ 15,00
  - Contrato B: marca "Camil", peso_embalagem: 1000g, unidade_compra: "pct", preço: R$ 3,50

## Próximos Passos

1. ✅ Backend atualizado
2. ⏳ Frontend precisa ser atualizado para exibir/editar os novos campos
3. ⏳ Testes de integração

## Notas

- Os campos foram adicionados manualmente no Neon
- O módulo backend foi atualizado para suportar os novos campos
- Não há necessidade de migração pois os campos já existem no banco
