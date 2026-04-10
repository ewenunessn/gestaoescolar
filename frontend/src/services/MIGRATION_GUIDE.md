# Guia de Migração para CRUD Service Factory

Este guia explica como migrar os serviços existentes para usar o novo `crudFactory`.

## Benefícios

- ✅ Elimina duplicação de código em 45+ arquivos
- ✅ Cache automático com `requestQueue`
- ✅ Tratamento consistente de respostas
- ✅ Suporte a métodos customizados
- ✅ Tipagem TypeScript completa
- ✅ Menos código para manter

## Antes e Depois

### ❌ Antes (código duplicado)

```typescript
// cardapios.ts
import { apiWithRetry } from "./api";

export async function listarCardapios() {
  const { data } = await apiWithRetry.get("/cardapios");
  return data.data || [];
}

export async function buscarCardapio(id: number) {
  const { data } = await apiWithRetry.get(`/cardapios/${id}`);
  return data.data || null;
}

export async function criarCardapio(cardapio: any) {
  const { data } = await apiWithRetry.post("/cardapios", cardapio);
  return data.data || data;
}

export async function editarCardapio(id: number, cardapio: any) {
  const { data } = await apiWithRetry.put(`/cardapios/${id}`, cardapio);
  return data.data || data;
}

export async function deletarCardapio(id: number) {
  await apiWithRetry.delete(`/cardapios/${id}`);
}
```

### ✅ Depois (usando factory)

```typescript
// cardapios.ts
import { createCachedCrudService } from "./crudFactory";

interface Cardapio {
  id: number;
  nome: string;
  // ... outros campos
}

// Serviço básico com cache
const cardapiosService = createCachedCrudService<Cardapio>('/cardapios');

// Exportar métodos individuais para compatibilidade
export const listarCardapios = cardapiosService.listar;
export const buscarCardapio = cardapiosService.buscar;
export const criarCardapio = cardapiosService.criar;
export const editarCardapio = cardapiosService.editar;
export const deletarCardapio = cardapiosService.deletar;

// Ou exportar o serviço completo
export default cardapiosService;
```

## Exemplos de Uso

### 1. Serviço Básico

```typescript
import { createCrudService } from "./crudFactory";

interface Produto {
  id: number;
  nome: string;
  preco: number;
}

const produtosService = createCrudService<Produto>('/produtos');

// Usar
const produtos = await produtosService.listar();
const produto = await produtosService.buscar(1);
await produtosService.criar({ nome: 'Novo', preco: 10 });
await produtosService.editar(1, { preco: 15 });
await produtosService.remover(1);
```

### 2. Serviço com Cache

```typescript
import { createCachedCrudService } from "./crudFactory";

// Cache automático com requestQueue
const escolasService = createCachedCrudService<Escola>('/escolas');

// Primeira chamada: faz requisição
const escolas1 = await escolasService.listar();

// Segunda chamada (dentro de 5 min): retorna do cache
const escolas2 = await escolasService.listar();

// Limpar cache manualmente
escolasService.limparCache();
```

### 3. Serviço com Prevenção de Cache do Navegador

```typescript
import { createFreshCrudService } from "./crudFactory";

// Adiciona timestamp em todas as requisições
const produtosService = createFreshCrudService<Produto>('/produtos');

// GET /produtos?_t=1234567890
const produtos = await produtosService.listar();
```

### 4. Serviço com Métodos Customizados

```typescript
import { createCrudService } from "./crudFactory";
import { apiWithRetry } from "./api";

const cardapiosService = createCrudService<Cardapio>('/cardapios', {
  useCache: true,
  customMethods: {
    // Métodos adicionais específicos
    calcularCusto: async (id: number) => {
      const { data } = await apiWithRetry.get(`/cardapios/${id}/custo`);
      return data.data || data;
    },
    
    calcularNecessidades: async (id: number) => {
      const { data } = await apiWithRetry.get(`/cardapios/${id}/necessidades`);
      return data.data || data;
    },
    
    listarRefeicoes: async (id: number) => {
      const { data } = await apiWithRetry.get(`/cardapios/${id}/refeicoes`);
      return data.data || [];
    }
  }
});

// Usar métodos customizados
const custo = await cardapiosService.calcularCusto(1);
const necessidades = await cardapiosService.calcularNecessidades(1);
```

### 5. Serviço com Transformação de Resposta

```typescript
import { createCrudService } from "./crudFactory";

interface ProdutoAPI {
  id: number;
  nome: string;
  preco_centavos: number;
}

interface Produto {
  id: number;
  nome: string;
  preco: number; // em reais
}

const produtosService = createCrudService<Produto>('/produtos', {
  transformResponse: (data: ProdutoAPI) => ({
    id: data.id,
    nome: data.nome,
    preco: data.preco_centavos / 100
  })
});
```

### 6. Serviço com Filtros

```typescript
const escolasService = createCachedCrudService<Escola>('/escolas');

// Listar com filtros
const escolasAtivas = await escolasService.listar({ 
  status: 'ativa',
  cidade: 'São Paulo'
});
// GET /escolas?status=ativa&cidade=São%20Paulo

// Cache separado por filtros
const escolasInativas = await escolasService.listar({ 
  status: 'inativa' 
});
```

## Migração Passo a Passo

### Passo 1: Identificar o Serviço

Escolha um arquivo de serviço para migrar (ex: `produtos.ts`)

### Passo 2: Definir a Interface TypeScript

```typescript
interface Produto {
  id: number;
  nome: string;
  // ... campos
}
```

### Passo 3: Criar o Serviço

```typescript
import { createCachedCrudService } from "./crudFactory";

const produtosService = createCachedCrudService<Produto>('/produtos');
```

