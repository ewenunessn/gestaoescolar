
import { default as db } from './src/database';

async function checkRotaEscolas() {
  try {
    const res = await db.query('SELECT * FROM rota_escolas LIMIT 5');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkRotaEscolas();
