const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const refeicoes = [
  {
    "refeicao": "Mingau de Cereal",
    "ingredientes": [
      {"item": "Cereal", "per_capita": "20g"},
      {"item": "Leite em pó", "per_capita": "15g"},
      {"item": "Açúcar", "per_capita": "5g"}
    ]
  },
  {
    "refeicao": "Arroz + Frango desfiado",
    "ingredientes": [
      {"item": "Arroz", "per_capita": "30g"},
      {"item": "Frango", "per_capita": "48g"},
      {"item": "Colorau", "per_capita": "1g"},
      {"item": "Vinagre", "per_capita": "1ml"},
      {"item": "Coentro", "per_capita": "1g"},
      {"item": "Cebola", "per_capita": "3g"},
      {"item": "Alho", "per_capita": "0,5g"},
      {"item": "Óleo", "per_capita": "1ml"},
      {"item": "Cebolinha", "per_capita": "1g"}
    ]
  },
  {
    "refeicao": "Suco + Panqueca",
    "ingredientes": [
      {"item": "Polpa", "per_capita": "30g"},
      {"item": "Trigo com fermento", "per_capita": "30g"},
      {"item": "Açúcar", "per_capita": "5g"},
      {"item": "Leite em pó", "per_capita": "10g"}
    ]
  },
  {
    "refeicao": "Canja",
    "ingredientes": [
      {"item": "Frango", "per_capita": "48g"},
      {"item": "Arroz", "per_capita": "30g"},
      {"item": "Cebolinha", "per_capita": "1g"},
      {"item": "Coentro", "per_capita": "1g"},
      {"item": "Cebola", "per_capita": "3g"},
      {"item": "Alho", "per_capita": "0,5g"},
      {"item": "Óleo", "per_capita": "1ml"},
      {"item": "Vinagre", "per_capita": "1ml"},
      {"item": "Cenoura", "per_capita": "5g"},
      {"item": "Sal", "per_capita": "1g"}
    ]
  },
  {
    "refeicao": "Mingau de Tapioca",
    "ingredientes": [
      {"item": "Farinha de tapioca", "per_capita": "20g"},
      {"item": "Açúcar", "per_capita": "10g"},
      {"item": "Leite em pó", "per_capita": "15g"}
    ]
  },
  {
    "refeicao": "Macarronada de Frango",
    "ingredientes": [
      {"item": "Macarrão", "per_capita": "30g"},
      {"item": "Frango", "per_capita": "48g"},
      {"item": "Colorau", "per_capita": "1g"},
      {"item": "Vinagre", "per_capita": "1ml"},
      {"item": "Coentro", "per_capita": "1g"},
      {"item": "Cebola", "per_capita": "3g"},
      {"item": "Alho", "per_capita": "0,5g"},
      {"item": "Óleo", "per_capita": "1ml"},
      {"item": "Sal", "per_capita": "1g"},
      {"item": "Cebolinha", "per_capita": "1g"}
    ]
  },
  {
    "refeicao": "Suco + Bolo de Leite",
    "ingredientes": [
      {"item": "Polpa", "per_capita": "30g"},
      {"item": "Trigo com fermento", "per_capita": "30g"},
      {"item": "Leite em pó", "per_capita": "10g"},
      {"item": "Açúcar", "per_capita": "10g"},
      {"item": "Ovo", "per_capita": "0,4g"},
      {"item": "Manteiga", "per_capita": "5g"}
    ]
  },
  {
    "refeicao": "Sopa",
    "ingredientes": [
      {"item": "Carne moída", "per_capita": "48g"},
      {"item": "Macarrão", "per_capita": "30g"},
      {"item": "Colorau", "per_capita": "1g"},
      {"item": "Sal", "per_capita": "1g"},
      {"item": "Coentro", "per_capita": "1g"},
      {"item": "Cebola", "per_capita": "3g"},
      {"item": "Alho", "per_capita": "0,5g"},
      {"item": "Óleo", "per_capita": "1ml"},
      {"item": "Cebolinha", "per_capita": "1g"}
    ]
  },
  {
    "refeicao": "Mingau de Fubá",
    "ingredientes": [
      {"item": "Fubá", "per_capita": "20g"},
      {"item": "Açúcar", "per_capita": "10g"},
      {"item": "Leite em pó", "per_capita": "15g"}
    ]
  },
  {
    "refeicao": "Carne desfiada, Arroz e Feijão",
    "ingredientes": [
      {"item": "Arroz", "per_capita": "30g"},
      {"item": "Carne acém", "per_capita": "70g"},
      {"item": "Feijão", "per_capita": "30g"},
      {"item": "Colorau", "per_capita": "1g"},
      {"item": "Coentro", "per_capita": "1g"},
      {"item": "Cebola", "per_capita": "3g"},
      {"item": "Alho", "per_capita": "0,5g"},
      {"item": "Óleo", "per_capita": "1ml"},
      {"item": "Sal", "per_capita": "1g"},
      {"item": "Cebolinha", "per_capita": "1g"}
    ]
  },
  {
    "refeicao": "Mingau de Arroz",
    "ingredientes": [
      {"item": "Arroz", "per_capita": "20g"},
      {"item": "Açúcar", "per_capita": "10g"},
      {"item": "Leite em pó", "per_capita": "15g"}
    ]
  },
  {
    "refeicao": "Mingau de Milho",
    "ingredientes": [
      {"item": "Milho branco", "per_capita": "20g"},
      {"item": "Açúcar", "per_capita": "10g"},
      {"item": "Leite em pó", "per_capita": "15g"}
    ]
  },
  {
    "refeicao": "Arroz com Galinha",
    "ingredientes": [
      {"item": "Arroz", "per_capita": "30g"},
      {"item": "Frango", "per_capita": "70g"},
      {"item": "Colorau", "per_capita": "1g"},
      {"item": "Vinagre", "per_capita": "1ml"},
      {"item": "Coentro", "per_capita": "1g"},
      {"item": "Cebola", "per_capita": "3g"},
      {"item": "Alho", "per_capita": "0,5g"},
      {"item": "Óleo", "per_capita": "2ml"},
      {"item": "Cebolinha", "per_capita": "1g"},
      {"item": "Chicória", "per_capita": "1g"},
      {"item": "Sal", "per_capita": "1g"}
    ]
  },
  {
    "refeicao": "Leite quente com Biscoito",
    "ingredientes": [
      {"item": "Leite em pó", "per_capita": "15g"},
      {"item": "Biscoito", "per_capita": "30g"}
    ]
  },
  {
    "refeicao": "Macarronada",
    "ingredientes": [
      {"item": "Macarrão", "per_capita": "30g"},
      {"item": "Carne moída", "per_capita": "70g"},
      {"item": "Colorau", "per_capita": "1g"},
      {"item": "Sal", "per_capita": "1g"},
      {"item": "Coentro", "per_capita": "1g"},
      {"item": "Cebola", "per_capita": "3g"},
      {"item": "Alho", "per_capita": "0,5g"},
      {"item": "Óleo", "per_capita": "2ml"},
      {"item": "Cebolinha", "per_capita": "1g"}
    ]
  },
  {
    "refeicao": "Café com Leite e Biscoito",
    "ingredientes": [
      {"item": "Café", "per_capita": "8g"},
      {"item": "Leite em pó", "per_capita": "15g"},
      {"item": "Açúcar", "per_capita": "10g"},
      {"item": "Biscoito", "per_capita": "30g"}
    ]
  },
  {
    "refeicao": "Café com Leite e Tapioca",
    "ingredientes": [
      {"item": "Café", "per_capita": "8g"},
      {"item": "Leite em pó", "per_capita": "15g"},
      {"item": "Açúcar", "per_capita": "5g"},
      {"item": "Goma", "per_capita": "20g"},
      {"item": "Manteiga", "per_capita": "2g"}
    ]
  },
  {
    "refeicao": "Frango guisado com Arroz",
    "ingredientes": [
      {"item": "Arroz", "per_capita": "30g"},
      {"item": "Frango", "per_capita": "70g"},
      {"item": "Colorau", "per_capita": "1g"},
      {"item": "Sal", "per_capita": "1g"},
      {"item": "Vinagre", "per_capita": "1ml"},
      {"item": "Coentro", "per_capita": "1g"},
      {"item": "Cebola", "per_capita": "3g"},
      {"item": "Alho", "per_capita": "0,5g"},
      {"item": "Óleo", "per_capita": "2ml"},
      {"item": "Chicória", "per_capita": "1g"},
      {"item": "Cebolinha", "per_capita": "1g"}
    ]
  },
  {
    "refeicao": "Suco com Biscoito ou Pipoca",
    "ingredientes": [
      {"item": "Polpa", "per_capita": "30g"},
      {"item": "Açúcar", "per_capita": "10g"},
      {"item": "Biscoito", "per_capita": "30g"},
      {"item": "Milho para pipoca", "per_capita": "20g"}
    ]
  },
  {
    "refeicao": "Isca de carne, Arroz e Feijão",
    "ingredientes": [
      {"item": "Carne acém", "per_capita": "70g"},
      {"item": "Arroz", "per_capita": "30g"},
      {"item": "Feijão", "per_capita": "30g"},
      {"item": "Coentro", "per_capita": "1g"},
      {"item": "Cebola", "per_capita": "3g"},
      {"item": "Alho", "per_capita": "0,5g"},
      {"item": "Colorau", "per_capita": "1g"},
      {"item": "Óleo", "per_capita": "1ml"},
      {"item": "Sal", "per_capita": "1g"},
      {"item": "Cebolinha", "per_capita": "1g"}
    ]
  }
];

