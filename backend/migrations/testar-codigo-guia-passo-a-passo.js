const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function testarPassoAPasso() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testando migração passo a passo...\n');

    // Passo 1: Adicionar coluna
    console.log('1️⃣ Adicionando coluna codigo_guia...');
    await client.query(`
      ALTER TABLE guias
      ADD COLUMN IF NOT EXISTS codigo_guia VARCHAR(50)
    `);
    console.log('✅ Coluna adicionada\n');

    // Passo 2: Criar índice
    console.log('2️⃣ Criando índice...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_guias_codigo ON guias(codigo_guia)
    `);
    console.log('✅ Índice criado\n');

    // Passo 3: Criar função
    console.log('3️⃣ Criando função gerar_codigo_guia...');
    await client.query(`
      CREATE OR REPLACE FUNCTION gerar_codigo_guia(p_mes INTEGER, p_ano INTEGER)
      RETURNS VARCHAR AS $$
      DECLARE
        sequencia INTEGER;
        mes_str VARCHAR(2);
        ano_str VARCHAR(4);
        codigo VARCHAR(50);
      BEGIN
        mes_str := LPAD(p_mes::TEXT, 2, '0');
        ano_str := p_ano::TEXT;
        
        SELECT COALESCE(MAX(
          CAST(SUBSTRING(codigo_guia FROM 'GUIA-[0-9]{4}-[0-9]{2}-([0-9]{5})') AS INTEGER)
        ), 0) + 1
        INTO sequencia
        FROM guias
        WHERE codigo_guia LIKE 'GUIA-' || ano_str || '-' || mes_str || '-%';
        
        codigo := 'GUIA-' || ano_str || '-' || mes_str || '-' || LPAD(sequencia::TEXT, 5, '0');
        
        RETURN codigo;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função criada\n');

    // Passo 4: Testar função
    console.log('4️⃣ Testando função...');
    const teste = await client.query(`SELECT gerar_codigo_guia(3, 2026) as codigo`);
    console.log('   Código gerado:', teste.rows[0].codigo);
    console.log('✅ Função funcionando\n');

    // Passo 5: Preencher códigos existentes
    console.log('5️⃣ Preenchendo códigos para guias existentes...');
    const guias = await client.query(`
      SELECT id, mes, ano 
      FROM guias 
      WHERE codigo_guia IS NULL
      ORDER BY ano, mes, id
    `);

    console.log(`   Encontradas ${guias.rows.length} guias sem código`);

    for (const guia of guias.rows) {
      const codigoResult = await client.query(
        `SELECT gerar_codigo_guia($1, $2) as codigo`,
        [guia.mes, guia.ano]
      );
      const novoCodigo = codigoResult.rows[0].codigo;

      await client.query(
        `UPDATE guias SET codigo_guia = $1 WHERE id = $2`,
        [novoCodigo, guia.id]
      );

      console.log(`   Guia ID ${guia.id} (${guia.mes}/${guia.ano}) → ${novoCodigo}`);
    }
    console.log('✅ Códigos preenchidos\n');

    // Passo 6: Tornar obrigatório
    console.log('6️⃣ Tornando campo obrigatório...');
    await client.query(`
      ALTER TABLE guias
      ALTER COLUMN codigo_guia SET NOT NULL
    `);
    console.log('✅ Campo agora é obrigatório\n');

    // Passo 7: Adicionar constraint UNIQUE
    console.log('7️⃣ Adicionando constraint UNIQUE...');
    await client.query(`
      ALTER TABLE guias
      ADD CONSTRAINT guias_codigo_guia_key UNIQUE (codigo_guia)
    `);
    console.log('✅ Constraint adicionada\n');

    // Verificação final
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(codigo_guia) as com_codigo
      FROM guias
    `);

    console.log('📊 Estatísticas finais:');
    console.log(`   Total de guias: ${stats.rows[0].total}`);
    console.log(`   Com código: ${stats.rows[0].com_codigo}`);

    // Exemplos
    const exemplos = await client.query(`
      SELECT codigo_guia, mes, ano, nome
      FROM guias
      ORDER BY ano DESC, mes DESC
      LIMIT 5
    `);

    console.log('\n📦 Exemplos:');
    exemplos.rows.forEach(g => {
      console.log(`   ${g.codigo_guia} - ${g.nome || `Guia ${g.mes}/${g.ano}`}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testarPassoAPasso();
