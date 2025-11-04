const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco Neon (ajuste conforme necessário)
const neonConfig = {
  host: process.env.NEON_HOST || 'ep-ancient-bread-123456.us-east-1.aws.neon.tech',
  port: 5432,
  database: process.env.NEON_DATABASE || 'alimentacao_escolar',
  user: process.env.NEON_USER || 'postgres',
  password: process.env.NEON_PASSWORD || 'your-neon-password',
  ssl: {
    rejectUnauthorized: false
  }
};

// Configuração do banco local (origem dos dados)
const localConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: process.env.DB_NAME || 'alimentacao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

// Função para executar SQL
async function executarSQL(pool, sql, descricao) {
  try {
    console.log(`🔄 ${descricao}...`);
    await pool.query(sql);
    console.log(`✅ ${descricao} concluído`);
  } catch (error) {
    console.error(`❌ Erro em ${descricao}:`, error.message);
    throw error;
  }
}

// Função principal de migração
async function migrarNeon() {
  let neonPool, localPool;
  
  try {
    console.log('🚀 Iniciando migração do banco Neon para multi-tenant...\n');
    
    // Conectar aos bancos
    console.log('🔗 Conectando ao banco Neon...');
    neonPool = new Pool(neonConfig);
    
    console.log('🔗 Conectando ao banco local...');
    localPool = new Pool(localConfig);
    
    // Testar conexões
    await neonPool.query('SELECT 1');
    console.log('✅ Conexão com Neon estabelecida');
    
    await localPool.query('SELECT 1');
    console.log('✅ Conexão com banco local estabelecida\n');
    
    // 1. Ler e executar script de estrutura
    console.log('📋 Aplicando estrutura de tenant...');
    const estruturaSQL = fs.readFileSync(
      path.join(__dirname, 'atualizar-neon-estrutura-tenant.sql'), 
      'utf8'
    );
    
    // Dividir o SQL em comandos individuais para executar separadamente
    const comandos = estruturaSQL.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (const comando of comandos) {
      try {
        await neonPool.query(comando);
      } catch (error) {
        // Ignorar erros de "already exists" ou comandos vazios
        if (!error.message.includes('already exists') && 
            !error.message.includes('does not exist') &&
            comando.trim().length > 10) {
          console.warn(`⚠️  Aviso ao executar comando: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Estrutura de tenant aplicada\n');
    
    // 2. Criar tenant principal
    console.log('🏢 Criando tenant principal...');
    const tenantSQL = `
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
    `;
    
    await neonPool.query(tenantSQL);
    console.log('✅ Tenant principal criado\n');
    
    // 3. Verificar se há dados para migrar
    console.log('📊 Verificando dados existentes...');
    const verificacao = await localPool.query(`
      SELECT 
        'escolas' as tabela, 
        COUNT(*) as total
      FROM escolas
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'produtos' as tabela, 
        COUNT(*) as total
      FROM produtos
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'usuarios' as tabela, 
        COUNT(*) as total
      FROM usuarios
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'fornecedores' as tabela, 
        COUNT(*) as total
      FROM fornecedores
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'contratos' as tabela, 
        COUNT(*) as total
      FROM contratos
      WHERE tenant_id IS NULL;
    `);
    
    console.log('📋 Dados encontrados para migração:');
    verificacao.rows.forEach(row => {
      console.log(`   ${row.tabela}: ${row.total} registros`);
    });
    
    const totalRegistros = verificacao.rows.reduce((sum, row) => sum + parseInt(row.total), 0);
    
    if (totalRegistros === 0) {
      console.log('\n⚠️  Nenhum dado encontrado para migração');
      console.log('✅ Estrutura de tenant já está aplicada');
      return;
    }
    
    // 4. Atualizar dados no Neon com tenant_id
    console.log('\n🔄 Atualizando dados com tenant_id...');
    
    // Como não queremos enviar dados do local para o Neon, 
    // apenas atualizaremos os dados existentes no Neon com o tenant
    const atualizacoes = [
      'UPDATE escolas SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE produtos SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE usuarios SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE fornecedores SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE contratos SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE modalidades SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE refeicoes SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE cardapios SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE estoque_escolas SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE estoque_lotes SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE estoque_escolas_historico SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE estoque_movimentacoes SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE estoque_alertas SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE pedidos SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE pedido_itens SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE guias SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE guia_produto_escola SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE demandas SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE escola_modalidades SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE escolas_modalidades SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE contrato_produtos SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE contrato_produtos_modalidades SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE cardapio_refeicoes SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE refeicao_produtos SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE faturamentos SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';',
      'UPDATE faturamento_itens SET tenant_id = \'11111111-1111-1111-1111-111111111111\' WHERE tenant_id IS NULL OR tenant_id = \'00000000-0000-0000-0000-000000000000\';'
    ];
    
    for (const sql of atualizacoes) {
      try {
        const result = await neonPool.query(sql);
        console.log(`✅ Atualização concluída: ${sql.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`⚠️  Aviso ao atualizar: ${error.message}`);
      }
    }
    
    console.log('\n✅ Dados atualizados com tenant_id');
    
    // 5. Verificar resultado
    console.log('\n📊 Verificando resultado da migração...');
    const resultado = await neonPool.query(`
      SELECT 
        'Tenant Principal' as item,
        '11111111-1111-1111-1111-111111111111' as tenant_id,
        'Secretaria de Educação Principal' as descricao
      UNION ALL
      SELECT 
        'Escolas' as item,
        CAST(COUNT(*) AS VARCHAR) as tenant_id,
        'Total de escolas no tenant' as descricao
      FROM escolas WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
      UNION ALL
      SELECT 
        'Produtos' as item,
        CAST(COUNT(*) AS VARCHAR) as tenant_id,
        'Total de produtos no tenant' as descricao
      FROM produtos WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
      UNION ALL
      SELECT 
        'Usuários' as item,
        CAST(COUNT(*) AS VARCHAR) as tenant_id,
        'Total de usuários no tenant' as descricao
      FROM usuarios WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
      UNION ALL
      SELECT 
        'Fornecedores' as item,
        CAST(COUNT(*) AS VARCHAR) as tenant_id,
        'Total de fornecedores no tenant' as descricao
      FROM fornecedores WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
      UNION ALL
      SELECT 
        'Contratos' as item,
        CAST(COUNT(*) AS VARCHAR) as tenant_id,
        'Total de contratos no tenant' as descricao
      FROM contratos WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
    `);
    
    console.log('\n🎉 Resumo da migração:');
    resultado.rows.forEach(row => {
      console.log(`   ${row.item}: ${row.tenant_id}`);
    });
    
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Testar o isolamento de tenant');
    console.log('   2. Configurar aplicação para usar tenant_id');
    console.log('   3. Verificar se as RLS policies estão funcionando');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    // Fechar conexões
    if (neonPool) await neonPool.end();
    if (localPool) await localPool.end();
  }
}

// Executar migração
if (require.main === module) {
  migrarNeon()
    .then(() => {
      console.log('\n🎉 Processo de migração finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = { migrarNeon };