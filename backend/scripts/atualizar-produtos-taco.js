const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

// Mapeamento de categorias TACO para categorias do sistema
const CATEGORIA_MAP = {
  'Cereais e derivados': 'Cereais',
  'Verduras, hortaliças e derivados': 'Hortaliças',
  'Frutas e derivados': 'Frutas',
  'Gorduras e óleos': 'Óleos e Gorduras',
  'Pescados e frutos do mar': 'Pescados',
  'Carnes e derivados': 'Carnes',
  'Leite e derivados': 'Laticínios',
  'Bebidas (alcoólicas e não alcoólicas)': 'Bebidas',
  'Ovos e derivados': 'Ovos',
  'Produtos açucarados': 'Açúcares',
  'Miscelâneas': 'Outros',
  'Outros alimentos industrializados': 'Industrializados',
  'Alimentos preparados': 'Preparados',
  'Leguminosas e derivados': 'Leguminosas',
  'Nozes e sementes': 'Oleaginosas'
};

// Mapeamento de tipo de processamento baseado na classificação NOVA
const TIPO_PROCESSAMENTO_MAP = {
  'in natura': ['cru', 'crua', 'in natura', 'fresco', 'fresca', 'natural', 'inteiro', 'inteira'],
  'minimamente processado': ['cozido', 'cozida', 'assado', 'assada', 'grelhado', 'grelhada', 
                              'refogado', 'refogada', 'congelado', 'congelada', 'desidratado', 
                              'desidratada', 'pasteurizado', 'pasteurizada', 'fermentado', 'fermentada'],
  'ingrediente culinário': ['óleo', 'azeite', 'sal', 'açúcar', 'manteiga', 'banha', 'gordura'],
  'processado': ['enlatado', 'enlatada', 'conserva', 'em calda', 'em conserva', 'defumado', 
                 'defumada', 'queijo', 'pão', 'extrato'],
  'ultraprocessado': ['biscoito', 'refrigerante', 'salgadinho', 'macarrão instantâneo', 
                      'nugget', 'salsicha', 'linguiça', 'presunto', 'mortadela', 'cereal matinal',
                      'barra de cereal', 'achocolatado', 'margarina', 'tempero pronto']
};

// Fatores de correção típicos por categoria (baseado em literatura técnica)
const FATOR_CORRECAO_CATEGORIA = {
  'Hortaliças': 1.15,      // 15% de perda (cascas, talos)
  'Frutas': 1.20,          // 20% de perda (cascas, sementes)
  'Carnes': 1.05,          // 5% de perda (aparas, gordura)
  'Pescados': 1.30,        // 30% de perda (cabeça, espinhas)
  'Cereais': 1.02,         // 2% de perda (impurezas)
  'Leguminosas': 1.02,     // 2% de perda (impurezas)
  'Ovos': 1.00,            // Sem perda
  'Laticínios': 1.00,      // Sem perda
  'Óleos e Gorduras': 1.00, // Sem perda
  'Açúcares': 1.00,        // Sem perda
  'Industrializados': 1.00, // Sem perda
  'Preparados': 1.00,      // Sem perda
  'Bebidas': 1.00,         // Sem perda
  'Oleaginosas': 1.10,     // 10% de perda (cascas)
  'Outros': 1.05           // 5% de perda (padrão)
};

// Fatores de correção específicos por produto
const FATOR_CORRECAO_ESPECIFICO = {
  'batata': 1.25,
  'cenoura': 1.15,
  'cebola': 1.10,
  'tomate': 1.05,
  'alface': 1.30,
  'repolho': 1.20,
  'abóbora': 1.40,
  'banana': 1.40,
  'laranja': 1.50,
  'maçã': 1.10,
  'mamão': 1.30,
  'melancia': 1.50,
  'frango': 1.05,
  'carne bovina': 1.05,
  'peixe': 1.30,
  'arroz': 1.02,
  'feijão': 1.02,
  'macarrão': 1.00,
  'óleo': 1.00,
  'leite': 1.00,
  'ovo': 1.00
};

