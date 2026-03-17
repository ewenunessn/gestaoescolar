/**
 * Script para aplicar permissões em TODAS as rotas principais
 * Executa: node backend/scripts/aplicar-permissoes-todas-rotas.js
 */

const fs = require('fs');
const path = require('path');

// Mapeamento de arquivos de rotas para módulos
const ROTAS_PARA_APLICAR = [
  // Produtos
  {
    arquivo: 'modules/produtos/routes/produtoRoutes.ts',
    modulo: 'produtos',
    importPath: '../../../middleware'
  },
  
  // Contratos
  {
    arquivo: 'modules/contratos/routes/contratoRoutes.ts',
    modulo: 'contratos',
    importPath: '../../../middleware'
  },
  
  // Fornecedores
  {
    arquivo: 'modules/contratos/routes/fornecedorRoutes.ts',
    modulo: 'fornecedores',
    importPath: '../../../middleware'
  },
  
  // Escolas
  {
    arquivo: 'modules/escolas/routes/escolaRoutes.ts',
    modulo: 'escolas',
    importPath: '../../../middleware'
  },
  
  // Cardápios
  {
    arquivo: 'modules/cardapios/routes/cardapioRoutes.ts',
    modulo: 'cardapios',
    importPath: '../../../middleware'
  },
  
  // Refeições
  {
    arquivo: 'modules/cardapios/routes/refeicaoRoutes.ts',
    modulo: 'refeicoes',
    importPath: '../../../middleware'
  },
  
  // Estoque Central
  {
    arquivo: 'modules/estoque/routes/estoqueCentralRoutes.ts',
    modulo: 'estoque',
    importPath: '../../../middleware'
  },
  
  // Entregas
  {
    arquivo: 'modules/entregas/routes/entregaRoutes.ts',
    modulo: 'entregas',
    importPath: '../../../middleware'
  },
  
  // Faturamentos
  {
    arquivo: 'modules/faturamentos/routes/faturamentoRoutes.ts',
    modulo: 'faturamentos',
    importPath: '../../../middleware'
  },
  
  // Recebimentos
  {
    arquivo: 'modules/recebimentos/routes/recebimentoRoutes.ts',
    modulo: 'recebimentos',
    importPath: '../../../middleware'
  },
  
  // PNAE
  {
    arquivo: 'routes/pnaeRoutes.ts',
    modulo: 'pnae',
    importPath: '../middleware'
  },
  
  // Nutricionistas
  {
    arquivo: 'routes/nutricionistaRoutes.ts',
    modulo: 'nutricionistas',
    importPath: '../middleware'
  }
];

function aplicarPermissoes(config) {
  const caminhoCompleto = path.join(__dirname, '..', 'src', config.arquivo);
  
  if (!fs.existsSync(caminhoCompleto)) {
    console.log(`⚠️  Arquivo não encontrado: ${config.arquivo}`);
    return false;
  }
  
  let conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
  
  // Verificar se já tem permissões aplicadas
  if (conteudo.includes('requireLeitura') || conteudo.includes('requireEscrita')) {
    console.log(`ℹ️  Permissões já aplicadas: ${config.arquivo}`);
    return true;
  }
  
  // Adicionar imports se não existirem
  if (!conteudo.includes('permissionMiddleware')) {
    const importAuth = `import { authenticateToken } from '${config.importPath}/authMiddleware';`;
    const importPermission = `import { requireLeitura, requireEscrita } from '${config.importPath}/permissionMiddleware';`;
    
    if (conteudo.includes(importAuth)) {
      conteudo = conteudo.replace(
        importAuth,
        `${importAuth}\n${importPermission}`
      );
    } else {
      // Adicionar após outros imports
      const linhasImport = conteudo.split('\n').findIndex(l => l.includes('import'));
      if (linhasImport >= 0) {
        const linhas = conteudo.split('\n');
        linhas.splice(linhasImport + 1, 0, importAuth);
        linhas.splice(linhasImport + 2, 0, importPermission);
        conteudo = linhas.join('\n');
      }
    }
  }
  
  // Aplicar middleware em rotas GET (leitura)
  conteudo = conteudo.replace(
    /router\.get\(\s*['"]([^'"]+)['"]\s*,\s*(?!requireLeitura|requireEscrita)([^,\)]+)\)/g,
    (match, rota, handler) => {
      // Ignorar rotas de teste e health
      if (rota.includes('test') || rota.includes('health')) {
        return match;
      }
      return `router.get('${rota}', requireLeitura('${config.modulo}'), ${handler})`;
    }
  );
  
  // Aplicar middleware em rotas POST, PUT, PATCH, DELETE (escrita)
  ['post', 'put', 'patch', 'delete'].forEach(metodo => {
    const regex = new RegExp(
      `router\\.${metodo}\\(\\s*['"]([^'"]+)['"]\\s*,\\s*(?!requireLeitura|requireEscrita)([^,\\)]+)\\)`,
      'g'
    );
    conteudo = conteudo.replace(regex, (match, rota, handler) => {
      return `router.${metodo}('${rota}', requireEscrita('${config.modulo}'), ${handler})`;
    });
  });
  
  // Salvar arquivo
  fs.writeFileSync(caminhoCompleto, conteudo, 'utf8');
  console.log(`✅ Permissões aplicadas: ${config.arquivo}`);
  return true;
}

// Executar
console.log('🔧 Aplicando permissões em todas as rotas...\n');

let sucesso = 0;
let falhas = 0;
let jaAplicado = 0;

ROTAS_PARA_APLICAR.forEach(config => {
  const resultado = aplicarPermissoes(config);
  if (resultado === true) {
    if (fs.readFileSync(path.join(__dirname, '..', 'src', config.arquivo), 'utf8').includes('requireLeitura')) {
      sucesso++;
    } else {
      jaAplicado++;
    }
  } else {
    falhas++;
  }
});

console.log(`\n📊 Resultado:`);
console.log(`   ✅ Aplicado com sucesso: ${sucesso}`);
console.log(`   ℹ️  Já estava aplicado: ${jaAplicado}`);
console.log(`   ❌ Falhas: ${falhas}`);
console.log(`\n✨ Concluído! Reinicie o backend para aplicar as mudanças.`);
