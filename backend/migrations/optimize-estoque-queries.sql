-- Otimização de queries do estoque
-- Criação de índices para melhorar performance

-- Índices para tabela estoque_escolas
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_escola_id ON estoque_escolas(escola_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_produto_id ON estoque_escolas(produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_quantidade ON estoque_escolas(quantidade_atual) WHERE quantidade_atual > 0;
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_updated_at ON estoque_escolas(updated_at);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_composite ON estoque_escolas(escola_id, produto_id, quantidade_atual);

-- Índices para tabela estoque_lotes
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_produto_id ON estoque_lotes(produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_status ON estoque_lotes(status);
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_validade ON estoque_lotes(data_validade) WHERE data_validade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_quantidade ON estoque_lotes(quantidade_atual) WHERE quantidade_atual > 0;
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_composite ON estoque_lotes(produto_id, status, quantidade_atual);
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_validade_status ON estoque_lotes(data_validade, status) WHERE data_validade IS NOT NULL AND status = 'ativo';

-- Índices para tabela produtos
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_nome ON produtos(categoria, nome) WHERE ativo = true;

-- Índices para tabela escolas
CREATE INDEX IF NOT EXISTS idx_escolas_ativo ON escolas(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_escolas_nome ON escolas(nome);

-- Índices para tabela estoque_escolas_historico
CREATE INDEX IF NOT EXISTS idx_historico_escola_id ON estoque_escolas_historico(escola_id);
CREATE INDEX IF NOT EXISTS idx_historico_produto_id ON estoque_escolas_historico(produto_id);
CREATE INDEX IF NOT EXISTS idx_historico_data ON estoque_escolas_historico(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_historico_tipo ON estoque_escolas_historico(tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_historico_composite ON estoque_escolas_historico(escola_id, produto_id, data_movimentacao);

-- Índices para melhorar queries de relatórios
CREATE INDEX IF NOT EXISTS idx_estoque_relatorio_validade ON estoque_lotes(data_validade, quantidade_atual, status) 
  WHERE data_validade IS NOT NULL AND quantidade_atual > 0 AND status = 'ativo';

-- Índice para queries de matriz (escolas x produtos)
CREATE INDEX IF NOT EXISTS idx_matriz_estoque ON estoque_escolas(escola_id, produto_id, quantidade_atual, updated_at);

-- Estatísticas para o otimizador
ANALYZE estoque_escolas;
ANALYZE estoque_lotes;
ANALYZE produtos;
ANALYZE escolas;
ANALYZE estoque_escolas_historico;