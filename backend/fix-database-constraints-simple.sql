-- CORREÇÃO SIMPLES DE CONSTRAINTS PARA MIGRAÇÃO DE TENANT
-- Trabalha com a estrutura atual do banco

BEGIN;

-- ========================================
-- 1. ADICIONAR COLUNA ESCOLA_ID EM ESTOQUE_LOTES
-- ========================================

-- Adicionar a coluna escola_id se não existir
ALTER TABLE estoque_lotes ADD COLUMN IF NOT EXISTS escola_id INTEGER;

-- Criar foreign key constraint se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'estoque_lotes_escola_id_fkey'
    ) THEN
        ALTER TABLE estoque_lotes 
        ADD CONSTRAINT estoque_lotes_escola_id_fkey 
        FOREIGN KEY (escola_id) REFERENCES escolas(id);
    END IF;
END $$;

-- ========================================
-- 2. POPULAR ESCOLA_ID EM ESTOQUE_LOTES
-- ========================================

-- Popular escola_id em estoque_lotes baseado em estoque_escolas
UPDATE estoque_lotes 
SET escola_id = (
    SELECT ee.escola_id 
    FROM estoque_escolas ee 
    WHERE ee.produto_id = estoque_lotes.produto_id 
    LIMIT 1
)
WHERE escola_id IS NULL;

-- Se ainda há lotes sem escola_id, usar primeira escola ativa
UPDATE estoque_lotes 
SET escola_id = (
    SELECT id FROM escolas WHERE ativo = true ORDER BY id LIMIT 1
)
WHERE escola_id IS NULL;

-- ========================================
-- 3. POPULAR TENANT_ID BASEADO EM RELACIONAMENTOS
-- ========================================

-- Atualizar estoque_escolas baseado na escola
UPDATE estoque_escolas 
SET tenant_id = (
    SELECT tenant_id 
    FROM escolas 
    WHERE id = estoque_escolas.escola_id
)
WHERE tenant_id IS NULL;

-- Atualizar estoque_lotes baseado na escola (agora que tem escola_id)
UPDATE estoque_lotes 
SET tenant_id = (
    SELECT tenant_id 
    FROM escolas 
    WHERE id = estoque_lotes.escola_id
)
WHERE tenant_id IS NULL;

-- Atualizar estoque_escolas_historico baseado na escola
UPDATE estoque_escolas_historico 
SET tenant_id = (
    SELECT tenant_id 
    FROM escolas 
    WHERE id = estoque_escolas_historico.escola_id
)
WHERE tenant_id IS NULL;

-- Atualizar estoque_movimentacoes baseado no lote
UPDATE estoque_movimentacoes 
SET tenant_id = (
    SELECT el.tenant_id 
    FROM estoque_lotes el 
    WHERE el.id = estoque_movimentacoes.lote_id
)
WHERE tenant_id IS NULL;

-- Para produtos, usar tenant padrão se não tiver
UPDATE produtos 
SET tenant_id = (
    SELECT id FROM tenants WHERE slug = 'sistema-principal' LIMIT 1
)
WHERE tenant_id IS NULL;

-- ========================================
-- 4. CRIAR ÍNDICES OTIMIZADOS PARA TENANT
-- ========================================