function detectarTipoProcessamento(nomeProduto, descricao) {
  const texto = `${nomeProduto} ${descricao || ''}`.toLowerCase();
  
  // Verificar ultraprocessados primeiro (mais específico)
  for (const palavra of TIPO_PROCESSAMENTO_MAP['ultraprocessado']) {
    if (texto.includes(palavra)) {
      return 'ultraprocessado';
    }
  }
  
  // Verificar ingredientes culinários
  for (const palavra of TIPO_PROCESSAMENTO_MAP['ingrediente culinário']) {
    if (texto.includes(palavra)) {
      return 'ingrediente culinário';
    }
  }
  
  // Verificar processados
  for (const palavra of TIPO_PROCESSAMENTO_MAP['processado']) {
    if (texto.includes(palavra)) {
      return 'processado';
    }
  }
  
  // Verificar minimamente processados
  for (const palavra of TIPO_PROCESSAMENTO_MAP['minimamente processado']) {
    if (texto.includes(palavra)) {
      return 'minimamente processado';
    }
  }
  
  // Verificar in natura
  for (const palavra of TIPO_PROCESSAMENTO_MAP['in natura']) {
    if (texto.includes(palavra)) {
      return 'in natura';
    }
  }
  
  // Inferir por categoria e características do produto
  
  // Ultraprocessados típicos
  if (texto.includes('instantâneo') || texto.includes('tempero pronto') || 
      texto.includes('achocolatado') || texto.includes('cereal matinal')) {
    return 'ultraprocessado';
  }
  
  // Ingredientes culinários típicos
  if (texto.includes('óleo') || texto.includes('azeite') || texto.includes('sal') || 
      texto.includes('açúcar') || texto.includes('manteiga') || texto.includes('banha')) {
    return 'ingrediente culinário';
  }
  
  // Processados típicos
  if (texto.includes('pão') || texto.includes('queijo') || texto.includes('extrato') ||
      texto.includes('farinha') || texto.includes('leite em pó')) {
    return 'processado';
  }
  
  // Minimamente processados típicos
  if (texto.includes('polpa') || texto.includes('manteiga') || texto.includes('arroz') ||
      texto.includes('feijão') || texto.includes('macarrão') || texto.includes('massa')) {
    return 'minimamente processado';
  }
  
  // In natura típicos (hortaliças, frutas, carnes frescas)
  if (texto.includes('alface') || texto.includes('tomate') || texto.includes('cebola') ||
      texto.includes('cenoura') || texto.includes('batata') || texto.includes('banana') ||
      texto.includes('laranja') || texto.includes('mamão') || texto.includes('melancia') ||
      texto.includes('couve') || texto.includes('alho') || texto.includes('limão') ||
      texto.includes('carne') || texto.includes('frango') || texto.includes('peixe') ||
      texto.includes('ovo')) {
    return 'in natura';
  }
  
  // Padrão: in natura para produtos frescos
  return 'in natura';
}

function calcularFatorCorrecao(nomeProduto, categoria, tipoProcessamento) {
  const nomeLower = nomeProduto.toLowerCase();
  
  // Se é processado ou ultraprocessado, geralmente fator = 1.0 (já vem pronto)
  if (tipoProcessamento === 'processado' || tipoProcessamento === 'ultraprocessado') {
    return 1.00;
  }
  
  // Verificar fatores específicos para produtos não processados
  for (const [palavra, fator] of Object.entries(FATOR_CORRECAO_ESPECIFICO)) {
    if (nomeLower.includes(palavra)) {
      return fator;
    }
  }
  
  // Usar fator da categoria
  return FATOR_CORRECAO_CATEGORIA[categoria] || 1.05;
}