### Passo 4: Adicionar Métodos Customizados (se necessário)

```typescript
const produtosService = createCrudService<Produto>('/produtos', {
  useCache: true,
  customMethods: {
    buscarComposicaoNutricional: async (id: number) => {
      const { data } = await apiWithRetry.get(`/produtos/${id}/composicao-nutricional`);
      return data.data;
    }
  }
});
```

### Passo 5: Exportar para Compatibilidade

```typescript
// Manter compatibilidade com código existente
export const listarProdutos = produtosService.listar;
export const buscarProduto = produtosService.buscar;
export const criarProduto = produtosService.criar;
export const editarProduto = produtosService.editar;
export const removerProduto = produtosService.remover;

// Exportar serviço completo
export default produtosService;
```

### Passo 6: Testar

```typescript
// Testar todas as operações
const produtos = await listarProdutos();
const produto = await buscarProduto(1);
```

## Serviços Prioritários para Migração

1. ✅ `cardapios.ts` - Exemplo de referência
2. ⏳ `produtos.ts` - Muitas operações
3. ⏳ `escolas.ts` - Usa cache
4. ⏳ `contratos.ts` - Usa cache
5. ⏳ `fornecedores.ts`
6. ⏳ `refeicoes.ts`
7. ⏳ `modalidades.ts`
8. ⏳ `nutricionistas.ts`
9. ⏳ `pedidos.ts`
10. ⏳ `demandas.ts`

... e mais 35+ serviços

## Opções Disponíveis

```typescript
interface CrudServiceOptions<T> {
  // Usar cache para operações de leitura
  useCache?: boolean;
  
  // Chave base para cache
  cacheKey?: string;
  
  // Adicionar timestamp para evitar cache do navegador
  preventBrowserCache?: boolean;
  
  // Métodos customizados adicionais
  customMethods?: Record<string, (...args: any[]) => Promise<any>>;
  
  // Transformar resposta antes de retornar
  transformResponse?: (data: any) => T;
}
```

## Helpers Disponíveis

```typescript
// Serviço básico
createCrudService<T>(endpoint, options)

// Serviço com cache habilitado
createCachedCrudService<T>(endpoint, options)

// Serviço com prevenção de cache do navegador
createFreshCrudService<T>(endpoint, options)
```

## Métodos do Serviço

```typescript
interface CrudService<T> {
  listar: (params?: Record<string, any>) => Promise<T[]>;
  buscar: (id: number | string) => Promise<T | null>;
  criar: (data: Partial<T>) => Promise<T>;
  editar: (id: number | string, data: Partial<T>) => Promise<T>;
  remover: (id: number | string) => Promise<void>;
  deletar: (id: number | string) => Promise<void>; // alias
  limparCache: () => void;
}
```

## Dicas

1. **Use cache para dados que mudam pouco** (escolas, modalidades, tipos)
2. **Não use cache para dados em tempo real** (pedidos, estoque)
3. **Adicione métodos customizados** para operações específicas
4. **Mantenha exports individuais** para compatibilidade
5. **Defina interfaces TypeScript** para melhor tipagem

## Exemplo Completo: Migração de `produtos.ts`

```typescript
import { createFreshCrudService } from "./crudFactory";
import { apiWithRetry } from "./api";

// Tipos
export interface Produto {
  id: number;
  nome: string;
  preco: number;
  fator_correcao: number;
  peso: number;
  // ... outros campos
}

export interface ComposicaoNutricional {
  produto_id: number;
  calorias: number;
  proteinas: number;
  // ... outros campos
}

// Criar serviço com prevenção de cache do navegador
const produtosService = createFreshCrudService<Produto>('/produtos', {
  customMethods: {
    // Métodos específicos de produtos
    buscarComposicaoNutricional: async (id: number): Promise<ComposicaoNutricional | null> => {
      const { data } = await apiWithRetry.get(`/produtos/${id}/composicao-nutricional`);
      return data.data || null;
    },
    
    salvarComposicaoNutricional: async (
      id: number, 
      composicao: Partial<ComposicaoNutricional>
    ): Promise<ComposicaoNutricional> => {
      const { data } = await apiWithRetry.put(
        `/produtos/${id}/composicao-nutricional`, 
        composicao
      );
      return data.data || data;
    },
    
    importarLote: async (produtos: Partial<Produto>[]): Promise<any> => {
      const { data } = await apiWithRetry.post('/produtos/importar-lote', { produtos });
      return data.data || data;
    }
  }
});

// Exports para compatibilidade
export const listarProdutos = produtosService.listar;
export const buscarProduto = produtosService.buscar;
export const criarProduto = produtosService.criar;
export const editarProduto = produtosService.editar;
export const removerProduto = produtosService.remover;
export const deletarProduto = produtosService.deletar;

// Métodos customizados
export const buscarComposicaoNutricional = produtosService.buscarComposicaoNutricional;
export const salvarComposicaoNutricional = produtosService.salvarComposicaoNutricional;
export const importarProdutosLote = produtosService.importarLote;

// Alias para compatibilidade
export const getProdutoById = buscarProduto;

// Export default
export default produtosService;
```

## Próximos Passos

1. Migrar serviços um por vez
2. Testar cada migração
3. Atualizar imports nos componentes (se necessário)
4. Remover código duplicado
5. Documentar mudanças

## Suporte

Para dúvidas ou problemas, consulte:
- `frontend/src/services/crudFactory.ts` - Implementação
- `frontend/src/utils/requestQueue.ts` - Sistema de cache
- `frontend/src/services/api.ts` - Cliente HTTP
