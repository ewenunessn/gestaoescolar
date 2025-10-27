const { Client } = require('pg');

async function testConfig() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco Neon');

    // Verificar estrutura da tabela
    console.log('\n📋 Estrutura da tabela:');
    const estrutura = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'configuracoes_sistema'
      ORDER BY ordinal_position
    `);
    console.table(estrutura.rows);

    // Verificar configurações existentes
    console.log('\n📊 Configurações existentes:');
    const configs = await client.query('SELECT * FROM configuracoes_sistema');
    console.table(configs.rows);

    // Testar inserção da configuração que está falhando
    console.log('\n🧪 Testando inserção de modulo_saldo_contratos...');
    try {
      const testConfig = {
        chave: 'modulo_saldo_contratos',
        valor: JSON.stringify({ modulo_principal: 'modalidades', mostrar_ambos: true }),
        descricao: 'Configuração do módulo principal de saldo de contratos',
        tipo: 'json',
        categoria: 'sistema'
      };

      const result = await client.query(`
        INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (chave) 
        DO UPDATE SET 
          valor = EXCLUDED.valor,
          descricao = COALESCE(EXCLUDED.descricao, configuracoes_sistema.descricao),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [testConfig.chave, testConfig.valor, testConfig.descricao, testConfig.tipo, testConfig.categoria]);

      console.log('✅ Inserção bem-sucedida:', result.rows[0]);
    } catch (err) {
      console.error('❌ Erro na inserção:', err.message);
      console.error('Detalhes:', err);
    }

    // Verificar novamente as configurações
    console.log('\n📊 Configurações após teste:');
    const configsApos = await client.query('SELECT * FROM configuracoes_sistema');
    console.table(configsApos.rows);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

testConfig();
