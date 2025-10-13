const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações do banco de dados
const config = {
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'postgres'
};

// Criar diretório de backup se não existir
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Gerar nome do arquivo com data e hora
const now = new Date();
const dateStr = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
const backupFile = `backup-alimentacao-escolar-${dateStr}.sql`;
const backupPath = path.join(backupDir, backupFile);

console.log('🔄 Iniciando backup do banco de dados...');
console.log(`📁 Banco: ${config.database}`);
console.log(`📄 Arquivo: ${backupFile}`);

// Comando pg_dump para backup completo
const pgDumpCommand = `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f "${backupPath}" --clean --create --inserts --column-inserts --verbose`;

// Executar comando com variáveis de ambiente
const env = { ...process.env, PGPASSWORD: config.password };

exec(pgDumpCommand, { env }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Erro ao criar backup:');
    console.error(error.message);
    if (stderr) console.error('Stderr:', stderr);
    process.exit(1);
  }

  console.log('✅ Backup concluído com sucesso!');
  console.log(`📍 Arquivo: ${backupPath}`);

  // Verificar tamanho do arquivo
  try {
    const stats = fs.statSync(backupPath);
    const fileSizeInBytes = stats.size;
    const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2);
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

    console.log(`📊 Tamanho: ${fileSizeInMB} MB (${fileSizeInKB} KB)`);

    // Listar arquivos de backup existentes
    console.log('\n📋 Backups existentes:');
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-alimentacao-escolar-'))
      .sort()
      .reverse()
      .slice(0, 5); // Mostrar apenas os 5 mais recentes

    backupFiles.forEach(file => {
      const filePath = path.join(backupDir, file);
      const fileStats = fs.statSync(filePath);
      const fileDate = fileStats.mtime.toLocaleString('pt-BR');
      const fileSize = (fileStats.size / (1024 * 1024)).toFixed(2);
      console.log(`   📄 ${file} (${fileSize} MB) - ${fileDate}`);
    });

  } catch (err) {
    console.warn('⚠️  Não foi possível verificar o tamanho do arquivo');
  }

  console.log('\n💡 Para restaurar este backup em outro computador:');
  console.log(`   psql -h localhost -U postgres -d postgres -f "${backupPath}"`);

});

// Script adicional para criar backup com dados de exemplo
function criarBackupExemplo() {
  console.log('\n🔄 Criando backup com dados de exemplo...');

  const exemploFile = `backup-exemplo-${dateStr}.sql`;
  const exemploPath = path.join(backupDir, exemploFile);

  // Backup apenas da estrutura e dados essenciais (sem dados sensíveis)
  const pgDumpExemplo = `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f "${exemploPath}" --data-only --table=fornecedores --table=produtos --table=contratos --table=contrato_produtos --table=movimentacoes_consumo_contrato --table=view_saldo_contratos_itens`;

  exec(pgDumpExemplo, { env }, (error) => {
    if (!error) {
      console.log(`✅ Backup de exemplo criado: ${exemploPath}`);
    }
  });
}

// Descomente a linha abaixo se quiser criar um backup de exemplo também
// criarBackupExemplo();