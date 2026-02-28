#!/usr/bin/env node
/**
 * Script para aplicar a migration de histórico de entregas
 * Funciona tanto no banco local quanto no Neon
 * 
 * Uso:
 *   node backend/scripts/apply-historico-entregas.js
 * 
 * Ou com URL específica:
 *   DATABASE_URL="postgresql://..." node backend/scripts/apply-historico-entregas.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Defina DATABASE_URL ou POSTGRES_URL no ambiente.');
  console.error('Exemplo: DATABASE_URL="postgresql://user:pass@host/db" node apply-historico-entregas.js');
  process.exit(1);
}

// Detectar se é local ou Neon
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const isNeon = connectionString.includes('neon.tech');

console.log('🔍 Detectando ambiente...');
console.log(`   ${isLocal ? '💻 Banco LOCAL' : isNeon ? '☁️  Banco NEON' : '🌐 Banco REMOTO'}`);
console.log(`   Host: ${connectionString.split('@')[1]?.split('/')[0] || 'desconhecido'}`);

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function executarSQL(sql, descricao) {
  try {
    console.log(`\n📝 ${descricao}...`);
    const result = await pool.query(sql);
    console.log(`   ✅ Sucesso! ${result.rowCount || 0} linha(s) afetada(s)`);
    return result;
  } catch (error) {
    // Ignorar erros de "já existe"
    if (error.message.includes('already exists') || 
        error.message.includes('já existe') ||
        error.message.includes('duplicate')) {
      console.log(`   ⚠️  Já existe, pulando...`);
      return null;
    }
    throw error;
  }
}

async function main() {
  try {
    console.log('\n🚀 Iniciando aplicação da migration de histórico de entregas...\n');

    // 1. Adicionar coluna assinatura_base64
    await executarSQL(`
      ALTER TABLE guia_produto_escola 
      ADD COLUMN IF NOT EXISTS assinatura_base64 TEXT;
    `, 'Adicionando coluna assinatura_base64');

    // 2. Adicionar coluna quantidade_total_entregue
    await executarSQL(`
      ALTER TABLE guia_produto_escola 
      ADD COLUMN IF NOT EXISTS quantidade_total_entregue NUMERIC DEFAULT 0;
    `, 'Adicionando coluna quantidade_total_entregue');

    // 3. Verificar e criar chave primária se necessário
    console.log('\n🔑 Verificando chave primária...');
    const pkCheck = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'guia_produto_escola' 
        AND constraint_type = 'PRIMARY KEY';
    `);
    
    if (pkCheck.rows.length === 0) {
      console.log('   ⚠️  Chave primária não encontrada, criando...');
      await executarSQL(`
        ALTER TABLE guia_produto_escola 
        ADD PRIMARY KEY (id);
      `, 'Adicionando chave primária');
    } else {
      console.log('   ✅ Chave primária já existe');
    }

    // 4. Criar tabela historico_entregas
    await executarSQL(`
      CREATE TABLE IF NOT EXISTS historico_entregas (
        id SERIAL PRIMARY KEY,
        guia_produto_escola_id INTEGER NOT NULL REFERENCES guia_produto_escola(id) ON DELETE CASCADE,
        quantidade_entregue NUMERIC NOT NULL CHECK (quantidade_entregue > 0),
        data_entrega TIMESTAMP NOT NULL DEFAULT NOW(),
        nome_quem_entregou VARCHAR(255) NOT NULL,
        nome_quem_recebeu VARCHAR(255) NOT NULL,
        observacao TEXT,
        assinatura_base64 TEXT,
        latitude NUMERIC,
        longitude NUMERIC,
        precisao_gps NUMERIC,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `, 'Criando tabela historico_entregas');

    // 5. Criar índices
    await executarSQL(`
      CREATE INDEX IF NOT EXISTS idx_historico_entregas_guia_produto 
      ON historico_entregas(guia_produto_escola_id);
    `, 'Criando índice idx_historico_entregas_guia_produto');

    await executarSQL(`
      CREATE INDEX IF NOT EXISTS idx_historico_entregas_data 
      ON historico_entregas(data_entrega);
    `, 'Criando índice idx_historico_entregas_data');

    await executarSQL(`
      CREATE INDEX IF NOT EXISTS idx_historico_entregas_recebedor 
      ON historico_entregas(nome_quem_recebeu);
    `, 'Criando índice idx_historico_entregas_recebedor');

    // 6. Criar função de trigger
    await executarSQL(`
      CREATE OR REPLACE FUNCTION update_historico_entregas_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `, 'Criando função de trigger');

    // 7. Criar trigger
    await executarSQL(`
      DROP TRIGGER IF EXISTS trigger_historico_entregas_updated_at ON historico_entregas;
      CREATE TRIGGER trigger_historico_entregas_updated_at
        BEFORE UPDATE ON historico_entregas
        FOR EACH ROW
        EXECUTE FUNCTION update_historico_entregas_updated_at();
    `, 'Criando trigger de updated_at');

    // 8. Migrar dados existentes
    console.log('\n📦 Migrando dados existentes...');
    const migracao = await pool.query(`
      INSERT INTO historico_entregas (
        guia_produto_escola_id,
        quantidade_entregue,
        data_entrega,
        nome_quem_entregou,
        nome_quem_recebeu,
        observacao,
        assinatura_base64,
        latitude,
        longitude,
        precisao_gps,
        created_at
      )
      SELECT 
        id,
        COALESCE(quantidade_entregue, quantidade) as quantidade_entregue,
        COALESCE(data_entrega, NOW()) as data_entrega,
        COALESCE(nome_quem_entregou, 'Sistema') as nome_quem_entregou,
        COALESCE(nome_quem_recebeu, 'Não informado') as nome_quem_recebeu,
        observacao,
        assinatura_base64,
        latitude,
        longitude,
        precisao_gps,
        COALESCE(data_entrega, NOW())
      FROM guia_produto_escola
      WHERE entrega_confirmada = true
        AND NOT EXISTS (
          SELECT 1 FROM historico_entregas he 
          WHERE he.guia_produto_escola_id = guia_produto_escola.id
        )
      RETURNING id;
    `);
    console.log(`   ✅ ${migracao.rowCount} registro(s) migrado(s)`);

    // 9. Atualizar quantidade_total_entregue
    await executarSQL(`
      UPDATE guia_produto_escola gpe
      SET quantidade_total_entregue = (
        SELECT COALESCE(SUM(quantidade_entregue), 0)
        FROM historico_entregas he
        WHERE he.guia_produto_escola_id = gpe.id
      )
      WHERE EXISTS (
        SELECT 1 FROM historico_entregas he 
        WHERE he.guia_produto_escola_id = gpe.id
      );
    `, 'Atualizando quantidade_total_entregue');

    // 10. Criar view
    await executarSQL(`
      CREATE OR REPLACE VIEW vw_entregas_completas AS
      SELECT 
        gpe.id as item_id,
        gpe.guia_id,
        gpe.produto_id,
        gpe.escola_id,
        gpe.quantidade as quantidade_programada,
        gpe.unidade,
        COALESCE(gpe.quantidade_total_entregue, 0) as quantidade_total_entregue,
        (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente,
        gpe.entrega_confirmada,
        gpe.para_entrega,
        p.nome as produto_nome,
        e.nome as escola_nome,
        g.mes,
        g.ano,
        COUNT(he.id) as total_entregas,
        MAX(he.data_entrega) as ultima_entrega,
        json_agg(
          json_build_object(
            'id', he.id,
            'quantidade', he.quantidade_entregue,
            'data', he.data_entrega,
            'entregador', he.nome_quem_entregou,
            'recebedor', he.nome_quem_recebeu,
            'observacao', he.observacao
          ) ORDER BY he.data_entrega DESC
        ) FILTER (WHERE he.id IS NOT NULL) as historico_entregas
      FROM guia_produto_escola gpe
      LEFT JOIN produtos p ON gpe.produto_id = p.id
      LEFT JOIN escolas e ON gpe.escola_id = e.id
      LEFT JOIN guias g ON gpe.guia_id = g.id
      LEFT JOIN historico_entregas he ON gpe.id = he.guia_produto_escola_id
      GROUP BY gpe.id, p.nome, e.nome, g.mes, g.ano;
    `, 'Criando view vw_entregas_completas');

    // 11. Verificar resultado
    console.log('\n📊 Verificando resultado...');
    const stats = await pool.query(`
      SELECT 
        'Registros no histórico' as metrica,
        COUNT(*) as valor
      FROM historico_entregas
      UNION ALL
      SELECT 
        'Itens com entregas' as metrica,
        COUNT(*) as valor
      FROM guia_produto_escola
      WHERE quantidade_total_entregue > 0
      UNION ALL
      SELECT 
        'Itens pendentes' as metrica,
        COUNT(*) as valor
      FROM guia_produto_escola
      WHERE para_entrega = true AND entrega_confirmada = false;
    `);

    console.log('\n📈 Estatísticas:');
    stats.rows.forEach(row => {
      console.log(`   ${row.metrica}: ${row.valor}`);
    });

    console.log('\n✅ Migration aplicada com sucesso!\n');

  } catch (error) {
    console.error('\n❌ Erro ao aplicar migration:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
