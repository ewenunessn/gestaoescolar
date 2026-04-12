const db = require('../src/database').default;

async function main() {
  // Verificar modulos
  const modulos = await db.query('SELECT COUNT(*) FROM modulos');
  const countModulos = parseInt(modulos.rows[0].count);
  console.log(`📦 Módulos existentes: ${countModulos}`);

  if (countModulos === 0) {
    console.log('🔧 Inserindo módulos...');
    await db.query(`
      INSERT INTO modulos (nome, slug, descricao, icone, ordem) VALUES
        ('Dashboard', 'dashboard', 'Painel principal com estatísticas', 'dashboard', 1),
        ('Escolas', 'escolas', 'Gerenciamento de escolas', 'school', 2),
        ('Modalidades', 'modalidades', 'Modalidades de ensino', 'category', 3),
        ('Produtos', 'produtos', 'Cadastro de produtos', 'inventory', 4),
        ('Nutricionistas', 'nutricionistas', 'Cadastro de nutricionistas', 'restaurant', 5),
        ('Fornecedores', 'fornecedores', 'Cadastro de fornecedores', 'business', 6),
        ('Contratos', 'contratos', 'Gerenciamento de contratos', 'description', 7),
        ('Preparações', 'preparacoes', 'Preparações e receitas', 'menu_book', 8),
        ('Cardápios', 'cardapios', 'Planejamento de cardápios', 'restaurant_menu', 9),
        ('Tipos Refeição', 'tipos_refeicao', 'Tipos de refeição', 'schedule', 10),
        ('Planejamento Compras', 'planejamento_compras', 'Planejamento de compras', 'calculate', 11),
        ('Demandas', 'demandas', 'Solicitações de demandas', 'request_quote', 12),
        ('Pedidos', 'pedidos', 'Gerenciamento de pedidos', 'shopping_cart', 13),
        ('Saldo Contratos', 'saldo_contratos', 'Saldo de contratos', 'category', 14),
        ('PNAE', 'pnae', 'Dashboard PNAE', 'agriculture', 15),
        ('Rotas', 'rotas', 'Gestão de rotas', 'business', 16),
        ('Romaneio', 'romaneio', 'Romaneio de entregas', 'print', 17),
        ('Entregas', 'entregas', 'Controle de entregas', 'local_shipping', 18),
        ('Comprovantes', 'comprovantes', 'Comprovantes de entrega', 'description', 19),
        ('Estoque', 'estoque', 'Controle de estoque', 'warehouse', 20),
        ('Solicitações', 'solicitacoes', 'Solicitações recebidas', 'request_quote', 21),
        ('Configurações', 'configuracoes', 'Configurações do sistema', 'settings', 22),
        ('Calendário', 'calendario', 'Calendário letivo', 'calendar_today', 23),
        ('Períodos', 'periodos', 'Gerenciamento de períodos', 'calendar_today', 24),
        ('Usuários', 'usuarios', 'Gerenciamento de usuários', 'people', 25),
        ('Notificações', 'notificacoes', 'Disparos de notificação', 'notifications_active', 26)
      ON CONFLICT (slug) DO NOTHING
    `);
    console.log('✅ Módulos inseridos');
  }

  // Verificar niveis
  const niveis = await db.query('SELECT COUNT(*) FROM niveis_permissao');
  const countNiveis = parseInt(niveis.rows[0].count);
  console.log(`🔐 Níveis existentes: ${countNiveis}`);

  if (countNiveis === 0) {
    console.log('🔧 Inserindo níveis...');
    await db.query(`
      INSERT INTO niveis_permissao (nome, slug, descricao, nivel) VALUES
        ('Nenhum', 'nenhum', 'Sem acesso ao módulo', 0),
        ('Leitura', 'leitura', 'Pode visualizar dados', 1),
        ('Escrita', 'escrita', 'Pode visualizar e editar dados', 2),
        ('Admin', 'admin', 'Acesso total ao módulo', 3)
      ON CONFLICT (slug) DO NOTHING
    `);
    console.log('✅ Níveis inseridos');
  }

  // Mostrar dados
  const m = await db.query('SELECT * FROM modulos ORDER BY ordem');
  console.log('\n📋 Módulos:');
  m.rows.forEach(r => console.log(`  ${r.id}. ${r.nome} (${r.slug})`));

  const n = await db.query('SELECT * FROM niveis_permissao ORDER BY nivel');
  console.log('\n🔐 Níveis:');
  n.rows.forEach(r => console.log(`  ${r.id}. ${r.nome} (nível ${r.nivel})`));

  // Verificar funcoes
  const f = await db.query('SELECT f.id, f.nome, COUNT(fp.id) as num_perms FROM funcoes f LEFT JOIN funcao_permissoes fp ON f.id = fp.funcao_id GROUP BY f.id ORDER BY f.nome');
  console.log('\n👥 Funções:');
  if (f.rows.length === 0) {
    console.log('  Nenhuma função cadastrada');
  } else {
    f.rows.forEach(r => console.log(`  ${r.id}. ${r.nome} (${r.num_perms} permissões)`));
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
