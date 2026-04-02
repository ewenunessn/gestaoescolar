# Como Usar o Gráfico de Tipo de Fornecedor

## 📍 Localização

O gráfico de pizza está localizado no **Card de Custo** na barra lateral direita da página de **Cardápio Calendário**.

## 🎯 Passo a Passo

### 1. Acessar o Cardápio
1. Navegue até **Cardápios** no menu principal
2. Selecione um cardápio existente ou crie um novo
3. Clique em **Visualizar Calendário**

### 2. Calcular o Custo
O custo é calculado automaticamente quando você:
- Acessa o cardápio calendário
- Adiciona ou remove refeições
- Modifica produtos nas refeições

### 3. Visualizar o Gráfico

#### No Card Lateral (Sidebar)
O card de custo exibe:
```
┌─────────────────────────────────┐
│ 🍽️ Custo do Cardápio            │
├─────────────────────────────────┤
│ Custo Total: R$ 15.450,00       │
│ Total de Alunos: 500            │
│ Custo por Aluno: R$ 30,90       │
├─────────────────────────────────┤
│ Por modalidade                  │
│ ...                             │
├─────────────────────────────────┤
│ Distribuição por Tipo           │
│                                 │
│     [GRÁFICO DE PIZZA]          │
│                                 │
│ ● Convencional  R$ 10.815 [70%] │
│ ● Agricultura   R$ 4.635  [30%] │
└─────────────────────────────────┘
```

#### Interagindo com o Gráfico
- **Passar o mouse:** Exibe tooltip com valor e percentual
- **Clicar em "Detalhes":** Abre modal com informações completas

### 4. Ver Detalhes Completos

Clique no botão **"Detalhes"** no topo do card para abrir o modal com:
- Resumo geral expandido
- Cards coloridos por tipo de fornecedor
- Detalhamento por dia e refeição
- Lista de produtos com seus fornecedores

## 🎨 Interpretando o Gráfico

### Cores
- 🔵 **Azul** - Fornecedor Convencional ou Empresa
- 🟢 **Verde** - Agricultura Familiar, Cooperativa ou Associação
- 🟠 **Laranja** - Fornecedor Individual

### Percentuais
O percentual indica quanto do custo total vai para aquele tipo de fornecedor.

**Exemplo:**
- Convencional: 70% = R$ 10.815,00 de R$ 15.450,00
- Agricultura Familiar: 30% = R$ 4.635,00 de R$ 15.450,00

## ✅ Conformidade PNAE

### Meta: 30% Agricultura Familiar
A Lei 11.947/2009 exige que no mínimo 30% dos recursos do PNAE sejam destinados à agricultura familiar.

#### Como Verificar:
1. Olhe o gráfico de pizza
2. Some os percentuais de:
   - Agricultura Familiar
   - Cooperativa AF
   - Associação AF
3. Verifique se a soma é ≥ 30%

#### Exemplo Conforme:
```
● Agricultura Familiar: 25%
● Cooperativa AF: 10%
● Convencional: 65%
─────────────────────────
Total AF: 35% ✅ (≥ 30%)
```

#### Exemplo Não Conforme:
```
● Agricultura Familiar: 15%
● Cooperativa AF: 10%
● Convencional: 75%
─────────────────────────
Total AF: 25% ❌ (< 30%)
```

## 🔍 Casos Especiais

### Gráfico Não Aparece
**Possíveis causas:**
1. Nenhuma refeição adicionada ao cardápio
2. Produtos sem contratos ativos
3. Fornecedores sem tipo definido

**Solução:**
1. Adicione refeições ao cardápio
2. Verifique se os produtos têm contratos ativos
3. Configure o tipo de fornecedor em **Cadastros > Fornecedores**

### Apenas Uma Cor no Gráfico
Isso significa que todos os produtos vêm do mesmo tipo de fornecedor.

**Para diversificar:**
1. Adicione produtos de outros fornecedores
2. Crie contratos com fornecedores de agricultura familiar
3. Revise o cardápio para incluir produtos variados

### Valores Zerados
Se o custo total for R$ 0,00:
1. Verifique se os produtos têm preços cadastrados
2. Verifique se os contratos estão ativos
3. Verifique se há alunos cadastrados nas modalidades

## 📊 Dicas de Uso

### Para Nutricionistas
- Use o gráfico para planejar cardápios que atendam à meta PNAE
- Priorize produtos de agricultura familiar quando possível
- Monitore o percentual ao adicionar/remover refeições

### Para Gestores
- Acompanhe a distribuição de recursos
- Identifique oportunidades de aumentar compras de AF
- Use para prestação de contas ao FNDE

### Para Compradores
- Identifique necessidade de novos contratos com AF
- Planeje licitações para atingir a meta de 30%
- Monitore o equilíbrio entre tipos de fornecedores

## 🖨️ Exportação

### Gerar Relatório
1. Clique em **"Detalhes"** no card de custo
2. No modal, você verá informações completas
3. Use a função de impressão do navegador (Ctrl+P)
4. Ou tire um screenshot para documentação

### Incluir em Apresentações
O gráfico pode ser capturado e incluído em:
- Relatórios para o FNDE
- Apresentações para o Conselho de Alimentação Escolar
- Documentos de prestação de contas
- Planejamentos anuais

## ❓ Perguntas Frequentes

### 1. O percentual é calculado sobre o quê?
Sobre o custo total do cardápio no período selecionado.

### 2. Posso filtrar por período?
Atualmente, o gráfico mostra o cardápio completo. Filtros por período podem ser adicionados no futuro.

### 3. Como alterar o tipo de um fornecedor?
Vá em **Cadastros > Fornecedores**, edite o fornecedor e altere o campo "Tipo de Fornecedor".

### 4. O gráfico atualiza automaticamente?
Sim, sempre que você adiciona/remove refeições ou produtos, o custo é recalculado.

### 5. Posso exportar o gráfico?
Atualmente, use screenshot ou impressão. Exportação direta pode ser adicionada no futuro.

## 🆘 Suporte

Se encontrar problemas:
1. Verifique se todos os dados estão cadastrados corretamente
2. Recarregue a página (F5)
3. Limpe o cache do navegador
4. Entre em contato com o suporte técnico

## 📚 Documentação Relacionada

- [Documentação Técnica Completa](./CUSTO_CARDAPIO_TIPO_FORNECEDOR.md)
- [Exemplos Visuais](./EXEMPLO_VISUAL_GRAFICO_PIZZA.md)
- [Resumo da Implementação](./RESUMO_IMPLEMENTACAO_GRAFICO_PIZZA.md)
- [Lei 11.947/2009 - PNAE](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l11947.htm)
