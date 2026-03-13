const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function aplicarMigration() {
  try {
    console.log('🔄 Adicionando campos de Ficha Técnica...\n');

    const migrationPath = path.join(__dirname, 'migrations', '20260312_add_ficha_tecnica_refeicoes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);
    console.log('✅ Migration aplicada com sucesso!\n');

    // Verificar novos campos em refeicoes
    const refeicoesResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'refeicoes'
      AND column_name IN (
        'modo_preparo', 'tempo_preparo_minutos', 'rendimento_porcoes', 
        'utensílios', 'calorias_por_porcao', 'proteinas_g', 'carboidratos_g',
        'lipidios_g', 'fibras_g', 'sodio_mg', 'custo_por_porcao',
        'observacoes_tecnicas', 'categoria'
      )
      ORDER BY column_name
    `);

    console.log('📋 Novos campos em refeicoes:');
    refeicoesResult.rows.forEach(col => {
      console.log(`   ✓ ${col.column_name.padEnd(30)} ${col.data_type}`);
    });

    // Verificar novos campos em refeicao_produtos
    const ingredientesResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'refeicao_produtos'
      AND column_name IN ('ordem', 'tipo_ingrediente')
      ORDER BY column_name
    `);

    console.log('\n📋 Novos campos em refeicao_produtos:');
    ingredientesResult.rows.forEach(col => {
      console.log(`   ✓ ${col.column_name.padEnd(30)} ${col.data_type}`);
    });

    // Exemplo de refeição com ficha técnica
    console.log('\n📝 Criando exemplo de refeição com ficha técnica...');
    
    const refeicaoResult = await pool.query(`
      INSERT INTO refeicoes (
        nome, 
        descricao, 
        categoria,
        modo_preparo,
        tempo_preparo_minutos,
        rendimento_porcoes,
        utensílios,
        calorias_por_porcao,
        proteinas_g,
        carboidratos_g,
        lipidios_g,
        fibras_g,
        sodio_mg,
        custo_por_porcao,
        observacoes_tecnicas,
        ativo
      )
      VALUES (
        'Arroz com Feijão',
        'Prato tradicional brasileiro - arroz branco com feijão preto',
        'Prato Principal',
        E'1. Lave o arroz em água corrente\n2. Refogue o alho no óleo\n3. Adicione o arroz e refogue por 2 minutos\n4. Adicione água fervente (2 xícaras de água para 1 de arroz)\n5. Tempere com sal\n6. Cozinhe em fogo baixo por 15-20 minutos\n7. Para o feijão: cozinhe em panela de pressão por 30 minutos\n8. Tempere com alho, cebola e sal',
        60,
        50,
        'Panela de pressão, panela média, colher de pau, escorredor',
        350.00,
        12.50,
        58.00,
        8.50,
        10.00,
        450.00,
        2.50,
        'Receita aprovada pelo nutricionista. Atende aos requisitos do PNAE.',
        true
      )
      ON CONFLICT DO NOTHING
      RETURNING id, nome
    `);

    if (refeicaoResult.rows.length > 0) {
      console.log(`   ✓ Refeição criada: ${refeicaoResult.rows[0].nome} (ID: ${refeicaoResult.rows[0].id})`);
    }

    console.log('\n✅ Ficha Técnica implementada com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

aplicarMigration();
