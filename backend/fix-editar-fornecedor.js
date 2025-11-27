const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/contratos/controllers/fornecedorController.ts');

console.log('🔧 Corrigindo editarFornecedor...\n');

let content = fs.readFileSync(filePath, 'utf8');

// Encontrar e substituir a função editarFornecedor completa
const funcStart = content.indexOf('export async function editarFornecedor');
const funcEnd = content.indexOf('\nexport async function verificarRelacionamentosFornecedor');

if (funcStart === -1 || funcEnd === -1) {
  console.log('❌ Função não encontrada');
  process.exit(1);
}

const newFunc = `export async function editarFornecedor(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      nome,
      cnpj,
      email,
      ativo
    } = req.body;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (nome !== undefined) {
      fields.push(\`nome = $\${paramIndex++}\`);
      values.push(nome);
    }
    if (cnpj !== undefined) {
      fields.push(\`cnpj = $\${paramIndex++}\`);
      values.push(cnpj);
    }
    if (email !== undefined) {
      fields.push(\`email = $\${paramIndex++}\`);
      values.push(email || null);
    }
    if (ativo !== undefined) {
      fields.push(\`ativo = $\${paramIndex++}\`);
      values.push(ativo);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhum campo para atualizar"
      });
    }

    fields.push(\`updated_at = CURRENT_TIMESTAMP\`);

    // IMPORTANTE: Adicionar tenant_id na condição WHERE
    const query = \`
      UPDATE fornecedores SET
        \${fields.join(', ')}
      WHERE id = $\${paramIndex} AND tenant_id = $\${paramIndex + 1}
      RETURNING *
    \`;
    values.push(id, req.tenant.id);

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fornecedor não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Fornecedor atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar fornecedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

`;

content = content.substring(0, funcStart) + newFunc + content.substring(funcEnd);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ editarFornecedor corrigido com sucesso!\n');
