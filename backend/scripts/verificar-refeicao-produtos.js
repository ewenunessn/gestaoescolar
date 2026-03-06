const db = require('../dist/database');

async function verificarRefeicaoProdutos() {
  try {
    console.log('🔍 Verificando tabela refeicao_produtos...\n');

    // 1. Verificar se a tabela existe
    const tabelaExiste = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'refeicao_produtos'
      );
    `);
    
    console.log('1️⃣ Tabela existe?', tabelaExiste.rows[0].exists);

    if (!tabelaExiste.rows[0].exists) {
      console.log('\n❌ Tabela refeicao_produtos não existe!');
      console.log('\n📝 SQL para criar a tabela:');
      console.log(`
CREATE TABLE refeicao_produtos (
  id SERIAL PRIMARY KEY,
  refeicao_id INTEGER NOT NULL REFERENCES refeicoes(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  per_capita DECIMAL(10,2) NOT NULL DEFAULT 100,
  tipo_medida VARCHAR(20) DEFAULT 'gramas' CHECK (tipo_medida IN ('gramas', 'unidades')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(refeicao_id, produto_id)
);

CREATE INDEX idx_refeicao_produtos_refeicao ON refeicao_produtos(refeicao_id);
CREATE INDEX idx_refeicao_produtos_produto ON refeicao_produtos(produto_id);
      `);
      return;
    }

    // 2. Verificar estrutura da tabela
    console.log('\n2️⃣ Estrutura da tabela:');
    const colunas = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'refeicao_produtos'
      ORDER BY ordinal_position;
    `);
    
    console.table(colunas.rows);

    // 3. Contar registros
    const count = await db.query('SELECT COUNT(*) FROM refeicao_produtos');
    console.log('\n3️⃣ Total de registros:', count.rows[0].count);

    // 4. Listar alguns registros
    if (parseInt(count.rows[0].count) > 0) {
      console.log('\n4️⃣ Primeiros 5 registros:');
      const registros = await db.query(`
        SELECT 
          rp.*,
          r.nome as refeicao_nome,
          p.nome as produto_nome
        FROM refeicao_produtos rp
        LEFT JOIN refeicoes r ON rp.refeicao_id = r.id
        LEFT JOIN produtos p ON rp.produto_id = p.id
        ORDER BY rp.id DESC
        LIMIT 5
      `);
      console.table(registros.rows);
    }

    // 5. Verificar refeições disponíveis
    console.log('\n5️⃣ Refeições disponíveis:');
    const refeicoes = await db.query('SELECT id, nome FROM refeicoes ORDER BY id LIMIT 5');
    console.table(refeicoes.rows);

    // 6. Verificar produtos disponíveis
    console.log('\n6️⃣ Produtos disponíveis:');
    const produtos = await db.query('SELECT id, nome FROM produtos ORDER BY id LIMIT 5');
    console.table(produtos.rows);

    // 7. Verificar constraints
    console.log('\n7️⃣ Constraints da tabela:');
    const constraints = await db.query(`
      SELECT
        con.conname as constraint_name,
        con.contype as constraint_type,
        CASE con.contype
          WHEN 'p' THEN 'PRIMARY KEY'
          WHEN 'f' THEN 'FOREIGN KEY'
          WHEN 'u' THEN 'UNIQUE'
          WHEN 'c' THEN 'CHECK'
        END as type_description
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'refeicao_produtos';
    `);
    console.table(constraints.rows);

    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

verificarRefeicaoProdutos();
