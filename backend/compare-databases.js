const { Pool } = require('pg');

const localPool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function compareDatabases() {
  try {
    console.log('🔍 Comparando estruturas dos bancos...\n');
    
    // Buscar todas as tabelas
    const localTables = await localPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const neonTables = await neonPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const localTableNames = localTables.rows.map(r => r.table_name);
    const neonTableNames = neonTables.rows.map(r => r.table_name);
    
    // Tabelas apenas no local
    const onlyLocal = localTableNames.filter(t => !neonTableNames.includes(t));
    // Tabelas apenas no Neon
    const onlyNeon = neonTableNames.filter(t => !localTableNames.includes(t));
    // Tabelas em ambos
    const inBoth = localTableNames.filter(t => neonTableNames.includes(t));
    
    console.log('📊 RESUMO DE TABELAS:\n');
    console.log(`Total Local: ${localTableNames.length}`);
    console.log(`Total Neon: ${neonTableNames.length}`);
    console.log(`Em ambos: ${inBoth.length}`);
    console.log(`Apenas Local: ${onlyLocal.length}`);
    console.log(`Apenas Neon: ${onlyNeon.length}\n`);
    
    if (onlyLocal.length > 0) {
      console.log('⚠️  Tabelas APENAS no LOCAL (faltam no Neon):');
      onlyLocal.forEach(t => console.log(`  - ${t}`));
      console.log('');
    }
    
    if (onlyNeon.length > 0) {
      console.log('⚠️  Tabelas APENAS no NEON (faltam no Local):');
      onlyNeon.forEach(t => console.log(`  - ${t}`));
      console.log('');
    }
    
    // Verificar tabelas importantes
    const importantTables = [
      'configuracoes_sistema',
      'demandas_escolas',
      'saldo_contratos_modalidades',
      'contrato_produtos_modalidades',
      'user_permissions'
    ];
    
    console.log('🔍 Verificando tabelas importantes:\n');
    
    for (const table of importantTables) {
      const inLocal = localTableNames.includes(table);
      const inNeon = neonTableNames.includes(table);
      
      const status = inLocal && inNeon ? '✅' : 
                     inLocal && !inNeon ? '⚠️  LOCAL' :
                     !inLocal && inNeon ? '⚠️  NEON' : '❌';
      
      console.log(`${status} ${table.padEnd(40)} Local: ${inLocal ? '✅' : '❌'}  Neon: ${inNeon ? '✅' : '❌'}`);
      
      // Se existe em ambos, verificar colunas
      if (inLocal && inNeon) {
        const localCols = await localPool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        const neonCols = await neonPool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        const localColNames = localCols.rows.map(r => r.column_name);
        const neonColNames = neonCols.rows.map(r => r.column_name);
        
        const missingInNeon = localColNames.filter(c => !neonColNames.includes(c));
        const missingInLocal = neonColNames.filter(c => !localColNames.includes(c));
        
        if (missingInNeon.length > 0) {
          console.log(`     ⚠️  Colunas faltando no Neon: ${missingInNeon.join(', ')}`);
        }
        if (missingInLocal.length > 0) {
          console.log(`     ⚠️  Colunas faltando no Local: ${missingInLocal.join(', ')}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('AÇÕES NECESSÁRIAS:');
    console.log('='.repeat(80));
    
    if (onlyLocal.length > 0) {
      console.log('\n1. Criar no Neon as tabelas que faltam:');
      onlyLocal.forEach(t => {
        if (importantTables.includes(t)) {
          console.log(`   ⚠️  IMPORTANTE: ${t}`);
        } else {
          console.log(`   - ${t}`);
        }
      });
    }
    
    if (onlyNeon.length > 0) {
      console.log('\n2. Criar no Local as tabelas que faltam (ou remover do Neon se obsoletas):');
      onlyNeon.forEach(t => console.log(`   - ${t}`));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

compareDatabases();
