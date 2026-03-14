const db = require('./src/database.ts');

async function verificarFrango() {
  try {
    // Buscar produto frango
    const result = await db.pool.query(`
      SELECT 
        id, 
        nome, 
        calorias_100g,
        proteinas_100g,
        carboidratos_100g,
        lipidios_100g,
        fibras_100g,
        sodio_100g
      FROM produtos 
      WHERE LOWER(nome) LIKE '%frango%'
      ORDER BY id
    `);
    
    console.log('=== PRODUTOS COM FRANGO ===');
    console.log(JSON.stringify(result.rows, null, 2));
    
    if (result.rows.length === 0) {
      console.log('\nNenhum produto com frango encontrado');
    } else {
      console.log(`\n${result.rows.length} produto(s) encontrado(s)`);
      
      result.rows.forEach(p => {
        console.log(`\n--- ${p.nome} (ID: ${p.id}) ---`);
        console.log(`Calorias: ${p.calorias_100g || 'NÃO CADASTRADO'}`);
        console.log(`Proteínas: ${p.proteinas_100g || 'NÃO CADASTRADO'}`);
        console.log(`Carboidratos: ${p.carboidratos_100g || 'NÃO CADASTRADO'}`);
        console.log(`Lipídios: ${p.lipidios_100g || 'NÃO CADASTRADO'}`);
        console.log(`Fibras: ${p.fibras_100g || 'NÃO CADASTRADO'}`);
        console.log(`Sódio: ${p.sodio_100g || 'NÃO CADASTRADO'}`);
      });
    }
    
    await db.pool.end();
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

verificarFrango();
