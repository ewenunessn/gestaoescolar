-- Script para corrigir o isolamento de tenant no estoque
-- Execute este script para garantir que os dados sejam filtrados por tenant

BEGIN;

-- 1. Criar função get_current_tenant_id() se não existir
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Retorna o tenant_id da configuração atual da sessão
    -- Se não estiver definido, retorna o tenant padrão "Sistema Principal"
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true)::UUID,
        (SELECT id FROM tenants WHERE slug = 'sistema-principal' LIMIT 1)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Criar função para definir o tenant atual na sessão
CREATE OR REPLACE FUNCTION set_current_tenant_id(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_uuid::text, false);
END;
$$ LANGUAGE plpgsql;

-- 3. Implementar Row Level Security (RLS) nas tabelas de estoque
ALTER TABLE estoque_escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas_historico ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS para isolamento automático
-- Política para estoque_escolas
DROP POLICY IF EXISTS estoque_escolas_tenant_isolation ON estoque_escolas;
CREATE POLICY estoque_escolas_tenant_isolation ON estoque_escolas
    FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Política para estoque_lotes
DROP POLICY IF EXISTS estoque_lotes_tenant_isolation ON estoque_lotes;
CREATE POLICY estoque_lotes_tenant_isolation ON estoque_lotes
    FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Política para estoque_escolas_historico
DROP POLICY IF EXISTS estoque_historico_tenant_isolation ON estoque_escolas_historico;
CREATE POLICY estoque_historico_tenant_isolation ON estoque_escolas_historico
    FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- 5. Garantir que escolas e produtos também tenham RLS
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- Política para escolas
DROP POLICY IF EXISTS escolas_tenant_isolation ON escolas;
CREATE POLICY escolas_tenant_isolation ON escolas
    FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Política para produtos
DROP POLICY IF EXISTS produtos_tenant_isolation ON produtos;
CREATE POLICY produtos_tenant_isolation ON produtos
    FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- 6. Criar função para bypass do RLS (apenas para administradores)
CREATE OR REPLACE FUNCTION bypass_rls_for_admin()
RETURNS VOID AS $$
BEGIN
    -- Permite bypass do RLS para operações administrativas
    SET row_security = off;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar função para restaurar RLS
CREATE OR REPLACE FUNCTION restore_rls()
RETURNS VOID AS $$
BEGIN
    -- Restaura o RLS
    SET row_security = on;
END;
$$ LANGUAGE plpgsql;

-- 8. Testar o isolamento
DO $$
DECLARE
    escola_teste_tenant_id UUID;
    sistema_principal_tenant_id UUID;
BEGIN
    -- Buscar IDs dos tenants
    SELECT id INTO escola_teste_tenant_id FROM tenants WHERE slug = 'escola-de-teste';
    SELECT id INTO sistema_principal_tenant_id FROM tenants WHERE slug = 'sistema-principal';
    
    -- Definir tenant "Escola de Teste"
    PERFORM set_current_tenant_id(escola_teste_tenant_id);
    
    -- Contar registros visíveis com RLS
    RAISE NOTICE 'Testando isolamento para tenant "Escola de Teste":';
    RAISE NOTICE 'Escolas visíveis: %', (SELECT COUNT(*) FROM escolas);
    RAISE NOTICE 'Produtos visíveis: %', (SELECT COUNT(*) FROM produtos);
    RAISE NOTICE 'Estoque escolas visível: %', (SELECT COUNT(*) FROM estoque_escolas);
    RAISE NOTICE 'Lotes visíveis: %', (SELECT COUNT(*) FROM estoque_lotes);
    
    -- Definir tenant "Sistema Principal"
    PERFORM set_current_tenant_id(sistema_principal_tenant_id);
    
    RAISE NOTICE 'Testando isolamento para tenant "Sistema Principal":';
    RAISE NOTICE 'Escolas visíveis: %', (SELECT COUNT(*) FROM escolas);
    RAISE NOTICE 'Produtos visíveis: %', (SELECT COUNT(*) FROM produtos);
    RAISE NOTICE 'Estoque escolas visível: %', (SELECT COUNT(*) FROM estoque_escolas);
    RAISE NOTICE 'Lotes visíveis: %', (SELECT COUNT(*) FROM estoque_lotes);
    
END $$;

COMMIT;

-- 9. Mostrar resumo
SELECT 
    'RLS habilitado em:' as info,
    string_agg(tablename, ', ') as tabelas
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
  AND tablename IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'escolas', 'produtos');

SELECT 
    'Políticas RLS criadas:' as info,
    COUNT(*) as total_politicas
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'escolas', 'produtos');