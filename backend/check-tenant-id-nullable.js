const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function checkNullable() {
  console.log('🔍 Verificando se tenant_id pode ser NULL...\n');
  
  try {
    const result = await neonPool.query(`
      SELECT 
        column_name,
        is_nullable,
        column_default,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
        AND column_name IN ('tenant_id', 'institution_id')
    `);
    
    console.log('Colunas da tabela usuarios:');
    result.rows.forEach(row => {
      console.log(`\n${row.column_name}:`);
      console.log(`  Tipo: ${row.data_type}`);
      console.log(`  Nullable: ${row.is_nullable}`);
      console.log(`  Default: ${row.column_default || 'nenhum'}`);
    });
    
    // Testar inserção sem tenant_id
    console.log('\n\n🧪 Testando inserção sem tenant_id...');
    const institutionId = 'c1c7aabd-7f03-43ab-8d6d-ff003ea9005f';
    
    try {
      await neonPool.query('BEGIN');
      
      const testResult = await neonPool.query(`
        INSERT INTO usuarios (
          nome, email, senha, tipo, ativo, institution_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'Teste Sem Tenant',
        `teste-sem-tenant-${Date.now()}@example.com`,
        '$2a$08$test',
        'usuario',
        true,
        institutionId
      ]);
      
      console.log('✅ SUCESSO! Usuário criado sem tenant_id:', testResult.rows[0].id);
      
      await neonPool.query('ROLLBACK');
      console.log('🔄 Transação revertida (teste)');
      
    } catch (error) {
      await neonPool.query('ROLLBACK');
      console.log('❌ ERRO ao criar usuário sem tenant_id:');
      console.log('   Código:', error.code);
      console.log('   Mensagem:', error.message);
      console.log('   Detalhe:', error.detail);
      
      if (error.code === '23503') {
        console.log('\n🎯 CONFIRMADO: Erro 23503 - Foreign key violation');
        console.log('   A coluna tenant_id provavelmente não aceita NULL');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await neonPool.end();
  }
}

checkNullable();
