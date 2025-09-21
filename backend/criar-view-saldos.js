const db = require('./dist/database');

async function criarViewSaldosContratos() {
  try {
    console.log('Criando view view_saldo_contratos_itens...');
    
    // Dropar a view existente primeiro
    await db.query('DROP VIEW IF EXISTS view_saldo_contratos_itens');
    
    const query = `
      CREATE VIEW view_saldo_contratos_itens AS
      SELECT 
          cp.id,
          cp.contrato_id,
          cp.produto_id,
          p.nome as produto_nome,
          p.unidade,
          cp.quantidade_contratada as quantidade_total,
          COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0) as quantidade_utilizada,
          COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0) as quantidade_estornada,
          (cp.quantidade_contratada - COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0)) as quantidade_disponivel_real,
          cp.preco_unitario,
          ((cp.quantidade_contratada - COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0)) * cp.preco_unitario) as valor_total_disponivel,
          c.numero as contrato_numero,
          c.data_inicio,
          c.data_fim,
          c.status as contrato_status,
          f.nome as fornecedor_nome,
          f.id as fornecedor_id,
          CASE 
              WHEN (cp.quantidade_contratada - COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0)) <= 0 THEN 'ESGOTADO'
              WHEN (cp.quantidade_contratada - COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0)) <= (cp.quantidade_contratada * 0.2) THEN 'BAIXO_SALDO'
              ELSE 'DISPONIVEL'
          END as status,
          cp.created_at,
          cp.updated_at
      FROM contrato_produtos cp
      JOIN produtos p ON cp.produto_id = p.id
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN movimentacoes_consumo_contrato mcc ON cp.id = mcc.contrato_produto_id
      WHERE cp.ativo = true
      GROUP BY cp.id, cp.contrato_id, cp.produto_id, p.nome, p.unidade, cp.quantidade_contratada, cp.preco_unitario, c.numero, c.data_inicio, c.data_fim, c.status, f.nome, f.id, cp.created_at, cp.updated_at;
    `;
    
    await db.query(query);
    console.log('✅ View view_saldo_contratos_itens criada com sucesso!');
    
    // Criar tabela de movimentações se não existir
    const tabelaMovimentacoes = `
      CREATE TABLE IF NOT EXISTS movimentacoes_consumo_contrato (
        id SERIAL PRIMARY KEY,
        contrato_produto_id INTEGER NOT NULL,
        quantidade DECIMAL(10,2) NOT NULL,
        tipo_movimentacao VARCHAR(20) NOT NULL,
        observacao TEXT,
        usuario_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id)
      );
    `;
    
    await db.query(tabelaMovimentacoes);
    console.log('✅ Tabela movimentacoes_consumo_contrato criada com sucesso!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar view:', error);
    process.exit(1);
  }
}

// Executar
if (require.main === module) {
  criarViewSaldosContratos();
}

module.exports = { criarViewSaldosContratos };