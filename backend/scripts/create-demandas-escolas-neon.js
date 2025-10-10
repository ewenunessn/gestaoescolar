const { Pool } = require('pg');

// Configuração do Neon
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function createDemandasEscolas() {
  const pool = new Pool({
    connectionString: NEON_CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🚀 Criando tabela demandas_escolas no Neon PostgreSQL...\n');

    // 1. Verificar se a tabela usuarios existe
    console.log('1. Verificando dependências...');
    const usuariosExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `);

    if (!usuariosExist.rows[0].exists) {
      console.log('⚠️  Criando tabela usuarios...');
      await pool.query(`
        CREATE TABLE usuarios (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          senha VARCHAR(255) NOT NULL,
          tipo VARCHAR(50) DEFAULT 'usuario',
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO usuarios (nome, email, senha, tipo) 
        VALUES ('Sistema', 'sistema@admin.com', '$2b$10$hash', 'admin');
      `);
      console.log('✅ Tabela usuarios criada');
    } else {
      console.log('✅ Tabela usuarios existe');
    }

    // 2. Criar tabela demandas_escolas
    console.log('\n2. Criando tabela demandas_escolas...');
    
    const demandasEscolasExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'demandas_escolas'
      );
    `);

    if (demandasEscolasExist.rows[0].exists) {
      console.log('⚠️  Tabela demandas_escolas já existe, removendo...');
      await pool.query('DROP TABLE demandas_escolas CASCADE;');
    }

    await pool.query(`
      CREATE TABLE demandas_escolas (
        id SERIAL PRIMARY KEY,
        escola_id INTEGER REFERENCES escolas(id) ON DELETE CASCADE,
        escola_nome VARCHAR(255),
        numero_oficio VARCHAR(50) NOT NULL,
        data_solicitacao DATE NOT NULL,
        data_semead DATE,
        objeto TEXT NOT NULL,
        descricao_itens TEXT NOT NULL,
        data_resposta_semead DATE,
        dias_solicitacao INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado_semead', 'atendido', 'nao_atendido')),
        observacoes TEXT,
        usuario_criacao_id INTEGER DEFAULT 1 REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraint para garantir que pelo menos um dos campos de escola esteja preenchido
        CONSTRAINT check_escola_info CHECK (escola_id IS NOT NULL OR (escola_nome IS NOT NULL AND escola_nome != ''))
      );
    `);
    console.log('✅ Tabela demandas_escolas criada');

    // 3. Criar índices
    console.log('\n3. Criando índices...');
    await pool.query(`
      CREATE INDEX idx_demandas_escolas_escola ON demandas_escolas(escola_id);
      CREATE INDEX idx_demandas_escolas_status ON demandas_escolas(status);
      CREATE INDEX idx_demandas_escolas_data_solicitacao ON demandas_escolas(data_solicitacao);
      CREATE INDEX idx_demandas_escolas_usuario_criacao ON demandas_escolas(usuario_criacao_id);
      CREATE INDEX idx_demandas_escolas_objeto ON demandas_escolas USING gin(to_tsvector('portuguese', objeto));
      CREATE INDEX idx_demandas_escolas_escola_nome ON demandas_escolas(escola_nome);
    `);
    console.log('✅ Índices criados');

    // 4. Adicionar comentários
    console.log('\n4. Adicionando comentários...');
    await pool.query(`
      COMMENT ON TABLE demandas_escolas IS 'Demandas das escolas e anexos da Secretaria Municipal de Educação';
      COMMENT ON COLUMN demandas_escolas.escola_nome IS 'Nome da escola/entidade solicitante (pode ser texto livre)';
      COMMENT ON COLUMN demandas_escolas.numero_oficio IS 'Número do ofício solicitante';
      COMMENT ON COLUMN demandas_escolas.data_solicitacao IS 'Data da solicitação';
      COMMENT ON COLUMN demandas_escolas.data_semead IS 'Data de envio à SEMEAD';
      COMMENT ON COLUMN demandas_escolas.objeto IS 'Objeto da solicitação';
      COMMENT ON COLUMN demandas_escolas.descricao_itens IS 'Descrição dos itens solicitados';
      COMMENT ON COLUMN demandas_escolas.data_resposta_semead IS 'Data da resposta da SEMEAD';
      COMMENT ON COLUMN demandas_escolas.dias_solicitacao IS 'Quantidade de dias desde a solicitação (calculado dinamicamente)';
      COMMENT ON COLUMN demandas_escolas.status IS 'Status da demanda: pendente, enviado_semead, atendido, nao_atendido';
    `);
    console.log('✅ Comentários adicionados');

    // 5. Inserir dados de exemplo
    console.log('\n5. Inserindo dados de exemplo...');
    await pool.query(`
      INSERT INTO demandas_escolas (
        escola_nome, numero_oficio, data_solicitacao, data_semead,
        objeto, descricao_itens, status, observacoes
      ) VALUES 
      (
        'Escola Municipal João Silva', 
        '001/2025', 
        '2025-10-01', 
        '2025-10-02',
        'Aquisição de móveis escolares', 
        'Mesas e cadeiras para sala de aula', 
        'enviado_semead',
        'Demanda urgente para início do ano letivo'
      ),
      (
        'CEMEI Maria Santos', 
        '002/2025', 
        '2025-10-05', 
        NULL,
        'Equipamentos de cozinha', 
        'Fogão industrial 6 bocas e geladeira comercial', 
        'pendente',
        NULL
      ),
      (
        'Anexo Educacional Centro', 
        '003/2025', 
        '2025-10-08', 
        '2025-10-09',
        'Material de limpeza', 
        'Produtos de higienização e limpeza geral', 
        'atendido',
        'Entregue conforme solicitado'
      );
    `);
    console.log('✅ Dados de exemplo inseridos');

    // 6. Verificar estrutura final
    console.log('\n6. Verificando estrutura final...');
    const estrutura = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'demandas_escolas' 
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Estrutura da tabela demandas_escolas:');
    estrutura.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // 7. Testar consulta com cálculo dinâmico de dias
    console.log('\n7. Testando consulta com cálculo dinâmico...');
    const teste = await pool.query(`
      SELECT 
        id, numero_oficio, escola_nome, status,
        data_solicitacao, data_semead, data_resposta_semead,
        CASE 
          WHEN data_semead IS NULL THEN NULL
          WHEN data_resposta_semead IS NOT NULL THEN 
            CASE 
              WHEN data_resposta_semead::date = data_semead::date THEN 0
              ELSE (data_resposta_semead::date - data_semead::date)::integer
            END
          WHEN data_semead::date = CURRENT_DATE THEN 0
          ELSE (CURRENT_DATE - data_semead::date)::integer
        END as dias_calculados
      FROM demandas_escolas 
      ORDER BY id;
    `);

    console.log('\n📊 Dados de teste:');
    teste.rows.forEach(row => {
      console.log(`   ${row.numero_oficio} - ${row.escola_nome}`);
      console.log(`   Status: ${row.status} | Dias: ${row.dias_calculados || 'N/A'}`);
      console.log('   ---');
    });

    console.log('\n🎉 Tabela demandas_escolas criada com sucesso no Neon!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Atualizar o modelo no backend para usar "demandas_escolas"');
    console.log('   2. Testar as operações CRUD');
    console.log('   3. Migrar dados existentes se necessário');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createDemandasEscolas();