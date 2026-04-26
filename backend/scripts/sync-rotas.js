const { Client } = require('pg');

// Configuração do banco Neon
const NEON_CONFIG = {
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || ''
};

// Configuração do banco local
const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
};

async function syncRotas() {
  const neonClient = new Client(NEON_CONFIG);
  const localClient = new Client(LOCAL_CONFIG);

  try {
    // Conectar nos dois bancos
    await neonClient.connect();
    await localClient.connect();
    console.log('✅ Conectado nos dois bancos');

    // Buscar rotas do Neon
    const rotasResult = await neonClient.query('SELECT * FROM rotas ORDER BY id');
    console.log(`📋 Encontradas ${rotasResult.rows.length} rotas no Neon`);

    if (rotasResult.rows.length === 0) {
      console.log('⚠️  Nenhuma rota encontrada no banco Neon');
      return;
    }

    // Limpar rotas locais
    await localClient.query('DELETE FROM rotas');
    console.log('🗑️  Rotas locais limpas');

    // Inserir rotas do Neon no banco local
    for (const rota of rotasResult.rows) {
      const insertQuery = `
        INSERT INTO rotas (id, nome, descricao, cor, ativa, tipo, preset_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          nome = EXCLUDED.nome,
          descricao = EXCLUDED.descricao,
          cor = EXCLUDED.cor,
          ativa = EXCLUDED.ativa,
          tipo = EXCLUDED.tipo,
          preset_id = EXCLUDED.preset_id,
          updated_at = EXCLUDED.updated_at
      `;

      await localClient.query(insertQuery, [
        rota.id,
        rota.nome,
        rota.descricao,
        rota.cor,
        rota.ativa,
        rota.tipo,
        rota.preset_id,
        rota.created_at,
        rota.updated_at
      ]);

      console.log(`✅ Rota inserida: ${rota.nome}`);
    }

    // Verificar se há escolas associadas às rotas
    const escolasRotaResult = await neonClient.query('SELECT * FROM rota_escolas ORDER BY rota_id, escola_id');
    console.log(`📋 Encontradas ${escolasRotaResult.rows.length} associações rota-escola no Neon`);

    if (escolasRotaResult.rows.length > 0) {
      // Limpar associações locais
      await localClient.query('DELETE FROM rota_escolas');
      console.log('🗑️  Associações rota-escola locais limpas');

      // Inserir associações do Neon no banco local
      for (const assoc of escolasRotaResult.rows) {
        const insertQuery = `
          INSERT INTO rota_escolas (id, rota_id, escola_id, ordem, created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            rota_id = EXCLUDED.rota_id,
            escola_id = EXCLUDED.escola_id,
            ordem = EXCLUDED.ordem
        `;

        await localClient.query(insertQuery, [
          assoc.id,
          assoc.rota_id,
          assoc.escola_id,
          assoc.ordem,
          assoc.created_at
        ]);
      }
      console.log(`✅ ${escolasRotaResult.rows.length} associações rota-escola inseridas`);
    }

    // Verificar resultado final
    const finalCount = await localClient.query('SELECT COUNT(*) FROM rotas');
    console.log(`🎯 Total de rotas no banco local: ${finalCount.rows[0].count}`);

    console.log('🎉 Sincronização de rotas concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante sincronização:', error.message);
    throw error;
  } finally {
    await neonClient.end();
    await localClient.end();
    console.log('🔌 Conexões fechadas');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  syncRotas()
    .then(() => {
      console.log('✅ Sincronização concluída');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha na sincronização:', error);
      process.exit(1);
    });
}

module.exports = { syncRotas };