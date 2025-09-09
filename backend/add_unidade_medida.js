const { Pool } = require('pg');

// Configuração do banco de produção
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('Adicionando campo unidade_medida na tabela estoque_movimentacoes...');
    
    // Adicionar campo unidade_medida
    await pool.query(`
      ALTER TABLE estoque_movimentacoes 
      ADD COLUMN unidade_medida VARCHAR(50)
    `);
    
    console.log('✅ Campo unidade_medida adicionado com sucesso!');
    
    // Verificar se o campo foi adicionado
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'estoque_movimentacoes' 
      AND column_name = 'unidade_medida'
    `);
    
    if (columns.rows.length > 0) {
      console.log('✅ Campo verificado:', columns.rows[0]);
    }
    
    // Atualizar registros existentes com a unidade atual do produto
    console.log('Atualizando registros existentes...');
    const updateResult = await pool.query(`
      UPDATE estoque_movimentacoes 
      SET unidade_medida = p.unidade
      FROM produtos p 
      WHERE estoque_movimentacoes.produto_id = p.id 
      AND estoque_movimentacoes.unidade_medida IS NULL
    `);
    
    console.log(`✅ ${updateResult.rowCount} registros atualizados com a unidade de medida!`);
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  Campo unidade_medida já existe na tabela.');
      
      // Apenas atualizar registros existentes
      console.log('Atualizando registros existentes...');
      const updateResult = await pool.query(`
        UPDATE estoque_movimentacoes 
        SET unidade_medida = p.unidade
        FROM produtos p 
        WHERE estoque_movimentacoes.produto_id = p.id 
        AND estoque_movimentacoes.unidade_medida IS NULL
      `);
      
      console.log(`✅ ${updateResult.rowCount} registros atualizados com a unidade de medida!`);
    } else {
      console.error('❌ Erro:', error.message);
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
})();