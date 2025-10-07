require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

async function criarViewNeon() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Conectando ao Neon (Produção)...');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    
    const client = await pool.connect();
    console.log('✅ Conectado ao Neon!\n');

    // Verificar se a view já existe
    console.log('🔍 Verificando se a view já existe...');
    const checkView = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'view_saldo_contratos_modalidades'
      ) as existe;
    `);

    if (checkView.rows[0].existe) {
      console.log('⚠️  View já existe. Será recriada...\n');
    }

    console.log('📝 Criando/Atualizando view view_saldo_contratos_modalidades...');
    
    const sql = `
-- View para consultar saldos por modalidade
CREATE OR REPLACE VIEW view_saldo_contratos_modalidades AS
SELECT 
    cpm.id,
    cpm.contrato_produto_id,
    cpm.modalidade_id,
    cpm.quantidade_inicial,
    cpm.quantidade_consumida,
    cpm.quantidade_disponivel,
    cpm.ativo,
    cpm.created_at,
    cpm.updated_at,
    
    -- Dados do contrato produto
    cp.contrato_id,
    cp.produto_id,
    cp.quantidade_contratada as quantidade_contrato,
    cp.preco_unitario,
    cp.saldo as saldo_contrato,
    
    -- Dados do contrato
    c.numero as contrato_numero,
    c.data_inicio,
    c.data_fim,
    c.status as contrato_status,
    
    -- Dados do produto
    p.nome as produto_nome,
    p.unidade,
    
    -- Dados da modalidade
    m.nome as modalidade_nome,
    m.codigo_financeiro as modalidade_codigo_financeiro,
    m.valor_repasse as modalidade_valor_repasse,
    
    -- Dados do fornecedor
    f.id as fornecedor_id,
    f.nome as fornecedor_nome,
    
    -- Cálculos
    (cpm.quantidade_disponivel * cp.preco_unitario) as valor_disponivel,
    
    -- Status baseado na disponibilidade
    CASE 
        WHEN cpm.quantidade_disponivel <= 0 THEN 'ESGOTADO'
        WHEN cpm.quantidade_disponivel <= (cpm.quantidade_inicial * 0.1) THEN 'BAIXO_ESTOQUE'
        ELSE 'DISPONIVEL'
    END as status
    
FROM contrato_produtos_modalidades cpm
JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN produtos p ON cp.produto_id = p.id
JOIN modalidades m ON cpm.modalidade_id = m.id
JOIN fornecedores f ON c.fornecedor_id = f.id
WHERE cpm.ativo = true
  AND cp.ativo = true
  AND c.ativo = true
  AND m.ativo = true;

COMMENT ON VIEW view_saldo_contratos_modalidades IS 'View consolidada para consultar saldos de contratos por modalidade';
    `;
    
    await client.query(sql);
    console.log('✅ View criada/atualizada com sucesso!\n');

    // Testar a view
    console.log('🔍 Testando a view...');
    const result = await client.query('SELECT COUNT(*) as total FROM view_saldo_contratos_modalidades');
    console.log(`✅ View funcionando! Total de registros: ${result.rows[0].total}\n`);

    // Verificar dados relacionados
    console.log('📊 Verificando dados relacionados:');
    
    const contratos = await client.query(`
      SELECT COUNT(*) as total FROM contratos WHERE ativo = true AND status = 'ativo'
    `);
    console.log(`   - Contratos ativos: ${contratos.rows[0].total}`);
    
    const contratoProdutos = await client.query(`
      SELECT COUNT(*) as total FROM contrato_produtos WHERE ativo = true
    `);
    console.log(`   - Produtos de contratos: ${contratoProdutos.rows[0].total}`);
    
    const modalidades = await client.query(`
      SELECT COUNT(*) as total FROM modalidades WHERE ativo = true
    `);
    console.log(`   - Modalidades ativas: ${modalidades.rows[0].total}`);
    
    const saldos = await client.query(`
      SELECT COUNT(*) as total FROM contrato_produtos_modalidades
    `);
    console.log(`   - Saldos cadastrados: ${saldos.rows[0].total}`);

    if (saldos.rows[0].total === '0') {
      console.log('\n⚠️  ATENÇÃO: Não há saldos por modalidade cadastrados!');
      console.log('💡 Cadastre os saldos iniciais pela interface do sistema.');
    }

    client.release();
    console.log('\n✅ Processo concluído!');
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('\nDetalhes:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

criarViewNeon();
