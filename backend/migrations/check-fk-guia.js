const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // Todas as FKs de guia_produto_escola
    const fks = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name
      WHERE tc.table_name = 'guia_produto_escola'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY kcu.column_name
    `);
    console.log('Todas as FKs de guia_produto_escola:');
    fks.rows.forEach(r => console.log(`  ${r.constraint_name} | col: ${r.column_name} -> ${r.foreign_table}.${r.foreign_column} | DELETE: ${r.delete_rule}`));

    // Verificar se guia_id tem FK com CASCADE
    const guiaFk = fks.rows.find(r => r.column_name === 'guia_id');
    if (!guiaFk) {
      console.log('\n⚠️  guia_id NÃO tem FK definida! Adicionando...');
      await client.query(`
        ALTER TABLE guia_produto_escola
        ADD CONSTRAINT guia_produto_escola_guia_id_fkey
        FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE
      `);
      console.log('✅ FK adicionada com ON DELETE CASCADE');
    } else if (guiaFk.delete_rule !== 'CASCADE') {
      console.log(`\n⚠️  guia_id tem FK mas sem CASCADE (atual: ${guiaFk.delete_rule}). Recriando...`);
      await client.query(`ALTER TABLE guia_produto_escola DROP CONSTRAINT "${guiaFk.constraint_name}"`);
      await client.query(`
        ALTER TABLE guia_produto_escola
        ADD CONSTRAINT "${guiaFk.constraint_name}"
        FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE
      `);
      console.log('✅ FK recriada com ON DELETE CASCADE');
    } else {
      console.log('\n✅ guia_id já tem ON DELETE CASCADE — nada a fazer');
    }

    // Confirmar órfãos
    const orphans = await client.query(`
      SELECT COUNT(*) as total FROM guia_produto_escola gpe
      WHERE NOT EXISTS (SELECT 1 FROM guias g WHERE g.id = gpe.guia_id)
    `);
    console.log(`\nÓrfãos no banco: ${orphans.rows[0].total}`);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
