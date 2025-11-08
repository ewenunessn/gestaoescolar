const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function criarFuncao() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('🔧 Criando função set_tenant_context...\n');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
      RETURNS void AS $$
      BEGIN
        -- Define o tenant_id no contexto da sessão
        PERFORM set_config('app.current_tenant_id', tenant_uuid::text, false);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Função set_tenant_context criada com sucesso!');
    
    // Testar a função
    console.log('\n🧪 Testando a função...');
    await client.query(`SELECT set_tenant_context($1)`, ['00000000-0000-0000-0000-000000000000']);
    console.log('✅ Função testada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

criarFuncao();
