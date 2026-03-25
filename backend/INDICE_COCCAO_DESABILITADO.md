# Índice de Cocção - Campo Informativo Apenas

## Decisão

O campo `indice_coccao` na tabela `produtos` foi mantido no banco de dados, mas **NÃO é aplicado automaticamente** nos cálculos de demanda.

## Motivo

O índice de cocção não deve ser levado em consideração para o cálculo de demanda de produtos, pois:

1. O per capita já é definido considerando o produto no estado final (cozido)
2. Aplicar o índice de cocção causaria cálculos incorretos
3. O campo serve apenas como referência informativa

## Implementação

### Backend

No arquivo `backend/src/controllers/planejamentoComprasController.ts`:

```typescript
async function calcularDemandaPeriodo(
  ano: number,
  mes: number,
  data_inicio: string,
  data_fim: string,
  escola_ids?: number[],
  considerar_indice_coccao: boolean = false, // DESABILITADO POR PADRÃO
  considerar_fator_correcao: boolean = true
): Promise<ProdutoDemanda[]>
```

### Lógica de Cálculo

```typescript
// Per capita em GRAMAS (ex: 150g de arroz cozido)
// NOTA: Índice de cocção DESABILITADO por padrão
// O campo existe no banco apenas para referência
// LÓGICA: Apenas FC (fator de correção) é aplicado se habilitado
const perCapitaCru = considerar_indice_coccao ? perCapita / indiceCoccao : perCapita;
const perCapitaBruto = considerar_fator_correcao ? perCapitaCru * fator : perCapitaCru;
qtdKg = (escola.numero_alunos * perCapitaBruto * ocorrencias.length) / 1000;
```

## O que Continua Funcionando

- ✅ Campo `indice_coccao` existe no banco de dados
- ✅ Campo pode ser editado na interface de produtos
- ✅ Campo é retornado nas consultas de produtos
- ✅ Fator de correção continua sendo aplicado normalmente

## O que Mudou

- ❌ Índice de cocção NÃO é aplicado nos cálculos de demanda
- ❌ Parâmetro `considerar_indice_coccao` tem valor padrão `false`
- ℹ️ Campo serve apenas como informação de referência

## Exemplo

### Produto: Arroz

- Per capita: 150g (arroz cozido)
- Fator de correção: 1.05 (5% de perda no pré-preparo)
- Índice de cocção: 2.5 (arroz aumenta 2.5x ao cozinhar) - **NÃO USADO**

### Cálculo para 100 alunos:

```
Quantidade cozida = 100 alunos × 150g = 15.000g = 15kg
Quantidade a comprar = 15kg × 1.05 (FC) = 15.75kg
```

**Nota:** O índice de cocção (2.5) NÃO é aplicado porque o per capita já considera o arroz cozido.

## Reativação (se necessário)

Se futuramente for necessário usar o índice de cocção, basta:

1. Passar `considerar_indice_coccao: true` nas chamadas da API
2. Ajustar o frontend para enviar esse parâmetro
3. Revisar a lógica de cálculo para garantir que faz sentido aplicá-lo

## Arquivos Afetados

- `backend/src/controllers/planejamentoComprasController.ts` - Lógica de cálculo
- `backend/src/modules/produtos/controllers/produtoController.ts` - CRUD de produtos (campo mantido)
- `backend/migrations/20260324_adicionar_indice_coccao.sql` - Migration (campo mantido)
