const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const SISTEMA_PRINCIPAL_ID = '00000000-0000-0000-0000-000000000000';
const ESCOLA_PADRAO_ID = '00000000-0000-0000-0000-000000000001';

async function migrarTudo() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('🔄 Migrando TODOS os dados do tenant "Escola Padrão" para "Sistema Principal"...\n');
    
    // Buscar todas as tabelas com tenant_id
    const tabelas = await client.query(`
      SELECT DISTINCT table_name
      FROM information_schema.columns
      WHERE column_name = 'tenant_id'
      AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`📋 Encontradas ${tabelas.rows.length} tabelas com tenant_id\n`);
    
    for (const row of tabelas.rows) {
      const tabela = row.table_name;
      
      try {
        // Contar registros antes
        const antes = await client.query(`
          SELECT COUNT(*) as count FROM ${tabela} WHERE tenant_id = $1
        `, [ESCOLA_PADRAO_ID]);
        
        const countAntes = parseInt(antes.rows[0].count);
        
        if (countAntes > 0) {
          // Migrar
          const result = await client.query(`
            UPDATE ${tabela} 
            SET tenant_id = $1 
            WHERE tenant_id = $2
          `, [SISTEMA_PRINCIPAL_ID, ESCOLA_PADRAO_ID]);
          
          console.log(`✅ ${tabela.padEnd(35)} - ${result.rowCount} registros migrados`);
        } else {
          console.log(`   ${tabela.padEnd(35)} - sem dados para migrar`);
        }
        
      } catch (error) {
        console.log(`❌ ${tabela.padEnd(35)} - erro: ${error.message}`);
      }
    }
    
    console.log('\n✅ Migração concluída!');
    
    // Resumo final
    console.log('\n📊 Resumo final no Sistema Principal:');
    
    const resumo = [
      'escolas',
      'produtos',
      'contratos',
      'fornecedores',
      'usuarios',
      'pedidos'
    ];
    
    for (const tabela of resumo) {
      try {
        const count = await client.query(`
          SELECT COUNT(*) as count FROM ${tabela} WHERE tenant_id = $1
        `, [SISTEMA_PRINCIPAL_ID]);
        
        console.log(`   ${tabela.padEnd(20)} - ${count.rows[0].count} registros`);
      } catch (error) {
        // Tabela pode não existir
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

migrarTudo();
