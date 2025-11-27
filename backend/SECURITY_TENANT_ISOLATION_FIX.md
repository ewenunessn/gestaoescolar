# Correção de Isolamento de Tenant - Segurança

## Problema Identificado

Vários controllers têm queries que buscam/atualizam/deletam registros apenas por ID, sem validar se o registro pertence ao tenant atual. Isso permite que um usuário acesse dados de outros tenants apenas conhecendo o ID.

## Vulnerabilidade

```typescript
// ❌ INSEGURO - Permite acesso cross-tenant
const result = await db.query(`
  SELECT * FROM produtos WHERE id = $1
`, [id]);

// ✅ SEGURO - Valida o tenant
const result = await db.query(`
  SELECT * FROM produtos WHERE id = $1 AND tenant_id = $2
`, [id, req.tenant.id]);
```

## Controllers Afetados

### ✅ Corrigido
1. **produtoController.ts**
   - buscarProduto()
   - editarProduto()
   - removerProduto()

### ⚠️ Pendente de Correção

2. **cardapioController.ts**
   - buscarCardapio()
   - editarCardapio()
   - removerCardapio()

3. **refeicaoController.ts**
   - buscarRefeicao()
   - editarRefeicao()
   - removerRefeicao()

4. **contratoController.ts**
   - buscarContrato()
   - editarContrato()
   - removerContrato()

5. **fornecedorController.ts**
   - buscarFornecedor()
   - editarFornecedor()
   - removerFornecedor()

6. **saldoContratosController.ts**
   - buscarSaldoContrato()
   - editarSaldoContrato()

7. **saldoContratosModalidadesController.ts**
   - buscarSaldoModalidade()
   - editarSaldoModalidade()

8. **escolaController.ts**
   - buscarEscola() (verificar)

9. **estoqueEscolaController.ts**
   - buscarEstoque()

10. **estoqueEscolarController.ts**
    - buscarEstoque()

## Padrão de Correção

Para cada função que busca/atualiza/deleta por ID:

```typescript
export async function buscarRegistro(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // ✅ ADICIONAR: Validar tenant
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }
    
    // ✅ ADICIONAR: tenant_id na query
    const result = await db.query(`
      SELECT * FROM tabela 
      WHERE id = $1 AND tenant_id = $2
    `, [id, req.tenant.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Registro não encontrado"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    // ...
  }
}
```

## Impacto de Segurança

**Severidade:** ALTA

**Risco:** Usuários podem acessar, modificar ou deletar dados de outros tenants apenas conhecendo o ID do registro.

**Exemplo de Ataque:**
1. Usuário do Tenant A cria um produto (ID: 123)
2. Usuário do Tenant B acessa `/api/produtos/123`
3. Sem validação de tenant, o usuário B consegue ver/editar o produto do Tenant A

## Status da Correção

- ✅ **Produtos:** Corrigido
- ⚠️ **Outros 9 controllers:** Pendente

## Próximos Passos

1. Aplicar o padrão de correção em todos os controllers listados
2. Criar testes automatizados para validar isolamento de tenant
3. Adicionar linter rule para detectar queries sem tenant_id
