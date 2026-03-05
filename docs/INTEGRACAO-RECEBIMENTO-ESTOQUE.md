# Integração: Recebimento → Estoque Central

## Visão Geral

Esta integração permite que após registrar um recebimento de mercadoria, o sistema automaticamente abra um diálogo para dar entrada no estoque central, facilitando o fluxo de trabalho e garantindo que o estoque seja atualizado imediatamente.

## Fluxo de Trabalho

```
1. Usuário registra recebimento
   ↓
2. Sistema confirma recebimento
   ↓
3. Sistema abre diálogo de entrada no estoque
   ↓
4. Usuário preenche dados do lote
   ↓
5. Sistema registra entrada no estoque central
```

## Campos do Diálogo de Entrada

### Obrigatórios
- **Lote**: Número do lote do produto
- **Data de Validade**: Data de validade do lote

### Opcionais
- **Data de Fabricação**: Data de fabricação do produto
- **Nota Fiscal**: Número da nota fiscal
- **Observações**: Observações adicionais

### Automáticos
- **Quantidade**: Preenchida automaticamente com a quantidade recebida
- **Produto**: Identificado automaticamente do item recebido
- **Fornecedor**: Preenchido automaticamente
- **Motivo**: Gerado automaticamente (ex: "Recebimento do pedido PED-MAR2026000001")

## Opções do Usuário

### 1. Registrar Entrada
- Preenche os campos obrigatórios
- Clica em "Registrar"
- Entrada é registrada no estoque central

### 2. Pular Entrada
- Clica em "Pular"
- Sistema confirma se deseja pular
- Entrada pode ser registrada posteriormente através do módulo de Estoque Central

## Validações

### No Recebimento
- Quantidade deve ser maior que zero
- Quantidade não pode exceder o saldo pendente
- Pedido deve existir e estar ativo

### Na Entrada no Estoque
- Lote é obrigatório
- Data de validade é obrigatória
- Quantidade é validada automaticamente
- Produto deve existir no cadastro

## Benefícios

1. **Agilidade**: Entrada no estoque imediatamente após recebimento
2. **Rastreabilidade**: Lote e validade registrados no momento do recebimento
3. **Precisão**: Dados do recebimento são reaproveitados
4. **Flexibilidade**: Usuário pode pular e registrar depois se necessário

## Implementação Técnica

### Frontend (React Native)
- **Arquivo**: `apps/entregador-native/src/screens/RecebimentoItensScreen.tsx`
- **Componentes**: 
  - Dialog de recebimento
  - Dialog de entrada no estoque
- **Estados**: Gerenciamento de formulários e processamento

### Backend
- **Endpoint de Recebimento**: `POST /api/recebimentos`
- **Endpoint de Entrada**: `POST /api/estoque-central/entrada`
- **Transações**: Cada operação é independente

### API
- **Recebimentos**: `apps/entregador-native/src/api/recebimentos.ts`
- **Estoque Central**: `apps/entregador-native/src/api/estoqueCentral.ts`

## Exemplo de Uso

### Cenário 1: Entrada Completa
```
1. Receber 100 unidades de Arroz
2. Informar lote: L123456
3. Informar validade: 31/12/2026
4. Informar NF: 12345
5. Registrar entrada
```

### Cenário 2: Entrada Posterior
```
1. Receber 100 unidades de Arroz
2. Clicar em "Pular"
3. Confirmar que deseja pular
4. Registrar entrada depois em Estoque Central → Entrada
```

## Tratamento de Erros

### Erro no Recebimento
- Entrada no estoque não é aberta
- Usuário pode tentar novamente

### Erro na Entrada no Estoque
- Recebimento já foi registrado
- Usuário pode:
  - Tentar novamente com dados corretos
  - Pular e registrar depois manualmente

## Melhorias Futuras

1. **Leitura de Código de Barras**: Escanear lote e validade
2. **Sugestão de Lote**: Baseado em histórico
3. **Validação de Data**: Picker de data ao invés de texto
4. **Foto da NF**: Anexar foto da nota fiscal
5. **Entrada em Lote**: Registrar múltiplos itens de uma vez

## Notas Importantes

- A entrada no estoque é opcional no momento do recebimento
- Mesmo pulando, o recebimento é registrado normalmente
- O estoque pode ser atualizado posteriormente através do módulo específico
- Todos os dados são validados antes de serem salvos
- O sistema usa FEFO (First Expired, First Out) para controle de lotes

## Troubleshooting

### Problema: Diálogo não abre após recebimento
**Solução**: Verificar se o recebimento foi registrado com sucesso

### Problema: Erro ao registrar entrada
**Solução**: Verificar se todos os campos obrigatórios estão preenchidos

### Problema: Produto não encontrado
**Solução**: Verificar se o produto está cadastrado no sistema

## Referências

- [Módulo de Recebimentos](./MODULO-RECEBIMENTOS.md)
- [Estoque Central](./ESTOQUE-CENTRAL.md)
- [FEFO - First Expired, First Out](./FEFO-ESTOQUE-CENTRAL.md)
