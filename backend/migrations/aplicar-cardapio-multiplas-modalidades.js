const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432')
});

async function aplicarMigracao() {
  const client = await pool.connect();
  try {
    console.log('🔄 Aplicando migração: cardapio_multiplas_modalidades...\n');

    const sql = fs.readFileSync(
      path.join(__dirname, '20260318_cardapio_multiplas_modalidades.sql'),
      'utf8'
    );

    await client.query(sql);

    console.log('✅ Migration aplicada com sucesso!\n');

    // Verificar estrutura criada
    console.log('📊 Verificando estrutura da tabela cardapio_modalidades:');
    const estrutura = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cardapio_modalidades'
      ORDER BY ordinal_position
    `);
    estrutura.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    console.log('');

    // Verificar dados migrados
    console.log('📝 Dados migrados:');
    const dados = await client.query(`
      SELECT 
        cm.cardapio_id,
        c.nome as cardapio_nome,
        cm.modalidade_id,
        m.nome as modalidade_nome
      FROM cardapio_modalidades cm
      JOIN cardapios_modalidade c ON c.id = cm.cardapio_id
      JOIN modalidades m ON m.id = cm.modalidade_id
      ORDER BY cm.cardapio_id
      LIMIT 10
    `);
    
    if (dados.rows.length > 0) {
      console.log(`   Total de relacionamentos: ${dados.rows.length}`);
      dados.rows.forEach(row => {
        console.log(`   Cardápio "${row.cardapio_nome}" -> Modalidade "${row.modalidade_nome}"`);
      });
    } else {
      console.log('   ⚠️  Nenhum dado migrado (pode ser normal se não houver cardápios)');
    }
    console.log('');

    console.log('✅ Migração concluída com sucesso!');
    console.log('📋 Próximos passos:');
    console.log('   1. Atualizar backend para usar tabela cardapio_modalidades');
    console.log('   2. Atualizar frontend para permitir seleção múltipla de modalidades');
    console.log('   3. Testar criação de cardápio com múltiplas modalidades');

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarMigracao().catch(console.error);