async function atualizarProdutos() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando atualização de produtos com base na tabela TACO...\n');

    // 1. Buscar todos os produtos
    const produtosResult = await client.query(`
      SELECT id, nome, categoria, tipo_processamento, fator_correcao
      FROM produtos
      WHERE ativo = true
      ORDER BY nome
    `);

    console.log(`📦 Total de produtos ativos: ${produtosResult.rows.length}\n`);

    let atualizados = 0;
    let erros = 0;

    for (const produto of produtosResult.rows) {
      try {
        // 2. Buscar correspondência na tabela TACO (se existir)
        const tacoResult = await client.query(`
          SELECT descricao
          FROM produto_composicao_nutricional
          WHERE produto_id = $1
          LIMIT 1
        `, [produto.id]);

        let novaCategoria = produto.categoria;
        let novoTipoProcessamento = produto.tipo_processamento;
        let novoFatorCorrecao = produto.fator_correcao || 1.0;

        // Detectar tipo de processamento baseado no nome e descrição TACO
        const descricaoTaco = tacoResult.rows.length > 0 ? tacoResult.rows[0].descricao : '';
        const tipoDetectado = detectarTipoProcessamento(produto.nome, descricaoTaco);
        
        // Garantir que o tipo está em lowercase e é um dos valores válidos
        const tiposValidos = ['in natura', 'minimamente processado', 'ingrediente culinário', 'processado', 'ultraprocessado'];
        novoTipoProcessamento = tiposValidos.includes(tipoDetectado) ? tipoDetectado : 'in natura';

        // Se não tem categoria ainda, inferir do nome
        if (!novaCategoria || novaCategoria === 'CONVECIONAL' || novaCategoria === 'AGRICULTURA') {
          const nomeLower = produto.nome.toLowerCase();
          if (nomeLower.includes('carne') || nomeLower.includes('bovina') || nomeLower.includes('frango') || nomeLower.includes('acém')) {
            novaCategoria = 'Carnes';
          } else if (nomeLower.includes('peixe') || nomeLower.includes('filé')) {
            novaCategoria = 'Pescados';
          } else if (nomeLower.includes('arroz') || nomeLower.includes('macarrão') || nomeLower.includes('pão') || nomeLower.includes('farinha') || nomeLower.includes('fubá') || nomeLower.includes('massa')) {
            novaCategoria = 'Cereais';
          } else if (nomeLower.includes('feijão') || nomeLower.includes('lentilha')) {
            novaCategoria = 'Leguminosas';
          } else if (nomeLower.includes('leite') || nomeLower.includes('queijo') || nomeLower.includes('iogurte') || nomeLower.includes('manteiga')) {
            novaCategoria = 'Laticínios';
          } else if (nomeLower.includes('óleo') || nomeLower.includes('azeite') || nomeLower.includes('margarina') || nomeLower.includes('dendê')) {
            novaCategoria = 'Óleos e Gorduras';
          } else if (nomeLower.includes('ovo')) {
            novaCategoria = 'Ovos';
          } else if (nomeLower.includes('banana') || nomeLower.includes('laranja') || nomeLower.includes('mamão') || 
                     nomeLower.includes('melancia') || nomeLower.includes('manga') || nomeLower.includes('limão') ||
                     nomeLower.includes('polpa') || nomeLower.includes('açaí') || nomeLower.includes('acerola')) {
            novaCategoria = 'Frutas';
          } else if (nomeLower.includes('alface') || nomeLower.includes('tomate') || nomeLower.includes('cebola') ||
                     nomeLower.includes('cenoura') || nomeLower.includes('batata') || nomeLower.includes('couve') ||
                     nomeLower.includes('abóbora') || nomeLower.includes('chuchu') || nomeLower.includes('pepino') ||
                     nomeLower.includes('alho') || nomeLower.includes('cebolinha') || nomeLower.includes('coentro') ||
                     nomeLower.includes('chicória') || nomeLower.includes('cariru') || nomeLower.includes('jambu') ||
                     nomeLower.includes('quiabo') || nomeLower.includes('maxixe') || nomeLower.includes('milho') ||
                     nomeLower.includes('macaxeira')) {
            novaCategoria = 'Hortaliças';
          } else if (nomeLower.includes('açúcar') || nomeLower.includes('mel')) {
            novaCategoria = 'Açúcares';
          } else if (nomeLower.includes('biscoito') || nomeLower.includes('cereal')) {
            novaCategoria = 'Industrializados';
          } else if (nomeLower.includes('café') || nomeLower.includes('sal') || nomeLower.includes('vinagre') || 
                     nomeLower.includes('colorífico') || nomeLower.includes('tucupi')) {
            novaCategoria = 'Outros';
          } else {
            novaCategoria = 'Outros';
          }
        }

        // Calcular fator de correção adequado
        novoFatorCorrecao = calcularFatorCorrecao(produto.nome, novaCategoria, novoTipoProcessamento);

        // 3. Atualizar produto
        await client.query(`
          UPDATE produtos
          SET 
            categoria = $1,
            tipo_processamento = $2,
            fator_correcao = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [novaCategoria, novoTipoProcessamento, novoFatorCorrecao, produto.id]);

        atualizados++;
        
        // Log apenas se houve mudança
        if (produto.categoria !== novaCategoria || 
            produto.tipo_processamento !== novoTipoProcessamento || 
            Math.abs((produto.fator_correcao || 1.0) - novoFatorCorrecao) > 0.001) {
          console.log(`✅ ${produto.nome}`);
          if (produto.categoria !== novaCategoria) {
            console.log(`   Categoria: ${produto.categoria || '(vazio)'} → ${novaCategoria}`);
          }
          if (produto.tipo_processamento !== novoTipoProcessamento) {
            console.log(`   Tipo: ${produto.tipo_processamento || '(vazio)'} → ${novoTipoProcessamento}`);
          }
          if (Math.abs((produto.fator_correcao || 1.0) - novoFatorCorrecao) > 0.001) {
            console.log(`   Fator Correção: ${(produto.fator_correcao || 1.0).toFixed(3)} → ${novoFatorCorrecao.toFixed(3)}`);
          }
          console.log('');
        }

      } catch (error) {
        erros++;
        console.error(`❌ Erro ao atualizar ${produto.nome}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Atualização concluída!`);
    console.log(`📊 Produtos processados: ${produtosResult.rows.length}`);
    console.log(`✅ Atualizados com sucesso: ${atualizados}`);
    console.log(`❌ Erros: ${erros}`);
    console.log('='.repeat(60));

    // Estatísticas por categoria
    console.log('\n📊 Distribuição por categoria:');
    const statsResult = await client.query(`
      SELECT categoria, COUNT(*) as total
      FROM produtos
      WHERE ativo = true
      GROUP BY categoria
      ORDER BY total DESC
    `);

    statsResult.rows.forEach(row => {
      console.log(`   ${row.categoria || '(sem categoria)'}: ${row.total} produtos`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
atualizarProdutos().catch(console.error);
