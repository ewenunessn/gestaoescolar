const fs = require('fs');
const path = require('path');

// Lista de controllers que sabemos que estão quebrados
const brokenControllers = [
  'src/modules/contratos/controllers/contratoController.ts',
  'src/modules/produtos/controllers/produtoController.ts',
  'src/modules/cardapios/controllers/modalidadeController.ts',
  'src/modules/cardapios/controllers/refeicaoController.ts',
  'src/modules/cardapios/controllers/cardapioController.ts',
  'src/modules/pedidos/controllers/pedidoController.ts'
];

function fixBrokenControllers() {
  console.log('🔧 Corrigindo controllers quebrados...');
  
  brokenControllers.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return;
    }
    
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;
      
      // Remover blocos de código quebrados comuns
      content = content.replace(/\s*\);\s*\}\s*\n\s*\n/g, '\n  }\n\n');
      content = content.replace(/\s*\);\s*\n\s*\}\s*\n/g, '\n  }\n');
      
      // Remover linhas órfãs com apenas ); }
      content = content.replace(/^\s*\);\s*$/gm, '');
      content = content.replace(/^\s*\}\s*$/gm, '');
      
      // Remover imports duplicados no meio do arquivo
      const lines = content.split('\n');
      const cleanedLines = [];
      let inFunction = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detectar início de função
        if (line.includes('export async function') || line.includes('export function')) {
          inFunction = true;
        }
        
        // Pular imports no meio do arquivo (depois de funções começarem)
        if (inFunction && (line.includes('import {') || line.includes('const db = require'))) {
          // Pular esta linha e possíveis linhas relacionadas
          while (i < lines.length && (lines[i].includes('import') || lines[i].includes('from ') || lines[i].includes('const db'))) {
            i++;
          }
          i--; // Voltar uma linha para não pular a próxima linha válida
          continue;
        }
        
        cleanedLines.push(line);
      }
      
      content = cleanedLines.join('\n');
      
      // Limpar linhas vazias extras
      content = content.replace(/\n\n\n+/g, '\n\n');
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Corrigido: ${filePath}`);
      } else {
        console.log(`⚪ Sem alterações: ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    }
  });
  
  console.log('✅ Correção de controllers quebrados concluída!');
}

fixBrokenControllers();