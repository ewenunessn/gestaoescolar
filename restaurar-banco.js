const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações do banco de dados de destino
const config = {
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'postgres'
};

console.log('🔄 Script de Restauração do Banco de Dados');
console.log('==========================================');

// Verificar se foi fornecido o arquivo de backup
const backupFile = process.argv[2];

if (!backupFile) {
  console.log('❌ Por favor, forneça o arquivo de backup como parâmetro.');
  console.log('💡 Uso: node restaurar-banco.js <arquivo-backup.sql>');
  console.log('   Exemplo: node restaurar-banco.js backups\\backup-alimentacao-escolar-2025-09-21_02-30-45.sql');
  
  // Listar backups disponíveis
  const backupDir = path.join(__dirname, 'backups');
  if (fs.existsSync(backupDir)) {
    console.log('\n📋 Backups disponíveis:');
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-alimentacao-escolar-'))
      .sort()
      .reverse()
      .slice(0, 10);
    
    if (backupFiles.length > 0) {
      backupFiles.forEach(file => {
        const filePath = path.join(backupDir, file);
        const fileStats = fs.statSync(filePath);
        const fileDate = fileStats.mtime.toLocaleString('pt-BR');
        const fileSize = (fileStats.size / (1024 * 1024)).toFixed(2);
        console.log(`   📄 ${file} (${fileSize} MB) - ${fileDate}`);
      });
    } else {
      console.log('   Nenhum backup encontrado na pasta backups/');
    }
  }
  
  process.exit(1);
}

// Verificar se o arquivo existe
const backupPath = path.resolve(backupFile);
if (!fs.existsSync(backupPath)) {
  console.log(`❌ Arquivo não encontrado: ${backupPath}`);
  process.exit(1);
}

console.log(`📁 Arquivo de backup: ${backupPath}`);
console.log(`📊 Tamanho: ${(fs.statSync(backupPath).size / (1024 * 1024)).toFixed(2)} MB`);

// Função para executar comando SQL
function executarComando(sql, descricao) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 ${descricao}...`);
    
    const command = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d postgres -c "${sql}"`;
    const env = { ...process.env, PGPASSWORD: config.password };
    
    exec(command, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erro: ${error.message}`);
        if (stderr) console.error(`Stderr: ${stderr}`);
        reject(error);
      } else {
        console.log(`✅ ${descricao} concluído`);
        resolve(stdout);
      }
    });
  });
}

// Processo de restauração assíncrono
async function restaurarBanco() {
  try {
    console.log('\n🔄 Iniciando processo de restauração...');
    
    // 1. Terminar conexões existentes
    await executarComando(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${config.database}' AND pid <> pg_backend_pid();`,
      'Terminando conexões existentes'
    );
    
    // 2. Dropar banco se existir
    await executarComando(
      `DROP DATABASE IF EXISTS ${config.database};`,
      'Removendo banco existente'
    );
    
    // 3. Criar novo banco
    await executarComando(
      `CREATE DATABASE ${config.database};`,
      'Criando novo banco de dados'
    );
    
    // 4. Restaurar backup
    console.log('\n🔄 Restaurando dados do backup...');
    
    const restoreCommand = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f "${backupPath}"`;
    const env = { ...process.env, PGPASSWORD: config.password };
    
    exec(restoreCommand, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erro ao restaurar backup:');
        console.error(error.message);
        if (stderr) console.error('Stderr:', stderr);
        process.exit(1);
      }
      
      console.log('✅ Restauração concluída com sucesso!');
      console.log('\n🎉 Banco de dados restaurado e pronto para uso!');
      console.log(`📍 Banco: ${config.database}`);
      console.log(`👤 Usuário: ${config.user}`);
      console.log(`🔗 Host: ${config.host}:${config.port}`);
      
      // Verificar se a restauração foi bem-sucedida
      console.log('\n🔍 Verificando restauração...');
      const verifyCommand = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -c "SELECT COUNT(*) as total_tabelas FROM information_schema.tables WHERE table_schema = 'public';"`;
      
      exec(verifyCommand, { env }, (error, stdout) => {
        if (!error && stdout) {
          console.log(`📊 Tabelas restauradas: ${stdout.trim()}`);
        }
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Erro durante a restauração:', error);
    process.exit(1);
  }
}

// Iniciar restauração
restaurarBanco();