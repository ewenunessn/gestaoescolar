require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificar() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando pedido criado...\n');
    
    // 1. Verificar se pedido existe
    const pedidoResult = await client.query(`
      SELECT * FROM pedidos WHERE numero LIKE 'PED-MAR2026%' ORDER BY id DESC LIMIT 1
    `);
    
    if (pedidoResult.rows.length === 0) {
      console.log('❌ Pedido não encontrado');
      return;
    }
    
    const pedido = pedidoResult.rows[0];
    console.log('✅ Pedido encontrado:');
    console.log('   ID:', pedido.id);
    console.log('   Número:', pedido.numero);
    console.log('   Status:', pedido.status);
    console.log('   Valor Total:', pedido.valor_total);
    console.log('   Usuario Criacao ID:', pedido.usuario_criacao_id);
    console.log('   Guia ID:', pedido.guia_id);
    console.log('');
    
    // 2. Verificar usuário
    const usuarioResult = await client.query(`
      SELECT id, nome, email FROM usuarios WHERE id = $1
    `, [pedido.usuario_criacao_id]);
    
    if (usuarioResult.rows.length === 0) {
      console.log('❌ PROBLEMA: Usuário ID', pedido.usuario_criacao_id, 'não existe!');
      console.log('');
      
      // Listar usuários disponíveis
      const usuariosResult = await client.query(`
        SELECT id, nome, email FROM usuarios ORDER BY id LIMIT 5
      `);
      console.log('📋 Usuários disponíveis:');
      usuariosResult.rows.forEach(u => {
        console.log(`   - ID ${u.id}: ${u.nome} (${u.email})`);
      });
      console.log('');
    } else {
      console.log('✅ Usuário encontrado:', usuarioResult.rows[0].nome);
      console.log('');
    }
    
    // 3. Verificar itens do pedido
    const itensResult = await client.query(`
      SELECT 
        pi.*,
        p.nome as produto_nome,
        cp.preco_unitario as preco_contrato
      FROM pedido_itens pi
      JOIN produtos p ON pi.produto_id = p.id
      LEFT JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      WHERE pi.pedido_id = $1
    `, [pedido.id]);
    
    console.log(`📦 Itens do pedido: ${itensResult.rows.length}`);
    itensResult.rows.forEach(item => {
      console.log(`   - ${item.produto_nome}: ${item.quantidade} ${item.unidade} × R$ ${Number(item.preco_unitario).toFixed(2)} = R$ ${Number(item.valor_total).toFixed(2)}`);
    });
    console.log('');
    
    // 4. Testar query de listagem (mesma do frontend)
    console.log('🔍 Testando query de listagem...');
    const listagemResult = await client.query(`
      SELECT
        p.*,
        u.nome as usuario_criacao_nome,
        ua.nome as usuario_aprovacao_nome,
        COUNT(DISTINCT pi.id) as total_itens,
        COALESCE(SUM(pi.quantidade), 0) as quantidade_total,
        COUNT(DISTINCT c.fornecedor_id) as total_fornecedores,
        STRING_AGG(DISTINCT f.nome, ', ') as fornecedores_nomes
      FROM pedidos p
      JOIN usuarios u ON p.usuario_criacao_id = u.id
      LEFT JOIN usuarios ua ON p.usuario_aprovacao_id = ua.id
      LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
      LEFT JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE p.id = $1
      GROUP BY p.id, u.nome, ua.nome
    `, [pedido.id]);
    
    if (listagemResult.rows.length === 0) {
      console.log('❌ Pedido NÃO aparece na query de listagem!');
      console.log('   Motivo: Provavelmente o JOIN com usuarios está falhando');
    } else {
      console.log('✅ Pedido aparece na query de listagem:');
      const p = listagemResult.rows[0];
      console.log('   Número:', p.numero);
      console.log('   Usuário:', p.usuario_criacao_nome);
      console.log('   Total Itens:', p.total_itens);
      console.log('   Fornecedores:', p.fornecedores_nomes);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

verificar();
