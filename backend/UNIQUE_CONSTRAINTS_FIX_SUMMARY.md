# Correção de Constraints de Unicidade por Tenant

## Problema
Várias tabelas tinham constraints de unicidade globais (sem considerar tenant_id), impedindo que o mesmo dado fosse usado em tenants diferentes.

## Solução
Ajustar todas as constraints UNIQUE para incluir `tenant_id`, permitindo duplicação entre tenants mas não dentro do mesmo tenant.

## Tabelas Corrigidas

### ✅ 1. Escolas
- **Constraint antiga:** `escolas_nome_unique` (global)
- **Constraint nova:** `escolas_nome_tenant_key` (por tenant)
- **Colunas:** `(nome, tenant_id)`
- **Também corrigido:** `escolas_codigo_acesso_tenant_key` (codigo_acesso, tenant_id)

### ✅ 2. Modalidades
- **Constraint antiga:** `modalidades_nome_key` (global)
- **Constraint nova:** `modalidades_nome_tenant_key` (por tenant)
- **Colunas:** `(nome, tenant_id)`

### ✅ 3. Produtos
- **Constraint antiga:** `produtos_nome_unique` (global)
- **Constraint nova:** `produtos_nome_tenant_key` (por tenant)
- **Colunas:** `(nome, tenant_id)`

### ✅ 4. Fornecedores
- **Constraint antiga:** `fornecedores_cnpj_key` (global)
- **Constraint nova:** `fornecedores_cnpj_tenant_key` (por tenant)
- **Colunas:** `(cnpj, tenant_id)`

### ✅ 5. Usuários
- **Constraint antiga:** `usuarios_email_key` (global)
- **Constraint nova:** `usuarios_email_tenant_key` (por tenant)
- **Colunas:** `(email, tenant_id)`

### ✅ 6. Contratos
- **Constraint antiga:** `contratos_numero_key` (global)
- **Constraint nova:** `contratos_numero_tenant_key` (por tenant)
- **Colunas:** `(numero, tenant_id)`

### ✅ 7. Pedidos
- **Constraint antiga:** `pedidos_numero_key` (global)
- **Constraint nova:** `pedidos_numero_tenant_key` (por tenant)
- **Colunas:** `(numero, tenant_id)`

### ✅ 8. Faturamentos
- **Constraint antiga:** `faturamentos_numero_key` (global)
- **Constraint nova:** `faturamentos_numero_tenant_key` (por tenant)
- **Colunas:** `(numero, tenant_id)`

## Migrations Criadas

1. **018_fix_escola_nome_constraint.sql** - Escolas
2. **019_fix_modalidades_nome_constraint.sql** - Modalidades
3. **020_fix_all_unique_constraints_tenant.sql** - Todas as outras tabelas

## Arquivo para Produção (Neon)

**APPLY_TO_NEON.sql** - Contém todas as correções para aplicar no banco de produção

## Scripts de Correção

- `fix-escola-nome-constraint.js` - Escolas
- `fix-modalidades-constraint.js` - Modalidades
- `fix-all-unique-constraints.js` - Todas as outras tabelas
- `find-all-unique-constraints.js` - Ferramenta de diagnóstico

## Outras Tabelas Identificadas (Não Corrigidas)

Estas tabelas têm constraints que envolvem relacionamentos e podem não precisar de correção:

- `cardapio_refeicoes` - uk_cardapio_refeicao_modalidade
- `contrato_produtos` - contrato_produtos_contrato_id_produto_id_key
- `contrato_produtos_modalidades` - contrato_produtos_modalidades_contrato_produto_id_modalidad_key
- `escola_modalidades` - escola_modalidades_escola_id_modalidade_id_key
- `escolas_modalidades` - escolas_modalidades_escola_id_modalidade_id_ano_letivo_key
- `estoque_escolas` - estoque_escolas_escola_id_produto_id_key
- `estoque_lotes` - uk_produto_lote
- `guia_produto_escola` - guia_produto_escola_unique_with_lote
- `refeicao_produtos` - uk_refeicao_produto

**Nota:** Estas constraints envolvem FKs entre tabelas do mesmo tenant, então a duplicação já é naturalmente prevenida pela relação.

## Tabelas Especiais (Não Corrigidas)

- `institutions` - Não precisa de tenant_id pois é a tabela que gerencia os tenants
  - `institutions_document_number_key`
  - `institutions_slug_key`

## Resultado

Agora é possível:
- ✅ Criar escolas com o mesmo nome em tenants diferentes
- ✅ Criar modalidades com o mesmo nome em tenants diferentes
- ✅ Criar produtos com o mesmo nome em tenants diferentes
- ✅ Cadastrar fornecedores com o mesmo CNPJ em tenants diferentes
- ✅ Criar usuários com o mesmo email em tenants diferentes
- ✅ Criar contratos com o mesmo número em tenants diferentes
- ✅ Criar pedidos com o mesmo número em tenants diferentes
- ✅ Criar faturamentos com o mesmo número em tenants diferentes

Mas ainda é impedido:
- ❌ Duplicar qualquer um desses dados **dentro do mesmo tenant**
