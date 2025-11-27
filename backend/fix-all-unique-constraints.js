const { Pool } = require('pg');
require('dotenv').config();

let pool;
if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const isLocalDatabase = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  
  pool = new Pool({
    connectionString,
    ssl: isLocalDatabase ? false : { rejectUnauthorized: false }
  });
} else {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alimentacao_escolar',
    password: process.env.DB_PASSWORD || 'admin123',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: false
  });
}

// Lista de correções a fazer
const corrections = [
  // Produtos
  {
    table: 'produtos',
    oldConstraint: 'produtos_nome_unique',
    newConstraint: 'produtos_nome_tenant_key',
    columns: '(nome, tenant_id)'
  },
  // Fornecedores
  {
    table: 'fornecedores',
    oldConstraint: 'fornecedores_cnpj_key',
    newConstraint: 'fornecedores_cnpj_tenant_key',
    columns: '(cnpj, tenant_id)'
  },
  // Usuários
  {
    table: 'usuarios',
    oldConstraint: 'usuarios_email_key',
    newConstraint: 'usuarios_email_tenant_key',
    columns: '(email, tenant_id)'
  },
  // Contratos
  {
    table: 'contratos',
    oldConstraint: 'contratos_numero_key',
    newConstraint: 'contratos_numero_tenant_key',
    columns: '(numero, tenant_id)'
  },
  // Pedidos
  {
    table: 'pedidos',
    oldConstraint: 'pedidos_numero_key',
    newConstraint: 'pedidos_numero_tenant_key',
    columns: '(numero, tenant_id)'
  },
  // Faturamentos
  {
    table: 'faturamentos',
    oldConstraint: 'faturamentos_numero_key',
    newConstraint: 'faturamentos_numero_tenant_key',
    columns: '(numero, tenant_id)'
  }
];

async function fixAllConstraints() {
  try {
    console.log('🚀 Corrigindo constraints de unicidade em múltiplas tabelas...\n');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const correction of corrections) {
      console.log(`\n📦 Tabela: ${correction.table}`);
      console.log(`   Constraint antiga: ${correction.oldConstraint}`);
      console.log(`   Constraint nova: ${correction.newConstraint}`);
      
      try {
        // 1. Remover constraint antiga
        await pool.query(`
          ALTER TABLE ${correction.table} 
          DROP CONSTRAINT IF EXISTS ${correction.oldConstraint};
        `);
        
        // 2. Remover índice antigo (se existir)
        await pool.query(`DROP INDEX IF EXISTS ${correction.oldConstraint};`);
        
        // 3. Adicionar nova constraint
        await pool.query(`
          ALTER TABLE ${correction.table} 
          ADD CONSTRAINT ${correction.newConstraint} 
          UNIQUE ${correction.columns};
        `);
        
        console.log(`   ✅ Corrigido com sucesso`);
        successCount++;
        
      } catch (error) {
        if (error.message.includes('já existe')) {
          console.log(`   ⚠️ Constraint já existe (pulando)`);
          skipCount++;
        } else {
          console.log(`   ❌ Erro: ${error.message}`);
          errorCount++;
        }
      }
    }
    
    console.log('\n\n📊 RESUMO:');
    console.log(`   ✅ Corrigidos: ${successCount}`);
    console.log(`   ⚠️ Pulados: ${skipCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📋 Total: ${corrections.length}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await pool.end();
  }
}

fixAllConstraints();
