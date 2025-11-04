const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurações de conexão - ATUALIZE COM SEUS DADOS DO NEON
const neonConfig = {
  host: 'ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech', // Host Neon
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner', // Usuário Neon
  password: 'npg_PDfBTKRsi29G', // Senha Neon
  ssl: { rejectUnauthorized: false } // Necessário para Neon
};

// Tenant padrão para migração dos dados existentes
const TENANT_PADRAO = {
  id: '00000000-0000-0000-0000-000000000001', // UUID fixo para o tenant padrão
  nome: 'Escola Padrão',
  slug: 'escola-padrao',
  cnpj: '00000000000000',
  email: 'admin@escola.padrao',
  status: 'active'
};

// SQL para atualizar estrutura (sem dados)
const sqlAtualizarEstrutura = `
-- ATUALIZAÇÃO DA ESTRUTURA DO BANCO NEON PARA MULTI-TENANT
-- Este script atualiza a estrutura do banco Neon com tenant isolation
-- Sem enviar dados, apenas estrutura

-- 1. CRIAR TABELA DE TENANTS (se não existir)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    cnpj VARCHAR(14),
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(8),
    logo_url TEXT,
    config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tenants
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_cnpj ON tenants(cnpj);

-- 2. ADICIONAR COLUNA TENANT_ID ÀS TABELAS EXISTENTES
-- Verificar e adicionar tenant_id apenas se a coluna não existir

DO $$
DECLARE
    tabela TEXT;
    coluna_existe BOOLEAN;
BEGIN
    -- Lista de tabelas que devem ter tenant_id
    FOREACH tabela IN ARRAY ARRAY[
        'escolas', 'produtos', 'usuarios', 'fornecedores', 'contratos', 'modalidades',
        'refeicoes', 'cardapios', 'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico',
        'estoque_movimentacoes', 'estoque_alertas', 'pedidos', 'pedido_itens', 'guias',
        'guia_produto_escola', 'demandas', 'escola_modalidades', 'escolas_modalidades',
        'contrato_produtos', 'contrato_produtos_modalidades', 'cardapio_refeicoes',
        'refeicao_produtos', 'faturamentos', 'faturamento_itens'
    ]
    LOOP
        -- Verificar se a coluna tenant_id já existe
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = tabela AND column_name = 'tenant_id'
        ) INTO coluna_existe;
        
        IF NOT coluna_existe THEN
            EXECUTE format('
                ALTER TABLE %I ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
                CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON %I(tenant_id);
            ', tabela, tabela, tabela);
            
            RAISE NOTICE 'Adicionada coluna tenant_id à tabela %', tabela;
        ELSE
            RAISE NOTICE 'Coluna tenant_id já existe na tabela %', tabela;
        END IF;
    END LOOP;
END $$;

-- 3. CRIAR ÍNDICES COMPOSTOS PARA MELHOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_escolas_tenant_nome ON escolas(tenant_id, nome);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_nome ON produtos(tenant_id, nome);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_categoria ON produtos(tenant_id, categoria);
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_email ON usuarios(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_fornecedores_tenant_nome ON fornecedores(tenant_id, nome);
CREATE INDEX IF NOT EXISTS idx_contratos_tenant_numero ON contratos(tenant_id, numero);
CREATE INDEX IF NOT EXISTS idx_contratos_tenant_status ON contratos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_modalidades_tenant_nome ON modalidades(tenant_id, nome);
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola_produto ON estoque_escolas(tenant_id, escola_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_status ON pedidos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_data ON pedidos(tenant_id, created_at);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS) NAS TABELAS
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapios ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE guias ENABLE ROW LEVEL SECURITY;
ALTER TABLE guia_produto_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE escola_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE escolas_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_produtos_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapio_refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE refeicao_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento_itens ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR POLÍTICAS DE ISOLAMENTO DE TENANT
-- Dropar políticas existentes antes de recriar
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' AND policyname LIKE 'tenant_isolation_%'
    LOOP
        EXECUTE format('DROP POLICY %I ON %I', policy_record.policyname, policy_record.tablename);
        RAISE NOTICE 'Política % removida da tabela %', policy_record.policyname, policy_record.tablename;
    END LOOP;
END $$;

-- Criar políticas de isolamento
CREATE POLICY tenant_isolation_escolas ON escolas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_produtos ON produtos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_usuarios ON usuarios
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_fornecedores ON fornecedores
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_contratos ON contratos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_modalidades ON modalidades
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_refeicoes ON refeicoes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_cardapios ON cardapios
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_estoque_escolas ON estoque_escolas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_estoque_lotes ON estoque_lotes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_estoque_escolas_historico ON estoque_escolas_historico
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_estoque_movimentacoes ON estoque_movimentacoes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_estoque_alertas ON estoque_alertas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_pedidos ON pedidos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_pedido_itens ON pedido_itens
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_guias ON guias
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_guia_produto_escola ON guia_produto_escola
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_demandas ON demandas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_escola_modalidades ON escola_modalidades
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_escolas_modalidades ON escolas_modalidades
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_contrato_produtos ON contrato_produtos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_contrato_produtos_modalidades ON contrato_produtos_modalidades
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_cardapio_refeicoes ON cardapio_refeicoes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_refeicao_produtos ON refeicao_produtos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_faturamentos ON faturamentos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_faturamento_itens ON faturamento_itens
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
`;

