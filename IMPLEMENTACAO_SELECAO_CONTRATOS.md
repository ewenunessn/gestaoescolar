# Implementação: Seleção de Contratos para Produtos em Múltiplos Contratos

## ✅ Implementação Concluída

### Resumo
Sistema agora detecta quando um produto está disponível em múltiplos contratos e solicita ao usuário que escolha qual contrato usar para cada produto.

---

## 🔧 Alterações Realizadas

### Backend

#### 1. `planejamentoComprasController.ts` - Função `gerarPedidosPorPeriodo`
**Modificações:**
- Query de contratos agora retorna TODOS os contratos por produto (não apenas o primeiro)
- Adicionado campo `saldo_disponivel` na query
- Detecta produtos com múltiplos contratos
- Se houver produtos com múltiplos contratos E não foi fornecida seleção:
  - Retorna `requer_selecao: true`
  - Retorna lista de `produtos_multiplos_contratos` com detalhes
- Se foi fornecida seleção (`contratos_selecionados`):
  - Usa os contratos selecionados pelo usuário
  - Continua com a geração do pedido

**Novo parâmetro aceito:**
```typescript
contratos_selecionados?: { produto_id: number; contrato_produto_id: number }[]
```

#### 2. `planejamentoComprasController.ts` - Função `gerarPedidoDaGuia`
**Modificações:**
- Mesma lógica aplicada para geração de pedidos a partir de guias
- Detecta múltiplos contratos
- Solicita seleção quando necessário
- Aceita `contratos_selecionados` como parâmetro

---

### Frontend

#### 1. Novo Componente: `SelecionarContratosDialog.tsx`
**Funcionalidades:**
- Dialog modal para seleção de contratos
- Lista todos os produtos que têm múltiplos contratos
- Para cada produto, mostra:
  - Nome do produto
  - Quantidade necessária
  - Lista de contratos disponíveis com:
    - Fornecedor
    - Preço unitário
    - Saldo disponível
    - Número do contrato
    - Badges indicando "Menor preço" e "Maior saldo"
- Botões de seleção automática:
  - "Usar Menor Preço" - seleciona automaticamente o contrato mais barato
  - "Usar Maior Saldo" - seleciona automaticamente o contrato com mais estoque
- Validação: todos os produtos devem ter um contrato selecionado
- Resumo do contrato selecionado com valor total estimado
- Alerta se quantidade necessária excede saldo disponível

#### 2. `PlanejamentoCompras.tsx`
**Modificações:**
- Adicionados estados:
  ```typescript
  const [produtosMultiplosContratos, setProdutosMultiplosContratos] = useState<any[]>([]);
  const [dialogSelecaoContratos, setDialogSelecaoContratos] = useState(false);
  const [contratosSelecionados, setContratosSelecionados] = useState<any[]>([]);
  ```

- Modificada `handleGerarPedidos()`:
  - Passa `contratos_selecionados` para a API
  - Se resposta contém `requer_selecao: true`:
    - Abre dialog de seleção
    - Armazena produtos com múltiplos contratos
  - Após seleção, tenta gerar pedidos novamente

- Modificada `handleGerarPedidoDaGuia()`:
  - Mesma lógica de detecção e seleção
  - Passa `contratos_selecionados` para a API

- Adicionadas funções:
  ```typescript
  handleConfirmarSelecaoContratos() // Confirma seleção e retenta geração
  handleCancelarSelecaoContratos()  // Cancela e limpa estados
  ```

#### 3. `planejamentoCompras.ts` (Service)
**Modificações:**
- `gerarPedidosPorPeriodo()` agora aceita:
  ```typescript
  contratos_selecionados?: { produto_id: number; contrato_produto_id: number }[]
  ```

- `gerarPedidoDaGuia()` agora aceita:
  ```typescript
  contratos_selecionados?: { produto_id: number; contrato_produto_id: number }[]
  ```

---

## 🎯 Fluxo de Uso

### Cenário 1: Produto em 1 Contrato
1. Usuário clica em "Gerar Pedido"
2. Sistema usa automaticamente o único contrato disponível
3. Pedido é gerado normalmente
**Sem mudança no comportamento**

