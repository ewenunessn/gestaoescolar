const db = require('../dist/database');

async function limparDuplicados() {
  try {
    console.log('🧹 Limpando produtos duplicados...\n');

    // 1. Verificar duplicados
    console.log('1️⃣ Verificando duplicados...');
    const duplicados = await db.query(`
      SELECT refeicao_id, produto_id, COUNT(*) as total
      FROM refeicao_produtos
      GROUP BY refeicao_id, produto_id
      HAVING COUNT(*) > 1
      ORDER BY total DESC
    `);

    console.log(`Encontrados ${duplicados.rows.length} pares com duplicatas:`);
    console.table(duplicados.rows);

    if (duplicados.rows.length === 0) {
      console.log('✅ Nenhum duplicado encontrado!');
      return;
    }

    // 2. Para cada duplicado, manter apenas o mais recente
    console.log('\n2️⃣ Removendo duplicados (mantendo o mais recente)...');
    
    for (const dup of duplicados.rows) {
      const { refeicao_id, produto_id } = dup;
      
      // Buscar todos os registros deste par
      const registros = await db.query(`
        SELECT id, created_at
        FROM refeicao_produtos
        WHERE refeicao_id = $1 AND produto_id = $2
        ORDER BY created_at DESC
      `, [refeicao_id, produto_id]);

      // Manter o primeiro (mais recente), deletar os outros
      const manter = registros.rows[0].id;
      const deletar = registros.rows.slice(1).map(r => r.id);

      console.log(`Refeição ${refeicao_id}, Produto ${produto_id}:`);
      console.log(`  Mantendo ID ${manter}`);
      console.log(`  Deletando IDs: ${deletar.join(', ')}`);

      if (deletar.length > 0) {
        await db.query(`
          DELETE FROM refeicao_produtos
          WHERE id = ANY($1)
        `, [deletar]);
      }
    }

    // 3. Verificar se constraint UNIQUE existe
    console.log('\n3️⃣ Verificando constraint UNIQUE...');
    const constraintExists = await db.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'refeicao_produtos'
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'uk_refeicao_produto'
    `);

    if (constraintExists.rows.length === 0) {
      console.log('Adicionando constraint UNIQUE...');
      await db.query(`
        ALTER TABLE refeicao_produtos
        ADD CONSTRAINT uk_refeicao_produto UNIQUE (refeicao_id, produto_id)
      `);
      console.log('✅ Constraint adicionada!');
    } else {
      console.log('✅ Constraint já existe!');
    }

    // 4. Verificar resultado final
    console.log('\n4️⃣ Verificando resultado...');
    const final = await db.query(`
      SELECT refeicao_id, produto_id, COUNT(*) as total
      FROM refeicao_produtos
      GROUP BY refeicao_id, produto_id
      HAVING COUNT(*) > 1
    `);

    if (final.rows.length === 0) {
      console.log('✅ Todos os duplicados foram removidos!');
    } else {
      console.log('⚠️ Ainda existem duplicados:');
      console.table(final.rows);
    }

    // 5. Mostrar total de registros
    const total = await db.query('SELECT COUNT(*) FROM refeicao_produtos');
    console.log(`\n📊 Total de registros: ${total.rows[0].count}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

limparDuplicados();
