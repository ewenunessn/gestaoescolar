const db = require('../database');

/**
 * Migração para consolidar a estrutura de pedidos
 * 
 * Esta migração:
 * 1. Cria as tabelas pedidos_fornecedores, pedidos_itens e pedidos_historico
 * 2. Migra dados da estrutura atual (pedidos_modernos + pedidos_modernos_itens)
 * 3. Atualiza referências e constraints
 * 4. Mantém compatibilidade com o código existente
 */

module.exports = {
  async up() {
    
    console.log('🔄 Iniciando consolidação da estrutura de pedidos...');
    
    try {
      // 1. Criar tabela pedidos_fornecedores
      console.log('📦 Criando tabela pedidos_fornecedores...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS pedidos_fornecedores (
          id SERIAL PRIMARY KEY,
          pedido_id INTEGER NOT NULL,
          fornecedor_id INTEGER NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE' 
            CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'EM_PREPARACAO', 'ENVIADO', 'ENTREGUE', 'CANCELADO')),
          valor_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
          observacoes_fornecedor TEXT,
          data_confirmacao TIMESTAMP,
          data_envio TIMESTAMP,
          data_entrega TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pedido_id) REFERENCES pedidos_modernos(id) ON DELETE CASCADE
        );
      `);
      
      // 2. Criar tabela pedidos_itens
      console.log('📦 Criando tabela pedidos_itens...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS pedidos_itens (
          id SERIAL PRIMARY KEY,
          pedido_fornecedor_id INTEGER NOT NULL,
          produto_id INTEGER NOT NULL,
          contrato_id INTEGER,
          quantidade NUMERIC(10,3) NOT NULL,
          preco_unitario NUMERIC(10,2) NOT NULL,
          subtotal NUMERIC(10,2) NOT NULL,
          observacoes_item TEXT,
          data_entrega_prevista TIMESTAMP,
          status_recebimento VARCHAR(20) DEFAULT 'NAO_INICIADO' 
            CHECK (status_recebimento IN ('NAO_INICIADO', 'PENDENTE', 'PARCIAL', 'COMPLETO', 'EXCEDENTE')),
          quantidade_recebida NUMERIC(10,3) DEFAULT 0,
          quantidade_pendente NUMERIC(10,3) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pedido_fornecedor_id) REFERENCES pedidos_fornecedores(id) ON DELETE CASCADE
        );
      `);
      
      // 3. Criar tabela pedidos_historico
      console.log('📦 Criando tabela pedidos_historico...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS pedidos_historico (
          id SERIAL PRIMARY KEY,
          pedido_id INTEGER NOT NULL,
          status_anterior VARCHAR(50) NOT NULL,
          status_novo VARCHAR(50) NOT NULL,
          observacoes TEXT,
          data_alteracao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          alterado_por VARCHAR(255) NOT NULL,
          FOREIGN KEY (pedido_id) REFERENCES pedidos_modernos(id) ON DELETE CASCADE
        );
      `);
      
      // 4. Migrar dados existentes
      console.log('🔄 Migrando dados existentes...');
      
      // Primeiro, criar registros em pedidos_fornecedores baseados nos pedidos_modernos
      await db.query(`
        INSERT INTO pedidos_fornecedores (pedido_id, fornecedor_id, status, valor_subtotal, created_at)
        SELECT 
          pm.id as pedido_id,
          COALESCE(pm.fornecedor_id, 1) as fornecedor_id, -- Usar fornecedor padrão se não especificado
          pm.status,
          pm.valor_total as valor_subtotal,
          pm.created_at
        FROM pedidos_modernos pm
        WHERE NOT EXISTS (
          SELECT 1 FROM pedidos_fornecedores pf WHERE pf.pedido_id = pm.id
        );
      `);
      
      // Migrar itens de pedidos_modernos_itens para pedidos_itens
      await db.query(`
        INSERT INTO pedidos_itens (
          pedido_fornecedor_id, produto_id, contrato_id, quantidade, 
          preco_unitario, subtotal, created_at
        )
        SELECT 
          pf.id as pedido_fornecedor_id,
          pmi.produto_id,
          pmi.contrato_id,
          pmi.quantidade,
          pmi.preco_unitario,
          pmi.subtotal,
          pmi.created_at
        FROM pedidos_modernos_itens pmi
        JOIN pedidos_fornecedores pf ON pf.pedido_id = pmi.pedido_id
        WHERE NOT EXISTS (
          SELECT 1 FROM pedidos_itens pi 
          WHERE pi.pedido_fornecedor_id = pf.id 
          AND pi.produto_id = pmi.produto_id
        );
      `);
      
      // 5. Criar índices para performance
      console.log('📊 Criando índices...');
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_pedidos_fornecedores_pedido ON pedidos_fornecedores(pedido_id);
        CREATE INDEX IF NOT EXISTS idx_pedidos_fornecedores_fornecedor ON pedidos_fornecedores(fornecedor_id);
        CREATE INDEX IF NOT EXISTS idx_pedidos_fornecedores_status ON pedidos_fornecedores(status);
        
        CREATE INDEX IF NOT EXISTS idx_pedidos_itens_fornecedor ON pedidos_itens(pedido_fornecedor_id);
        CREATE INDEX IF NOT EXISTS idx_pedidos_itens_produto ON pedidos_itens(produto_id);
        CREATE INDEX IF NOT EXISTS idx_pedidos_itens_contrato ON pedidos_itens(contrato_id);
        CREATE INDEX IF NOT EXISTS idx_pedidos_itens_status_recebimento ON pedidos_itens(status_recebimento);
        
        CREATE INDEX IF NOT EXISTS idx_pedidos_historico_pedido ON pedidos_historico(pedido_id);
        CREATE INDEX IF NOT EXISTS idx_pedidos_historico_data ON pedidos_historico(data_alteracao);
      `);
      
      // 6. Criar triggers para manter consistência
      console.log('⚙️ Criando triggers...');
      
      // Trigger para atualizar updated_at em pedidos_fornecedores
      await db.query(`
        CREATE OR REPLACE FUNCTION update_pedidos_fornecedores_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        DROP TRIGGER IF EXISTS trigger_update_pedidos_fornecedores_timestamp ON pedidos_fornecedores;
        CREATE TRIGGER trigger_update_pedidos_fornecedores_timestamp
          BEFORE UPDATE ON pedidos_fornecedores
          FOR EACH ROW
          EXECUTE FUNCTION update_pedidos_fornecedores_timestamp();
      `);
      
      // Trigger para atualizar updated_at em pedidos_itens
      await db.query(`
        CREATE OR REPLACE FUNCTION update_pedidos_itens_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        DROP TRIGGER IF EXISTS trigger_update_pedidos_itens_timestamp ON pedidos_itens;
        CREATE TRIGGER trigger_update_pedidos_itens_timestamp
          BEFORE UPDATE ON pedidos_itens
          FOR EACH ROW
          EXECUTE FUNCTION update_pedidos_itens_timestamp();
      `);
      
      // 7. Verificar integridade dos dados migrados
      console.log('🔍 Verificando integridade dos dados...');
      
      const result = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM pedidos_modernos) as total_pedidos,
          (SELECT COUNT(*) FROM pedidos_fornecedores) as total_fornecedores,
          (SELECT COUNT(*) FROM pedidos_itens) as total_itens,
          (SELECT COUNT(*) FROM pedidos_modernos_itens) as total_itens_originais
      `);
      
      const verificacao = result.rows[0];
      
      console.log('📊 Estatísticas da migração:');
      console.log(`   - Pedidos: ${verificacao.total_pedidos}`);
      console.log(`   - Fornecedores: ${verificacao.total_fornecedores}`);
      console.log(`   - Itens migrados: ${verificacao.total_itens}`);
      console.log(`   - Itens originais: ${verificacao.total_itens_originais}`);
      
      console.log('✅ Consolidação da estrutura de pedidos concluída com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro durante a consolidação:', error);
      throw error;
    }
  },
  
  async down() {
    
    console.log('🔄 Revertendo consolidação da estrutura de pedidos...');
    
    try {
      // Remover triggers
      await db.query(`
        DROP TRIGGER IF EXISTS trigger_update_pedidos_fornecedores_timestamp ON pedidos_fornecedores;
        DROP TRIGGER IF EXISTS trigger_update_pedidos_itens_timestamp ON pedidos_itens;
        DROP FUNCTION IF EXISTS update_pedidos_fornecedores_timestamp();
        DROP FUNCTION IF EXISTS update_pedidos_itens_timestamp();
      `);
      
      // Remover tabelas (em ordem reversa devido às foreign keys)
      await db.query('DROP TABLE IF EXISTS pedidos_historico CASCADE;');
      await db.query('DROP TABLE IF EXISTS pedidos_itens CASCADE;');
      await db.query('DROP TABLE IF EXISTS pedidos_fornecedores CASCADE;');
      
      console.log('✅ Reversão concluída com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro durante a reversão:', error);
      throw error;
    }
  }
};