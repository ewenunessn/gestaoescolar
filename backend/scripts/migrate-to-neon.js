const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do Neon
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function migrateToNeon() {
  const pool = new Pool({
    connectionString: NEON_CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🚀 Iniciando migração para Neon PostgreSQL...\n');

    // 1. Verificar se a tabela usuarios existe (dependência)
    console.log('1. Verificando tabela usuarios...');
    const usuariosExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `);

    if (!usuariosExist.rows[0].exists) {
      console.log('⚠️  Criando tabela usuarios (dependência)...');
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
        
        -- Inserir usuário padrão
        INSERT INTO usuarios (nome, email, senha, tipo) 
        VALUES ('Sistema', 'sistema@admin.com', '$2b$10$hash', 'admin');
      `);
      console.log('✅ Tabela usuarios criada');
    } else {
      console.log('✅ Tabela usuarios já existe');
    }

    // 2. Verificar se a tabela escolas existe (dependência)
    console.log('\n2. Verificando tabela escolas...');
    const escolasExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'escolas'
      );
    `);

    if (!escolasExist.rows[0].exists) {
      console.log('⚠️  Criando tabela escolas (dependência)...');
      await pool.query(`
        CREATE TABLE escolas (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          codigo VARCHAR(50) UNIQUE,
          endereco TEXT,
          telefone VARCHAR(20),
          email VARCHAR(255),
          diretor VARCHAR(255),
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Inserir escola padrão
        INSERT INTO escolas (nome, codigo) 
        VALUES ('Escola Padrão', 'ESC001');
      `);
      console.log('✅ Tabela escolas criada');
    } else {
      console.log('✅ Tabela escolas já existe');
    }

    // 3. Criar/atualizar tabela demandas
    console.log('\n3. Verificando tabela demandas...');
    const demandasExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'demandas'
      );
    `);

    if (!demandasExist.rows[0].exists) {
      console.log('⚠️  Criando tabela demandas...');
      await pool.query(`
        CREATE TABLE demandas (
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
      console.log('✅ Tabela demandas criada');
    } else {
      console.log('✅ Tabela demandas já existe');
      
      // Verificar se o campo escola_nome existe
      console.log('   Verificando campo escola_nome...');
      const escolaNomeExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'demandas' 
          AND column_name = 'escola_nome'
        );
      `);
      
      if (!escolaNomeExists.rows[0].exists) {
        console.log('   ⚠️  Adicionando campo escola_nome...');
        await pool.query(`
          -- Adicionar campo escola_nome
          ALTER TABLE demandas ADD COLUMN escola_nome VARCHAR(255);
          
          -- Atualizar registros existentes com o nome da escola
          UPDATE demandas 
          SET escola_nome = e.nome 
          FROM escolas e 
          WHERE demandas.escola_id = e.id;
          
          -- Tornar escola_id opcional
          ALTER TABLE demandas ALTER COLUMN escola_id DROP NOT NULL;
          
          -- Adicionar constraint para garantir que pelo menos um dos campos esteja preenchido
          ALTER TABLE demandas ADD CONSTRAINT check_escola_info 
          CHECK (escola_id IS NOT NULL OR (escola_nome IS NOT NULL AND escola_nome != ''));
        `);
        console.log('   ✅ Campo escola_nome adicionado');
      } else {
        console.log('   ✅ Campo escola_nome já existe');
      }
    }

    // 4. Criar índices para performance
    console.log('\n4. Criando índices...');
    await pool.query(`
      -- Índices para melhorar performance (IF NOT EXISTS não funciona em todos os PostgreSQL, então usamos DO $$ BEGIN ... EXCEPTION)
      DO $$ 
      BEGIN
        -- Índice para escola_id
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_demandas_escola') THEN
          CREATE INDEX idx_demandas_escola ON demandas(escola_id);
        END IF;
        
        -- Índice para status
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_demandas_status') THEN
          CREATE INDEX idx_demandas_status ON demandas(status);
        END IF;
        
        -- Índice para data_solicitacao
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_demandas_data_solicitacao') THEN
          CREATE INDEX idx_demandas_data_solicitacao ON demandas(data_solicitacao);
        END IF;
        
        -- Índice para usuario_criacao_id
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_demandas_usuario_criacao') THEN
          CREATE INDEX idx_demandas_usuario_criacao ON demandas(usuario_criacao_id);
        END IF;
        
        -- Índice para busca no objeto
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_demandas_objeto') THEN
          CREATE INDEX idx_demandas_objeto ON demandas USING gin(to_tsvector('portuguese', objeto));
        END IF;
        
        -- Índice para escola_nome
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_demandas_escola_nome') THEN
          CREATE INDEX idx_demandas_escola_nome ON demandas(escola_nome);
        END IF;
      END $$;
    `);
    console.log('✅ Índices criados/verificados');

    // 5. Adicionar comentários
    console.log('\n5. Adicionando comentários...');
    await pool.query(`
      COMMENT ON TABLE demandas IS 'Demandas das escolas e anexos da Secretaria Municipal de Educação';
      COMMENT ON COLUMN demandas.escola_nome IS 'Nome da escola/entidade solicitante (pode ser texto livre)';
      COMMENT ON COLUMN demandas.numero_oficio IS 'Número do ofício solicitante';
      COMMENT ON COLUMN demandas.data_solicitacao IS 'Data da solicitação';
      COMMENT ON COLUMN demandas.data_semead IS 'Data de envio à SEMEAD';
      COMMENT ON COLUMN demandas.objeto IS 'Objeto da solicitação';
      COMMENT ON COLUMN demandas.descricao_itens IS 'Descrição dos itens solicitados';
      COMMENT ON COLUMN demandas.data_resposta_semead IS 'Data da resposta da SEMEAD';
      COMMENT ON COLUMN demandas.dias_solicitacao IS 'Quantidade de dias desde a solicitação (calculado dinamicamente)';
      COMMENT ON COLUMN demandas.status IS 'Status da demanda: pendente, enviado_semead, atendido, nao_atendido';
    `);
    console.log('✅ Comentários adicionados');

    // 6. Verificar estrutura final
    console.log('\n6. Verificando estrutura final...');
    const estrutura = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'demandas' 
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Estrutura da tabela demandas:');
    estrutura.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // 7. Testar uma consulta
    console.log('\n7. Testando consulta...');
    const teste = await pool.query(`
      SELECT COUNT(*) as total_demandas FROM demandas;
    `);
    console.log(`✅ Total de demandas: ${teste.rows[0].total_demandas}`);

    console.log('\n🎉 Migração concluída com sucesso!');
    console.log('\n📝 Resumo:');
    console.log('   ✅ Tabela demandas criada/atualizada');
    console.log('   ✅ Campo escola_nome adicionado');
    console.log('   ✅ Índices de performance criados');
    console.log('   ✅ Constraints de integridade aplicadas');
    console.log('   ✅ Sistema pronto para uso no Neon!');

  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar migração
migrateToNeon();