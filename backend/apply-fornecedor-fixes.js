const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/contratos/controllers/fornecedorController.ts');

console.log('🔧 Aplicando correções no fornecedorController.ts...\n');

let content = fs.readFileSync(filePath, 'utf8');

// Correção 1: editarFornecedor - adicionar validação de tenant
const editarFuncStart = 'export async function editarFornecedor(req: Request, res: Response) {\n  try {\n    const { id } = req.params;';
const editarFuncStartWithTenant = `export async function editarFornecedor(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }`;

if (content.includes(editarFuncStart) && !content.includes('editarFornecedor(req: Request, res: Response) {\n  try {\n    const { id } = req.params;\n\n    // Configurar contexto de tenant')) {
  content = content.replace(editarFuncStart, editarFuncStartWithTenant);
  console.log('✅ Adicionada validação de tenant em editarFornecedor');
}

// Correção 2: editarFornecedor - adicionar tenant_id no WHERE
const oldWhere = 'WHERE id = ${paramIndex}\n      RETURNING *\n    `;\n    values.push(id);';
const newWhere = 'WHERE id = ${paramIndex} AND tenant_id = ${paramIndex + 1}\n      RETURNING *\n    `;\n    values.push(id, req.tenant.id);';

if (content.includes(oldWhere)) {
  content = content.replace(oldWhere, newWhere);
  console.log('✅ Adicionado tenant_id no WHERE de editarFornecedor');
}

// Correção 3: removerFornecedor - adicionar validação de tenant
const removerFuncStart = 'export async function removerFornecedor(req: Request, res: Response) {\n  try {\n    const { id } = req.params;\n\n    const result = await db.query(`\n      DELETE FROM fornecedores WHERE id = $1';
const removerFuncStartWithTenant = `export async function removerFornecedor(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    const result = await db.query(\`
      DELETE FROM fornecedores WHERE id = $1 AND tenant_id = $2`;

if (content.includes('export async function removerFornecedor') && !content.includes('removerFornecedor(req: Request, res: Response) {\n  try {\n    const { id } = req.params;\n\n    // Configurar contexto de tenant')) {
  // Substituir a função inteira
  const removerStart = content.indexOf('export async function removerFornecedor');
  const removerEnd = content.indexOf('}\n}', removerStart) + 3;
  
  const newRemoverFunc = `export async function removerFornecedor(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    // IMPORTANTE: Filtrar por tenant_id para segurança
    const result = await db.query(\`
      DELETE FROM fornecedores WHERE id = $1 AND tenant_id = $2
      RETURNING *
    \`, [id, req.tenant.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fornecedor não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Fornecedor removido com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao remover fornecedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}`;
  
  content = content.substring(0, removerStart) + newRemoverFunc + content.substring(removerEnd);
  console.log('✅ Corrigido removerFornecedor com validação de tenant');
}

// Salvar arquivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ Correções aplicadas com sucesso!');
console.log('📝 Arquivo atualizado: fornecedorController.ts\n');
