const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function fixConfiguracoes() {
  try {
    await client.connect();
    console.log('✅ Conectado ao Neon\n');
    
    // 1. Verificar estrutura
    console.log('🔍 Verificando estrutura da tabela configuracoes_sistema...');
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'configuracoes_sistema'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas:');
    columns.rows.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    console.log('');
    
    // 2. Buscar tenant padrão
    console.log('🔍 Buscando tenant padrão...');
    const tenant = await client.query(`
      SELECT id, name FROM tenants ORDER BY created_at LIMIT 1
    `);
    
    if (tenant.rows.length === 0) {
      console.error('❌ Nenhum tenant encontrado!');
      return;
    }
    
    const tenantId = tenant.rows[0].id;
    const tenantName = tenant.rows[0].name;
    console.log(`✅ Tenant: ${tenantName} (${tenantId})\n`);
    
    // 3. Verificar registros existentes
    console.log('🔍 Verificando registros existentes...');
    const existing = await client.query(`
      SELECT chave, valor, tenant_id
      FROM configuracoes_sistema
      ORDER BY chave
    `);
    
    console.log(`Total de registros: ${existing.rows.length}`);
    if (existing.rows.length > 0) {
      console.log('Registros:');
      existing.rows.forEach(r => {
        console.log(`  - ${r.chave}: ${r.valor} (tenant: ${r.tenant_id || 'NULL'})`);
      });
    }
    console.log('');
    
    // 4. Atualizar registros sem tenant_id
    console.log('🔄 Atualizando registros sem tenant_id...');
    const updateResult = await client.query(`
      UPDATE configuracoes_sistema
      SET tenant_id = $1
      WHERE tenant_id IS NULL
    `, [tenantId]);
    
    console.log(`✅ ${updateResult.rowCount} registros atualizados\n`);
    
    // 5. Criar configuração do módulo de saldo se não existir
    console.log('🔄 Verificando configuração modulo_saldo_contratos...');
    const configExists = await client.query(`
      SELECT * FROM configuracoes_sistema
      WHERE chave = 'modulo_saldo_contratos'
        AND tenant_id = $1
    `, [tenantId]);
    
    if (configExists.rows.length === 0) {
      console.log('❌ Configuração não existe. Criando...');
      await client.query(`
        INSERT INTO configuracoes_sistema (chave, valor, descricao, tenant_id)
        VALUES (
          'modulo_saldo_contratos',
          '{"modulo_principal":"modalidades","mostrar_ambos":false}',
          'Configuração do módulo de saldo de contratos',
          $1
        )
      `, [tenantId]);
      console.log('✅ Configuração criada\n');
    } else {
      console.log('✅ Configuração já existe\n');
    }
    
    // 6. Verificar resultado final
    console.log('📊 Resultado final:');
    const final = await client.query(`
      SELECT chave, valor, tenant_id
      FROM configuracoes_sistema
      WHERE tenant_id = $1
      ORDER BY chave
    `, [tenantId]);
    
    console.log(`Total de configurações para o tenant: ${final.rows.length}`);
    final.rows.forEach(r => {
      console.log(`  ✅ ${r.chave}: ${r.valor}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CONFIGURAÇÕES CORRIGIDAS COM SUCESSO!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

fixConfiguracoes();
