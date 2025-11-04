-- MIGRAÇÃO DE DADOS EXISTENTES PARA TENANT
-- Este script migra todos os dados existentes para um tenant específico
-- Sem duplicar ou perder dados

-- 1. CRIAR TENANT PRINCIPAL (se ainda não existir)
INSERT INTO tenants (id, nome, slug, cnpj, email, status, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'Secretaria de Educação Principal', 
    'secretaria-educacao',
    '12345678000195',
    'admin@educacao.gov.br',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    slug = EXCLUDED.slug,
    cnpj = EXCLUDED.cnpj,
    email = EXCLUDED.email,
    updated_at = NOW();

-- 2. ATUALIZAR DADOS EXISTENTES COM O NOVO TENANT
-- Atualizar apenas registros que não têm tenant_id ou têm o tenant default

-- Tabelas principais por ordem de dependência
UPDATE escolas SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE usuarios SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE fornecedores SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE produtos SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE modalidades SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE refeicoes SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

-- Tabelas de relacionamento e dependentes
UPDATE contratos SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE contrato_produtos SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE contrato_produtos_modalidades SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE cardapios SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE cardapio_refeicoes SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE refeicao_produtos SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

-- Estoque
UPDATE estoque_escolas SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE estoque_lotes SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE estoque_escolas_historico SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE estoque_movimentacoes SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE estoque_alertas SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

-- Pedidos e entregas
UPDATE pedidos SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE pedido_itens SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE guias SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE guia_produto_escola SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE demandas SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

-- Relacionamentos
UPDATE escola_modalidades SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE escolas_modalidades SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

-- Faturamento
UPDATE faturamentos SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE faturamento_itens SET 
    tenant_id = '11111111-1111-1111-1111-111111111111' 
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

-- 3. TORNAR TENANT_ID NOT NULL NAS TABELAS PRINCIPAIS
ALTER TABLE escolas ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE produtos ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE usuarios ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE fornecedores ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE contratos ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE modalidades ALTER COLUMN tenant_id SET NOT NULL;

-- 4. VERIFICAR MIGRAÇÃO
SELECT 
    'Migração concluída com sucesso!' as status,
    (SELECT COUNT(*) FROM tenants WHERE id = '11111111-1111-1111-1111-111111111111') as tenant_principal_criado,
    (SELECT COUNT(*) FROM escolas WHERE tenant_id = '11111111-1111-1111-1111-111111111111') as escolas_migradas,
    (SELECT COUNT(*) FROM produtos WHERE tenant_id = '11111111-1111-1111-1111-111111111111') as produtos_migrados,
    (SELECT COUNT(*) FROM usuarios WHERE tenant_id = '11111111-1111-1111-1111-111111111111') as usuarios_migrados,
    (SELECT COUNT(*) FROM fornecedores WHERE tenant_id = '11111111-1111-1111-1111-111111111111') as fornecedores_migrados,
    (SELECT COUNT(*) FROM contratos WHERE tenant_id = '11111111-1111-1111-1111-111111111111') as contratos_migrados;

-- 5. RESUMO DA MIGRAÇÃO
CREATE OR REPLACE VIEW view_migracao_resumo AS
SELECT 
    'Tenant Principal' as item,
    '11111111-1111-1111-1111-111111111111' as tenant_id,
    'Secretaria de Educação Principal' as descricao
UNION ALL
SELECT 
    'Escolas migradas' as item,
    CAST(COUNT(*) AS VARCHAR) as tenant_id,
    'Total de escolas no tenant' as descricao
FROM escolas WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 
    'Produtos migrados' as item,
    CAST(COUNT(*) AS VARCHAR) as tenant_id,
    'Total de produtos no tenant' as descricao
FROM produtos WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 
    'Usuários migrados' as item,
    CAST(COUNT(*) AS VARCHAR) as tenant_id,
    'Total de usuários no tenant' as descricao
FROM usuarios WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 
    'Fornecedores migrados' as item,
    CAST(COUNT(*) AS VARCHAR) as tenant_id,
    'Total de fornecedores no tenant' as descricao
FROM fornecedores WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 
    'Contratos migrados' as item,
    CAST(COUNT(*) AS VARCHAR) as tenant_id,
    'Total de contratos no tenant' as descricao
FROM contratos WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Executar a view para ver o resumo
SELECT * FROM view_migracao_resumo;