-- =====================================================
-- SCRIPT PARA AJUSTAR BANCO ÀS NECESSIDADES DO SISTEMA
-- =====================================================

-- 1. Garantir que todas as colunas necessárias existam em contrato_produtos
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS limite DECIMAL(10,3);
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS preco DECIMAL(10,2);
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS saldo DECIMAL(15,2);
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS quantidade_contratada DECIMAL(10,3);
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS quantidade_consumida DECIMAL(10,3) DEFAULT 0;
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Garantir colunas em modalidades
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS codigo_financeiro VARCHAR(10);
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS valor_repasse DECIMAL(10,2) DEFAULT 0;
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Garantir colunas em pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero VARCHAR(50);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS data_pedido DATE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS usuario_criacao_id INTEGER REFERENCES usuarios(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS usuario_aprovacao_id INTEGER REFERENCES usuarios(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMP;

-- 4. Garantir colunas em faturamentos
ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS numero VARCHAR(50);
ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS data_faturamento DATE;
ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS usuario_criacao_id INTEGER REFERENCES usuarios(id);

-- 5. Garantir colunas em pedido_itens
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS contrato_produto_id INTEGER REFERENCES contrato_produtos(id);
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS produto_id INTEGER REFERENCES produtos(id);
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS data_entrega_prevista DATE;

-- 6. Garantir colunas em faturamento_itens
ALTER TABLE faturamento_itens ADD COLUMN IF NOT EXISTS pedido_item_id INTEGER;
ALTER TABLE faturamento_itens ADD COLUMN IF NOT EXISTS quantidade_original DECIMAL(10,3);
ALTER TABLE faturamento_itens ADD COLUMN IF NOT EXISTS quantidade_modalidade DECIMAL(10,3);
ALTER TABLE faturamento_itens ADD COLUMN IF NOT EXISTS percentual_modalidade DECIMAL(5,2);
ALTER TABLE faturamento_itens ADD COLUMN IF NOT EXISTS contrato_id INTEGER REFERENCES contratos(id);
ALTER TABLE faturamento_itens ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER REFERENCES fornecedores(id);

-- 7. Garantir colunas em produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade VARCHAR(20) DEFAULT 'kg';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS fator_divisao DECIMAL(10,3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tipo_processamento VARCHAR(50);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(50);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso DECIMAL(10,3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS validade_minima INTEGER;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS imagem_url TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 10;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS perecivel BOOLEAN DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_medio DECIMAL(10,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_referencia DECIMAL(10,2);

-- 8. Garantir colunas em refeicoes
ALTER TABLE refeicoes ADD COLUMN IF NOT EXISTS horario_inicio TIME;
ALTER TABLE refeicoes ADD COLUMN IF NOT EXISTS horario_fim TIME;
ALTER TABLE refeicoes ADD COLUMN IF NOT EXISTS ativa BOOLEAN DEFAULT true;
ALTER TABLE refeicoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 9. Garantir colunas em refeicao_produtos
ALTER TABLE refeicao_produtos ADD COLUMN IF NOT EXISTS per_capita DECIMAL(10,3);
ALTER TABLE refeicao_produtos ADD COLUMN IF NOT EXISTS tipo_medida VARCHAR(20);
ALTER TABLE refeicao_produtos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE refeicao_produtos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 10. Garantir colunas em cardapios
ALTER TABLE cardapios ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE cardapios ADD COLUMN IF NOT EXISTS periodo_dias INTEGER;

-- 11. Garantir colunas em cardapio_refeicoes
ALTER TABLE cardapio_refeicoes ADD COLUMN IF NOT EXISTS modalidade_id INTEGER REFERENCES modalidades(id);
ALTER TABLE cardapio_refeicoes ADD COLUMN IF NOT EXISTS frequencia_mensal INTEGER DEFAULT 1;
ALTER TABLE cardapio_refeicoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 12. Garantir colunas em escolas
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS codigo_acesso VARCHAR(6);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS municipio VARCHAR(100);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS endereco_maps TEXT;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS nome_gestor VARCHAR(255);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS administracao VARCHAR(20) DEFAULT 'municipal';
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS rota INTEGER;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS posicao_rota INTEGER;

-- 13. Garantir colunas em escola_modalidades
ALTER TABLE escola_modalidades ADD COLUMN IF NOT EXISTS turno VARCHAR(20);
ALTER TABLE escola_modalidades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 14. Garantir colunas em contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS saldo_disponivel DECIMAL(15,2) DEFAULT 0;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS tipo_contrato VARCHAR(20) DEFAULT 'fornecimento';
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS objeto TEXT;

-- 15. Garantir colunas em fornecedores
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS contato_responsavel VARCHAR(255);
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 16. Garantir colunas em estoque_lotes
ALTER TABLE estoque_lotes ADD COLUMN IF NOT EXISTS recebimento_id INTEGER;
ALTER TABLE estoque_lotes ADD COLUMN IF NOT EXISTS nota_fiscal VARCHAR(100);
ALTER TABLE estoque_lotes ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE estoque_lotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 17. Garantir colunas em estoque_movimentacoes
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS produto_id INTEGER REFERENCES produtos(id);
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS tipo VARCHAR(20);
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS quantidade_anterior DECIMAL(10,3);
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS quantidade_posterior DECIMAL(10,3);
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS motivo TEXT;
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS documento_referencia TEXT;
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS escola_id INTEGER REFERENCES escolas(id);
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS unidade_medida VARCHAR(20);
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE estoque_movimentacoes ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 18. Garantir colunas em estoque_escolas
ALTER TABLE estoque_escolas ADD COLUMN IF NOT EXISTS quantidade_minima DECIMAL(10,3) DEFAULT 0;
ALTER TABLE estoque_escolas ADD COLUMN IF NOT EXISTS quantidade_maxima DECIMAL(10,3) DEFAULT 0;
ALTER TABLE estoque_escolas ADD COLUMN IF NOT EXISTS data_ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE estoque_escolas ADD COLUMN IF NOT EXISTS usuario_ultima_atualizacao INTEGER REFERENCES usuarios(id);
ALTER TABLE estoque_escolas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE estoque_escolas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 19. Garantir colunas em estoque_escolas_historico
ALTER TABLE estoque_escolas_historico ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE estoque_escolas_historico ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 20. Garantir colunas em usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil VARCHAR(50) DEFAULT 'usuario';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP;

-- 21. Criar índices importantes se não existirem
CREATE INDEX IF NOT EXISTS idx_contrato_produtos_contrato ON contrato_produtos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_produtos_produto ON contrato_produtos(produto_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_produto ON pedido_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_itens_faturamento ON faturamento_itens(faturamento_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_itens_modalidade ON faturamento_itens(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_escola ON estoque_escolas(escola_id);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_produto ON estoque_escolas(produto_id);
CREATE INDEX IF NOT EXISTS idx_escola_modalidades_escola ON escola_modalidades(escola_id);
CREATE INDEX IF NOT EXISTS idx_escola_modalidades_modalidade ON escola_modalidades(modalidade_id);

-- 22. Atualizar valores padrão para modalidades existentes
UPDATE modalidades SET valor_repasse = 34592.50, codigo_financeiro = '2.035' WHERE nome = 'CRECHE' AND valor_repasse = 0;
UPDATE modalidades SET valor_repasse = 34860.75, codigo_financeiro = '2.039' WHERE nome = 'PRÉ ESCOLA' AND valor_repasse = 0;
UPDATE modalidades SET valor_repasse = 138463.00, codigo_financeiro = '2.037' WHERE nome = 'ENS. FUNDAMENTAL' AND valor_repasse = 0;
UPDATE modalidades SET valor_repasse = 34726.50, codigo_financeiro = '2.038' WHERE nome = 'ENS. MÉDIO' AND valor_repasse = 0;
UPDATE modalidades SET valor_repasse = 2432.00, codigo_financeiro = '2.034' WHERE nome = 'AEE' AND valor_repasse = 0;
UPDATE modalidades SET valor_repasse = 6498.50, codigo_financeiro = '2.036' WHERE nome = 'EJA' AND valor_repasse = 0;

-- 23. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers nas tabelas que têm updated_at
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_escolas_updated_at ON escolas;
CREATE TRIGGER update_escolas_updated_at BEFORE UPDATE ON escolas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_produtos_updated_at ON produtos;
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contratos_updated_at ON contratos;
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON contratos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_modalidades_updated_at ON modalidades;
CREATE TRIGGER update_modalidades_updated_at BEFORE UPDATE ON modalidades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cardapios_updated_at ON cardapios;
CREATE TRIGGER update_cardapios_updated_at BEFORE UPDATE ON cardapios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_refeicoes_updated_at ON refeicoes;
CREATE TRIGGER update_refeicoes_updated_at BEFORE UPDATE ON refeicoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verificação final
SELECT 'Ajustes aplicados com sucesso!' as status;
