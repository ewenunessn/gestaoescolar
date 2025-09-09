const db = require('../database');

console.log('🔄 Executando migration: Adicionar campos para faturamento por contrato...');

try {
  // Adicionar colunas para suporte ao faturamento por contrato
  db.query(`
    ALTER TABLE faturamentos 
    ADD COLUMN IF NOT EXISTS contrato_id INTEGER,
    ADD COLUMN IF NOT EXISTS is_parcial BOOLEAN DEFAULT FALSE
  `);

  // Adicionar foreign key para contrato_id
  db.query(`
    ALTER TABLE faturamentos 
    ADD CONSTRAINT fk_faturamentos_contrato 
    FOREIGN KEY (contrato_id) REFERENCES contratos(id)
  `).catch(() => {
    console.log('Foreign key constraint já existe ou não pôde ser criada');
  });

  console.log('✅ Migration executada com sucesso: Campos para faturamento por contrato adicionados');
} catch (error) {
  console.error('❌ Erro na migration:', error);
  throw error;
}