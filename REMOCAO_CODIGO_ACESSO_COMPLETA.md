# Remoção Completa do Campo codigo_acesso

## Resumo
O campo `codigo_acesso` foi completamente removido do sistema. Agora apenas o campo `codigo` (Código INEP) é utilizado, servindo tanto para identificação da escola quanto para acesso ao sistema.

## Alterações Realizadas

### 1. Migration SQL
**Arquivo:** `backend/migrations/20260320_remove_codigo_acesso_escolas.sql`
- Remove a coluna `codigo_acesso` da tabela `escolas`
- Adiciona comentário ao campo `codigo` explicando seu uso duplo

### 2. Backend - Controller
**Arquivo:** `backend/src/modules/escolas/controllers/escolaController.ts`
- Removido `codigo_acesso` de todas as queries SQL
- Atualizado `listarEscolas()` - removido da seleção e GROUP BY
- Atualizado `buscarEscola()` - removido da seleção
- Atualizado `criarEscola()` - removido do INSERT
- Atualizado `editarEscola()` - removido do UPDATE

### 3. Frontend - Tipos Compartilhados
**Arquivo:** `shared/types/index.ts`
- Interface `Escola` atualizada:
  - Removido campo `codigo_acesso`
  - Adicionados campos: `codigo`, `municipio`, `endereco_maps`, `nome_gestor`, `administracao`
  - Comentário adicionado ao campo `codigo` explicando uso duplo
- Interface `EscolaCreate` atualizada com os mesmos campos

### 4. Frontend - Página de Escolas
**Arquivo:** `frontend/src/pages/Escolas.tsx`
- Interface local `Escola` atualizada (removido `codigo_acesso`)
- Estado `formData` atualizado (removido `codigo_acesso`)
- Modal de cadastro:
  - Campo "Código INEP" agora ocupa linha inteira
  - Helper text atualizado: "Código do INEP - também usado para acesso ao sistema"
  - Removido campo separado de "Código de Acesso"
- Função `openModal()` atualizada
- Exportação Excel atualizada (removida coluna "Código de Acesso")

### 5. Frontend - Página de Detalhes
**Arquivo:** `frontend/src/pages/EscolaDetalhes.tsx`
- Interface `Escola` atualizada (removido `codigo_acesso`)
- Formulário de edição:
  - Removido campo "Código de Acesso"
  - Campo "Código INEP" com helper text atualizado
- Visualização de dados:
  - Removido InfoItem de "Código de Acesso"
- Estados `formData` atualizados em todas as funções

### 6. Frontend - Importação de Escolas
**Arquivo:** `frontend/src/components/ImportacaoEscolas.tsx`
- Interface `EscolaValidada` atualizada (removido `codigo_acesso`)
- Função `validarEscolas()`:
  - Removido mapeamento de `codigo_acesso`
  - Removida validação de tamanho do `codigo_acesso`
- Modelo Excel atualizado:
  - Removida coluna "Código de Acesso"
  - Adicionada coluna "Código INEP" no início
- Tabela de preview:
  - Removida coluna "Código de Acesso"
- Mensagem de erro atualizada (removida menção ao código de acesso)

### 7. Script de Aplicação
**Arquivo:** `backend/migrations/aplicar-remocao-codigo-acesso.js`
- Script Node.js para aplicar a migration
- Verifica se a coluna existe antes de remover
- Exibe estrutura final da tabela
- Mostra comentário do campo `codigo`

## Como Aplicar as Mudanças

### 1. Aplicar Migration no Banco de Dados
```bash
node backend/migrations/aplicar-remocao-codigo-acesso.js
```

### 2. Reiniciar o Backend
```bash
cd backend
npm run dev
```

### 3. Reiniciar o Frontend
```bash
cd frontend
npm run dev
```

## Impactos no Sistema

### ✅ Funcionalidades Mantidas
- Cadastro de escolas (agora mais simples)
- Edição de escolas
- Listagem de escolas
- Importação em lote
- Exportação para Excel
- Exclusão de escolas

### ⚠️ Atenção Necessária
- **Login de Escolas**: Se o sistema usa `codigo_acesso` para login, será necessário atualizar para usar o campo `codigo` (INEP)
- **Apps Mobile**: Os apps `estoque-escolar-mobile` e `entregador-native` ainda referenciam `codigo_acesso` e precisarão ser atualizados
- **Banco de Dados**: Após aplicar a migration, não será possível reverter sem backup

## Arquivos que Ainda Referenciam codigo_acesso

### Backend
- `backend/database/schema.sql` - Schema antigo (pode ser atualizado)
- `backend/src/modules/guias/models/Guia.ts` - Modelo de Guia

### Mobile Apps
- `apps/estoque-escolar-mobile/src/services/api.ts`
- `apps/estoque-escolar-mobile/src/services/gestorEscola.ts`

### Scripts
- Vários scripts de migration antigos que não afetam o funcionamento atual

## Próximos Passos Recomendados

1. ✅ Aplicar migration no banco de dados local
2. ✅ Testar cadastro de novas escolas
3. ✅ Testar edição de escolas existentes
4. ✅ Testar importação em lote
5. ⚠️ Atualizar sistema de login de escolas (se aplicável)
6. ⚠️ Atualizar apps mobile
7. ✅ Aplicar migration no banco de produção (quando testado)

## Benefícios da Mudança

1. **Simplicidade**: Um único campo para identificação e acesso
2. **Menos Confusão**: Não há mais dois códigos diferentes
3. **Padrão Nacional**: Usa o código INEP oficial
4. **Menos Campos**: Interface mais limpa e fácil de usar
5. **Manutenção**: Menos campos para gerenciar e validar

## Observações Importantes

- O campo `codigo` (INEP) é opcional no cadastro
- Escolas sem código INEP podem ser cadastradas normalmente
- O código INEP deve ser único quando informado
- A migration é irreversível sem backup do banco de dados
