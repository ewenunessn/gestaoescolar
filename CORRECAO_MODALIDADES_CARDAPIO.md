# Correção: Problema ao Listar Modalidades no Seletor de Cardápios

## Problema Identificado

Ao criar ou editar cardápios, o seletor de modalidades não estava listando as opções disponíveis, apresentando o erro:
```
Cannot read properties of undefined (reading 'success')
```

## Causas Raiz

### 1. Tipo de Valor Inconsistente no Select
No componente `CardapiosModalidade.tsx`, o `MenuItem` estava usando `value={m.id}` (número), mas o `formData.modalidade_id` era uma string, causando incompatibilidade.

### 2. Filtro Restritivo no Backend
O controller de modalidades tinha um filtro `WHERE m.ativo = true` fixo, impedindo a listagem de modalidades inativas que poderiam ser necessárias para edição de cardápios antigos.

### 3. Tratamento de Resposta Inadequado
O serviço `cardapiosModalidade.ts` estava usando `response.data.data || response.data`, mas quando `response.data` é um array ou objeto direto (sem envolver em `{ data: ... }`), o código funcionava. O problema real era que o código não tratava adequadamente quando `response.data` poderia ser `undefined` em casos de erro.

### 4. Inconsistência na Estrutura de Resposta
O backend de cardápios retorna dados diretamente (`res.json(result.rows)`), enquanto o backend de modalidades retorna envolto em objeto (`res.json({ success: true, data: ... })`). Isso causava confusão no tratamento das respostas.

## Correções Aplicadas

### 1. Frontend - CardapiosModalidade.tsx
**Arquivo:** `frontend/src/pages/CardapiosModalidade.tsx`

```typescript
// ANTES
{modalidades.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}

// DEPOIS
{modalidades.map((m) => <MenuItem key={m.id} value={m.id.toString()}>{m.nome}</MenuItem>)}
```

### 2. Backend - modalidadeController.ts
**Arquivo:** `backend/src/modules/cardapios/controllers/modalidadeController.ts`

```typescript
// ANTES
WHERE m.ativo = true

// DEPOIS
export async function listarModalidades(req: Request, res: Response) {
  try {
    // Permitir filtrar por status ativo via query param
    const { ativo } = req.query;
    const whereClause = ativo !== undefined ? 'WHERE m.ativo = $1' : '';
    const params = ativo !== undefined ? [ativo === 'true'] : [];
    
    const result = await db.query(`
      SELECT ...
      FROM modalidades m
      LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
      ${whereClause}
      GROUP BY ...
      ORDER BY m.nome
    `, params);
    ...
  }
}
```

### 3. Frontend - modalidadeService.ts
**Arquivo:** `frontend/src/services/modalidadeService.ts`

```typescript
// ANTES
async listar(): Promise<Modalidade[]> {
  const response = await api.get(this.baseUrl);
  return response.data.data || response.data;
}

// DEPOIS
async listar(ativo?: boolean): Promise<Modalidade[]> {
  try {
    const params = ativo !== undefined ? `?ativo=${ativo}` : '';
    const response = await api.get(`${this.baseUrl}${params}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Erro ao listar modalidades:', error);
    throw error;
  }
}
```

### 4. Frontend - cardapiosModalidade.ts (Tratamento Robusto)
**Arquivo:** `frontend/src/services/cardapiosModalidade.ts`

Todas as funções foram atualizadas para tratar ambos os formatos de resposta:

```typescript
// ANTES
export async function listarCardapiosModalidade(...): Promise<CardapioModalidade[]> {
  try {
    const response = await api.get(`/cardapios?${params.toString()}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Erro ao listar cardápios:', error);
    throw error;
  }
}

// DEPOIS
export async function listarCardapiosModalidade(...): Promise<CardapioModalidade[]> {
  try {
    const params = new URLSearchParams();
    // ... configuração de params ...
    
    const response = await api.get(`/cardapios?${params.toString()}`);
    
    // Backend retorna array diretamente em response.data
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // Ou pode retornar { data: [...] }
    if (response.data && response.data.data) {
      return response.data.data;
    }
    
    // Fallback para array vazio
    console.warn('Resposta inesperada da API:', response.data);
    return [];
  } catch (error) {
    console.error('Erro ao listar cardápios:', error);
    throw error;
  }
}
```

O mesmo padrão foi aplicado para:
- `buscarCardapioModalidade()`
- `criarCardapioModalidade()`
- `editarCardapioModalidade()`
- `listarRefeicoesCardapio()`
- `adicionarRefeicaoDia()`

## Benefícios

1. **Seletor Funcional**: As modalidades agora aparecem corretamente no seletor
2. **Flexibilidade**: Possibilidade de listar todas as modalidades ou apenas as ativas
3. **Tratamento de Erros Robusto**: Erros são capturados e tratados adequadamente
4. **Consistência de Tipos**: Valores string/number são tratados corretamente
5. **Compatibilidade**: Suporta ambos os formatos de resposta da API
6. **Resiliência**: Fallbacks para arrays/objetos vazios evitam crashes
7. **Compatibilidade**: Cardápios antigos com modalidades inativas podem ser editados

## Como Testar

1. Acesse a página de Cardápios
2. Clique em "Novo Cardápio"
3. Verifique se o seletor de modalidades lista todas as opções
4. Selecione uma modalidade e preencha os demais campos
5. Salve o cardápio
6. Edite um cardápio existente e verifique se a modalidade está selecionada corretamente

## Scripts de Verificação

### Verificar Modalidades no Banco
```bash
node backend/migrations/verificar-modalidades.js
```

### Testar API de Modalidades
```bash
node backend/migrations/testar-api-modalidades.js
```

Estes scripts mostrarão:
- Total de modalidades cadastradas
- Lista de modalidades com status (ativa/inativa)
- Estrutura da resposta da API
- Resumo de ativas vs inativas

## Próximos Passos

Se o problema persistir, verifique:
1. Se há modalidades cadastradas no banco de dados
2. Se o backend está rodando corretamente
3. Se há erros no console do navegador (F12)
4. Se o token de autenticação é válido
5. Se a rota `/api/modalidades` está respondendo corretamente
