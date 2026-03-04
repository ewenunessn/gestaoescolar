const db = require('../dist/database');
const jwt = require('jsonwebtoken');

async function getToken() {
  try {
    // Buscar um usuário
    const result = await db.query(`
      SELECT * FROM usuarios LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('👤 Usuário encontrado:', user);

    // Gerar token
    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        email: user.email
      },
      process.env.JWT_SECRET || 'seu_secret_key_aqui',
      { expiresIn: '24h' }
    );

    console.log('\n🔑 Token gerado:');
    console.log(token);

    // Testar a rota de pedidos
    console.log('\n🧪 Testando rota de pedidos...');
    const pedidos = await db.query(`
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
      WHERE 1=1
      GROUP BY p.id, u.nome, ua.nome
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    console.log(`✅ ${pedidos.rows.length} pedidos encontrados`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  process.exit(0);
}

getToken();
