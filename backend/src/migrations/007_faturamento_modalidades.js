/**
 * Migração para criar tabela de faturamento com divisão por modalidades
 * Esta tabela armazena a divisão proporcional dos itens de faturamento por modalidade
 */

module.exports = {
  up: async (db) => {
    // Criar tabela faturamento_itens_modalidades
    await db.exec(`
      CREATE TABLE IF NOT EXISTS faturamento_itens_modalidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        faturamento_id INTEGER NOT NULL,
        pedido_item_id INTEGER NOT NULL,
        produto_id INTEGER NOT NULL,
        modalidade_id INTEGER NOT NULL,
        quantidade_original DECIMAL(10,3) NOT NULL,
        quantidade_modalidade DECIMAL(10,3) NOT NULL,
        percentual_modalidade DECIMAL(5,2) NOT NULL,
        valor_unitario DECIMAL(10,2) NOT NULL,
        valor_total_modalidade DECIMAL(12,2) NOT NULL,
        valor_repasse_modalidade DECIMAL(10,2) NOT NULL,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        -- Chaves estrangeiras
        FOREIGN KEY (faturamento_id) REFERENCES faturamentos(id) ON DELETE CASCADE,
        FOREIGN KEY (pedido_item_id) REFERENCES pedidos_itens(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
        FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE CASCADE
      )
    `);

    // Criar índices para otimizar consultas
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_faturamento_itens_modalidades_faturamento 
      ON faturamento_itens_modalidades(faturamento_id)
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_faturamento_itens_modalidades_pedido_item 
      ON faturamento_itens_modalidades(pedido_item_id)
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_faturamento_itens_modalidades_modalidade 
      ON faturamento_itens_modalidades(modalidade_id)
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_faturamento_itens_modalidades_produto 
      ON faturamento_itens_modalidades(produto_id)
    `);

    // Criar tabela para configuração de modalidades por item (seleção prévia)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS pedido_itens_modalidades_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_item_id INTEGER NOT NULL,
        modalidade_id INTEGER NOT NULL,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        -- Chaves estrangeiras
        FOREIGN KEY (pedido_item_id) REFERENCES pedidos_itens(id) ON DELETE CASCADE,
        FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON DELETE CASCADE,
        
        -- Garantir que não haja duplicatas
        UNIQUE(pedido_item_id, modalidade_id)
      )
    `);

    // Criar índices para a tabela de configuração
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pedido_itens_modalidades_config_item 
      ON pedido_itens_modalidades_config(pedido_item_id)
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pedido_itens_modalidades_config_modalidade 
      ON pedido_itens_modalidades_config(modalidade_id)
    `);

    // Criar trigger para atualizar updated_at automaticamente
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_faturamento_itens_modalidades_timestamp 
      AFTER UPDATE ON faturamento_itens_modalidades
      FOR EACH ROW
      BEGIN
        UPDATE faturamento_itens_modalidades 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
      END
    `);

    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_pedido_itens_modalidades_config_timestamp 
      AFTER UPDATE ON pedido_itens_modalidades_config
      FOR EACH ROW
      BEGIN
        UPDATE pedido_itens_modalidades_config 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
      END
    `);

    console.log('✅ Migração 007: Tabelas de faturamento por modalidades criadas com sucesso');
  },

  down: async (db) => {
    // Remover triggers
    await db.exec('DROP TRIGGER IF EXISTS update_faturamento_itens_modalidades_timestamp');
    await db.exec('DROP TRIGGER IF EXISTS update_pedido_itens_modalidades_config_timestamp');
    
    // Remover tabelas
    await db.exec('DROP TABLE IF EXISTS pedido_itens_modalidades_config');
    await db.exec('DROP TABLE IF EXISTS faturamento_itens_modalidades');
    
    console.log('✅ Migração 007: Tabelas de faturamento por modalidades removidas');
  }
};