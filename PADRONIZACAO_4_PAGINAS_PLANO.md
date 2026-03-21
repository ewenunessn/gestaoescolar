# Plano de Padronização - 4 Páginas

## Páginas a Atualizar
1. Modalidades
2. Nutricionistas  
3. Fornecedores
4. Contratos

## Alterações Comuns para Todas

### 1. Substituir estrutura de tabela por DataTable
- Remover Table, TableContainer, TableHead, TableBody manual
- Implementar colunas usando ColumnDef do TanStack Table
- Usar componente DataTable reutilizável

### 2. Toolbar Padronizada
- Botão de criar (preto #000)
- Ícone de filtro (Popover)
- Ícone de busca expansível
- Ícone de importar/exportar (quando aplicável)

### 3. Filtros com Popover
- Substituir TableFilter por Popover customizado
- Filtros específicos de cada página
- Chips mostrando filtros ativos
- Botões "Limpar" e "Aplicar"

### 4. Modal de Cadastro Melhorado
- Seções organizadas com títulos coloridos
- Dividers entre seções
- Placeholders informativos
- Helper texts explicativos
- Switch com descrições
- Loading indicator no botão

### 5. Scroll e Layout
- Header fixo fora do scroll
- Body com scroll interno
- Altura fixa para tabela
- Bordas arredondadas no container

## Detalhes por Página

### MODALIDADES
**Colunas:**
- ID (80px)
- Nome da Modalidade (300px)
- Código Financeiro (150px)
- Valor Repasse (120px)
- Parcelas (100px)
- Total Anual (120px)
- Alunos (100px)
- Ações (100px)

**Filtros:**
- Status (Todos/Ativas/Inativas)
- Ordenar por (Nome/Valor/Status)

**Modal - Seções:**
1. Informações Básicas: Nome, Descrição
2. Dados Financeiros: Código Financeiro, Valor Repasse, Parcelas
3. Status: Switch Ativo

### NUTRICIONISTAS
**Colunas:**
- ID (80px)
- Nome (300px)
- CRN (150px)
- Especialidade (150px)
- Contato (200px)
- Ações (100px)

**Filtros:**
- Status (Todos/Ativos/Inativos)

**Modal - Seções:**
1. Informações Pessoais: Nome Completo
2. Registro Profissional: Região CRN, Número CRN
3. Contato: CPF, Telefone, Email
4. Especialização: Especialidade
5. Status: Switch Ativo

### FORNECEDORES
**Colunas:**
- ID (80px)
- Nome (300px)
- CNPJ (150px)
- Tipo (150px)
- Email (200px)
- Ações (100px)

**Filtros:**
- Status (Todos/Ativos/Inativos)
- Tipo (Todos/Convencional/Agricultura Familiar/Cooperativa/Associação)

**Modal - Seções:**
1. Informações Básicas: Nome, CNPJ
2. Classificação: Tipo de Fornecedor
3. Agricultura Familiar (condicional): DAP/CAF, Data Validade
4. Contato: Email
5. Status: Switch Ativo

**Funcionalidades Especiais:**
- Importar/Exportar fornecedores
- Campos condicionais para Agricultura Familiar

### CONTRATOS
**Colunas:**
- ID (80px)
- Número (150px)
- Fornecedor (250px)
- Status (120px)
- Vigência (200px)
- Valor Total (150px)
- Ações (100px)

**Filtros:**
- Fornecedor (dropdown com lista)
- Status (Todos/Vigente/Vencido/Suspenso)

**Observações:**
- Não tem modal de criação (usa página separada /contratos/novo)
- Apenas visualização e navegação para detalhes
- Cálculo de status baseado em datas

## Imports Necessários

```typescript
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import {
  Popover,
  Divider,
  Grid,
  CircularProgress,
} from '@mui/material';
```

## Padrão de Código

### Definição de Colunas
```typescript
const columns = useMemo<ColumnDef<TipoEntidade>[]>(() => [
  { 
    accessorKey: 'id', 
    header: 'ID',
    size: 80,
    enableSorting: true,
  },
  // ... outras colunas
], [navigate]);
```

### Uso do DataTable
```typescript
<DataTable
  data={entidadesFiltradas}
  columns={columns}
  loading={loading}
  onRowClick={handleRowClick}
  searchPlaceholder="Buscar..."
  onCreateClick={openModal}
  createButtonLabel="Nova Entidade"
  onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
  onImportExportClick={(e) => setImportExportMenuAnchor(e.currentTarget)}
/>
```

### Popover de Filtros
```typescript
<Popover
  open={Boolean(filterAnchorEl)}
  anchorEl={filterAnchorEl}
  onClose={() => setFilterAnchorEl(null)}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
>
  <Box sx={{ p: 2, minWidth: 280 }}>
    {/* Conteúdo dos filtros */}
  </Box>
</Popover>
```

## Checklist de Implementação

Para cada página:
- [ ] Atualizar imports
- [ ] Criar interface da entidade
- [ ] Definir colunas com ColumnDef
- [ ] Implementar filtros com Popover
- [ ] Reorganizar modal em seções
- [ ] Adicionar placeholders e helper texts
- [ ] Implementar handleRowClick
- [ ] Remover código antigo de tabela
- [ ] Testar funcionalidades
- [ ] Verificar diagnostics

## Ordem de Implementação
1. Modalidades (mais simples)
2. Nutricionistas (similar)
3. Fornecedores (tem importação)
4. Contratos (sem modal de criação)


## Status de Implementação

### ✅ MODALIDADES - CONCLUÍDO
- Substituído por DataTable com TanStack Table
- 8 colunas implementadas
- Modal reorganizado em 3 seções
- Filtros com Popover (Status e Ordenar por)
- Documento: `PADRONIZACAO_MODALIDADES_COMPLETA.md`

### ✅ NUTRICIONISTAS - CONCLUÍDO
- Substituído por DataTable com TanStack Table
- 7 colunas implementadas
- Modal reorganizado em 5 seções
- Filtros com Popover (Status)
- Select com 10 regiões CRN
- Documento: `PADRONIZACAO_NUTRICIONISTAS_COMPLETA.md`

### ✅ CONTRATOS - CONCLUÍDO
- Substituído por DataTable com TanStack Table
- 7 colunas implementadas
- Filtros com Popover (Fornecedor e Status)
- Botão "Novo Contrato" navega para `/contratos/novo`
- handleRowClick navega para `/contratos/${id}`
- Cálculo de status baseado em datas
- Documento: `PADRONIZACAO_CONTRATOS_COMPLETA.md`

### ✅ FORNECEDORES - CONCLUÍDO
- Substituído por DataTable com TanStack Table
- 7 colunas implementadas
- Modal reorganizado em 5 seções (com seção condicional para AF)
- Filtros com Popover (Status e Tipo)
- Importação/Exportação de fornecedores
- Campos condicionais para Agricultura Familiar
- Documento: `PADRONIZACAO_FORNECEDORES_COMPLETA.md`

## Arquivos Criados
- `frontend/src/pages/Modalidades.tsx` (atualizado)
- `frontend/src/pages/Nutricionistas.tsx` (atualizado)
- `frontend/src/pages/Contratos.tsx` (atualizado)
- `frontend/src/pages/Fornecedores.tsx` (atualizado)
- `PADRONIZACAO_MODALIDADES_COMPLETA.md`
- `PADRONIZACAO_NUTRICIONISTAS_COMPLETA.md`
- `PADRONIZACAO_CONTRATOS_COMPLETA.md`
- `PADRONIZACAO_FORNECEDORES_COMPLETA.md`

## Resultado Final
✅ Todas as 4 páginas do plano foram padronizadas com sucesso!
✅ Padrão visual consistente em todo o sistema
✅ Componente DataTable reutilizável implementado
✅ Documentação completa de cada página

## Próximos Passos (Opcional)
- Considerar padronizar outras páginas do sistema seguindo o mesmo padrão
- Aplicar o padrão em páginas futuras
- Manter a consistência visual e funcional
