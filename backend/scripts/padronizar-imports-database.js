/**
 * Script para padronizar imports do database.ts
 * Converte todos os require() para import ES6
 */

const fs = require('fs');
const path = require('path');

// Lista de arquivos para converter (baseado no grep)
const arquivos = [
  'src/utils/sistemaRobustoManager.ts',
  'src/utils/queryAnalyzer.ts',
  'src/utils/optimizedQueries.ts',
  'src/routes/monitoringRoutes.ts',
  'src/modules/usuarios/models/User.ts',
  'src/modules/usuarios/controllers/userController.ts',
  'src/modules/usuarios/controllers/debugLoginController.ts',
  'src/modules/produtos/models/Produto.ts',
  'src/modules/produtos/controllers/produtoController.ts',
  'src/modules/pedidos/services/FaturamentoService.ts',
  'src/modules/pedidos/controllers/pedidoController.ts',
  'src/modules/pedidos/controllers/faturamentoController.ts',
  'src/modules/guias/models/Guia.ts',
  'src/modules/guias/models/EscolaModalidade.ts',
  'src/modules/guias/controllers/escolaModalidadeController.ts',
  'src/modules/estoque/models/ProdutoComposicaoNutricional.ts',
  'src/modules/estoque/models/Produto.ts',
  'src/modules/estoque/controllers/produtoModalidadeController.ts',
  'src/modules/estoque/controllers/demandaController.ts',
  'src/modules/escolas/controllers/escolaController.ts',
  'src/modules/entregas/models/Rota.ts',
  'src/modules/entregas/controllers/userController.ts',
  'src/modules/demandas/models/demandaModel.ts',
  'src/modules/contratos/models/Fornecedor.ts',
  'src/modules/contratos/controllers/saldoContratosModalidadesController.ts',
  'src/modules/contratos/controllers/fornecedorController.ts',
  'src/modules/contratos/controllers/contratoProdutoController.ts',
  'src/modules/contratos/controllers/contratoController.ts',
  'src/modules/cardapios/models/RefeicaoProduto.ts',
  'src/modules/cardapios/models/Modalidade.ts',
  'src/modules/cardapios/models/Cardapio.ts',
  'src/modules/cardapios/controllers/refeicaoController.ts',
  'src/modules/cardapios/controllers/modalidadeController.ts',
  'src/controllers/permissoesController.ts',
  'src/controllers/deleteController.ts',
  'src/controllers/adminDataController.ts',
];

let totalConvertidos = 0;
let totalErros = 0;

console.log('🔄 Iniciando padronização de imports...\n');

arquivos.forEach(arquivo => {
  const caminhoCompleto = path.join(__dirname, '..', arquivo);
  
  try {
    if (!fs.existsSync(caminhoCompleto)) {
      console.log(`⚠️  Arquivo não encontrado: ${arquivo}`);
      return;
    }

    let conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
    let modificado = false;

    // Padrão 1: const db = require("../../../database");
    if (conteudo.includes('const db = require("../../../database")')) {
      conteudo = conteudo.replace(
        /const db = require\("\.\.\/\.\.\/\.\.\/database"\);?/g,
        'import db from "../../../database";'
      );
      modificado = true;
    }

    // Padrão 2: const db = require('../../../database');
    if (conteudo.includes("const db = require('../../../database')")) {
      conteudo = conteudo.replace(
        /const db = require\('\.\.\/\.\.\/\.\.\/database'\);?/g,
        'import db from "../../../database";'
      );
      modificado = true;
    }

    // Padrão 3: const db = require("../database");
    if (conteudo.includes('const db = require("../database")')) {
      conteudo = conteudo.replace(
        /const db = require\("\.\.\/database"\);?/g,
        'import db from "../database";'
      );
      modificado = true;
    }

    // Padrão 4: const db = require('../database');
    if (conteudo.includes("const db = require('../database')")) {
      conteudo = conteudo.replace(
        /const db = require\('\.\.\/database'\);?/g,
        'import db from "../database";'
      );
      modificado = true;
    }

    // Padrão 5: const db = require('../../database');
    if (conteudo.includes("const db = require('../../database')")) {
      conteudo = conteudo.replace(
        /const db = require\('\.\.\/\.\.\/database'\);?/g,
        'import db from "../../database";'
      );
      modificado = true;
    }

    // Casos especiais inline (dentro de funções)
    // Padrão: const db = require("../../../database");
    conteudo = conteudo.replace(
      /(\s+)const db = require\("\.\.\/\.\.\/\.\.\/database"\);?/g,
      '$1const db = (await import("../../../database")).default;'
    );

    if (modificado) {
      fs.writeFileSync(caminhoCompleto, conteudo, 'utf8');
      console.log(`✅ ${arquivo}`);
      totalConvertidos++;
    } else {
      console.log(`⏭️  ${arquivo} (já estava correto ou não precisa mudança)`);
    }

  } catch (erro) {
    console.error(`❌ Erro em ${arquivo}:`, erro.message);
    totalErros++;
  }
});

console.log(`\n📊 Resumo:`);
console.log(`   ✅ Convertidos: ${totalConvertidos}`);
console.log(`   ❌ Erros: ${totalErros}`);
console.log(`   📁 Total processados: ${arquivos.length}`);

if (totalConvertidos > 0) {
  console.log(`\n✨ Padronização concluída! Todos os imports agora usam ES6.`);
  console.log(`\n⚠️  IMPORTANTE: Teste o backend após essa mudança:`);
  console.log(`   cd backend`);
  console.log(`   npm run dev`);
}
