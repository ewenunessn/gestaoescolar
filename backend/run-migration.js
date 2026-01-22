const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection - you'll need to enter your password when prompted
const pool = new Pool({
  host: 'ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech',
  user: 'gestaoescolar_owner',
  database: 'gestaoescolar',
  password: 'your_password_here', // REPLACE WITH YOUR ACTUAL PASSWORD
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: Add unidade to contrato_produtos...');
    
    // Step 1: Add column
    console.log('Step 1: Adding unidade column...');
    await client.query('ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS unidade VARCHAR(50)');
    console.log('✅ Added unidade column');
    
    // Step 2: Update existing records
    console.log('Step 2: Updating existing records with product units...');
    const updateResult = await client.query(`
      UPDATE contrato_produtos 
      SET unidade = p.unidade 
      FROM produtos p 
      WHERE contrato_produtos.produto_id = p.id AND contrato_produtos.unidade IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} records with product units`);
    
    // Step 3: Set default for any remaining nulls
    console.log('Step 3: Setting default units for remaining records...');
    const defaultResult = await client.query(`UPDATE contrato_produtos SET unidade = 'Kg' WHERE unidade IS NULL`);
    console.log(`✅ Set default units for ${defaultResult.rowCount} records`);
    
    // Step 4: Make column NOT NULL
    console.log('Step 4: Making unidade column NOT NULL...');
    await client.query('ALTER TABLE contrato_produtos ALTER COLUMN unidade SET NOT NULL');
    console.log('✅ Made unidade column NOT NULL');
    
    // Step 5: Add comment
    console.log('Step 5: Adding column comment...');
    await client.query(`COMMENT ON COLUMN contrato_produtos.unidade IS 'Unit of measure for this product in this specific contract'`);
    console.log('✅ Added column comment');
    
    // Verify results
    const result = await client.query('SELECT COUNT(*) as total FROM contrato_produtos WHERE unidade IS NOT NULL');
    console.log(`✅ Final verification: ${result.rows[0].total} contract product records have units`);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 Migration process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  });