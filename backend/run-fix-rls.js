/**
 * Script para corrigir políticas RLS
 * Execute com: node run-fix-rls.js
 */

const fs = require('fs');
const path = require('path');

// Importar configuração do banco baseada no ambiente
const db = process.env.VERCEL === '1' ? require("./dist/database-vercel") : require("./dist/database");

async function runFixRLS() {
  try {
    console.log('🚀 Corrigindo políticas RLS...');
    
    // Testar conexão
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Falha na conexão com o banco de dados');
    }
    
    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', '004_fix_rls_policies.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executando migração: 004_fix_rls_policies.sql');
    
    // Executar migração
    console.log('  Executando correção de políticas RLS...');
    await db.query(migrationSQL);
    
    console.log('✅ Correção executada com sucesso!');
    
    // Verificar status do RLS
    const rlsStatusResult = await db.query(`SELECT * FROM rls_status ORDER BY tablename`);
    
    console.log('📊 Status do Row Level Security:');
    rlsStatusResult.rows.forEach(row => {
      const status = row.rls_enabled ? '✅ Ativo' : '❌ Inativo';
      console.log(`  ${row.tablename}: ${status} (${row.policy_count} políticas)`);
    });
    
    // Testar contexto de tenant
    console.log('🧪 Testando contexto de tenant...');
    
    try {
      const contextTest = await db.query(`SELECT get_current_tenant_id() as current_tenant`);
      console.log(`  Tenant atual: ${contextTest.rows[0].current_tenant}`);
      
      const schoolsTest = await db.query(`SELECT COUNT(*) as total FROM escolas`);
      console.log(`  Escolas visíveis com RLS: ${schoolsTest.rows[0].total}`);
      
    } catch (error) {
      console.log(`  ⚠️  Erro no teste: ${error.message}`);
    }
    
    console.log('\n🎉 RLS configurado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
    console.error('\nDetalhes do erro:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Fechar conexão
    if (db.pool) {
      await db.pool.end();
    }
    process.exit(0);
  }
}

// Executar correção
runFixRLS();