// Mapeamento direto de ingredientes para produtos do banco
const mapeamentoDireto = {
  // Básicos
  'arroz': 'Arroz',
  'frango': 'Frango Inteiro',
  'frango inteiro': 'Frango Inteiro',
  'galinha': 'Frango Inteiro',
  'filé de frango': 'Filé De Peito De Frango',
  'peito de frango': 'Filé De Peito De Frango',
  
  // Carnes
  'carne': 'Carne Bovina Acém',
  'carne acém': 'Carne Bovina Acém',
  'acém': 'Carne Bovina Acém',
  'carne moída': 'Carne Bovina Moída',
  'moída': 'Carne Bovina Moída',
  
  // Massas e farinhas
  'macarrão': 'Macarrão Tipo Espaguete',
  'macarrao': 'Macarrão Tipo Espaguete',
  'trigo com fermento': 'Farinha De Trigo Com Fermento',
  'farinha de trigo': 'Farinha De Trigo Com Fermento',
  'farinha de tapioca': 'Farinha de tapioca',
  'tapioca': 'Farinha de tapioca',
  'goma': 'Goma de mandioca',
  'fubá': 'Fubá De Milho Em Flocos Finos',
  'fuba': 'Fubá De Milho Em Flocos Finos',
  
  // Laticínios
  'leite em pó': 'Leite Em Pó Integral',
  'leite': 'Leite Em Pó Integral',
  'manteiga': 'Manteiga Sem Lactose',
  
  // Temperos
  'sal': 'Sal Refinado',
  'alho': 'Alho',
  'cebola': 'Cebola Branca',
  'cebolinha': 'Cebolinha',
  'coentro': 'Coentro',
  'colorau': 'Colorífico',
  'colorífico': 'Colorífico',
  'vinagre': 'Vinagre De Álcool',
  
  // Óleos e gorduras
  'óleo': 'Azeite De Dendê',
  'oleo': 'Azeite De Dendê',
  
  // Doces e açúcares
  'açúcar': 'Açúcar Cristal',
  'acucar': 'Açúcar Cristal',
  
  // Bebidas
  'café': 'Café',
  'cafe': 'Café',
  'polpa': 'Polpa De Fruta (Acerola)',
  'suco': 'Polpa De Fruta (Acerola)',
  
  // Biscoitos
  'biscoito': 'Biscoito Cream Cracker',
  'rosquinha': 'Biscoito Rosca Sabor Leite Integral',
  'rosca': 'Biscoito Rosca Sabor Leite Integral',
  
  // Cereais
  'cereal': 'Cereal Em Pó De Arroz',
  'aveia': 'Cerel Em Pó De Arroze Aveia',
  
  // Legumes
  'cenoura': 'Cenoura',
  'chicória': 'Chicória',
  'chicoria': 'Chicória',
  
  // Grãos
  'feijão': 'Feijão Carioquinha',
  'feijao': 'Feijão Carioquinha',
  'milho branco': 'Milho Branco',
  'milho': 'Milho Branco',
  'milho para pipoca': 'Milho Para Pipoca',
  'pipoca': 'Milho Para Pipoca',
  
  // Outros
  'ovo': 'Ovo De Galinha'
};

