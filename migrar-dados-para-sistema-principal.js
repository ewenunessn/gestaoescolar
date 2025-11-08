const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const SISTEMA_PRINCIPAL_ID = '00000000-0000-0000-0000-000000000000';

async function migrarDados() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('🔄 Migrando todos os dados para o tenant Sistema Principal...\n');
    
    // Tabelas que têm tenant_id
    const tabelas = [
      'escolas',
      'produtos',
      'contratos',
      'entregas',
      'estoque',
      'pedidos',
      'usuarios'
    ];
    
    for (const tabela of tabelas) {
      try {
        // Verificar se a tabela tem a coluna tenant_id
        const colunas = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'tenant_id'
        `, [tabela]);
        
        if (colunas.rows.length === 0) {
          console.log(`⏭️  ${tabela}: não tem coluna tenant_id, pulando...`);
          continue;
        }
        
        // Contar registros sem tenant_id
        const semTenant = await client.query(`
          SELECT COUNT(*) as count FROM ${tabela} WHERE tenant_id IS NULL
        `);
        
        const countSemTenant = parseInt(semTenant.rows[0].count);
        
        if (countSemTenant > 0) {
          // Atualizar registros sem tenant_id
          await client.query(`
            UPDATE ${tabela} 
            SET tenant_id = $1 
            WHERE tenant_id IS NULL
          `, [SISTEMA_PRINCIPAL_ID]);
          
          console.log(`✅ ${tabela}: ${countSemTenant} registros atualizados`);
        } else {
          console.log(`✓  ${tabela}: todos os registros já têm tenant_id`);
        }
        
        // Mostrar total de registros do Sistema Principal
        const total = await client.query(`
          SELECT COUNT(*) as count FROM ${tabela} WHERE tenant_id = $1
        `, [SISTEMA_PRINCIPAL_ID]);
        
        console.log(`   Total no Sistema Principal: ${total.rows[0].count}`);
        
      } catch (error) {
        console.log(`❌ ${tabela}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Migração concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

migrarDados();
