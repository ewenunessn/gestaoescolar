# Ficha Técnica PDF com Composição Nutricional Detalhada

## Implementação Completa

### Objetivo
Exportar ficha técnica em PDF mostrando a composição nutricional de CADA ingrediente individualmente, além dos valores totais da refeição.

### Arquivos Criados/Modificados

#### 1. Backend - Controller de Ingredientes Detalhados
**Arquivo:** `backend/src/controllers/refeicaoIngredientesController.ts`

- Endpoint GET `/api/refeicoes/:id/ingredientes-detalhados`
- Busca todos os ingredientes da refeição com composição nutricional
- Calcula valores nutricionais proporcionais ao per capita de cada ingrediente
- Retorna 8 campos nutricionais por ingrediente:
  - Proteínas (g)
  - Lipídios (g)
  - Carboidratos (g)
  - Cálcio (mg)
  - Ferro (mg)
  - Vitamina A / Retinol (mcg)
  - Vitamina C (mg)
  - Sódio (mg)

**Lógica de Cálculo:**
```typescript
// Converter per capita para gramas
let quantidadeGramas = per_capita;
if (tipo_medida === 'unidades') {
  quantidadeGramas = per_capita * 100; // 100g por unidade
}

// Calcular proporção (quantidade / 100g)
const proporcao = quantidadeGramas / 100;

// Calcular valor nutricional proporcional
valor_porcao = valor_100g * proporcao;
```

#### 2. Backend - Rota Registrada
**Arquivo:** `backend/src/routes/refeicaoCalculosRoutes.ts`

- Adicionado import do controller `buscarIngredientesDetalhados`
- Registrada rota GET `/refeicoes/:id/ingredientes-detalhados`

#### 3. Frontend - Serviço de Ingredientes
**Arquivo:** `frontend/src/services/refeicaoIngredientes.ts` (NOVO)

- Interface `IngredienteDetalhado` com todos os campos nutricionais
- Função `buscarIngredientesDetalhados(refeicaoId)` para consumir o endpoint

#### 4. Frontend - Geração de PDF Atualizada
**Arquivo:** `frontend/src/pages/RefeicaoDetalhe.tsx`

Função `gerarPDF()` modificada para:

1. Buscar ingredientes detalhados do backend
2. Criar tabela expandida com 11 colunas:
   - Produto
   - Per Capita
   - Unidade
   - Proteínas (g)
   - Lipídios (g)
   - Carboidratos (g)
   - Cálcio (mg)
   - Ferro (mg)
   - Vitamina A (mcg)
   - Vitamina C (mg)
   - Sódio (mg)

3. Mostrar valores calculados proporcionalmente para cada ingrediente
4. Manter seção de "VALORES NUTRICIONAIS TOTAIS" após a tabela detalhada

### Estrutura do PDF Gerado

```
FICHA TÉCNICA DE PREPARAÇÃO
============================

[Nome da Refeição]
[Descrição]

INFORMAÇÕES GERAIS
------------------
- Categoria: [categoria]
- Tempo de Preparo: [tempo] minutos
- Rendimento: [porções] porções

INGREDIENTES E COMPOSIÇÃO NUTRICIONAL
--------------------------------------
┌──────────┬──────────┬────┬──────┬──────┬──────┬───────┬───────┬───────┬───────┬───────┐
│ Produto  │ Per Cap. │ Un │ Prot.│ Lip. │ Carb.│ Cálcio│ Ferro │ Vit A │ Vit C │ Sódio │
├──────────┼──────────┼────┼──────┼──────┼──────┼───────┼───────┼───────┼───────┼───────┤
│ Frango   │ 150.0    │ g  │ 31.5 │ 4.5  │ 0.0  │ 15.0  │ 1.2   │ 12.0  │ 0.0   │ 90.0  │
│ Arroz    │ 100.0    │ g  │ 7.0  │ 0.5  │ 78.0 │ 10.0  │ 0.8   │ 0.0   │ 0.0   │ 5.0   │
│ ...      │ ...      │... │ ...  │ ...  │ ...  │ ...   │ ...   │ ...   │ ...   │ ...   │
└──────────┴──────────┴────┴──────┴──────┴──────┴───────┴───────┴───────┴───────┴───────┘

MODO DE PREPARO
---------------
[Instruções passo a passo]

UTENSÍLIOS NECESSÁRIOS
----------------------
[Lista de utensílios]

VALORES NUTRICIONAIS TOTAIS (por porção)
-----------------------------------------
Proteínas: 45.2g    Lipídios: 12.3g    Carboidratos: 85.4g    Cálcio: 150.5mg
Ferro: 3.2mg        Vitamina A: 250.0mcg    Vitamina C: 15.8mg    Sódio: 450.2mg

CUSTO ESTIMADO
--------------
Custo Total: R$ 25.50
Custo por Porção: R$ 5.10

OBSERVAÇÕES TÉCNICAS
--------------------
[Observações do nutricionista]
```

### Características da Tabela de Ingredientes

- **Fonte reduzida (7-8pt)** para caber todas as colunas em A4
- **Cabeçalhos com quebra de linha** para economizar espaço horizontal
- **Valores formatados** com 1 casa decimal
- **Valores zerados mostram "-"** para melhor legibilidade
- **Layout com linhas horizontais** para separar ingredientes

### Fluxo de Dados

```
Frontend (RefeicaoDetalhe.tsx)
    ↓ [Clica em "Exportar PDF"]
    ↓ buscarIngredientesDetalhados(refeicaoId)
    ↓
Backend (refeicaoIngredientesController.ts)
    ↓ SELECT com JOIN em produto_composicao_nutricional
    ↓ Calcula valores proporcionais ao per capita
    ↓ Retorna array de ingredientes detalhados
    ↓
Frontend (gerarPDF)
    ↓ Monta tabela com 11 colunas
    ↓ Adiciona valores totais da refeição
    ↓ Gera PDF com pdfMake
    ↓ Download automático
```

### Validações e Tratamento de Erros

1. **Ingredientes sem composição nutricional:** Mostram "-" nas colunas
2. **Valores zerados:** Mostram "-" ao invés de "0.0"
3. **Erro na busca:** Toast de erro e log no console
4. **Tipo de medida:** Converte unidades para gramas (100g por unidade)

### Próximos Passos (Opcional)

- [ ] Adicionar calorias na tabela de ingredientes
- [ ] Permitir configurar peso médio por unidade (atualmente fixo em 100g)
- [ ] Adicionar gráfico de distribuição de macronutrientes
- [ ] Exportar em outros formatos (Excel, CSV)
- [ ] Adicionar logo da instituição no cabeçalho do PDF

### Testes Recomendados

1. Criar refeição com múltiplos ingredientes
2. Cadastrar composição nutricional para cada produto
3. Definir per capita e rendimento
4. Clicar em "Exportar PDF"
5. Verificar se tabela mostra valores corretos para cada ingrediente
6. Verificar se totais batem com a soma dos ingredientes

## Status

✅ **IMPLEMENTADO E PRONTO PARA USO**

Todos os arquivos foram criados/modificados e a funcionalidade está completa.
