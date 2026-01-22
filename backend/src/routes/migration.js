const express = require('express');
const router = express.Router();
const db = require('../database');
const fs = require('fs');
const path = require('path');

// Temporary endpoint to run migration - REMOVE AFTER USE
router.post('/run-unit-migration', async (req, res) => {
  try {
    console.log('🔄 Starting migration: Add unidade to contrato_produtos...');
    
    // Step 1: Add column
    await db.query('ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS unidade VARCHAR(50)');
    console.log('✅ Added unidade column');
    
    // Step 2: Update existing records
    await db.query(`
      UPDATE contrato_produtos 
      SET unidade = p.unidade 
      FROM produtos p 
      WHERE contrato_produtos.produto_id = p.id AND contrato_produtos.unidade IS NULL
    `);
    console.log('✅ Updated existing records with product units');
    
    // Step 3: Set default for any remaining nulls
    await db.query(`UPDATE contrato_produtos SET unidade = 'Kg' WHERE unidade IS NULL`);
    console.log('✅ Set default units for remaining records');
    
    // Step 4: Make column NOT NULL
    await db.query('ALTER TABLE contrato_produtos ALTER COLUMN unidade SET NOT NULL');
    console.log('✅ Made unidade column NOT NULL');
    
    // Step 5: Add comment
    await db.query(`COMMENT ON COLUMN contrato_produtos.unidade IS 'Unit of measure for this product in this specific contract'`);
    console.log('✅ Added column comment');
    
    // Verify results
    const result = await db.query('SELECT COUNT(*) as total FROM contrato_produtos WHERE unidade IS NOT NULL');
    
    res.json({
      success: true,
      message: 'Migration completed successfully',
      recordsUpdated: result.rows[0].total
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

module.exports = router;