### Cenário 2: Produto em 2+ Contratos
1. Usuário clica em "Gerar Pedido"
2. Sistema detecta produtos com múltiplos contratos
3. Dialog de seleção é exibido automaticamente
4. Usuário pode:
   - Selecionar manualmente cada contrato
   - Clicar em "Usar Menor Preço" (seleção automática)
   - Clicar em "Usar Maior Saldo" (seleção automática)
5. Usuário confirma seleção
6. Sistema gera pedido com os contratos selecionados

---

## 📊 Informações Exibidas no Dialog

Para cada produto com múltiplos contratos:
- ✅ Nome do produto
- ✅ Quantidade necessária
- ✅ Unidade de medida

Para cada contrato disponível:
- ✅ Nome do fornecedor
- ✅ Número do contrato
- ✅ Preço unitário
- ✅ Saldo disponível
- ✅ Badge "Menor $" (se for o mais barato)
- ✅ Badge "Maior saldo" (se tiver mais estoque)
- ✅ Valor total estimado do contrato selecionado
- ⚠️ Alerta se quantidade excede saldo

---

## 🔄 Compatibilidade

### Retrocompatibilidade
✅ Mantida - Produtos com 1 contrato funcionam como antes

### APIs Afetadas
- `POST /planejamento-compras/gerar-pedidos`
- `POST /planejamento-compras/gerar-pedido-da-guia`

### Novos Campos de Resposta
```typescript
{
  requer_selecao?: boolean;
  produtos_multiplos_contratos?: Array<{
    produto_id: number;
    produto_nome: string;
    unidade: string;
    quantidade_necessaria: number;
    contratos: Array<{
      contrato_produto_id: number;
      contrato_id: number;
      contrato_numero: string;
      fornecedor_id: number;
      fornecedor_nome: string;
      preco_unitario: number;
      saldo_disponivel: number;
      data_fim: string;
    }>;
  }>;
  mensagem?: string;
}
```

---

## 🧪 Testes Sugeridos

### Teste 1: Produto em 1 Contrato
- [ ] Gerar pedido com produto em apenas 1 contrato
- [ ] Verificar que pedido é gerado sem solicitar seleção

### Teste 2: Produto em 2+ Contratos
- [ ] Gerar pedido com produto em múltiplos contratos
- [ ] Verificar que dialog de seleção é exibido
- [ ] Verificar informações dos contratos (preço, saldo, fornecedor)
- [ ] Verificar badges "Menor $" e "Maior saldo"

### Teste 3: Seleção Manual
- [ ] Selecionar manualmente contratos diferentes
- [ ] Confirmar e verificar que pedido é gerado corretamente
- [ ] Verificar que contratos selecionados foram usados

### Teste 4: Seleção Automática - Menor Preço
- [ ] Clicar em "Usar Menor Preço"
- [ ] Verificar que contratos mais baratos foram selecionados
- [ ] Confirmar e verificar pedido gerado

### Teste 5: Seleção Automática - Maior Saldo
- [ ] Clicar em "Usar Maior Saldo"
- [ ] Verificar que contratos com mais estoque foram selecionados
- [ ] Confirmar e verificar pedido gerado

### Teste 6: Cancelamento
- [ ] Abrir dialog de seleção
- [ ] Clicar em "Cancelar"
- [ ] Verificar que nenhum pedido foi gerado

### Teste 7: Validação
- [ ] Tentar confirmar sem selecionar todos os contratos
- [ ] Verificar que botão "Confirmar" está desabilitado

### Teste 8: Alerta de Saldo Insuficiente
- [ ] Selecionar contrato com saldo menor que quantidade necessária
- [ ] Verificar que alerta é exibido

### Teste 9: Gerar Pedido da Guia
- [ ] Repetir testes 1-8 usando "Gerar Pedido da Guia"
- [ ] Verificar mesmo comportamento

---

## 📝 Notas Técnicas

### Performance
- Query de contratos otimizada com índices existentes
- Agrupamento em memória (Map) é eficiente
- Dialog renderiza apenas quando necessário

### Segurança
- Validação no backend: contratos selecionados devem existir e estar ativos
- Validação no frontend: todos os produtos devem ter contrato selecionado

### UX
- Dialog modal impede ações até seleção ser feita
- Botões de seleção automática facilitam decisões rápidas
- Informações visuais (badges, cores) ajudam na escolha
- Feedback claro sobre saldo insuficiente

---

**Data de Implementação:** 17/03/2026  
**Status:** ✅ Implementado e pronto para testes
