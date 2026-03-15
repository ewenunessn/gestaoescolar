-- Fix: adiciona ON DELETE CASCADE em todas as FKs que referenciam produtos
-- Isso permite deletar um produto sem precisar deletar manualmente cada tabela dependente

-- estoque_central
ALTER TABLE estoque_central DROP CONSTRAINT IF EXISTS estoque_central_produto_id_fkey;
ALTER TABLE estoque_central ADD CONSTRAINT estoque_central_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- estoque_lotes
ALTER TABLE estoque_lotes DROP CONSTRAINT IF EXISTS estoque_lotes_produto_id_fkey;
ALTER TABLE estoque_lotes ADD CONSTRAINT estoque_lotes_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- estoque_movimentacoes
ALTER TABLE estoque_movimentacoes DROP CONSTRAINT IF EXISTS estoque_movimentacoes_produto_id_fkey;
ALTER TABLE estoque_movimentacoes ADD CONSTRAINT estoque_movimentacoes_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- estoque_escolas
ALTER TABLE estoque_escolas DROP CONSTRAINT IF EXISTS estoque_escolas_produto_id_fkey;
ALTER TABLE estoque_escolas ADD CONSTRAINT estoque_escolas_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- estoque_escolas_historico (FK direta para produto)
ALTER TABLE estoque_escolas_historico DROP CONSTRAINT IF EXISTS estoque_escolas_historico_produto_id_fkey;
ALTER TABLE estoque_escolas_historico ADD CONSTRAINT estoque_escolas_historico_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- guia_produto_escola
ALTER TABLE guia_produto_escola DROP CONSTRAINT IF EXISTS guia_produto_escola_produto_id_fkey;
ALTER TABLE guia_produto_escola ADD CONSTRAINT guia_produto_escola_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- faturamento_itens
ALTER TABLE faturamento_itens DROP CONSTRAINT IF EXISTS faturamento_itens_produto_id_fkey;
ALTER TABLE faturamento_itens ADD CONSTRAINT faturamento_itens_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- pedido_itens (FK para produto)
ALTER TABLE pedido_itens DROP CONSTRAINT IF EXISTS pedido_itens_produto_id_fkey;
ALTER TABLE pedido_itens ADD CONSTRAINT pedido_itens_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- pedido_itens (FK para contrato_produtos) - CASCADE para não bloquear delete de contrato_produtos
ALTER TABLE pedido_itens DROP CONSTRAINT IF EXISTS pedido_itens_contrato_produto_id_fkey;
ALTER TABLE pedido_itens ADD CONSTRAINT pedido_itens_contrato_produto_id_fkey
  FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id) ON DELETE SET NULL;

-- contrato_produtos
ALTER TABLE contrato_produtos DROP CONSTRAINT IF EXISTS contrato_produtos_produto_id_fkey;
ALTER TABLE contrato_produtos ADD CONSTRAINT contrato_produtos_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- refeicao_produtos
ALTER TABLE refeicao_produtos DROP CONSTRAINT IF EXISTS refeicao_produtos_produto_id_fkey;
ALTER TABLE refeicao_produtos ADD CONSTRAINT refeicao_produtos_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- produto_composicao_nutricional
ALTER TABLE produto_composicao_nutricional DROP CONSTRAINT IF EXISTS produto_composicao_nutricional_produto_id_fkey;
ALTER TABLE produto_composicao_nutricional ADD CONSTRAINT produto_composicao_nutricional_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- demandas
ALTER TABLE demandas DROP CONSTRAINT IF EXISTS demandas_produto_id_fkey;
ALTER TABLE demandas ADD CONSTRAINT demandas_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- produto_modalidades (se existir)
ALTER TABLE produto_modalidades DROP CONSTRAINT IF EXISTS produto_modalidades_produto_id_fkey;
ALTER TABLE produto_modalidades ADD CONSTRAINT produto_modalidades_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- refeicoes_ingredientes (se existir)
ALTER TABLE refeicoes_ingredientes DROP CONSTRAINT IF EXISTS refeicoes_ingredientes_produto_id_fkey;
ALTER TABLE refeicoes_ingredientes ADD CONSTRAINT refeicoes_ingredientes_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- controle_qualidade (se existir)
ALTER TABLE controle_qualidade DROP CONSTRAINT IF EXISTS controle_qualidade_produto_id_fkey;
ALTER TABLE controle_qualidade ADD CONSTRAINT controle_qualidade_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- estoque_alertas (se existir)
ALTER TABLE estoque_alertas DROP CONSTRAINT IF EXISTS estoque_alertas_produto_id_fkey;
ALTER TABLE estoque_alertas ADD CONSTRAINT estoque_alertas_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- estoque_escola (tabela alternativa, se existir)
ALTER TABLE estoque_escola DROP CONSTRAINT IF EXISTS estoque_escola_produto_id_fkey;
ALTER TABLE estoque_escola ADD CONSTRAINT estoque_escola_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- estoque_escolar_movimentacoes (se existir)
ALTER TABLE estoque_escolar_movimentacoes DROP CONSTRAINT IF EXISTS estoque_escolar_movimentacoes_produto_id_fkey;
ALTER TABLE estoque_escolar_movimentacoes ADD CONSTRAINT estoque_escolar_movimentacoes_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- estoque_central_movimentacoes (FK para estoque_central, cascade quando central é deletado)
ALTER TABLE estoque_central_movimentacoes DROP CONSTRAINT IF EXISTS estoque_central_movimentacoes_estoque_central_id_fkey;
ALTER TABLE estoque_central_movimentacoes ADD CONSTRAINT estoque_central_movimentacoes_estoque_central_id_fkey
  FOREIGN KEY (estoque_central_id) REFERENCES estoque_central(id) ON DELETE CASCADE;
