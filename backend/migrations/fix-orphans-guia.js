const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // 1. Verificar órfãos
    const orphans = await client.query(`
      SELECT COUNT(*) as total
      FROM guia_produto_escola gpe
      WHERE NOT EXISTS (SELECT 1 FROM guias g WHERE g.id = gpe.guia_id)
    `);
    console.log(`Órfãos encontrados: ${orphans.rows[0].total}`);

    // 2. Verificar FK atual
    const fk = await client.query(`
      SELECT
        tc.constraint_name,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'guia_produto_escola'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name ILIKE '%guia%'
    `);
    console.log('FK atual:', JSON.stringify(fk.rows));

    await client.query('BEGIN');

    // 3. Deletar órfãos
    const del = await client.query(`
      DELETE FROM guia_produto_escola
      WHERE NOT EXISTS (SELECT 1 FROM guias g WHERE g.id = guia_produto_escola.guia_id)
    `);
    console.log(`Órfãos deletados: ${del.rowCount}`);

    // 4. Recriar FK com ON DELETE CASCADE
    if (fk.rows.length > 0) {
      const constraintName = fk.rows[0].constraint_name;
      console.log(`Recriando FK '${constraintName}' com ON DELETE CASCADE...`);
      await client.query(`ALTER TABLE guia_produto_escola DROP CONSTRAINT "${constraintName}"`);
      await client.query(`
        ALTER TABLE guia_produto_escola
        ADD CONSTRAINT "${constraintName}"
        FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE
      `);
      console.log('FK recriada com ON DELETE CASCADE');
    } else {
      // FK não encontrada pelo nome, tenta pelo padrão
      console.log('FK não encontrada pelo nome, adicionando nova...');
      await client.query(`
        ALTER TABLE guia_produto_escola
        ADD CONSTRAINT guia_produto_escola_guia_id_fkey
        FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE
      `).catch(e => console.log('Aviso ao adicionar FK:', e.message));
    }

    await client.query('COMMIT');

    // 5. Confirmar
    const check = await client.query(`
      SELECT COUNT(*) as total
      FROM guia_produto_escola gpe
      WHERE NOT EXISTS (SELECT 1 FROM guias g WHERE g.id = gpe.guia_id)
    `);
    console.log(`Órfãos restantes após limpeza: ${check.rows[0].total}`);

    // 6. Confirmar FK
    const fkFinal = await client.query(`
      SELECT tc.constraint_name, rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'guia_produto_escola'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name ILIKE '%guia%'
    `);
    console.log('FK final:', JSON.stringify(fkFinal.rows));

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erro:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
