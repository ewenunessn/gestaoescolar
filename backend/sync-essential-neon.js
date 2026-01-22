const { Pool } = require('pg');

// Configurações dos bancos
const LOCAL_CONFIG = {
  user: 'postgres',
  host: 'localhost',
  database: 'alimentacao_escolar',
  password: 'admin123',
  port: 5432,
};

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
};

class EssentialSync {
  constructor() {
    this.localPool = new Pool(LOCAL_CONFIG);
    this.neonPool = new Pool(NEON_CONFIG);
  }

  async syncEssentialChanges() {
    console.log('🚀 Sincronizando mudanças essenciais...\n');
    
    try {
      // 1. Adicionar colunas essenciais que estão faltando
      await this.addEssentialColumns();
      
      // 2. Verificar se as mudanças foram aplicadas
      await this.verifyChanges();
      
      console.log('\n✅ Sincronização essencial concluída!');
      
    } catch (error) {
      console.error('❌ Erro durante sincronização:', error.message);
      throw error;
    }
  }

  async addEssentialColumns() {
    console.log('📝 Adicionando colunas essenciais...\n');
    
    const essentialMigrations = [
      // Colunas que foram removidas da tabela produtos mas ainda são referenciadas
      {
        table: 'contrato_produtos',
        columns: [
          'unidade character varying(50)',
          'marca character varying(255)',
          'peso numeric(10,3)'
        ]
      },
      
      // Coluna que falta na tabela contratos
      {
        table: 'contratos', 
        columns: [
          'tipo_licitacao character varying(100)'
        ]
      },
      
      // Colunas que faltam na tabela demandas
      {
        table: 'demandas',
        columns: [
          'numero_oficio character varying(100)',
          'data_solicitacao date',
          'data_semead date', 
          'objeto text',
          'descricao_itens text',
          'data_resposta_semead date',
          'dias_solicitacao integer',
          'status character varying(50) DEFAULT \'pendente\'',
          'observacoes text',
          'usuario_criacao_id integer'
        ]
      },
      
      // Colunas que faltam na tabela produtos
      {
        table: 'produtos',
        columns: [
          'codigo_barras character varying(100)',
          'preco_referencia numeric(10,2)',
          'estoque_minimo numeric(10,2) DEFAULT 0'
        ]
      },
      
      // Colunas que faltam na tabela pedido_itens
      {
        table: 'pedido_itens',
        columns: [
          'valor_total numeric(10,2)',
          'observacoes text',
          'updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP'
        ]
      },
      
      // Colunas que faltam na tabela faturamentos
      {
        table: 'faturamentos',
        columns: [
          'valor_total numeric(12,2)'
        ]
      },
      
      // Colunas que faltam na tabela faturamento_itens
      {
        table: 'faturamento_itens',
        columns: [
          'updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP'
        ]
      },
      
      // Colunas que faltam na tabela guia_produto_escola
      {
        table: 'guia_produto_escola',
        columns: [
          'equipe_entrega_id integer',
          'planejamento_id integer'
        ]
      }
    ];

    for (const migration of essentialMigrations) {
      console.log(`🔧 Processando tabela: ${migration.table}`);
      
      for (const column of migration.columns) {
        const [columnName] = column.split(' ');
        
        // Verificar se a coluna já existe
        const exists = await this.columnExists(migration.table, columnName);
        
        if (!exists) {
          const sql = `ALTER TABLE ${migration.table} ADD COLUMN ${column};`;
          console.log(`  ➕ Adicionando coluna: ${columnName}`);
          
          try {
            await this.neonPool.query(sql);
            console.log(`  ✅ Coluna ${columnName} adicionada com sucesso`);
          } catch (error) {
            console.log(`  ⚠️ Erro ao adicionar ${columnName}: ${error.message}`);
          }
        } else {
          console.log(`  ✓ Coluna ${columnName} já existe`);
        }
      }
    }
  }

  async columnExists(tableName, columnName) {
    const query = `
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name = $2;
    `;
    
    const result = await this.neonPool.query(query, [tableName, columnName]);
    return result.rows.length > 0;
  }

  async verifyChanges() {
    console.log('\n🔍 Verificando mudanças aplicadas...');
    
    const verifications = [
      { table: 'contrato_produtos', column: 'unidade' },
      { table: 'contrato_produtos', column: 'marca' },
      { table: 'contrato_produtos', column: 'peso' },
      { table: 'contratos', column: 'tipo_licitacao' },
      { table: 'produtos', column: 'codigo_barras' },
      { table: 'pedido_itens', column: 'valor_total' },
      { table: 'faturamentos', column: 'valor_total' }
    ];

    let allGood = true;
    
    for (const check of verifications) {
      const exists = await this.columnExists(check.table, check.column);
      if (exists) {
        console.log(`✅ ${check.table}.${check.column} - OK`);
      } else {
        console.log(`❌ ${check.table}.${check.column} - FALTANDO`);
        allGood = false;
      }
    }
    
    return allGood;
  }

  async close() {
    await this.localPool.end();
    await this.neonPool.end();
  }
}

// Função principal
async function main() {
  const sync = new EssentialSync();
  
  try {
    await sync.syncEssentialChanges();
  } catch (error) {
    console.error('💥 Erro:', error.message);
  } finally {
    await sync.close();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { EssentialSync };