function parseQuantidade(perCapita) {
  // Remove espaços e converte vírgula para ponto
  const valor = perCapita.replace(/\s/g, '').replace(',', '.');
  // Extrai apenas o número
  const match = valor.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

async function buscarProduto(nomeIngrediente) {
  try {
    // Normalizar nome do ingrediente
    const nomeNormalizado = nomeIngrediente.toLowerCase().trim();

    // Primeiro, tentar mapeamento direto
    if (mapeamentoDireto[nomeNormalizado]) {
      const nomeProduto = mapeamentoDireto[nomeNormalizado];
      const result = await pool.query(`
        SELECT p.id, p.nome, COALESCE(um.codigo, p.unidade_distribuicao, 'UN') as unidade
        FROM produtos p
        LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
        WHERE LOWER(p.nome) = LOWER($1)
        LIMIT 1
      `, [nomeProduto]);

      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }

    // Se não encontrou no mapeamento direto, tentar busca ILIKE
    const result = await pool.query(`
      SELECT p.id, p.nome, COALESCE(um.codigo, p.unidade_distribuicao, 'UN') as unidade
      FROM produtos p
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      WHERE LOWER(p.nome) ILIKE $1
      ORDER BY LENGTH(p.nome) ASC
      LIMIT 1
    `, [`%${nomeNormalizado}%`]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    return null;
  } catch (error) {
    console.error(`Erro ao buscar produto "${nomeIngrediente}":`, error.message);
    return null;
  }
}

async function adicionarRefeicoes() {
  console.log('\n🍽️  Adicionando refeições ao sistema...\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    let refeicoesAdicionadas = 0;
    let ingredientesAdicionados = 0;
    let ingredientesNaoEncontrados = [];

    for (const refeicaoData of refeicoes) {
      console.log(`\n📝 Processando: ${refeicaoData.refeicao}`);

      // Verificar se a refeição já existe
      const refeicaoExiste = await client.query(`
        SELECT id FROM refeicoes WHERE LOWER(nome) = LOWER($1)
      `, [refeicaoData.refeicao]);

      let refeicaoId;

      if (refeicaoExiste.rows.length > 0) {
        refeicaoId = refeicaoExiste.rows[0].id;
        console.log(`   ⚠️  Refeição já existe (ID: ${refeicaoId}), atualizando ingredientes...`);
      } else {
        // Criar nova refeição
        const novaRefeicao = await client.query(`
          INSERT INTO refeicoes (nome, descricao, ativo)
          VALUES ($1, $2, true)
          RETURNING id
        `, [refeicaoData.refeicao, `Refeição: ${refeicaoData.refeicao}`]);

        refeicaoId = novaRefeicao.rows[0].id;
        refeicoesAdicionadas++;
        console.log(`   ✅ Refeição criada (ID: ${refeicaoId})`);
      }

      // Adicionar ingredientes
      for (const ingrediente of refeicaoData.ingredientes) {
        const produto = await buscarProduto(ingrediente.item);

        if (produto) {
          const quantidade = parseQuantidade(ingrediente.per_capita);

          // Verificar se o ingrediente já existe
          const ingredienteExiste = await client.query(`
            SELECT id FROM refeicao_produtos 
            WHERE refeicao_id = $1 AND produto_id = $2
          `, [refeicaoId, produto.id]);

          if (ingredienteExiste.rows.length > 0) {
            // Atualizar quantidade
            await client.query(`
              UPDATE refeicao_produtos 
              SET quantidade_per_capita = $1
              WHERE refeicao_id = $2 AND produto_id = $3
            `, [quantidade, refeicaoId, produto.id]);
            console.log(`      ↻ ${ingrediente.item} → ${produto.nome} (${quantidade}${produto.unidade}) - atualizado`);
          } else {
            // Inserir novo ingrediente
            await client.query(`
              INSERT INTO refeicao_produtos (refeicao_id, produto_id, quantidade_per_capita)
              VALUES ($1, $2, $3)
            `, [refeicaoId, produto.id, quantidade]);
            ingredientesAdicionados++;
            console.log(`      ✓ ${ingrediente.item} → ${produto.nome} (${quantidade}${produto.unidade})`);
          }
        } else {
          ingredientesNaoEncontrados.push({
            refeicao: refeicaoData.refeicao,
            ingrediente: ingrediente.item
          });
          console.log(`      ✗ ${ingrediente.item} - NÃO ENCONTRADO`);
        }
      }
    }

    await client.query('COMMIT');

    console.log('\n\n📊 RESUMO:');
    console.log(`✅ Refeições adicionadas: ${refeicoesAdicionadas}`);
    console.log(`✅ Ingredientes adicionados: ${ingredientesAdicionados}`);
    console.log(`❌ Ingredientes não encontrados: ${ingredientesNaoEncontrados.length}`);

    if (ingredientesNaoEncontrados.length > 0) {
      console.log('\n⚠️  Ingredientes não encontrados:');
      ingredientesNaoEncontrados.forEach(item => {
        console.log(`   - ${item.ingrediente} (${item.refeicao})`);
      });
    }

    console.log('\n✅ Processo concluído!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

adicionarRefeicoes();
