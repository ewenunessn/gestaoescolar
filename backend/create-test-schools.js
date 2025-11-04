const db = require('./dist/database');

async function createTestSchools() {
  try {
    console.log('🏫 Criando escolas de teste para diferentes tenants...\n');
    
    // Obter tenants disponíveis
    const tenants = await db.query(`
      SELECT id, name, slug 
      FROM tenants 
      WHERE status = 'active' AND id != '00000000-0000-0000-0000-000000000000'
      ORDER BY name
      LIMIT 3
    `);
    
    console.log('🏢 Tenants selecionados:');
    tenants.rows.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name} (${tenant.slug})`);
    });
    
    // Criar escolas para cada tenant
    for (let i = 0; i < tenants.rows.length; i++) {
      const tenant = tenants.rows[i];
      console.log(`\n🏫 Criando escolas para: ${tenant.name}`);
      
      // Criar 3 escolas para cada tenant
      for (let j = 1; j <= 3; j++) {
        const escolaData = {
          nome: `Escola ${tenant.slug.toUpperCase()} ${j}`,
          codigo_acesso: Math.random().toString().slice(2, 8).padStart(6, '0'),
          endereco: `Rua ${tenant.slug} ${j}, Centro`,
          municipio: tenant.name.replace('Prefeitura Municipal de ', ''),
          telefone: `(11) 9999-${String(i).padStart(2, '0')}${String(j).padStart(2, '0')}`,
          administracao: 'municipal',
          ativo: true,
          tenant_id: tenant.id
        };
        
        const result = await db.query(`
          INSERT INTO escolas (
            nome, codigo_acesso, endereco, municipio, telefone, 
            administracao, ativo, tenant_id, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
          RETURNING id, nome
        `, [
          escolaData.nome,
          escolaData.codigo_acesso,
          escolaData.endereco,
          escolaData.municipio,
          escolaData.telefone,
          escolaData.administracao,
          escolaData.ativo,
          escolaData.tenant_id
        ]);
        
        console.log(`   ✅ Criada: ${result.rows[0].nome}`);
      }
    }
    
    // Verificar distribuição final
    console.log('\n📊 Distribuição final de escolas por tenant:');
    const distribution = await db.query(`
      SELECT 
        t.name as tenant_name,
        t.slug,
        COUNT(e.id) as total_escolas
      FROM tenants t
      LEFT JOIN escolas e ON t.id = e.tenant_id
      WHERE t.status = 'active'
      GROUP BY t.id, t.name, t.slug
      ORDER BY total_escolas DESC
    `);
    
    console.table(distribution.rows);
    
    console.log('\n🎉 Escolas de teste criadas com sucesso!');
    console.log('\n💡 Agora você pode testar o switch de tenant no frontend.');
    console.log('   Cada tenant deve mostrar apenas suas próprias escolas.');
    
  } catch (error) {
    console.error('❌ Erro ao criar escolas de teste:', error);
  } finally {
    process.exit(0);
  }
}

createTestSchools();