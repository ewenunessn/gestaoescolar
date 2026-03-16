const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// Dados extraídos da tabela
const DADOS = [
  { item: 'BISCOITO CREAM CRACKER', marca: 'TRIGOLNO', quantidade: 25500, unidade: 'PACOTE', preco: 4.16, fornecedor: 'RAMOS COMERCIO LTDA', contrato: '252' },
  { item: 'LEITE DE COCO', marca: 'FREDÃO', quantidade: 6000, unidade: 'GARRAFA', preco: 2.41, fornecedor: 'RAMOS COMERCIO LTDA', contrato: '66' },
  { item: 'MASSA DE SÊMOLA ARGOLINHA', marca: 'RICOSA', quantidade: 3200, unidade: 'PACOTE', preco: 4.69, fornecedor: 'RAMOS COMERCIO LTDA', contrato: '369' },
  { item: 'ARROZ', marca: 'ACOSTUMADO', quantidade: 44783, unidade: 'KG', preco: 5.03, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '368' },
  { item: 'CARNE BOVINA ACÉM', marca: 'MAFRINORTE', quantidade: 11680, unidade: 'KG', preco: 27.90, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '368' },
  { item: 'FILÉ DE PEITO DE FRANGO', marca: 'AMERICANO', quantidade: 24179, unidade: 'KG', preco: 20.90, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '368' },
  { item: 'MANTEIGA SEM LACTOSE', marca: 'TOURINHO', quantidade: 300, unidade: 'UNIDADE', preco: 17.20, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '368' },
  { item: 'POLPA DE FRUTA (AÇAÍ)', marca: 'NUTRIN POLPAS', quantidade: 11500, unidade: 'KG', preco: 18.99, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '368' },
  { item: 'ALHO', marca: 'ALHOBEL', quantidade: 2240, unidade: 'PACOTE', preco: 14.20, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'AÇÚCAR CRISTAL', marca: 'ITAMARATI', quantidade: 24000, unidade: 'KG', preco: 4.08, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'BISCOITO TIPO MAIZENA', marca: 'TRIGOLINO', quantidade: 3429, unidade: 'PACOTE', preco: 4.78, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'BISCOITO ROSCO SABOR COCO', marca: 'TRIGOLINO', quantidade: 4800, unidade: 'PACOTE', preco: 4.50, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'CARNE BOVINA MOÍDA', marca: 'MAFRINORTE', quantidade: 10000, unidade: 'KG', preco: 15.15, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'CEREAL EM PÓ DE MILHO', marca: 'FORTLON', quantidade: 8889, unidade: 'SHACHÊ', preco: 4.25, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'CENOURA', marca: 'IN NATURA', quantidade: 10600, unidade: 'KG', preco: 5.00, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'COLORÍFICO', marca: 'M. VITORIA', quantidade: 22000, unidade: 'PACOTE', preco: 1.03, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'FEIJÃO CARIOQUINHA', marca: 'DA CASA', quantidade: 3000, unidade: 'KG', preco: 4.78, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'FEIJÃO PRETO', marca: 'DONA DE', quantidade: 3000, unidade: 'KG', preco: 6.30, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'FUBÁ DE MILHO EM FLOCOS FINOS', marca: 'VITAMILHO', quantidade: 4000, unidade: 'PACOTE', preco: 2.40, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'FRANGO INTEIRO', marca: 'AMERICANO', quantidade: 25000, unidade: 'KG', preco: 10.72, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'FILÉ DE PEIXE', marca: 'EXCELLENT FISH', quantidade: 9000, unidade: 'KG', preco: 27.99, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'LEITE EM PÓ INTEGRAL', marca: 'SOBERANO', quantidade: 90000, unidade: 'PACOTE', preco: 7.08, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'MACARRÃO TIPO ESPAGUETE', marca: 'POTY NEXO', quantidade: 11000, unidade: 'PACOTE', preco: 2.69, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'OVO DE GALINHA', marca: 'GAASA', quantidade: 161280, unidade: 'UNIDADE', preco: 0.67, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'SAL REFINADO', marca: 'MARIZA', quantidade: 2800, unidade: 'KG', preco: 1.40, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'VINAGRE DE ÁLCOOL', marca: 'GAMA LOPES', quantidade: 2000, unidade: 'GARRAFA', preco: 1.35, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '64' },
  { item: 'BISCOITO MARIA TRADICIONAL', marca: 'POTY', quantidade: 8250, unidade: 'PACOTE', preco: 3.23, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '253' },
  { item: 'BISCOITO MARIA DE CHOCOLATE', marca: 'TRIGOLINO', quantidade: 5750, unidade: 'PACOTE', preco: 4.12, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '253' },
  { item: 'MILHO PARA PIPOCA', marca: 'MARIZA', quantidade: 5200, unidade: 'PACOTE', preco: 5.00, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '253' },
  { item: 'ÓLEO DE SOJA', marca: 'CONCÓRDIA', quantidade: 5222, unidade: 'GARRAFA', preco: 9.40, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '253' },
  { item: 'POLPA DE FRUTA (ACEROLA)', marca: 'NUTRIN POLPAS', quantidade: 8000, unidade: 'KG', preco: 8.40, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '253' },
  { item: 'POLPA DE FRUTA (GOIABA)', marca: 'NUTRIN POLPAS', quantidade: 20000, unidade: 'KG', preco: 8.60, fornecedor: 'DISTRIBUIDORA MESQUITA LTDA', contrato: '253' },
  { item: 'AZEITE DE DENDÊ', marca: 'MARIZA', quantidade: 2500, unidade: 'GARRAFA', preco: 4.49, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '250' },
  { item: 'BATATA', marca: 'IN NATURA', quantidade: 10600, unidade: 'KG', preco: 5.62, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '250' },
  { item: 'BISCOITO ROSCA SABOR LEITE INTEGRAL', marca: 'TRIGOLINO', quantidade: 9400, unidade: 'PACOTE', preco: 4.83, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '250' },
  { item: 'BISCOITO ROSCA SEM LACTOSE CHOCOLATE', marca: 'TRIGOLINO', quantidade: 2800, unidade: 'PACOTE', preco: 4.85, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '250' },
  { item: 'CEREAL EM PÓ DE ARROZ', marca: 'TRIGOLINO', quantidade: 11111, unidade: 'PACOTE', preco: 4.37, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '250' },
  { item: 'CEBOLA BRANCA', marca: 'IN NATURA', quantidade: 20000, unidade: 'KG', preco: 3.14, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '250' },
  { item: 'MILHO BRANCO', marca: 'MARIZA', quantidade: 6400, unidade: 'PACOTE 500G', preco: 5.69, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '250' },
  { item: 'POLPA DE FRUTA (CAJU)', marca: 'PETRUZ', quantidade: 11000, unidade: 'KG', preco: 10.39, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '250' },
  { item: 'FARINHA DE TRIGO COM FERMENTO', marca: 'MIRELLA', quantidade: 2000, unidade: 'KG', preco: 5.28, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '62' },
  { item: 'FARINHA DE TRIGO SEM FERMENTO', marca: 'MIRELLA', quantidade: 1000, unidade: 'KG', preco: 5.12, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '62' },
  { item: 'LEITE EM PÓ SEM LACTOSE', marca: 'ITAMBE', quantidade: 4500, unidade: 'PACOTE', preco: 18.99, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '62' },
  { item: 'PÃO DE HAMBÚRGUER', marca: 'MASSALEVE', quantidade: 210630, unidade: 'UNIDADE', preco: 0.69, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '62' },
  { item: 'CEREL EM PÓ DE ARROZ E AVEIA', marca: 'MARATÁ', quantidade: 5556, unidade: 'PACOTE', preco: 5.76, fornecedor: 'AHCOR COMERCIO DE PRODUTS ODONTOLOGICOS LTDA', contrato: '367' }
];

