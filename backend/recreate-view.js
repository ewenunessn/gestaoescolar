const db = require('./src/database');
const fs = require('fs');
const path = require('path');

async function recreateView() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'recreate_view_saldo.sql'), 'utf8');
    await db.query(sql);
    console.log('✅ View recriada com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

recreateView();
