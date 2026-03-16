require('dotenv').config();
const { Client } = require('pg');

async function verificarECriarPeriodos() {
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao Neon\n');

    // Verificar se a tabela periodos existe
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'periodos'
      );
    `);

    const tabelaExiste = checkTable.rows[0].exists;
    console.log(`📊 Tabela periodos existe: ${tabelaExiste ? 'SIM' : 'NÃO'}\n`);

    if (!tabelaExiste) {
      console.log('📝 Criando tabela periodos...\n');
      
      // Criar tabela
      await client.query(`
        CREATE TABLE periodos (
          id SERIAL PRIMARY KEY,
          ano INTEGER NOT NULL UNIQUE,
          descricao VARCHAR(255),
          data_inicio DATE NOT NULL,
          data_fim DATE NOT NULL,
          ativo BOOLEAN DEFAULT false,
          fechado BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabela criada\n');

      // Criar índices
      await client.query(`CREATE INDEX IF NOT EXISTS idx_periodos_ano ON periodos(ano);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_periodos_ativo ON periodos(ativo);`);
      console.log('✅ Índices criados\n');

      // Criar trigger para garantir apenas um período ativo
      await client.query(`
        CREATE OR REPLACE FUNCTION fn_apenas_um_periodo_ativo()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.ativo = true THEN
            UPDATE periodos SET ativo = false WHERE id != NEW.id;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS trg_apenas_um_periodo_ativo ON periodos;
        CREATE TRIGGER trg_apenas_um_periodo_ativo
        BEFORE INSERT OR UPDATE ON periodos
        FOR EACH ROW
        EXECUTE FUNCTION fn_apenas_um_periodo_ativo();
      `);
      console.log('✅ Trigger criado\n');

      // Inserir períodos padrão
      await client.query(`
        INSERT INTO periodos (ano, descricao, data_inicio, data_fim, ativo)
        VALUES 
          (2024, 'Ano Letivo 2024', '2024-01-01', '2024-12-31', false),
          (2025, 'Ano Letivo 2025', '2025-01-01', '2025-12-31', false),
          (2026, 'Ano Letivo 2026', '2026-01-01', '2026-12-31', true)
        ON CONFLICT (ano) DO NOTHING;
      `);
      console.log('✅ Períodos padrão inseridos\n');
    }

    // Adicionar periodo_id nas tabelas se não existir
    const tabelas = ['pedidos', 'guias', 'cardapios', 'faturamentos'];
    
    for (const tabela of tabelas) {
      const checkColumn = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = '${tabela}' 
          AND column_name = 'periodo_id'
        );
      `);

      if (!checkColumn.rows[0].exists) {
        console.log(`📝 Adicionando periodo_id em ${tabela}...`);
        await client.query(`ALTER TABLE ${tabela} ADD COLUMN periodo_id INTEGER REFERENCES periodos(id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${tabela}_periodo ON ${tabela}(periodo_id);`);
        console.log(`✅ Coluna adicionada em ${tabela}\n`);
      } else {
        console.log(`✅ Coluna periodo_id já existe em ${tabela}`);
      }
    }

    // Criar triggers de atribuição automática
    console.log('\n📝 Criando triggers de atribuição automática...\n');

    // Trigger para pedidos
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_atribuir_periodo_pedido()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.periodo_id IS NULL THEN
          SELECT id INTO NEW.periodo_id 
          FROM periodos 
          WHERE NEW.data_pedido BETWEEN data_inicio AND data_fim
          ORDER BY ativo DESC, ano DESC
          LIMIT 1;
          
          IF NEW.periodo_id IS NULL THEN
            SELECT id INTO NEW.periodo_id FROM periodos WHERE ativo = true LIMIT 1;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_pedidos_atribuir_periodo ON pedidos;
      CREATE TRIGGER trg_pedidos_atribuir_periodo
      BEFORE INSERT ON pedidos
      FOR EACH ROW
      EXECUTE FUNCTION fn_atribuir_periodo_pedido();
    `);

    // Trigger para guias
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_atribuir_periodo_guia()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.periodo_id IS NULL THEN
          SELECT id INTO NEW.periodo_id FROM periodos WHERE ativo = true LIMIT 1;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_guias_atribuir_periodo ON guias;
      CREATE TRIGGER trg_guias_atribuir_periodo
      BEFORE INSERT ON guias
      FOR EACH ROW
      EXECUTE FUNCTION fn_atribuir_periodo_guia();
    `);

    // Trigger para cardapios
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_atribuir_periodo_cardapio()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.periodo_id IS NULL THEN
          SELECT id INTO NEW.periodo_id FROM periodos WHERE ativo = true LIMIT 1;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_cardapios_atribuir_periodo ON cardapios;
      CREATE TRIGGER trg_cardapios_atribuir_periodo
      BEFORE INSERT ON cardapios
      FOR EACH ROW
      EXECUTE FUNCTION fn_atribuir_periodo_cardapio();
    `);

    console.log('✅ Triggers criados\n');

    // Atualizar registros existentes
    console.log('📝 Atualizando registros existentes...\n');
    
    const periodoAtivo = await client.query('SELECT id FROM periodos WHERE ativo = true LIMIT 1');
    if (periodoAtivo.rows.length > 0) {
      const periodoId = periodoAtivo.rows[0].id;
      
      for (const tabela of tabelas) {
        const result = await client.query(`
          UPDATE ${tabela} 
          SET periodo_id = $1 
          WHERE periodo_id IS NULL
        `, [periodoId]);
        console.log(`✅ ${result.rowCount} registros atualizados em ${tabela}`);
      }
    }

    console.log('\n✅ MIGRAÇÃO COMPLETA!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada\n');
  }
}

verificarECriarPeriodos().catch(console.error);