// SQL para criar tenant padrão e migrar dados existentes
const sqlMigrarDados = `
-- CRIAR TENANT PADRÃO E MIGRAR DADOS EXISTENTES
-- Este script cria um tenant padrão e associa todos os dados existentes a ele

-- 1. CRIAR TENANT PADRÃO (se não existir)
INSERT INTO tenants (id, nome, slug, cnpj, email, status, created_at, updated_at)
VALUES (
    '${TENANT_PADRAO.id}',
    '${TENANT_PADRAO.nome}',
    '${TENANT_PADRAO.slug}',
    '${TENANT_PADRAO.cnpj}',
    '${TENANT_PADRAO.email}',
    '${TENANT_PADRAO.status}',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    slug = EXCLUDED.slug,
    cnpj = EXCLUDED.cnpj,
    email = EXCLUDED.email,
    status = EXCLUDED.status,
    updated_at = NOW();

-- 2. ATUALIZAR TODAS AS TABELAS COM TENANT_ID PADRÃO
-- Atualizar apenas registros que não têm tenant_id
DO $$
DECLARE
    tabela TEXT;
    total_atualizados INTEGER;
BEGIN
    -- Lista de tabelas para atualizar
    FOREACH tabela IN ARRAY ARRAY[
        'escolas', 'produtos', 'usuarios', 'fornecedores', 'contratos', 'modalidades',
        'refeicoes', 'cardapios', 'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico',
        'estoque_movimentacoes', 'estoque_alertas', 'pedidos', 'pedido_itens', 'guias',
        'guia_produto_escola', 'demandas', 'escola_modalidades', 'escolas_modalidades',
        'contrato_produtos', 'contrato_produtos_modalidades', 'cardapio_refeicoes',
        'refeicao_produtos', 'faturamentos', 'faturamento_itens'
    ]
    LOOP
        EXECUTE format('
            UPDATE %I 
            SET tenant_id = ''${TENANT_PADRAO.id}''
            WHERE tenant_id IS NULL;
        ', tabela);
        
        GET DIAGNOSTICS total_atualizados = ROW_COUNT;
        RAISE NOTICE 'Tabela %: % registros atualizados com tenant_id padrão', tabela, total_atualizados;
    END LOOP;
END $$;

-- 3. VERIFICAR MIGRAÇÃO
SELECT 
    'escolas' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE tenant_id = '${TENANT_PADRAO.id}') as tenant_padrao
FROM escolas
UNION ALL
SELECT 
    'produtos' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE tenant_id = '${TENANT_PADRAO.id}') as tenant_padrao
FROM produtos
UNION ALL
SELECT 
    'usuarios' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE tenant_id = '${TENANT_PADRAO.id}') as tenant_padrao
FROM usuarios
UNION ALL
SELECT 
    'fornecedores' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE tenant_id = '${TENANT_PADRAO.id}') as tenant_padrao
FROM fornecedores
UNION ALL
SELECT 
    'contratos' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE tenant_id = '${TENANT_PADRAO.id}') as tenant_padrao
FROM contratos;
`;

