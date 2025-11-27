const { Pool } = require('pg');

const localPool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function syncConfigs() {
  try {
    console.log('🔄 Sincronizando configurações Local → Neon\n');
    
    // 1. Buscar tenant do Neon
    const neonTenant = await neonPool.query(`
      SELECT id, name FROM tenants ORDER BY created_at LIMIT 1
    `);
    
    if (neonTenant.rows.length === 0) {
      console.error('❌ Nenhum tenant encontrado no Neon!');
      return;
    }
    
    const tenantId = neonTenant.rows[0].id;
    console.log(`✅ Tenant Neon: ${neonTenant.rows[0].name}\n`);
    
    // 2. Buscar configurações do local
    const localConfigs = await localPool.query(`
      SELECT chave, valor, descricao, tipo, categoria
      FROM configuracoes_sistema
      ORDER BY chave
    `);
    
    console.log(`📊 Configurações no Local: ${localConfigs.rows.length}\n`);
    
    if (localConfigs.rows.length === 0) {
      console.log('⚠️  Nenhuma configuração no banco local');
      return;
    }
    
    // 3. Sincronizar cada configuração
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const config of localConfigs.rows) {
      try {
        // Verificar se já existe no Neon
        const exists = await neonPool.query(`
          SELECT id FROM configuracoes_sistema
          WHERE chave = $1 AND tenant_id = $2
        `, [config.chave, tenantId]);
        
        if (exists.rows.length > 0) {
          // Atualizar
          await neonPool.query(`
            UPDATE configuracoes_sistema
            SET valor = $1,
                descricao = $2,
                tipo = $3,
                categoria = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE chave = $5 AND tenant_id = $6
          `, [config.valor, config.descricao, config.tipo, config.categoria, config.chave, tenantId]);
          
          console.log(`  ✏️  Atualizado: ${config.chave}`);
          updated++;
        } else {
          // Criar
          await neonPool.query(`
            INSERT INTO configuracoes_sistema 
            (chave, valor, descricao, tipo, categoria, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [config.chave, config.valor, config.descricao, config.tipo, config.categoria, tenantId]);
          
          console.log(`  ✅ Criado: ${config.chave}`);
          created++;
        }
      } catch (error) {
        console.log(`  ❌ Erro em ${config.chave}: ${error.message}`);
        skipped++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('RESUMO DA SINCRONIZAÇÃO:');
    console.log('='.repeat(60));
    console.log(`✅ Criadas: ${created}`);
    console.log(`✏️  Atualizadas: ${updated}`);
    console.log(`❌ Erros: ${skipped}`);
    console.log(`📊 Total processadas: ${localConfigs.rows.length}`);
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

syncConfigs();
