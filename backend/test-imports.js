// Testar importações do módulo usuários
const fs = require('fs');
const path = require('path');

// Testar se os arquivos existem
const controllerPath = './src/modules/usuarios/controllers/userController.js';
const routesPath = './src/modules/usuarios/routes/userRoutes.js';

console.log('Verificando arquivos...');
console.log('Controller existe:', fs.existsSync(controllerPath));
console.log('Routes existe:', fs.existsSync(routesPath));

// Se os arquivos TypeScript existem
console.log('Controller TS existe:', fs.existsSync('./src/modules/usuarios/controllers/userController.ts'));
console.log('Routes TS existe:', fs.existsSync('./src/modules/usuarios/routes/userRoutes.ts'));

// Verificar exports do controller
try {
  if (fs.existsSync(controllerPath)) {
    const controller = require(controllerPath);
    console.log('Exports do controller:', Object.keys(controller));
  } else {
    console.log('Arquivo JS não encontrado, verificando TS...');
  }
} catch (error) {
  console.error('Erro ao importar controller:', error.message);
}