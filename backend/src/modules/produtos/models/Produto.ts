const db = require("../database");

export interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  unidade?: string;
  fator_divisao?: number;
  tipo_processamento?: string; // in natura, minimamente processado, processado, ultraprocessado
  categoria?: string;
  marca?: string;
  codigo_barras?: string;
  peso?: number; // peso em gramas
  validade_minima?: number;
  imagem_url?: string;
  estoque_minimo?: number;
  perecivel: boolean; // indica se o produto é perecível
  ativo: boolean;
}

export async function createProdutoTable() {
  // Função desabilitada - usar SQL direto
  await db.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT, -- DESCONTINUADO - mantido para compatibilidade
      unidade TEXT,
      fator_divisao REAL,
      tipo_processamento TEXT,
      categoria TEXT,
      marca TEXT,
      codigo_barras TEXT,
      peso REAL,
      validade_minima INTEGER,
      imagem_url TEXT,
      estoque_minimo INTEGER DEFAULT 10,
      perecivel INTEGER DEFAULT 0, -- NOVO - 0 = não perecível, 1 = perecível
      ativo INTEGER DEFAULT 1
    )
  `);
  await db.close();
}

export async function getAllProdutos(): Promise<Produto[]> {
  // Função desabilitada - usar SQL direto
  const produtos = await db.all("SELECT * FROM produtos");
  await db.close();
  return produtos;
}

export async function getProdutoById(id: number): Promise<Produto | null> {
  // Função desabilitada - usar SQL direto
  const result = await db.query(
    "SELECT * FROM produtos WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function createProduto(
  produto: Omit<Produto, "id">
): Promise<Produto> {
  // Função desabilitada - usar SQL direto
  const result = await db.run(
    "INSERT INTO produtos (nome, unidade, fator_divisao, tipo_processamento, categoria, marca, codigo_barras, peso, validade_minima, imagem_url, estoque_minimo, perecivel, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    produto.nome,
    produto.unidade || null,
    produto.fator_divisao ?? null,
    produto.tipo_processamento || null,
    produto.categoria || null,
    produto.marca || null,
    produto.codigo_barras || null,
    produto.peso ?? null,
    produto.validade_minima ?? null,
    produto.imagem_url || null,
    produto.estoque_minimo ?? 10,
    produto.perecivel ? 1 : 0,
    produto.ativo ? 1 : 0
  );
  const novo = await db.get(
    "SELECT * FROM produtos WHERE id = ?",
    result.lastID
  );
  await db.close();
  if (!novo) {
    throw new Error("Falha ao recuperar o produto recém-criado.");
  }
  return novo;
}

export async function updateProduto(
  id: number,
  produto: Partial<Omit<Produto, "id">>
): Promise<Produto | null> {
  // Função desabilitada - usar SQL direto
  const atual = await db.get(
    "SELECT * FROM produtos WHERE id = ?",
    id
  );
  if (!atual) {
    await db.close();
    return null;
  }
  const nome = produto.nome ?? atual.nome;
  const unidade = produto.unidade ?? atual.unidade;
  const fator_divisao = produto.fator_divisao ?? atual.fator_divisao;
  const tipo_processamento =
    produto.tipo_processamento ?? atual.tipo_processamento;
  const categoria = produto.categoria ?? atual.categoria;
  const marca = produto.marca ?? atual.marca;
  const codigo_barras = produto.codigo_barras ?? atual.codigo_barras;
  const peso = produto.peso ?? atual.peso;
  const validade_minima = produto.validade_minima ?? atual.validade_minima;
  const imagem_url = produto.imagem_url ?? atual.imagem_url;
  const estoque_minimo = produto.estoque_minimo ?? atual.estoque_minimo;
  const perecivel = produto.perecivel !== undefined ? (produto.perecivel ? 1 : 0) : atual.perecivel;
  const ativo =
    produto.ativo !== undefined ? (produto.ativo ? 1 : 0) : atual.ativo;
  await db.run(
    "UPDATE produtos SET nome = ?, unidade = ?, fator_divisao = ?, tipo_processamento = ?, categoria = ?, marca = ?, codigo_barras = ?, peso = ?, validade_minima = ?, imagem_url = ?, estoque_minimo = ?, perecivel = ?, ativo = ? WHERE id = ?",
    nome,
    unidade,
    fator_divisao,
    tipo_processamento,
    categoria,
    marca,
    codigo_barras,
    peso,
    validade_minima,
    imagem_url,
    estoque_minimo,
    perecivel,
    ativo,
    id
  );
  const atualizado = await db.get(
    "SELECT * FROM produtos WHERE id = ?",
    id
  );
  await db.close();
  return atualizado || null;
}

export async function deleteProduto(id: number): Promise<boolean> {
  // Função desabilitada - usar SQL direto
  const result = await db.run("DELETE FROM produtos WHERE id = ?", id);
  await db.close();
  return (result.changes ?? 0) > 0;
}