/**
 * Script para migrar controllers para o novo sistema de tratamento de erros
 */

const fs = require('fs');
const path = require('path');

const controllersToMigrate = [
  'backend/src/modules/pedidos/controllers/pedidoController.ts',
  'backend/src/modules/contratos/controllers/contratoController.ts',
  'backend/src/modules/cardapios/controllers/cardapioController.ts',
  'backend/src/modules/cardapios/controllers/refeicaoController.ts',
  'backend/src/modules/entregas/controllers/entregaController.ts',
  'backend/src/modules/estoque/controllers/estoqueController.ts',
  'backend/src/modules/faturamentos/controllers/faturamentoController.ts',
  'backend/src/modules/guias/controllers/guiaController.ts',
  'backend/src/modules/demandas/controllers/demandaController.ts',
  'backend/src/modules/recebimentos/controllers/recebimentoController.ts',
  'backend/src/modules/escolas/controllers/escolaController.ts'
];

function migrateController(filePath) {
  console.log(`\n📝 Migrando: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Adicionar imports se não existirem
  if (!content.includes('from "../../../utils/errorHandler"')) {
    const importStatement = `import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  BusinessError,
  ConflictError,
  validateRequired,
  handleDatabaseError
} from "../../../utils/errorHandler";`;

    // Adicionar após o import do database
    content = content.replace(
      /import db from ["']\.\.\/\.\.\/\.\.\/database["'];/,
      `import db from "../../../database";\n${importStatement}`
    );
    modified = true;
    console.log('✅ Imports adicionados');
  }

  // 2. Substituir async function por const com asyncHandler
  const functionPattern = /export async function (\w+)\(req: Request, res: Response\) \{[\s\S]*?^}/gm;
  const matches = content.match(functionPattern);
  
  if (matches) {
    matches.forEach(match => {
      const functionName = match.match(/export async function (\w+)/)[1];
      
      // Remover try/catch externo
      let newFunction = match
        .replace(/export async function (\w+)\(req: Request, res: Response\) \{\s*try \{/, 
                 `export const $1 = asyncHandler(async (req: Request, res: Response) => {`)
        .replace(/\} catch \(error[^)]*\) \{[\s\S]*?\}\s*\}$/, '});');

      // Substituir res.status(404) por throw new NotFoundError
      newFunction = newFunction.replace(
        /return res\.status\(404\)\.json\(\{[^}]*message:\s*["']([^"']+)["'][^}]*\}\);/g,
        'throw new NotFoundError(\'$1\');'
      );

      // Substituir res.status(400) por throw new ValidationError
      newFunction = newFunction.replace(
        /return res\.status\(400\)\.json\(\{[^}]*message:\s*["']([^"']+)["'][^}]*\}\);/g,
        'throw new ValidationError(\'$1\');'
      );

      // Substituir res.status(409) por throw new ConflictError
      newFunction = newFunction.replace(
        /return res\.status\(409\)\.json\(\{[^}]*message:\s*["']([^"']+)["'][^}]*\}\);/g,
        'throw new ConflictError(\'$1\');'
      );

      if (newFunction !== match) {
        content = content.replace(match, newFunction);
        modified = true;
        console.log(`✅ Função ${functionName} migrada`);
      }
    });
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Arquivo salvo: ${filePath}`);
  } else {
    console.log(`ℹ️  Nenhuma alteração necessária`);
  }
}

console.log('🚀 Iniciando migração de controllers...\n');

controllersToMigrate.forEach(controller => {
  try {
    migrateController(controller);
  } catch (error) {
    console.error(`❌ Erro ao migrar ${controller}:`, error.message);
  }
});

console.log('\n✅ Migração concluída!');
