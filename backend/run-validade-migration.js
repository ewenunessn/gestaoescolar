const { Client } = require('pg');
require('dotenv').config();

async function runValidadeMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco Neon');

    console.log('🔄 Iniciando migration: Controle de Validade');

    // 1. Verificar tabelas existentes
    console.log('📝 Verificando tabelas existentes...');
    const tabelas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name LIKE '%estoque%'
      ORDER BY table_name
    `);
    
    console.log('Tabelas de estoque encontradas:');
    tabelas.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // 2. Adicionar campos de validade na tabela estoque_escolas
    console.log('📝 Adicionando campos de validade em estoque_escolas...');
    await client.query(`
      ALTER TABLE estoque_escolas 
      ADD COLUMN IF NOT EXISTS data_validade_proxima DATE,
      ADD COLUMN IF NOT EXISTS lote_proximo_vencimento VARCHAR(100),
      ADD COLUMN IF NOT EXISTS dias_para_vencimento INTEGER,
      ADD COLUMN IF NOT EXISTS status_validade VARCHAR(20) DEFAULT 'normal',
      ADD COLUMN IF NOT EXISTS tem_lotes_vencidos BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tem_lotes_criticos BOOLEAN DEFAULT FALSE
    `);

    // 3. Criar tabela para controle de lotes de estoque escolar
    console.log('📝 Criando tabela estoque_escolar_lotes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS estoque_escolar_lotes (
        id SERIAL PRIMARY KEY,
        estoque_escola_id INTEGER NOT NULL REFERENCES estoque_escolas(id),
        produto_id INTEGER NOT NULL REFERENCES produtos(id),
        escola_id INTEGER NOT NULL REFERENCES escolas(id),
        lote VARCHAR(100) NOT NULL,
        data_fabricacao DATE,
        data_validade DATE,
        quantidade_inicial NUMERIC NOT NULL DEFAULT 0,
        quantidade_atual NUMERIC NOT NULL DEFAULT 0,
        prioridade_saida INTEGER DEFAULT 1, -- 1=alta (vence primeiro), 2=média, 3=baixa
        status VARCHAR(20) DEFAULT 'ativo', -- ativo, esgotado, vencido
        observacoes TEXT,
        fornecedor_id INTEGER,
        nota_fiscal VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(produto_id, escola_id, lote)
      )
    `);

    // 4. Criar índices para performance
    console.log('📝 Criando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_estoque_escolas_validade ON estoque_escolas(data_validade_proxima);
      CREATE INDEX IF NOT EXISTS idx_estoque_escolas_dias_vencimento ON estoque_escolas(dias_para_vencimento);
      CREATE INDEX IF NOT EXISTS idx_estoque_escolas_status_validade ON estoque_escolas(status_validade);
      CREATE INDEX IF NOT EXISTS idx_estoque_escolar_lotes_validade ON estoque_escolar_lotes(data_validade);
      CREATE INDEX IF NOT EXISTS idx_estoque_escolar_lotes_prioridade ON estoque_escolar_lotes(prioridade_saida, data_validade);
      CREATE INDEX IF NOT EXISTS idx_estoque_escolar_lotes_produto ON estoque_escolar_lotes(produto_id);
      CREATE INDEX IF NOT EXISTS idx_estoque_escolar_lotes_escola ON estoque_escolar_lotes(escola_id);
      CREATE INDEX IF NOT EXISTS idx_estoque_escolar_lotes_status ON estoque_escolar_lotes(status);
    `);

    // 5. Criar função para calcular prioridade de saída baseada na validade
    console.log('📝 Criando função de prioridade...');
    await client.query(`
      CREATE OR REPLACE FUNCTION calcular_prioridade_saida_estoque(data_validade DATE)
      RETURNS INTEGER AS $$
      DECLARE
        dias_restantes INTEGER;
      BEGIN
        IF data_validade IS NULL THEN
          RETURN 3; -- Prioridade baixa para itens sem validade
        END IF;
        
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

    // 6. Criar função para calcular status de validade
    console.log('📝 Criando função de status de validade...');
    await client.query(`
      CREATE OR REPLACE FUNCTION calcular_status_validade(data_validade DATE)
      RETURNS VARCHAR AS $$
      DECLARE
        dias_restantes INTEGER;
      BEGIN
        IF data_validade IS NULL THEN
          RETURN 'normal';
        END IF;
        
        dias_restantes := EXTRACT(DAY FROM (data_validade - CURRENT_DATE));
        
        IF dias_restantes <= 0 THEN
          RETURN 'vencido';
        ELSIF dias_restantes <= 7 THEN
          RETURN 'critico';
        ELSIF dias_restantes <= 30 THEN
          RETURN 'atencao';
        ELSE
          RETURN 'normal';
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 7. Criar trigger para atualizar prioridade automaticamente nos lotes
    console.log('📝 Criando trigger de prioridade para lotes...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_lote_prioridade()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.prioridade_saida := calcular_prioridade_saida_estoque(NEW.data_validade);
        NEW.updated_at := CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_update_lote_prioridade ON estoque_escolar_lotes;
      CREATE TRIGGER trigger_update_lote_prioridade
        BEFORE INSERT OR UPDATE ON estoque_escolar_lotes
        FOR EACH ROW
        EXECUTE FUNCTION update_lote_prioridade();
    `);

    // 8. Criar função para atualizar informações de validade no estoque principal
    console.log('📝 Criando função para atualizar validade do estoque...');
    await client.query(`
      CREATE OR REPLACE FUNCTION atualizar_validade_estoque(p_estoque_escola_id INTEGER)
      RETURNS VOID AS $$
      DECLARE
        lote_proximo RECORD;
        tem_vencidos BOOLEAN := FALSE;
        tem_criticos BOOLEAN := FALSE;
      BEGIN
        -- Buscar o lote com vencimento mais próximo
        SELECT 
          l.data_validade,
          l.lote,
          EXTRACT(DAY FROM (l.data_validade - CURRENT_DATE)) as dias_restantes
        INTO lote_proximo
        FROM estoque_escolar_lotes l
        WHERE l.estoque_escola_id = p_estoque_escola_id
          AND l.status = 'ativo'
          AND l.quantidade_atual > 0
          AND l.data_validade IS NOT NULL
        ORDER BY l.data_validade ASC
        LIMIT 1;

        -- Verificar se há lotes vencidos
        SELECT EXISTS(
          SELECT 1 FROM estoque_escolar_lotes l
          WHERE l.estoque_escola_id = p_estoque_escola_id
            AND l.status = 'ativo'
            AND l.quantidade_atual > 0
            AND l.data_validade IS NOT NULL
            AND l.data_validade <= CURRENT_DATE
        ) INTO tem_vencidos;

        -- Verificar se há lotes críticos (vence em até 7 dias)
        SELECT EXISTS(
          SELECT 1 FROM estoque_escolar_lotes l
          WHERE l.estoque_escola_id = p_estoque_escola_id
            AND l.status = 'ativo'
            AND l.quantidade_atual > 0
            AND l.data_validade IS NOT NULL
            AND l.data_validade > CURRENT_DATE
            AND EXTRACT(DAY FROM (l.data_validade - CURRENT_DATE)) <= 7
        ) INTO tem_criticos;

        -- Atualizar o registro principal do estoque
        UPDATE estoque_escolas SET
          data_validade_proxima = lote_proximo.data_validade,
          lote_proximo_vencimento = lote_proximo.lote,
          dias_para_vencimento = lote_proximo.dias_restantes,
          status_validade = CASE 
            WHEN tem_vencidos THEN 'vencido'
            WHEN tem_criticos THEN 'critico'
            WHEN lote_proximo.dias_restantes IS NOT NULL AND lote_proximo.dias_restantes <= 30 THEN 'atencao'
            ELSE 'normal'
          END,
          tem_lotes_vencidos = tem_vencidos,
          tem_lotes_criticos = tem_criticos,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = p_estoque_escola_id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 6. Criar view para itens com validade próxima
    console.log('📝 Criando view de validades próximas...');
    await client.query(`
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
        p.unidade as unidade_medida,
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
    await client.query(`
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
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_itens,
        COUNT(CASE WHEN data_validade IS NOT NULL THEN 1 END) as itens_com_validade,
        COUNT(CASE WHEN dias_para_vencimento <= 7 THEN 1 END) as itens_criticos,
        COUNT(CASE WHEN dias_para_vencimento <= 30 THEN 1 END) as itens_atencao
      FROM guias_itens 
      WHERE para_entrega = true AND entrega_confirmada = false
    `);
    
    console.log('📊 Estatísticas após migration:', stats.rows[0]);

    // Verificar se as tabelas foram criadas
    const tabelas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('entregas_lotes')
      AND table_schema = 'public'
    `);
    
    console.log(`✅ ${tabelas.rows.length} nova(s) tabela(s) criada(s)`);
    tabelas.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // Verificar views criadas
    const views = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name = 'vw_itens_validade_proxima'
      AND table_schema = 'public'
    `);
    
    console.log(`✅ ${views.rows.length} view(s) criada(s)`);
    views.rows.forEach(view => {
      console.log(`   - ${view.table_name}`);
    });

  } catch (error) {
    console.error('❌ Erro na migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runValidadeMigration()
  .then(() => {
    console.log('🎉 Migration de controle de validade executada com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Falha na migration:', error.message);
    process.exit(1);
  });