async function atualizarEstruturaNeon() {
  console.log('🔄 Atualizando estrutura do banco Neon para multi-tenant...');
  console.log('📍 Host:', neonConfig.host);
  console.log('📊 Banco:', neonConfig.database);
  
  const client = new Client(neonConfig);
  
  try {
    await client.connect();
    console.log('✅ Conectado ao banco Neon');
    
    // 1. Atualizar estrutura (sem dados)
    console.log('\n🔄 Executando atualização de estrutura...');
    await client.query(sqlAtualizarEstrutura);
    console.log('✅ Estrutura atualizada com sucesso!');
    
    // 2. Criar tenant padrão e migrar dados
    console.log('\n🔄 Criando tenant padrão e migrando dados...');
    const result = await client.query(sqlMigrarDados);
    
    console.log('✅ Migração de dados concluída!');
    console.log('\n📊 Resumo da migração:');
    
    if (result.rows && result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log(`   📋 ${row.tabela}: ${row.total_registros} registros (${row.tenant_padrao} no tenant padrão)`);
      });
    }
    
    // 3. Verificar se há dados sem tenant
    console.log('\n🔍 Verificando dados sem tenant...');
    const verificacao = await client.query(`
      SELECT 
        'escolas' as tabela,
        COUNT(*) FILTER (WHERE tenant_id IS NULL) as sem_tenant
      FROM escolas
      UNION ALL
      SELECT 
        'produtos' as tabela,
        COUNT(*) FILTER (WHERE tenant_id IS NULL) as sem_tenant
      FROM produtos
      UNION ALL
      SELECT 
        'usuarios' as tabela,
        COUNT(*) FILTER (WHERE tenant_id IS NULL) as sem_tenant
      FROM usuarios
      HAVING COUNT(*) FILTER (WHERE tenant_id IS NULL) > 0;
    `);
    
    if (verificacao.rows.length > 0) {
      console.log('⚠️  Atenção: Existem dados sem tenant_id:');
      verificacao.rows.forEach(row => {
        console.log(`   ❌ ${row.tabela}: ${row.sem_tenant} registros`);
      });
    } else {
      console.log('✅ Todos os dados estão associados a tenants!');
    }
    
    console.log('\n🎉 Atualização concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log(`   1. Tenant padrão criado: ${TENANT_PADRAO.nome} (${TENANT_PADRAO.slug})`);
    console.log(`   2. ID do tenant: ${TENANT_PADRAO.id}`);
    console.log('   3. Configure seu frontend para usar o tenant_id nas requisições');
    console.log('   4. Teste o isolamento de tenant no sistema');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar banco Neon:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Função para testar a conexão antes de executar
async function testarConexao() {
  const client = new Client(neonConfig);
  
  try {
    await client.connect();
    console.log('✅ Teste de conexão bem-sucedido!');
    
    // Verificar versão do PostgreSQL
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL:', result.rows[0].version);
    
    // Verificar se já existe estrutura tenant
    const tenantCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tenants'
      ) as existe;
    `);
    
    console.log('🔍 Tabela tenants existe:', tenantCheck.rows[0].existe);
    
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão:', error);
    return false;
  }
}

// Executar script
async function executar() {
  console.log('🚀 Iniciando atualização do banco Neon...');
  console.log('⚠️  IMPORTANTE: Atualize as configurações de conexão no script!');
  console.log('   Host:', neonConfig.host);
  console.log('   Database:', neonConfig.database);
  console.log('   User:', neonConfig.user);
  console.log('');
  
  // Verificar se as configurações foram atualizadas
  if (neonConfig.host.includes('seu-host-neon')) {
    console.error('❌ ERRO: Você precisa atualizar as configurações de conexão do Neon!');
    console.log('📝 Edite o arquivo e substitua:');
    console.log('   - host: "seu-host-neon.aws.neon.tech"');
    console.log('   - user: "seu-usuario-neon"');
    console.log('   - password: "sua-senha-neon"');
    process.exit(1);
  }
  
  try {
    // Testar conexão primeiro
    console.log('🔍 Testando conexão com o banco...');
    const conexaoOk = await testarConexao();
    
    if (!conexaoOk) {
      console.error('❌ Falha na conexão. Verifique as configurações.');
      process.exit(1);
    }
    
    // Executar atualização
    await atualizarEstruturaNeon();
    
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
    process.exit(1);
  }
}

// Verificar se pg está instalado
try {
  require('pg');
  executar();
} catch (error) {
  console.error('❌ pg não está instalado. Instale com: npm install pg');
  process.exit(1);
}