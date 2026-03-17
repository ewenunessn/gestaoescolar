/**
 * Script para aplicar middleware de permissões em todas as rotas
 * 
 * Este script atualiza automaticamente os arquivos de rotas para incluir
 * verificação de permissões baseada em módulos
 */

const fs = require('fs');
const path = require('path');

// Mapeamento de rotas para módulos e níveis de permissão
const ROTAS_MODULOS = {
  // Compras
  'modules/compras/routes/compraRoutes.ts': {
    modulo: 'compras',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Guias
  'modules/guias/routes/guiaRoutes.ts': {
    modulo: 'guias',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Produtos
  'modules/produtos/routes/produtoRoutes.ts': {
    modulo: 'produtos',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Contratos
  'modules/contratos/routes/contratoRoutes.ts': {
    modulo: 'contratos',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Fornecedores
  'modules/contratos/routes/fornecedorRoutes.ts': {
    modulo: 'fornecedores',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Escolas
  'modules/escolas/routes/escolaRoutes.ts': {
    modulo: 'escolas',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Cardápios
  'modules/cardapios/routes/cardapioRoutes.ts': {
    modulo: 'cardapios',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Refeições
  'modules/cardapios/routes/refeicaoRoutes.ts': {
    modulo: 'refeicoes',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Estoque Central
  'modules/estoque/routes/estoqueCentralRoutes.ts': {
    modulo: 'estoque',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Entregas
  'modules/entregas/routes/entregaRoutes.ts': {
    modulo: 'entregas',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Faturamentos
  'modules/faturamentos/routes/faturamentoRoutes.ts': {
    modulo: 'faturamentos',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Recebimentos
  'modules/recebimentos/routes/recebimentoRoutes.ts': {
    modulo: 'recebimentos',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // PNAE
  'routes/pnaeRoutes.ts': {
    modulo: 'pnae',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  },
  
  // Nutricionistas
  'routes/nutricionistaRoutes.ts': {
    modulo: 'nutricionistas',
    leitura: ['GET /'],
    escrita: ['POST /', 'PUT /', 'PATCH /', 'DELETE /']
  }
};

function aplicarPermissoesEmRota(caminhoArquivo, config) {
  const caminhoCompleto = path.join(__dirname, '..', 'src', caminhoArquivo);
  
  if (!fs.existsSync(caminhoCompleto)) {
    console.log(`⚠️  Arquivo não encontrado: ${caminhoArquivo}`);
    return false;
  }
  
  let conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
  
  // Verificar se já tem o import do middleware de permissões
  if (!conteudo.includes('permissionMiddleware')) {
    // Adicionar import após o import do authMiddleware
    const importAuth = "import { authenticateToken } from '../../../middleware/authMiddleware';";
    const importPermission = "import { requireLeitura, requireEscrita } from '../../../middleware/permissionMiddleware';";
    
    if (conteudo.includes(importAuth)) {
      conteudo = conteudo.replace(
        importAuth,
        `${importAuth}\n${importPermission}`
      );
    } else {
      // Se não tem authMiddleware, adicionar ambos no início
      const routerLine = "const router = Router();";
      conteudo = conteudo.replace(
        routerLine,
        `import { authenticateToken } from '../../../middleware/authMiddleware';\n${importPermission}\n\n${routerLine}`
      );
    }
  }
  
  // Aplicar middleware de leitura em rotas GET
  conteudo = conteudo.replace(
    /router\.get\('([^']+)',\s*([^,\)]+)\)/g,
    (match, rota, handler) => {
      // Não aplicar em rotas que já têm middleware
      if (match.includes('requireLeitura') || match.includes('requireEscrita')) {
        return match;
      }
      return `router.get('${rota}', requireLeitura('${config.modulo}'), ${handler})`;
    }
  );
  
  // Aplicar middleware de escrita em rotas POST, PUT, PATCH, DELETE
  ['post', 'put', 'patch', 'delete'].forEach(metodo => {
    const regex = new RegExp(`router\\.${metodo}\\('([^']+)',\\s*([^,\\)]+)\\)`, 'g');
    conteudo = conteudo.replace(regex, (match, rota, handler) => {
      // Não aplicar em rotas que já têm middleware
      if (match.includes('requireLeitura') || match.includes('requireEscrita')) {
        return match;
      }
      return `router.${metodo}('${rota}', requireEscrita('${config.modulo}'), ${handler})`;
    });
  });
  
  // Salvar arquivo
  fs.writeFileSync(caminhoCompleto, conteudo, 'utf8');
  console.log(`✅ Permissões aplicadas em: ${caminhoArquivo}`);
  return true;
}

// Executar
console.log('🔧 Aplicando middleware de permissões em todas as rotas...\n');

let sucesso = 0;
let falhas = 0;

Object.entries(ROTAS_MODULOS).forEach(([caminho, config]) => {
  if (aplicarPermissoesEmRota(caminho, config)) {
    sucesso++;
  } else {
    falhas++;
  }
});

console.log(`\n📊 Resultado:`);
console.log(`   ✅ Sucesso: ${sucesso}`);
console.log(`   ❌ Falhas: ${falhas}`);
console.log(`\n✨ Concluído!`);