async function run() {
  await client.connect();
  console.log('✅ Conectado ao Neon\n');

  try {
    // 1. VERIFICAR PRODUTOS EXISTENTES
    console.log('📦 ETAPA 1: Verificando produtos existentes...\n');
    const produtosExistentes = await client.query('SELECT id, nome, unidade FROM produtos ORDER BY nome');
    console.log(`Total de produtos no sistema: ${produtosExistentes.rows.length}\n`);

    const produtosMap = new Map();
    produtosExistentes.rows.forEach(p => {
      const key = `${p.nome.toUpperCase().trim()}|${p.unidade.toUpperCase().trim()}`;
      produtosMap.set(key, p.id);
    });

    // Verificar quais produtos da lista existem
    const produtosFaltando = [];
    const produtosEncontrados = [];
    
    DADOS.forEach(item => {
      const key = `${item.item.toUpperCase().trim()}|${item.unidade.toUpperCase().trim()}`;
      if (produtosMap.has(key)) {
        produtosEncontrados.push({ ...item, produto_id: produtosMap.get(key) });
      } else {
        produtosFaltando.push(item);
      }
    });

    console.log(`✅ Produtos encontrados: ${produtosEncontrados.length}`);
    console.log(`❌ Produtos faltando: ${produtosFaltando.length}\n`);

    if (produtosFaltando.length > 0) {
      console.log('⚠️  PRODUTOS QUE PRECISAM SER CADASTRADOS:');
      produtosFaltando.forEach(p => {
        console.log(`   - ${p.item} (${p.unidade})`);
      });
      console.log('\n⚠️  ATENÇÃO: Cadastre esses produtos primeiro antes de continuar!\n');
      await client.end();
      return;
    }

    // 2. VERIFICAR/CRIAR FORNECEDORES
    console.log('🏢 ETAPA 2: Verificando fornecedores...\n');
    const fornecedoresUnicos = [...new Set(DADOS.map(d => d.fornecedor))];
    const fornecedoresMap = new Map();

    for (const nomeFornecedor of fornecedoresUnicos) {
      const result = await client.query(
        'SELECT id FROM fornecedores WHERE UPPER(nome) = UPPER($1)',
        [nomeFornecedor]
      );

      if (result.rows.length > 0) {
        fornecedoresMap.set(nomeFornecedor, result.rows[0].id);
        console.log(`✅ Fornecedor encontrado: ${nomeFornecedor} (ID: ${result.rows[0].id})`);
      } else {
        const insert = await client.query(
          `INSERT INTO fornecedores (nome, cnpj, ativo) 
           VALUES ($1, $2, true) 
           RETURNING id`,
          [nomeFornecedor, '00.000.000/0000-00']
        );
        fornecedoresMap.set(nomeFornecedor, insert.rows[0].id);
        console.log(`➕ Fornecedor criado: ${nomeFornecedor} (ID: ${insert.rows[0].id})`);
      }
    }

    // 3. VERIFICAR/CRIAR CONTRATOS
    console.log('\n📄 ETAPA 3: Verificando contratos...\n');
    const contratosUnicos = [...new Set(DADOS.map(d => `${d.contrato}|${d.fornecedor}`))];
    const contratosMap = new Map();

    for (const contratoKey of contratosUnicos) {
      const [numero, fornecedor] = contratoKey.split('|');
      const fornecedor_id = fornecedoresMap.get(fornecedor);

      const result = await client.query(
        'SELECT id FROM contratos WHERE numero = $1 AND fornecedor_id = $2',
        [numero, fornecedor_id]
      );

      if (result.rows.length > 0) {
        contratosMap.set(contratoKey, result.rows[0].id);
        console.log(`✅ Contrato encontrado: ${numero} - ${fornecedor} (ID: ${result.rows[0].id})`);
      } else {
        const dataInicio = '2025-01-01';
        const dataFim = '2025-12-31';
        
        const insert = await client.query(
          `INSERT INTO contratos (fornecedor_id, numero, data_inicio, data_fim, ativo, tipo_licitacao) 
           VALUES ($1, $2, $3, $4, true, 'pregao_eletronico') 
           RETURNING id`,
          [fornecedor_id, numero, dataInicio, dataFim]
        );
        contratosMap.set(contratoKey, insert.rows[0].id);
        console.log(`➕ Contrato criado: ${numero} - ${fornecedor} (ID: ${insert.rows[0].id})`);
      }
    }

    // 4. ADICIONAR PRODUTOS AOS CONTRATOS
    console.log('\n📦 ETAPA 4: Adicionando produtos aos contratos...\n');
    let adicionados = 0;
    let jaExistentes = 0;
    let erros = 0;

    for (const item of produtosEncontrados) {
      const contratoKey = `${item.contrato}|${item.fornecedor}`;
      const contrato_id = contratosMap.get(contratoKey);

      // Verificar se já existe
      const existe = await client.query(
        'SELECT id FROM contrato_produtos WHERE contrato_id = $1 AND produto_id = $2',
        [contrato_id, item.produto_id]
      );

      if (existe.rows.length > 0) {
        jaExistentes++;
        console.log(`⏭️  Já existe: ${item.item} no contrato ${item.contrato}`);
        continue;
      }

      try {
        await client.query(
          `INSERT INTO contrato_produtos 
           (contrato_id, produto_id, quantidade_contratada, preco_unitario, marca, ativo) 
           VALUES ($1, $2, $3, $4, $5, true)`,
          [contrato_id, item.produto_id, item.quantidade, item.preco, item.marca]
        );
        adicionados++;
        console.log(`✅ Adicionado: ${item.item} (${item.marca}) ao contrato ${item.contrato}`);
      } catch (error) {
        erros++;
        console.error(`❌ Erro ao adicionar ${item.item}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA IMPORTAÇÃO:');
    console.log('='.repeat(60));
    console.log(`✅ Produtos adicionados: ${adicionados}`);
    console.log(`⏭️  Produtos já existentes: ${jaExistentes}`);
    console.log(`❌ Erros: ${erros}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERRO GERAL:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada');
  }
}

run().catch(console.error);
