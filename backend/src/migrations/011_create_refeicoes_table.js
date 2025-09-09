// Migração para criar tabela de refeições no PostgreSQL
const db = require('../database');

module.exports = {
  async up() {
    console.log('🔧 Criando tabela refeicoes...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS refeicoes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        tipo VARCHAR(100),
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar índices para melhor performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_refeicoes_nome ON refeicoes(nome);
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_refeicoes_tipo ON refeicoes(tipo);
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_refeicoes_ativo ON refeicoes(ativo);
    `);
    
    // Inserir dados padrão se a tabela estiver vazia
    const count = await db.query('SELECT COUNT(*) as total FROM refeicoes');
    if (count.rows[0].total === 0) {
      console.log('📝 Inserindo dados padrão de refeições...');
      
      await db.query(`
        INSERT INTO refeicoes (nome, descricao, tipo, ativo) VALUES
        ('Café da Manhã', 'Primeira refeição do dia', 'cafe_manha', true),
        ('Lanche da Manhã', 'Lanche entre café e almoço', 'lanche_manha', true),
        ('Almoço', 'Refeição principal do dia', 'almoco', true),
        ('Lanche da Tarde', 'Lanche vespertino', 'lanche_tarde', true),
        ('Jantar', 'Refeição noturna', 'jantar', true)
      `);
    }
    
    console.log('✅ Tabela refeicoes criada com sucesso!');
  },
  
  async down() {
    console.log('🗑️ Removendo tabela refeicoes...');
    await db.query('DROP TABLE IF EXISTS refeicoes CASCADE');
    console.log('✅ Tabela refeicoes removida!');
  }
};