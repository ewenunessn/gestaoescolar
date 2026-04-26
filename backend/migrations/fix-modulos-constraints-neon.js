const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  await client.connect();
  console.log('✅ Conectado ao Neon\n');

  try {
    // Adicionar PRIMARY KEY na tabela modulos
    console.log('📝 Adicionando PRIMARY KEY em modulos.id...');
    await client.query('ALTER TABLE modulos ADD PRIMARY KEY (id)');
    console.log('✅ PRIMARY KEY adicionada em modulos.id');

    // Adicionar UNIQUE constraint em modulos.slug
    console.log('\n📝 Adicionando UNIQUE constraint em modulos.slug...');
    await client.query('ALTER TABLE modulos ADD CONSTRAINT modulos_slug_unique UNIQUE (slug)');
    console.log('✅ UNIQUE constraint adicionada em modulos.slug');

    // Adicionar PRIMARY KEY na tabela niveis_permissao
    console.log('\n📝 Adicionando PRIMARY KEY em niveis_permissao.id...');
    await client.query('ALTER TABLE niveis_permissao ADD PRIMARY KEY (id)');
    console.log('✅ PRIMARY KEY adicionada em niveis_permissao.id');

    // Adicionar UNIQUE constraint em niveis_permissao.slug
    console.log('\n📝 Adicionando UNIQUE constraint em niveis_permissao.slug...');
    await client.query('ALTER TABLE niveis_permissao ADD CONSTRAINT niveis_permissao_slug_unique UNIQUE (slug)');
    console.log('✅ UNIQUE constraint adicionada em niveis_permissao.slug');

    console.log('\n✅ Todas as constraints foram adicionadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

fix()
  .then(() => {
    console.log('\n✅ Processo concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Processo falhou');
    process.exit(1);
  });
