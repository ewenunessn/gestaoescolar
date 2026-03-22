/**
 * Script para importar a Tabela TACO (UNICAMP, 4ª edição) no banco de dados.
 * Fonte: https://github.com/raulfdm/taco-api (dados de domínio público - NEPA/UNICAMP)
 * Execute: node backend/migrations/importar-taco.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const isNeon = connectionString?.includes('neon.tech');
console.log(`Conectando ao banco: ${isNeon ? 'Neon (produção)' : 'Local'}`);

const pool = new Pool({ connectionString, ssl: isNeon ? { rejectUnauthorized: false } : false });

const FOOD_CSV_URL = 'https://raw.githubusercontent.com/raulfdm/taco-api/main/references/csv/food.csv';
const NUTRIENTS_CSV_URL = 'https://raw.githubusercontent.com/raulfdm/taco-api/main/references/csv/nutrients.csv';
const CATEGORIES_CSV_URL = 'https://raw.githubusercontent.com/raulfdm/taco-api/main/references/csv/categories.csv';

async function fetchCSV(url) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    // handle quoted fields with commas
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    fields.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = fields[i] ?? ''; });
    return obj;
  });
}

function toNum(val) {
  if (val === '' || val === null || val === undefined || val === ' ') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function main() {
  console.log('Buscando dados da TACO do GitHub...');

  const [foodCSV, nutrientsCSV, categoriesCSV] = await Promise.all([
    fetchCSV(FOOD_CSV_URL),
    fetchCSV(NUTRIENTS_CSV_URL),
    fetchCSV(CATEGORIES_CSV_URL),
  ]);

  const foods = parseCSV(foodCSV);
  const nutrients = parseCSV(nutrientsCSV);
  const categories = parseCSV(categoriesCSV);

  console.log(`Alimentos: ${foods.length}, Nutrientes: ${nutrients.length}, Categorias: ${categories.length}`);

  // map categoryId -> name
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c.name; });

  // map foodId -> nutrients row
  const nutriMap = {};
  nutrients.forEach(n => { nutriMap[n.foodId] = n; });

  // Criar tabela se não existir
  await pool.query(`
    CREATE TABLE IF NOT EXISTS taco_alimentos (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      categoria TEXT,
      energia_kcal NUMERIC,
      proteina_g NUMERIC,
      lipideos_g NUMERIC,
      carboidratos_g NUMERIC,
      fibra_alimentar_g NUMERIC,
      calcio_mg NUMERIC,
      ferro_mg NUMERIC,
      sodio_mg NUMERIC,
      vitamina_c_mg NUMERIC,
      vitamina_a_mcg NUMERIC,
      colesterol_mg NUMERIC,
      gorduras_saturadas_g NUMERIC,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('Tabela taco_alimentos verificada/criada.');

  // Limpar dados anteriores
  await pool.query('TRUNCATE TABLE taco_alimentos RESTART IDENTITY');
  console.log('Dados anteriores removidos.');

  // Montar INSERT em batch para performance
  const values = [];
  const params = [];
  let paramIdx = 1;

  for (const food of foods) {
    const n = nutriMap[food.id] || {};
    const categoria = catMap[food.categoryId] || null;

    values.push(`($${paramIdx},$${paramIdx+1},$${paramIdx+2},$${paramIdx+3},$${paramIdx+4},$${paramIdx+5},$${paramIdx+6},$${paramIdx+7},$${paramIdx+8},$${paramIdx+9},$${paramIdx+10},$${paramIdx+11},$${paramIdx+12},$${paramIdx+13},$${paramIdx+14})`);
    params.push(
      parseInt(food.id),
      food.name,
      categoria,
      toNum(n.kcal),
      toNum(n.protein),
      toNum(n.lipids),
      toNum(n.carbohydrates),
      toNum(n.dietaryFiber),
      toNum(n.calcium),
      toNum(n.iron),
      toNum(n.sodium),
      toNum(n.vitaminC),
      toNum(n.re) ?? toNum(n.rae) ?? toNum(n.retinol),
      toNum(n.cholesterol),
      null
    );
    paramIdx += 15;
  }

  await pool.query(
    `INSERT INTO taco_alimentos
      (id, nome, categoria, energia_kcal, proteina_g, lipideos_g, carboidratos_g,
       fibra_alimentar_g, calcio_mg, ferro_mg, sodio_mg, vitamina_c_mg,
       vitamina_a_mcg, colesterol_mg, gorduras_saturadas_g)
     VALUES ${values.join(',')}`,
    params
  );

  console.log(`\nImportação concluída: ${foods.length} alimentos inseridos.`);
  await pool.end();
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
