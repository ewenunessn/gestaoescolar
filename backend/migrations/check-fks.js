const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar' });

client.connect().then(async () => {
  const r = await client.query(`
    SELECT tc.constraint_name, tc.table_name, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'produto_id'
      AND rc.delete_rule != 'CASCADE'
    ORDER BY tc.table_name
  `);
  console.log('FKs produto_id sem CASCADE:');
  r.rows.forEach(row => console.log(`  ${row.table_name}.${row.constraint_name} → ${row.delete_rule}`));
  if (r.rows.length === 0) console.log('  Nenhuma — todas já são CASCADE');
  await client.end();
}).catch(async e => { console.error(e.message); await client.end(); });
