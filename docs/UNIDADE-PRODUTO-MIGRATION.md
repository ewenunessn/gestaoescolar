# Migração: Unidade do Produto

Documentação completa da migração da coluna `unidade` de volta para a tabela `produtos`.

## 📋 Resumo

A coluna `unidade` foi adicionada diretamente na tabela `produtos` para simplificar o modelo de dados e garantir consistência em todo o sistema.

## ✅ Mudanças Realizadas

### Backend

#### 1. Migration SQL
- **Arquivo**: `backend/src/migrations/20260303_add_unidade_to_produtos.sql`
- Adiciona coluna `unidade VARCHAR(20) DEFAULT 'UN'`
- Atualiza produtos existentes com unidades inteligentes baseadas no nome
- Cria índice para performance

#### 2. Models Atualizados
- `EstoqueCentral.ts`: Interface `EstoqueCentralCompleto` agora inclui `unidade`
- Queries atualizadas para incluir `p.unidade` nos JOINs

#### 3. Controllers Atualizados
- **Arquivo**: `backend/src/modules/produtos/controllers/produtoController.ts`
- `listarProdutos()`: Inclui `p.unidade` no SELECT
- `buscarProduto()`: Inclui `p.unidade` no SELECT
- `criarProduto()`: Aceita e valida campo `unidade`
- `editarProduto()`: Aceita e valida campo `unidade`
- Validação de unidades permitidas: UN, KG, G, L, ML, DZ, PCT, CX, FD, SC

#### 4. Views Atualizadas
- `vw_estoque_central_completo`: Inclui `p.unidade`
- `vw_lotes_proximos_vencimento`: Inclui `p.unidade`
- `vw_estoque_baixo`: Inclui `p.unidade`

#### 5. Scripts Criados
- `apply-unidade-produtos.js`: Aplica migration em LOCAL e NEON
- `update-views-with-unidade.js`: Atualiza views em ambos ambientes
- `sync-all-to-neon.js`: Sincronização completa com Neon
- `fix-all-pks-neon.js`: Corrige PKs faltantes no Neon

### Frontend

#### 1. Types Atualizados
- **Arquivo**: `frontend/src/types/produto.ts`
- Interface `Produto` agora inclui `unidade?: string`
- `CriarProdutoRequest` inclui `unidade?: string`
- `AtualizarProdutoRequest` inclui `unidade?: string`
- Mantém `unidade_contrato` como deprecated para compatibilidade

#### 2. Página de Produtos
- **Arquivo**: `frontend/src/pages/Produtos.tsx`
- Formulário de criação inclui campo `unidade` com select de opções
- Tabela de listagem exibe coluna `unidade` com Chip
- Interface `ProdutoForm` atualizada
- Import do Chip corrigido

#### 3. Página de Detalhes do Produto
- **Arquivo**: `frontend/src/pages/ProdutoDetalhe.tsx`
- Exibe unidade na seção de identificação
- Formulário de edição inclui campo `unidade` com select
- Campo unidade enviado no handleSave

#### 2. Página de Produtos
- **Arquivo**: `frontend/src/pages/Produtos.tsx`
- Formulário de criação inclui campo `unidade` com select de opções
- Tabela de listagem exibe coluna `unidade` com Chip
- Interface `ProdutoForm` atualizada

#### 3. Unidades Disponíveis
- UN (Unidade) - Padrão
- KG (Quilograma)
- G (Grama)
- L (Litro)
- ML (Mililitro)
- DZ (Dúzia)
- PCT (Pacote)
- CX (Caixa)
- FD (Fardo)
- SC (Saco)

## 🚀 Como Aplicar

### Banco de Dados Local
```bash
cd backend
npm run build
node scripts/apply-unidade-produtos.js
node scripts/update-views-with-unidade.js
```

### Banco de Dados Neon
```bash
# Corrigir PKs primeiro (se necessário)
POSTGRES_URL="sua-url-neon" node scripts/fix-all-pks-neon.js

# Sincronizar tudo
POSTGRES_URL="sua-url-neon" node scripts/sync-all-to-neon.js
```

## 📊 Resultado

### Banco Local
- ✅ Coluna `unidade` adicionada
- ✅ 15 produtos com unidades configuradas
- ✅ Views atualizadas
- ✅ Índice criado

### Banco Neon
- ✅ PKs corrigidas (produtos, usuarios, contratos, fornecedores)
- ✅ Coluna `unidade` adicionada
- ✅ Estoque central criado
- ✅ Views atualizadas

## 🔄 Compatibilidade

### Retrocompatibilidade
- Campo `unidade_contrato` mantido como deprecated
- Código antigo continua funcionando
- Migração gradual possível

### Novos Desenvolvimentos
- Usar sempre `produto.unidade`
- Não usar mais `unidade_contrato`
- Validar unidade no frontend e backend

## 📝 Próximos Passos

### Backend
- [x] Atualizar controllers para validar unidade
- [x] Adicionar validação de unidades permitidas
- [x] Incluir unidade em listar, buscar, criar e editar
- [ ] Migrar código que usa `unidade_contrato`

### Frontend
- [x] Atualizar página de listagem (Produtos.tsx)
- [x] Atualizar página de detalhes (ProdutoDetalhe.tsx)
- [x] Adicionar campo unidade no formulário de criação
- [x] Adicionar campo unidade no formulário de edição
- [x] Exibir unidade na tabela de listagem
- [ ] Adicionar filtro por unidade
- [ ] Exibir unidade em relatórios
- [ ] Atualizar importação/exportação

### Mobile
- [ ] Atualizar apps mobile para exibir unidade
- [ ] Sincronizar com nova estrutura

## ⚠️ Pontos de Atenção

1. **Produtos Existentes**: Recebem unidade "UN" por padrão
2. **Validação**: Adicionar validação de unidades no backend
3. **Relatórios**: Atualizar para incluir unidade
4. **Importação**: Incluir unidade no template de importação
5. **Contratos**: Verificar se há referências a `unidade_contrato`

## 🧪 Testes Realizados

- ✅ Migration aplicada com sucesso (LOCAL e NEON)
- ✅ Views recriadas corretamente
- ✅ Frontend exibe unidade na listagem
- ✅ Formulário de criação inclui campo unidade
- ✅ Formulário de edição inclui campo unidade
- ✅ Backend valida unidades permitidas
- ✅ Backend inclui unidade em todas as operações CRUD
- ✅ Estoque central funciona com unidade

## 📚 Referências

- Migration: `backend/src/migrations/20260303_add_unidade_to_produtos.sql`
- Types: `frontend/src/types/produto.ts`
- Página: `frontend/src/pages/Produtos.tsx`
- Model: `backend/src/modules/estoque/models/EstoqueCentral.ts`
