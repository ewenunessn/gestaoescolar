# Sistema de Unidades de Medida Profissional

## Problema da Abordagem Anterior

A abordagem anterior tinha vários problemas:
- ❌ Unidades como texto livre (inconsistência)
- ❌ Fator de conversão manual e propenso a erros
- ❌ Sem validação de conversões impossíveis (kg → litro)
- ❌ Difícil manutenção e auditoria

## Nova Abordagem (Como Grandes ERPs)

### 1. Tabela de Unidades Padronizadas

```sql
unidades_medida
├── id
├── codigo (KG, L, UN, CX, etc)
├── nome (Quilograma, Litro, etc)
├── tipo (massa, volume, unidade)
├── unidade_base_id (referência para base)
└── fator_conversao_base (fator para base)
```

### 2. Hierarquia de Unidades

**MASSA** (base: Grama)
```
Tonelada (T)  → 1.000.000 g
Quilograma (KG) → 1.000 g
Grama (G)      → 1 g (BASE)
Miligrama (MG) → 0,001 g
```

**VOLUME** (base: Mililitro)
```
Litro (L)     → 1.000 ml
Mililitro (ML) → 1 ml (BASE)
```

**UNIDADE** (base: Unidade)
```
Dúzia (DZ)    → 12 un
Unidade (UN)  → 1 un (BASE)
Caixa (CX)    → variável (definido por produto)
Pacote (PCT)  → variável
Saco (SC)     → variável
```

### 3. Conversão Automática

#### Exemplo 1: Conversão Simples (KG → G)
```typescript
// 2 kg para gramas
await converterUnidade(2, idKG, idG)
// Resultado: 2000

// Cálculo interno:
// 2 * 1000 (fator KG) / 1 (fator G) = 2000
```

#### Exemplo 2: Conversão com Embalagem (CX → KG)
```typescript
// 3 caixas de 5kg para kg
await converterUnidade(3, idCX, idKG, 5000)
// Resultado: 15

// Cálculo interno:
// 3 * 5000g / 1000 (fator KG) = 15 kg
```

#### Exemplo 3: Validação de Tipo
```typescript
// Tentar converter kg para litro
await converterUnidade(2, idKG, idL)
// Erro: "Não é possível converter massa para volume"
```

### 4. Integração com Sistema Existente

#### Produtos
```typescript
// Antes
produto.unidade_distribuicao = "Quilograma" // texto livre

// Depois
produto.unidade_medida_id = 2 // referência para KG
```

#### Contratos
```typescript
// Antes
contrato_produto.unidade_compra = "Caixa"
contrato_produto.fator_conversao = 5 // manual, propenso a erro

// Depois
contrato_produto.unidade_medida_compra_id = 9 // referência para CX
contrato_produto.peso_embalagem = 5000 // 5kg em gramas
// fator_conversao calculado automaticamente
```

### 5. Vantagens

✅ **Padronização**: Unidades consistentes em todo sistema
✅ **Validação**: Impossível converter massa para volume
✅ **Auditoria**: Histórico de conversões rastreável
✅ **Manutenção**: Fácil adicionar novas unidades
✅ **Precisão**: Cálculos automáticos sem erro humano
✅ **Escalabilidade**: Suporta qualquer tipo de unidade

### 6. Migração

#### Passo 1: Executar Migration
```bash
psql -U postgres -d seu_banco < backend/migrations/20260323_criar_tabela_unidades_medida.sql
```

#### Passo 2: Verificar Migração
```sql
-- Ver unidades criadas
SELECT * FROM unidades_medida ORDER BY tipo, codigo;

-- Ver produtos migrados
SELECT 
  p.nome,
  p.unidade_distribuicao as antigo,
  um.codigo as novo
FROM produtos p
LEFT JOIN unidades_medida um ON um.id = p.unidade_medida_id
LIMIT 10;
```

#### Passo 3: Atualizar Backend
- Controllers usarão `unidadesMedidaService`
- Conversões automáticas via `converterUnidade()`
- Validações via `calcularFatorConversao()`

#### Passo 4: Atualizar Frontend
- Dropdowns com unidades da tabela
- Validação de tipos compatíveis
- Cálculo automático de conversões

### 7. Exemplos de Uso

#### Criar Produto
```typescript
const produto = {
  nome: "Arroz",
  unidade_medida_id: 2, // KG
  peso: 1000 // 1kg em gramas
};
```

#### Adicionar ao Contrato
```typescript
const contratoProduto = {
  produto_id: 1,
  unidade_medida_compra_id: 9, // CX (Caixa)
  peso_embalagem: 5000, // 5kg por caixa
  // fator_conversao será calculado: 5000g / 1000g = 5
};
```

#### Calcular Demanda
```typescript
// Demanda: 100 kg de arroz
// Contrato: Caixas de 5kg

const demandaKg = 100;
const quantidadeCaixas = await converterUnidade(
  demandaKg,
  idKG,
  idCX,
  5000 // peso da caixa
);
// Resultado: 20 caixas
```

### 8. Comparação com Grandes ERPs

| Recurso | Nossa Implementação | SAP | Oracle | TOTVS |
|---------|---------------------|-----|--------|-------|
| Tabela de Unidades | ✅ | ✅ | ✅ | ✅ |
| Conversão Automática | ✅ | ✅ | ✅ | ✅ |
| Validação de Tipos | ✅ | ✅ | ✅ | ✅ |
| Unidade Base | ✅ | ✅ | ✅ | ✅ |
| Embalagens Variáveis | ✅ | ✅ | ✅ | ✅ |
| Auditoria | ✅ | ✅ | ✅ | ✅ |

## Próximos Passos

1. ✅ Criar tabela `unidades_medida`
2. ✅ Criar serviço de conversão
3. ⏳ Atualizar controllers para usar novo sistema
4. ⏳ Atualizar frontend (dropdowns, validações)
5. ⏳ Migrar dados existentes
6. ⏳ Testes de conversão
7. ⏳ Documentação de API

## Referências

- SAP Material Master (MM)
- Oracle Inventory Management
- TOTVS Protheus - Unidades de Medida
- ISO 80000 (International System of Quantities)
