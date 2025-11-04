#!/usr/bin/env node

/**
 * SCRIPT DE TESTE DA MIGRAÇÃO DE TENANT PARA ESTOQUE
 * 
 * Este script testa a migração de dados de estoque para suporte a tenant
 * criando dados de teste, executando a migração e validando os resultados.
 * 
 * Uso: node test-inventory-tenant-migration.js [--cleanup] [--verbose]
 */

const { Pool } = require('pg');
const crypto = require('crypto');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gestao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Configurações do script
const config = {
  cleanup: process.argv.includes('--cleanup'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

class InventoryTenantMigrationTest {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.testId = crypto.randomBytes(4).toString('hex');
    this.testData = {
      tenants: [],
      escolas: [],
      produtos: [],
      estoque_escolas: [],
      estoque_lotes: [],
      estoque_historico: [],
      estoque_movimentacoes: []
    };
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = {
      'INFO': '📋',
      'SUCCESS': '✅',
      'WARNING': '⚠️',
      'ERROR': '❌',
      'DEBUG': '🔍',
      'TEST': '🧪'
    }[level] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (data && config.verbose) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  async executeQuery(query, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  }

  async createTestTenants() {
    this.log('TEST', 'Criando tenants de teste...');

    const tenants = [
      {
        id: `${this.testId}-0000-0000-0000-000000000001`,
        slug: `test-tenant-1-${this.testId}`,
        name: `Tenant Teste 1 ${this.testId}`,
        subdomain: `test1-${this.testId}`
      },
      {
        id: `${this.testId}-0000-0000-0000-000000000002`,
        slug: `test-tenant-2-${this.testId}`,
        name: `Tenant Teste 2 ${this.testId}`,
        subdomain: `test2-${this.testId}`
      }
    ];

    for (const tenant of tenants) {
      await this.executeQuery(`
        INSERT INTO tenants (id, slug, name, subdomain, status, settings, limits)
        VALUES ($1, $2, $3, $4, 'active', '{}', '{}')
        ON CONFLICT (id) DO NOTHING
      `, [tenant.id, tenant.slug, tenant.name, tenant.subdomain]);
      
      this.testData.tenants.push(tenant);
    }

    this.log('SUCCESS', `${tenants.length} tenants de teste criados`);
  }

  async createTestSchools() {
    this.log('TEST', 'Criando escolas de teste...');

    const escolas = [
      {
        nome: `Escola Teste 1 - ${this.testId}`,
        tenant_id: this.testData.tenants[0].id
      },
      {
        nome: `Escola Teste 2 - ${this.testId}`,
        tenant_id: this.testData.tenants[0].id
      },
      {
        nome: `Escola Teste 3 - ${this.testId}`,
        tenant_id: this.testData.tenants[1].id
      }
    ];

    for (const escola of escolas) {
      const result = await this.executeQuery(`
        INSERT INTO escolas (nome, endereco, ativo, tenant_id)
        VALUES ($1, 'Endereço Teste', true, $2)
        RETURNING id
      `, [escola.nome, escola.tenant_id]);
      
      escola.id = result.rows[0].id;
      this.testData.escolas.push(escola);
    }

    this.log('SUCCESS', `${escolas.length} escolas de teste criadas`);
  }

  async createTestProducts() {
    this.log('TEST', 'Criando produtos de teste...');

    const produtos = [
      {
        nome: `Produto Teste 1 - ${this.testId}`,
        categoria: 'Teste',
        tenant_id: this.testData.tenants[0].id
      },
      {
        nome: `Produto Teste 2 - ${this.testId}`,
        categoria: 'Teste',
        tenant_id: this.testData.tenants[0].id
      },
      {
        nome: `Produto Teste 3 - ${this.testId}`,
        categoria: 'Teste',
        tenant_id: this.testData.tenants[1].id
      }
    ];

    for (const produto of produtos) {
      const result = await this.executeQuery(`
        INSERT INTO produtos (nome, descricao, categoria, unidade, ativo, tenant_id)
        VALUES ($1, 'Descrição Teste', $2, 'UN', true, $3)
        RETURNING id
      `, [produto.nome, produto.categoria, produto.tenant_id]);
      
      produto.id = result.rows[0].id;
      this.testData.produtos.push(produto);
    }

    this.log('SUCCESS', `${produtos.length} produtos de teste criados`);
  }

  async createTestInventoryData() {
    this.log('TEST', 'Criando dados de estoque de teste...');

    // Criar registros de estoque_escolas (SEM tenant_id para simular dados antigos)
    for (const escola of this.testData.escolas) {
      for (const produto of this.testData.produtos) {
        // Só criar estoque para produtos do mesmo tenant da escola
        if (produto.tenant_id === escola.tenant_id) {
          const result = await this.executeQuery(`
            INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
            VALUES ($1, $2, $3)
            RETURNING id
          `, [escola.id, produto.id, Math.floor(Math.random() * 100) + 10]);
          
          this.testData.estoque_escolas.push({
            id: result.rows[0].id,
            escola_id: escola.id,
            produto_id: produto.id,
            expected_tenant_id: escola.tenant_id
          });
        }
      }
    }

    // Criar lotes (SEM tenant_id e SEM escola_id para simular dados antigos)
    for (const produto of this.testData.produtos) {
      const result = await this.executeQuery(`
        INSERT INTO estoque_lotes (produto_id, lote, quantidade_inicial, quantidade_atual, status)
        VALUES ($1, $2, $3, $4, 'ativo')
        RETURNING id
      `, [produto.id, `LOTE-${this.testId}-${produto.id}`, 50, 45]);
      
      this.testData.estoque_lotes.push({
        id: result.rows[0].id,
        produto_id: produto.id,
        expected_tenant_id: produto.tenant_id
      });
    }

    // Criar histórico (SEM tenant_id)
    for (const estoqueItem of this.testData.estoque_escolas) {
      const result = await this.executeQuery(`
        INSERT INTO estoque_escolas_historico (
          estoque_escola_id, escola_id, produto_id, tipo_movimentacao,
          quantidade_anterior, quantidade_movimentada, quantidade_posterior
        )
        VALUES ($1, $2, $3, 'entrada', 0, 10, 10)
        RETURNING id
      `, [estoqueItem.id, estoqueItem.escola_id, estoqueItem.produto_id]);
      
      this.testData.estoque_historico.push({
        id: result.rows[0].id,
        estoque_escola_id: estoqueItem.id,
        escola_id: estoqueItem.escola_id,
        produto_id: estoqueItem.produto_id,
        expected_tenant_id: estoqueItem.expected_tenant_id
      });
    }

    // Criar movimentações (SEM tenant_id)
    for (const lote of this.testData.estoque_lotes) {
      const result = await this.executeQuery(`
        INSERT INTO estoque_movimentacoes (
          lote_id, produto_id, tipo, quantidade,
          quantidade_anterior, quantidade_posterior, motivo
        )
        VALUES ($1, $2, 'entrada', 5, 45, 50, 'Teste de migração')
        RETURNING id
      `, [lote.id, lote.produto_id]);
      
      this.testData.estoque_movimentacoes.push({
        id: result.rows[0].id,
        lote_id: lote.id,
        produto_id: lote.produto_id,
        expected_tenant_id: lote.expected_tenant_id
      });
    }

    this.log('SUCCESS', 'Dados de estoque de teste criados');
    this.log('DEBUG', 'Resumo dos dados criados', {
      estoque_escolas: this.testData.estoque_escolas.length,
      estoque_lotes: this.testData.estoque_lotes.length,
      estoque_historico: this.testData.estoque_historico.length,
      estoque_movimentacoes: this.testData.estoque_movimentacoes.length
    });
  }

  async validatePreMigrationState() {
    this.log('TEST', 'Validando estado pré-migração...');

    // Verificar que os dados não têm tenant_id
    const checks = [
      { table: 'estoque_escolas', data: this.testData.estoque_escolas },
      { table: 'estoque_lotes', data: this.testData.estoque_lotes },
      { table: 'estoque_escolas_historico', data: this.testData.estoque_historico },
      { table: 'estoque_movimentacoes', data: this.testData.estoque_movimentacoes }
    ];

    for (const check of checks) {
      const result = await this.executeQuery(`
        SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant_id
        FROM ${check.table}
        WHERE id = ANY($1)
      `, [check.data.map(item => item.id)]);

      const { total, with_tenant_id } = result.rows[0];
      
      if (parseInt(with_tenant_id) > 0) {
        throw new Error(`Tabela ${check.table} já tem registros com tenant_id antes da migração`);
      }

      this.log('SUCCESS', `${check.table}: ${total} registros sem tenant_id (correto)`);
    }

    // Verificar se escola_id está faltando em estoque_lotes
    const lotesWithEscolaId = await this.executeQuery(`
      SELECT COUNT(*) as with_escola_id
      FROM estoque_lotes
      WHERE id = ANY($1) AND escola_id IS NOT NULL
    `, [this.testData.estoque_lotes.map(item => item.id)]);

    if (parseInt(lotesWithEscolaId.rows[0].with_escola_id) > 0) {
      this.log('WARNING', 'Alguns lotes já têm escola_id - isso é esperado se a migração já foi executada parcialmente');
    }

    this.log('SUCCESS', 'Estado pré-migração validado');
  }

  async runMigration() {
    this.log('TEST', 'Executando migração...');

    try {
      // Executar a migração usando o script principal
      const InventoryTenantMigration = require('./run-inventory-tenant-migration.js');
      const migration = new InventoryTenantMigration();
      
      // Executar apenas a migração, sem validação completa
      await migration.checkPrerequisites();
      const migrationSQL = await migration.loadSQLFile('migrations/012_inventory_tenant_data_migration.sql');
      await migration.executeSQL(migrationSQL, 'Migração de teste');
      await migration.close();

      this.log('SUCCESS', 'Migração executada com sucesso');

    } catch (error) {
      this.log('ERROR', 'Migração falhou', { error: error.message });
      throw error;
    }
  }

  async validatePostMigrationState() {
    this.log('TEST', 'Validando estado pós-migração...');

    // Verificar que todos os registros têm tenant_id
    const checks = [
      { table: 'estoque_escolas', data: this.testData.estoque_escolas },
      { table: 'estoque_lotes', data: this.testData.estoque_lotes },
      { table: 'estoque_escolas_historico', data: this.testData.estoque_historico },
      { table: 'estoque_movimentacoes', data: this.testData.estoque_movimentacoes }
    ];

    for (const check of checks) {
      const result = await this.executeQuery(`
        SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant_id
        FROM ${check.table}
        WHERE id = ANY($1)
      `, [check.data.map(item => item.id)]);

      const { total, with_tenant_id } = result.rows[0];
      
      if (parseInt(total) !== parseInt(with_tenant_id)) {
        throw new Error(`Tabela ${check.table}: ${with_tenant_id}/${total} registros têm tenant_id após migração`);
      }

      this.log('SUCCESS', `${check.table}: ${total}/${total} registros com tenant_id`);
    }

    // Verificar se os tenant_id estão corretos
    for (const item of this.testData.estoque_escolas) {
      const result = await this.executeQuery(`
        SELECT tenant_id FROM estoque_escolas WHERE id = $1
      `, [item.id]);

      if (result.rows[0].tenant_id !== item.expected_tenant_id) {
        throw new Error(`estoque_escolas ${item.id}: tenant_id incorreto`);
      }
    }

    // Verificar se escola_id foi populado em estoque_lotes
    const lotesWithEscolaId = await this.executeQuery(`
      SELECT COUNT(*) as with_escola_id
      FROM estoque_lotes
      WHERE id = ANY($1) AND escola_id IS NOT NULL
    `, [this.testData.estoque_lotes.map(item => item.id)]);

    if (parseInt(lotesWithEscolaId.rows[0].with_escola_id) !== this.testData.estoque_lotes.length) {
      throw new Error('Nem todos os lotes têm escola_id após migração');
    }

    this.log('SUCCESS', 'Estado pós-migração validado');
  }

  async validateTenantIsolation() {
    this.log('TEST', 'Validando isolamento de tenant...');

    // Verificar que cada tenant só vê seus próprios dados
    for (const tenant of this.testData.tenants) {
      const estoqueCount = await this.executeQuery(`
        SELECT COUNT(*) as count
        FROM estoque_escolas ee
        JOIN escolas e ON e.id = ee.escola_id
        WHERE e.tenant_id = $1
          AND ee.id = ANY($2)
      `, [tenant.id, this.testData.estoque_escolas.map(item => item.id)]);

      const expectedCount = this.testData.estoque_escolas.filter(
        item => item.expected_tenant_id === tenant.id
      ).length;

      if (parseInt(estoqueCount.rows[0].count) !== expectedCount) {
        throw new Error(`Tenant ${tenant.slug}: contagem de estoque incorreta`);
      }

      this.log('SUCCESS', `Tenant ${tenant.slug}: ${expectedCount} registros de estoque isolados corretamente`);
    }

    this.log('SUCCESS', 'Isolamento de tenant validado');
  }

  async cleanupTestData() {
    if (!config.cleanup) {
      this.log('INFO', 'Limpeza pulada (use --cleanup para limpar dados de teste)');
      return;
    }

    this.log('TEST', 'Limpando dados de teste...');

    try {
      // Remover em ordem reversa devido às foreign keys
      const tables = [
        { table: 'estoque_movimentacoes', data: this.testData.estoque_movimentacoes },
        { table: 'estoque_escolas_historico', data: this.testData.estoque_historico },
        { table: 'estoque_lotes', data: this.testData.estoque_lotes },
        { table: 'estoque_escolas', data: this.testData.estoque_escolas },
        { table: 'produtos', data: this.testData.produtos },
        { table: 'escolas', data: this.testData.escolas },
        { table: 'tenants', data: this.testData.tenants }
      ];

      for (const { table, data } of tables) {
        if (data.length > 0) {
          await this.executeQuery(`
            DELETE FROM ${table} WHERE id = ANY($1)
          `, [data.map(item => item.id)]);
          
          this.log('SUCCESS', `${data.length} registros removidos de ${table}`);
        }
      }

      this.log('SUCCESS', 'Limpeza concluída');

    } catch (error) {
      this.log('ERROR', 'Erro na limpeza', { error: error.message });
      // Não falhar o teste por causa da limpeza
    }
  }

  async runFullTest() {
    this.log('INFO', `Iniciando teste completo da migração (ID: ${this.testId})`);

    try {
      // 1. Criar dados de teste
      await this.createTestTenants();
      await this.createTestSchools();
      await this.createTestProducts();
      await this.createTestInventoryData();

      // 2. Validar estado inicial
      await this.validatePreMigrationState();

      // 3. Executar migração
      await this.runMigration();

      // 4. Validar resultado
      await this.validatePostMigrationState();
      await this.validateTenantIsolation();

      this.log('SUCCESS', 'Teste completo passou! ✅');
      return true;

    } catch (error) {
      this.log('ERROR', 'Teste falhou', { error: error.message });
      throw error;

    } finally {
      // 5. Limpeza (se solicitada)
      await this.cleanupTestData();
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Função principal
async function main() {
  const test = new InventoryTenantMigrationTest();

  try {
    test.log('INFO', 'Iniciando teste da migração de tenant para estoque');
    test.log('INFO', `Configuração: ${JSON.stringify(config, null, 2)}`);

    await test.runFullTest();

    test.log('SUCCESS', 'Todos os testes passaram! 🎉');
    process.exit(0);

  } catch (error) {
    test.log('ERROR', 'Testes falharam', { error: error.message, stack: error.stack });
    process.exit(1);

  } finally {
    await test.close();
  }
}

// Tratamento de sinais
process.on('SIGINT', async () => {
  console.log('\n⚠️ Interrupção detectada. Finalizando...');
  process.exit(1);
});

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = InventoryTenantMigrationTest;