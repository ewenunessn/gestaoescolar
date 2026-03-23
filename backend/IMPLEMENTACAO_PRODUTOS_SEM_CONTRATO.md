# Implementação: Tratamento de Produtos Sem Contrato

## Problema Identificado

Ao tentar gerar pedido da Guia #58, o sistema travava após buscar contratos porque:
- Produto Chicória (ID 118) não tinha contrato ativo
- O código não tratava adequadamente produtos sem contrato
- Não havia feedback ao usuário sobre produtos sem contrato

## Solução Implementada

### Backend (`planejamentoComprasController.ts`)

#### 1. Verificação Antecipada de Produtos Sem Contrato

```typescript
// PRIMEIRO: Identificar produtos SEM contrato
const produtosSemContrato: Array<{ produto_id: number; produto_nome: string; quantidade: number }> = [];
const produtosComContrato: number[] = [];

for (const grupo of grupos.values()) {
  const contratos = contratosPorProduto.get(grupo.produto_id) || [];
  const qtdTotal = grupo.escolas.reduce((sum, e) => sum + e.quantidade, 0);
  
  if (contratos.length === 0) {
    produtosSemContrato.push({
      produto_id: grupo.produto_id,
      produto_nome: grupo.produto_nome,
      quantidade: qtdTotal
    });
  } else {
    produtosComContrato.push(grupo.produto_id);
  }
}
```

#### 2. Três Cenários de Tratamento

**Cenário 1: TODOS os produtos sem contrato**
```typescript
if (produtosSemContrato.length > 0 && produtosComContrato.length === 0) {
  return res.status(400).json({
    error: 'Nenhum produto da guia possui contrato ativo',
    produtos_sem_contrato: produtosSemContrato,
    mensagem: `Todos os ${produtosSemContrato.length} produtos da guia não possuem contrato ativo.`
  });
}
```

**Cenário 2: ALGUNS produtos sem contrato (requer confirmação)**
```typescript
if (produtosSemContrato.length > 0 && !ignorar_sem_contrato) {
  return res.status(200).json({
    requer_confirmacao: true,
    produtos_sem_contrato: produtosSemContrato,
    produtos_com_contrato: produtosComContrato.length,
    mensagem: `${produtosSemContrato.length} produto(s) não possuem contrato ativo e serão ignorados.`
  });
}
```

**Cenário 3: Usuário confirmou continuar**
```typescript
// Parâmetro ignorar_sem_contrato = true
// Continua gerando pedido apenas com produtos que têm contrato
```

#### 3. Logs Detalhados para Debug

```typescript
console.log('🔍 Verificando produtos sem contrato...');
console.log('✅ Produtos COM contrato:', produtosComContrato.length);
console.log('❌ Produtos SEM contrato:', produtosSemContrato.length);
console.log('📋 Detalhes produtos sem contrato:', produtosSemContrato.map(...));
```

#### 4. Informação no Pedido Gerado

