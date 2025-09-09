const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function addUnidadeMedidaEscolaHistorico() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    // Verificar se a coluna já existe
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'estoque_escolas_historico' 
      AND column_name = 'unidade_medida'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('⚠️ Coluna unidade_medida já existe na tabela estoque_escolas_historico');
    } else {
      // Adicionar coluna unidade_medida
      await client.query(`
        ALTER TABLE estoque_escolas_historico 
        ADD COLUMN unidade_medida VARCHAR(50)
      `);
      console.log('✅ Coluna unidade_medida adicionada na tabela estoque_escolas_historico');
    }

    // Verificar estrutura da coluna
    const columnInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'estoque_escolas_historico' 
      AND column_name = 'unidade_medida'
    `);
    
    console.log('📋 Estrutura da coluna:', columnInfo.rows[0]);

    // Atualizar registros existentes com a unidade de medida atual do produto
    const updateResult = await client.query(`
      UPDATE estoque_escolas_historico 
      SET unidade_medida = p.unidade
      FROM produtos p
      WHERE estoque_escolas_historico.produto_id = p.id
      AND estoque_escolas_historico.unidade_medida IS NULL
    `);

    console.log(`✅ ${updateResult.rowCount} registros atualizados com unidade de medida`);

    // Verificar quantos registros têm unidade_medida preenchida
    const countResult = await client.query(`
      SELECT COUNT(*) as total_com_unidade 
      FROM estoque_escolas_historico 
      WHERE unidade_medida IS NOT NULL
    `);

    console.log(`📊 Total de registros com unidade_medida: ${countResult.rows[0].total_com_unidade}`);
    console.log('🎉 Campo unidade_medida adicionado com sucesso na tabela estoque_escolas_historico!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

addUnidadeMedidaEscolaHistorico();