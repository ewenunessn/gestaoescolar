// Migration para adicionar controle de validade no sistema de entregas
const db = require('../src/database');

async function up() {
  console.log('🔄 Iniciando migration: Controle de Validade');

  try {
    // 1. Adicionar campos de validade na tabela guias_itens
    console.log('📝 Adicionando campos de validade em guias_itens...');
    await db.query(`
      ALTER TABLE guias_itens 
      ADD COLUMN IF NOT EXISTS data_validade DATE,
      ADD COLUMN IF NOT EXISTS lote_origem VARCHAR(100),
      ADD COLUMN IF NOT EXISTS dias_para_vencimento INTEGER GENERATED ALWAYS AS (
        CASE 
          WHEN data_validade IS NOT NULL 
          THEN EXTRACT(DAY FROM (data_validade - CURRENT_DATE))
          ELSE NULL 
        END
      ) STORED
    `);

    // 2. Criar tabela para controle de lotes com validade nas entregas
    console.log('📝 Criando tabela entregas_lotes...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS entregas_lotes (
        id SERIAL PRIMARY KEY,
        guia_item_id INTEGER NOT NULL REFERENCES guias_itens(id),
        lote VARCHAR(100) NOT NULL,
        data_validade DATE NOT NULL,
        quantidade_lote NUMERIC NOT NULL DEFAULT 0,
        quantidade_entregue NUMERIC NOT NULL DEFAULT 0,
        prioridade_saida INTEGER DEFAULT 1, -- 1=alta (vence primeiro), 2=média, 3=baixa
        status VARCHAR(20) DEFAULT 'ativo', -- ativo, esgotado, vencido
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Criar índices para performance
    console.log('📝 Criando índices...');
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_guias_itens_validade ON guias_itens(data_validade);
      CREATE INDEX IF NOT EXISTS idx_guias_itens_dias_vencimento ON guias_itens(dias_para_vencimento);
      CREATE INDEX IF NOT EXISTS idx_entregas_lotes_validade ON entregas_lotes(data_validade);
      CREATE INDEX IF NOT EXISTS idx_entregas_lotes_prioridade ON entregas_lotes(prioridade_saida, data_validade);
      CREATE INDEX IF NOT EXISTS idx_entregas_lotes_guia_item ON entregas_lotes(guia_item_id);
    `);

    // 4. Criar função para calcular prioridade de saída baseada na validade
    console.log('📝 Criando função de prioridade...');
    await db.query(`
      CREATE OR REPLACE FUNCTION calcular_prioridade_saida(data_validade DATE)
      RETURNS INTEGER AS $$
      DECLARE
        dias_restantes INTEGER;
      BEGIN
        dias_restantes := EXTRACT(DAY FROM (data_validade - CURRENT_DATE));
        
        -- Prioridade alta: vence em até 7 dias
        IF dias_restantes <= 7 THEN
          RETURN 1;
        -- Prioridade média: vence em até 30 dias
        ELSIF dias_restantes <= 30 THEN
          RETURN 2;
        -- Prioridade baixa: vence em mais de 30 dias
        ELSE
          RETURN 3;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 5. Criar trigger para atualizar prioridade automaticamente
    console.log('📝 Criando trigger de prioridade...');
    await db.query(`
      CREATE OR REPLACE FUNCTION update_prioridade_saida()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.prioridade_saida := calcular_prioridade_saida(NEW.data_validade);
        NEW.updated_at := CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_update_prioridade ON entregas_lotes;
      CREATE TRIGGER trigger_update_prioridade
        BEFORE INSERT OR UPDATE ON entregas_lotes
        FOR EACH ROW
        EXECUTE FUNCTION update_prioridade_saida();
    `);

    // 6. Criar view para itens com validade próxima
    console.log('📝 Criando view de validades próximas...');
    await db.query(`
      CREATE OR REPLACE VIEW vw_itens_validade_proxima AS
      SELECT 
        gi.id as guia_item_id,
        gi.guia_id,
        gi.produto_id,
        gi.escola_id,
        gi.quantidade,
        gi.data_validade,
        gi.dias_para_vencimento,
        gi.lote_origem,
        p.nome as produto_nome,
        p.unidade,
        e.nome as escola_nome,
        g.mes,
        g.ano,
        CASE 
          WHEN gi.dias_para_vencimento <= 0 THEN 'vencido'
          WHEN gi.dias_para_vencimento <= 7 THEN 'critico'
          WHEN gi.dias_para_vencimento <= 30 THEN 'atencao'
          ELSE 'normal'
        END as status_validade
      FROM guias_itens gi
      JOIN produtos p ON p.id = gi.produto_id
      JOIN escolas e ON e.id = gi.escola_id
      JOIN guias g ON g.id = gi.guia_id
      WHERE gi.data_validade IS NOT NULL
        AND gi.para_entrega = true
        AND gi.entrega_confirmada = false
      ORDER BY gi.data_validade ASC, gi.dias_para_vencimento ASC
    `);

    // 7. Criar função para sugerir itens por validade
    console.log('📝 Criando função de sugestão inteligente...');
    await db.query(`
      CREATE OR REPLACE FUNCTION sugerir_itens_por_validade(
        p_escola_id INTEGER DEFAULT NULL,
        p_produto_id INTEGER DEFAULT NULL,
        p_dias_limite INTEGER DEFAULT 30
      )
      RETURNS TABLE (
        guia_item_id INTEGER,
        produto_nome VARCHAR,
        quantidade NUMERIC,
        data_validade DATE,
        dias_restantes INTEGER,
        prioridade VARCHAR,
        lote_origem VARCHAR,
        escola_nome VARCHAR
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          v.guia_item_id,
          v.produto_nome,
          v.quantidade,
          v.data_validade,
          v.dias_para_vencimento,
          v.status_validade,
          v.lote_origem,
          v.escola_nome
        FROM vw_itens_validade_proxima v
        WHERE (p_escola_id IS NULL OR v.escola_id = p_escola_id)
          AND (p_produto_id IS NULL OR v.produto_id = p_produto_id)
          AND v.dias_para_vencimento <= p_dias_limite
        ORDER BY 
          CASE v.status_validade
            WHEN 'vencido' THEN 1
            WHEN 'critico' THEN 2
            WHEN 'atencao' THEN 3
            ELSE 4
          END,
          v.data_validade ASC;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Migration concluída com sucesso!');
    
    // Mostrar estatísticas
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_itens,
        COUNT(CASE WHEN data_validade IS NOT NULL THEN 1 END) as itens_com_validade,
        COUNT(CASE WHEN dias_para_vencimento <= 7 THEN 1 END) as itens_criticos,
        COUNT(CASE WHEN dias_para_vencimento <= 30 THEN 1 END) as itens_atencao
      FROM guias_itens 
      WHERE para_entrega = true AND entrega_confirmada = false
    `);
    
    console.log('📊 Estatísticas após migration:', stats.rows[0]);

  } catch (error) {
    console.error('❌ Erro na migration:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Revertendo migration: Controle de Validade');

  try {
    // Remover em ordem reversa
    await db.query('DROP VIEW IF EXISTS vw_itens_validade_proxima CASCADE');
    await db.query('DROP FUNCTION IF EXISTS sugerir_itens_por_validade CASCADE');
    await db.query('DROP FUNCTION IF EXISTS calcular_prioridade_saida CASCADE');
    await db.query('DROP FUNCTION IF EXISTS update_prioridade_saida CASCADE');
    await db.query('DROP TABLE IF EXISTS entregas_lotes CASCADE');
    
    await db.query(`
      ALTER TABLE guias_itens 
      DROP COLUMN IF EXISTS data_validade,
      DROP COLUMN IF EXISTS lote_origem,
      DROP COLUMN IF EXISTS dias_para_vencimento
    `);

    console.log('✅ Migration revertida com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao reverter migration:', error);
    throw error;
  }
}

module.exports = { up, down };