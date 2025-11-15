const { Pool } = require('pg');

// URL do Neon (produção)
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function populateContratoProdutos() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Populando contrato_produtos...\n');
    
    await client.query('BEGIN');
    
    // 1. Buscar o tenant
    const tenant = await client.query(`
      SELECT id FROM tenants WHERE slug = 'secretaria-educacao' LIMIT 1
    `);
    
    if (tenant.rows.length === 0) {
      console.error('❌ Tenant não encontrado');
      return;
    }
    
    const tenantId = tenant.rows[0].id;
    console.log(`✅ Tenant: ${tenantId}\n`);
    
    // 2. Buscar ou criar um contrato padrão
    let contrato = await client.query(`
      SELECT id FROM contratos WHERE tenant_id = $1 LIMIT 1
    `, [tenantId]);
    
    let contratoId;
    
    if (contrato.rows.length === 0) {
      // Buscar um fornecedor
      let fornecedor = await client.query(`
        SELECT id FROM fornecedores WHERE tenant_id = $1 LIMIT 1
      `, [tenantId]);
      
      let fornecedorId;
      
      if (fornecedor.rows.length === 0) {
        // Criar fornecedor padrão
        const novoFornecedor = await client.query(`
          INSERT INTO fornecedores (nome, cnpj, tenant_id, ativo)
          VALUES ('Fornecedor Padrão', '00000000000000', $1, true)
          RETURNING id
        `, [tenantId]);
        fornecedorId = novoFornecedor.rows[0].id;
        console.log(`✅ Fornecedor criado: ${fornecedorId}`);
      } else {
        fornecedorId = fornecedor.rows[0].id;
        console.log(`✅ Fornecedor existente: ${fornecedorId}`);
      }
      
      // Criar contrato padrão
      const novoContrato = await client.query(`
        INSERT INTO contratos (
          numero, fornecedor_id, data_inicio, data_fim, 
          valor_total, status, tenant_id, ativo
        )
        VALUES (
          'CONTRATO-2025-001', $1, '2025-01-01', '2025-12-31',
          1000000.00, 'ativo', $2, true
        )
        RETURNING id
      `, [fornecedorId, tenantId]);
      
      contratoId = novoContrato.rows[0].id;
      console.log(`✅ Contrato criado: ${contratoId}\n`);
    } else {
      contratoId = contrato.rows[0].id;
      console.log(`✅ Contrato existente: ${contratoId}\n`);
    }
    
    // 3. Buscar todos os produtos ativos
    const produtos = await client.query(`
      SELECT id, nome FROM produtos 
      WHERE tenant_id = $1 AND ativo = true
      ORDER BY nome
    `, [tenantId]);
    
    console.log(`📦 ${produtos.rows.length} produtos encontrados\n`);
    
    // 4. Inserir produtos no contrato
    let inseridos = 0;
    let jaExistentes = 0;
    
    for (const produto of produtos.rows) {
      // Verificar se já existe
      const existe = await client.query(`
        SELECT id FROM contrato_produtos 
        WHERE contrato_id = $1 AND produto_id = $2
      `, [contratoId, produto.id]);
      
      if (existe.rows.length === 0) {
        await client.query(`
          INSERT INTO contrato_produtos (
            contrato_id, produto_id, quantidade_contratada, 
            preco_unitario, saldo, ativo
          )
          VALUES ($1, $2, 10000, 10.00, 10000, true)
        `, [contratoId, produto.id]);
        
        inseridos++;
        console.log(`✅ ${produto.nome}`);
      } else {
        jaExistentes++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n📊 Resumo:`);
    console.log(`   Produtos inseridos: ${inseridos}`);
    console.log(`   Já existentes: ${jaExistentes}`);
    console.log(`   Total: ${produtos.rows.length}`);
    
    console.log('\n✅ Agora você pode usar o módulo de Saldo por Modalidade!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

populateContratoProdutos()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
