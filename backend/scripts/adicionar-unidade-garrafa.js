const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'merenda_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      }
);

async function adicionarUnidadeGarrafa() {
  console.log('🍾 Adicionando unidade "Garrafa" ao sistema\n');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar se já existe
    console.log('\n1️⃣ Verificando se unidade Garrafa já existe...');
    const existe = await pool.query(`
      SELECT id, codigo, nome, tipo
      FROM unidades_medida
      WHERE codigo = 'GF' OR LOWER(nome) = 'garrafa'
    `);
    
    if (existe.rows.length > 0) {
      console.log('   ⚠️  Unidade Garrafa já existe:');
      existe.rows.forEach(u => {
        console.log(`      - ID: ${u.id}, Código: ${u.codigo}, Nome: ${u.nome}, Tipo: ${u.tipo}`);
      });
      console.log('\n   ℹ️  Nenhuma ação necessária.');
      return;
    }

    // 2. Buscar ID da unidade base (UN - Unidade)
    console.log('\n2️⃣ Buscando unidade base (UN - Unidade)...');
    const unidadeBase = await pool.query(`
      SELECT id FROM unidades_medida WHERE codigo = 'UN'
    `);
    
    if (unidadeBase.rows.length === 0) {
      throw new Error('Unidade base UN não encontrada!');
    }
    
    const unidadeBaseId = unidadeBase.rows[0].id;
    console.log(`   ✅ Unidade base encontrada: ID ${unidadeBaseId}`);

    // 3. Inserir unidade Garrafa
    console.log('\n3️⃣ Inserindo unidade Garrafa...');
    const resultado = await pool.query(`
      INSERT INTO unidades_medida (codigo, nome, tipo, unidade_base_id, fator_conversao_base, ativo)
      VALUES ('GF', 'Garrafa', 'unidade', $1, 1, true)
      RETURNING id, codigo, nome, tipo
    `, [unidadeBaseId]);
    
    const novaUnidade = resultado.rows[0];
    console.log('   ✅ Unidade Garrafa adicionada com sucesso!');
    console.log(`      - ID: ${novaUnidade.id}`);
    console.log(`      - Código: ${novaUnidade.codigo}`);
    console.log(`      - Nome: ${novaUnidade.nome}`);
    console.log(`      - Tipo: ${novaUnidade.tipo}`);

    // 4. Verificar todas as unidades de tipo "unidade"
    console.log('\n4️⃣ Listando todas as unidades do tipo "unidade":');
    const unidades = await pool.query(`
      SELECT id, codigo, nome
      FROM unidades_medida
      WHERE tipo = 'unidade'
      ORDER BY codigo
    `);
    
    console.log(`\n   📋 Total: ${unidades.rows.length} unidades`);
    unidades.rows.forEach(u => {
      console.log(`      - ${u.codigo.padEnd(5)} | ${u.nome}`);
    });

    // 5. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ UNIDADE GARRAFA ADICIONADA COM SUCESSO!');
    console.log('\n📊 Resumo:');
    console.log('   ✅ Código: GF');
    console.log('   ✅ Nome: Garrafa');
    console.log('   ✅ Tipo: unidade');
    console.log('   ✅ Fator de conversão: 1 (base: Unidade)');
    
    console.log('\n💡 Como usar:');
    console.log('   - Ao cadastrar produtos, selecione "Garrafa" como unidade');
    console.log('   - Exemplo: Óleo de Soja - 1 Garrafa de 450g');
    console.log('   - O sistema tratará como 1 unidade');
    
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro ao adicionar unidade:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

adicionarUnidadeGarrafa()
  .then(() => {
    console.log('\n✅ Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro no script:', error);
    process.exit(1);
  });