-- Índices compostos com tenant_id para performance
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola_produto 
ON estoque_escolas(tenant_id, escola_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_escola_produto 
ON estoque_lotes(tenant_id, escola_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_validade 
ON estoque_lotes(tenant_id, data_validade) 
WHERE data_validade IS NOT NULL AND status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_estoque_historico_tenant_escola_data 
ON estoque_escolas_historico(tenant_id, escola_id, data_movimentacao);

CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_tenant_lote 
ON estoque_movimentacoes(tenant_id, lote_id);

-- ========================================
-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
-- ========================================

-- Função para obter tenant atual (se não existir)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true)::UUID,
        (SELECT id FROM tenants WHERE slug = 'sistema-principal' LIMIT 1)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Habilitar RLS nas tabelas de estoque
ALTER TABLE estoque_escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
DROP POLICY IF EXISTS tenant_isolation_estoque_escolas ON estoque_escolas;
CREATE POLICY tenant_isolation_estoque_escolas ON estoque_escolas
    FOR ALL USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_estoque_lotes ON estoque_lotes;
CREATE POLICY tenant_isolation_estoque_lotes ON estoque_lotes
    FOR ALL USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_estoque_historico ON estoque_escolas_historico;
CREATE POLICY tenant_isolation_estoque_historico ON estoque_escolas_historico
    FOR ALL USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_estoque_movimentacoes ON estoque_movimentacoes;
CREATE POLICY tenant_isolation_estoque_movimentacoes ON estoque_movimentacoes
    FOR ALL USING (tenant_id = get_current_tenant_id());

-- ========================================
-- 6. CRIAR TRIGGERS PARA TENANT_ID AUTOMÁTICO
-- ========================================

-- Função para definir tenant_id automaticamente
CREATE OR REPLACE FUNCTION set_tenant_id_estoque()
RETURNS TRIGGER AS $$
BEGIN
    -- Se tenant_id não foi definido, pegar da escola ou contexto atual
    IF NEW.tenant_id IS NULL THEN
        -- Para tabelas com escola_id, pegar tenant da escola
        IF TG_TABLE_NAME IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico') THEN
            SELECT tenant_id INTO NEW.tenant_id 
            FROM escolas 
            WHERE id = NEW.escola_id;
        END IF;
        
        -- Para estoque_movimentacoes, pegar tenant do lote
        IF TG_TABLE_NAME = 'estoque_movimentacoes' THEN
            SELECT tenant_id INTO NEW.tenant_id 
            FROM estoque_lotes 
            WHERE id = NEW.lote_id;
        END IF;
        
        -- Se ainda não encontrou, usar contexto atual
        IF NEW.tenant_id IS NULL THEN
            NEW.tenant_id := get_current_tenant_id();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_escolas ON estoque_escolas;
CREATE TRIGGER trigger_set_tenant_id_estoque_escolas
    BEFORE INSERT ON estoque_escolas
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_estoque();

DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_lotes ON estoque_lotes;
CREATE TRIGGER trigger_set_tenant_id_estoque_lotes
    BEFORE INSERT ON estoque_lotes
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_estoque();

DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_historico ON estoque_escolas_historico;
CREATE TRIGGER trigger_set_tenant_id_estoque_historico
    BEFORE INSERT ON estoque_escolas_historico
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_estoque();

DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_movimentacoes ON estoque_movimentacoes;
CREATE TRIGGER trigger_set_tenant_id_estoque_movimentacoes
    BEFORE INSERT ON estoque_movimentacoes
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_id_estoque();

COMMIT;

-- ========================================
-- 7. VERIFICAÇÃO FINAL
-- ========================================

-- Verificar se todos os registros têm tenant_id
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    'estoque_escolas' as tabela,
    COUNT(*) as total_registros,
    COUNT(tenant_id) as com_tenant_id,
    CASE WHEN COUNT(*) = COUNT(tenant_id) THEN '✅ OK' ELSE '❌ PROBLEMA' END as resultado
FROM estoque_escolas

UNION ALL

SELECT 
    'VERIFICAÇÃO FINAL',
    'estoque_lotes',
    COUNT(*),
    COUNT(tenant_id),
    CASE WHEN COUNT(*) = COUNT(tenant_id) THEN '✅ OK' ELSE '❌ PROBLEMA' END
FROM estoque_lotes

UNION ALL

SELECT 
    'VERIFICAÇÃO FINAL',
    'estoque_escolas_historico',
    COUNT(*),
    COUNT(tenant_id),
    CASE WHEN COUNT(*) = COUNT(tenant_id) THEN '✅ OK' ELSE '❌ PROBLEMA' END
FROM estoque_escolas_historico

UNION ALL

SELECT 
    'VERIFICAÇÃO FINAL',
    'estoque_movimentacoes',
    COUNT(*),
    COUNT(tenant_id),
    CASE WHEN COUNT(*) = COUNT(tenant_id) THEN '✅ OK' ELSE '❌ PROBLEMA' END
FROM estoque_movimentacoes;

-- Verificar se escola_id foi populado em estoque_lotes
SELECT 
    'VERIFICAÇÃO ESCOLA_ID' as status,
    COUNT(*) as total_lotes,
    COUNT(escola_id) as com_escola_id,
    CASE WHEN COUNT(*) = COUNT(escola_id) THEN '✅ OK' ELSE '❌ PROBLEMA' END as resultado
FROM estoque_lotes;