```typescript
const obsTexto = [
  observacoes,
  `Gerado da Guia de Demanda #${guia_id}`,
  produtosSemContrato.length > 0 ? `Sem contrato (não incluídos): ${nomesSemContrato}` : null,
].filter(Boolean).join(' | ');
```

### Frontend (`GerarPedidoDaGuiaDialog.tsx`)

#### 1. Estados Adicionados

```typescript
const [produtosSemContrato, setProdutosSemContrato] = useState<any[]>([]);
const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
const [produtosComContrato, setProdutosComContrato] = useState(0);
```

#### 2. Detecção de Confirmação Necessária

```typescript
async function handleGerar() {
  const resultado = await gerarPedidoDaGuia(guiaSelecionada.id);
  
  // Verificar se requer confirmação
  if ((resultado as any).requer_confirmacao) {
    setProdutosSemContrato((resultado as any).produtos_sem_contrato || []);
    setProdutosComContrato((resultado as any).produtos_com_contrato || 0);
    setMostrarConfirmacao(true);
    return;
  }
  
  // ... continuar normalmente
}
```

#### 3. Tela de Confirmação

```typescript
{mostrarConfirmacao ? (
  <>
    <Alert severity="warning">
      {produtosSemContrato.length} produto(s) não possuem contrato ativo e serão ignorados.
      Deseja continuar apenas com os {produtosComContrato} produtos que têm contrato?
    </Alert>

    <Box>
      {produtosSemContrato.map((produto) => (
        <Box>
          <Typography>{produto.produto_nome}</Typography>
          <Typography>Quantidade: {produto.quantidade.toFixed(2)} kg</Typography>
        </Box>
      ))}
    </Box>
  </>
) : (
  // ... formulário normal
)}
```

#### 4. Confirmação do Usuário

```typescript
async function handleConfirmarComSemContrato() {
  // Chama novamente com ignorar_sem_contrato = true
  const resultado = await gerarPedidoDaGuia(guiaSelecionada.id, undefined, true);
  
  // Mostra aviso sobre produtos ignorados
  if ((resultado as any).aviso) {
    toast.warning((resultado as any).aviso);
  }
  
  toast.success(`Pedido ${pedido.numero} gerado com sucesso!`);
}
```

### Service (`planejamentoCompras.ts`)

```typescript
export async function gerarPedidoDaGuia(
  guia_id: number, 
  contratos_selecionados?: { ... }[],
  ignorar_sem_contrato?: boolean,  // ← Novo parâmetro
  observacoes?: string
): Promise<GerarPedidoDaGuiaResponse> {
  const response = await api.post('/planejamento-compras/gerar-pedido-da-guia', { 
    guia_id, 
    contratos_selecionados,
    ignorar_sem_contrato,  // ← Enviado ao backend
    observacoes 
  });
  return response.data;
}
```

## Fluxo Completo

### Caso 1: Todos os produtos têm contrato
1. Usuário clica "Gerar Pedido"
2. Backend gera pedido normalmente
3. Sucesso!

### Caso 2: Alguns produtos sem contrato
1. Usuário clica "Gerar Pedido"
2. Backend detecta produtos sem contrato
3. Backend retorna `requer_confirmacao: true`
4. Frontend mostra tela de confirmação com lista de produtos sem contrato
5. Usuário decide:
   - **Cancelar**: Volta ao formulário
   - **Continuar Mesmo Assim**: Chama novamente com `ignorar_sem_contrato: true`
6. Backend gera pedido apenas com produtos que têm contrato
7. Pedido criado com observação sobre produtos ignorados
8. Frontend mostra aviso amarelo sobre produtos ignorados

### Caso 3: Nenhum produto tem contrato
1. Usuário clica "Gerar Pedido"
2. Backend detecta que TODOS os produtos não têm contrato
3. Backend retorna erro 400
4. Frontend mostra mensagem de erro
5. Usuário precisa cadastrar contratos antes de gerar pedido

## Arquivos Modificados

### Backend
- `backend/src/controllers/planejamentoComprasController.ts`
  - Função `gerarPedidoDaGuia` (linhas 1313-1730)
  - Adicionada verificação antecipada de produtos sem contrato
  - Adicionado parâmetro `ignorar_sem_contrato`
  - Adicionados logs detalhados para debug
  - Melhorado tratamento de erros com try-catch

### Frontend
- `frontend/src/components/GerarPedidoDaGuiaDialog.tsx`
  - Adicionados estados para confirmação
  - Adicionada tela de confirmação
  - Adicionada função `handleConfirmarComSemContrato`
  - Melhorado feedback visual

- `frontend/src/services/planejamentoCompras.ts`
  - Adicionado parâmetro `ignorar_sem_contrato`

## Benefícios

1. **Transparência**: Usuário sabe exatamente quais produtos não têm contrato
2. **Controle**: Usuário decide se quer continuar ou não
3. **Rastreabilidade**: Produtos sem contrato ficam registrados nas observações do pedido
4. **Debug**: Logs detalhados facilitam identificação de problemas
5. **UX**: Feedback claro e ações bem definidas

## Teste

Para testar a implementação:

1. Criar uma guia com produtos que têm e não têm contrato
2. Tentar gerar pedido
3. Verificar se aparece tela de confirmação
4. Confirmar e verificar se pedido é gerado apenas com produtos com contrato
5. Verificar observações do pedido criado

## Exemplo de Resposta

### Requer Confirmação
```json
{
  "requer_confirmacao": true,
  "produtos_sem_contrato": [
    {
      "produto_id": 118,
      "produto_nome": "Chicória",
      "quantidade": 150.5
    }
  ],
  "produtos_com_contrato": 6,
  "mensagem": "1 produto(s) não possuem contrato ativo e serão ignorados. Deseja continuar apenas com os 6 produtos que têm contrato?"
}
```

### Pedido Criado com Aviso
```json
{
  "pedidos_criados": [{
    "pedido_id": 123,
    "numero": "PED-MAR2026000001",
    "guia_id": 58,
    "total_itens": 6,
    "valor_total": 15000.00,
    "produtos_sem_contrato": [
      {
        "produto_id": 118,
        "produto_nome": "Chicória",
        "quantidade": 150.5
      }
    ]
  }],
  "total_criados": 1,
  "total_erros": 0,
  "aviso": "1 produto(s) não incluído(s) por falta de contrato: Chicória"
}
```
