const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const SISTEMA_PRINCIPAL_ID = '00000000-0000-0000-0000-000000000000';

// Tabelas que precisam de tenant_id
const tabelasParaMigrar = [
  'configuracao_entregas',
  'configuracoes_sistema',
  'gas_controle',
  'historico_estoque',
  'logs_auditoria',
  'presets_rotas',
  'produto_modalidades',
  'recebimentos_simples',
  'rota_escolas',
  'rotas_entrega'
];

async function adicionarTenantId() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('🔄 Adicionando tenant_id e migrando dados...\n');
    
    for (const tabela of tabelasParaMigrar) {
      try {
        console.log(`📋 Processando ${tabela}...`);
        
        // Verificar se já tem a coluna
        const temColuna = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'tenant_id'
        `, [tabela]);
        
        if (temColuna.rows.length === 0) {
          // Adicionar coluna tenant_id
          await client.query(`
            ALTER TABLE ${tabela} 
            ADD COLUMN tenant_id UUID REFERENCES tenants(id)
          `);
          console.log(`   ✅ Coluna tenant_id adicionada`);
        } else {
          console.log(`   ✓  Coluna tenant_id já existe`);
        }
        
        // Atualizar registros sem tenant_id
        const result = await client.query(`
          UPDATE ${tabela} 
          SET tenant_id = $1 
          WHERE tenant_id IS NULL
          RETURNING id
        `, [SISTEMA_PRINCIPAL_ID]);
        
        if (result.rowCount > 0) {
          console.log(`   ✅ ${result.rowCount} registros migrados para Sistema Principal`);
        } else {
          console.log(`   ✓  Todos os registros já têm tenant_id`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`);
      }
    }
    
    console.log('\n✅ Migração concluída!');
    console.log('\n📊 Resumo por tabela:');
    
    for (const tabela of tabelasParaMigrar) {
      try {
        const count = await client.query(`
          SELECT COUNT(*) as count 
          FROM ${tabela} 
          WHERE tenant_id = $1
        `, [SISTEMA_PRINCIPAL_ID]);
        
        console.log(`   ${tabela.padEnd(30)} - ${count.rows[0].count} registros`);
      } catch (error) {
        console.log(`   ${tabela.padEnd(30)} - erro ao contar`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

adicionarTenantId();
