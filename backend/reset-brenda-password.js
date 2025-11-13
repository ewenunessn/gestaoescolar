const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function resetBrendaPassword() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Resetando senha da Brenda...\n');

    const newPassword = 'Brenda@2025';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await client.query(`
      UPDATE usuarios 
      SET senha = $1
      WHERE email = 'ewertonsolon@gmail.com'
    `, [hashedPassword]);

    console.log('✅ Senha atualizada com sucesso!');
    console.log('📧 Email: ewertonsolon@gmail.com');
    console.log('🔑 Nova senha:', newPassword);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

resetBrendaPassword()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    process.exit(1);
  });
