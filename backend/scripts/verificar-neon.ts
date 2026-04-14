/**
 * Verificar tabelas no Neon (banco remoto)
 */
import { Pool } from 'pg';

async function verificarNeon() {
  // URL do Neon - ajustar conforme .env
  const neonUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || 'postgresql://seu_banco_neon';
  
  console.log('🔍 Verificando banco NEON...');
  console.log(`   URL: ${neonUrl.substring(0, 30)}...`);

  const pool = new Pool({
    connectionString: neonUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Testar conexão
    const testResult = await pool.query('SELECT NOW() as now, current_database() as db');
    console.log(`\n✅ Conectado ao Neon: ${testResult.rows[0].db}`);

    // Listar tabelas
    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('\n📋 Tabelas no Neon:');
    tablesResult.rows.forEach(t => console.log(`  - ${t.tablename}`));

    // Verificar tabelas importantes
    const tabelasNecessarias = [
      'cardapios', 'cardapios_modalidade', 'cardapio_modalidades',
      'cardapio_refeicoes_dia', 'refeicoes', 'refeicao_produtos',
      'refeicao_produto_modalidade', 'produtos', 'modalidades',
      'escolas', 'escola_modalidades'
    ];

    console.log('\n🔍 Verificando tabelas necessárias:');
    const tabelasExistentes = tablesResult.rows.map(r => r.tablename);
    
    let todasExistem = true;
    for (const tabela of tabelasNecessarias) {
      const existe = tabelasExistentes.includes(tabela);
      if (!existe) {
        console.log(`  ❌ ${tabela} - NÃO EXISTE`);
        todasExistem = false;
      } else {
        try {
          const countResult = await pool.query(`SELECT COUNT(*) FROM ${tabela}`);
          console.log(`  ✅ ${tabela}: ${countResult.rows[0].count} registros`);
        } catch (e) {
          console.log(`  ⚠️  ${tabela}: erro ao contar`);
        }
      }
    }

    if (!todasExistem) {
      console.log('\n⚠️  Faltam tabelas! Rode as migrations.');
    } else {
      console.log('\n✅ Todas as tabelas existem!');
    }

  } catch (error) {
    console.error('\n❌ Erro ao conectar ao Neon:', error.message);
    console.log('   Verifique se o DATABASE_URL está correto no .env');
  } finally {
    await pool.end();
  }
}

verificarNeon();
