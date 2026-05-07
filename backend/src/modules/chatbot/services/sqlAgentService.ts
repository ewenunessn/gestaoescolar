import type { ChatbotHistoryMessage } from "./chatbotOrchestrator";

type QueryFn = (sql: string, params?: any[]) => Promise<{ rows: any[] }>;

export type SqlAgentIntent =
  | "estoque.escolas_com_produto"
  | "estoque.produto_na_escola"
  | "estoque.ranking_escolas_por_produto"
  | "estoque.produtos_da_escola";

export interface PlannedSqlAgentIntent {
  intent: SqlAgentIntent;
  produtoNome?: string;
  escolaNome?: string;
}

export interface ExecuteSqlAgentInput {
  message: string;
  history?: ChatbotHistoryMessage[];
  plannedIntent?: PlannedSqlAgentIntent;
  query?: QueryFn;
}

export interface SqlAgentResult {
  handled: boolean;
  intent?: SqlAgentIntent;
  answer: string;
  sql: {
    name?: string;
    params: any[];
  };
  data?: unknown;
}

interface ProdutoCandidato {
  id: number;
  nome: string;
  unidade: string;
}

interface EscolaCandidato {
  id: number;
  nome: string;
}

interface SqlIntent {
  intent: SqlAgentIntent;
  produtoNome: string;
  escolaNome?: string;
}

interface LinkedEntities {
  produto?: ProdutoCandidato;
  escola?: EscolaCandidato;
}

type SemanticOperation =
  | "product_at_school"
  | "schools_with_product"
  | "ranking_schools_by_product"
  | "products_at_school";

const defaultQuery: QueryFn = async (sql, params = []) => {
  const db = (await import("../../../database")).default;
  return db.query(sql, params);
};

function normalizeSearch(value: string): string {
  return `%${value.trim().replace(/\s+/g, "%")}%`;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const ignored = new Set([
    "a",
    "as",
    "o",
    "os",
    "de",
    "da",
    "do",
    "das",
    "dos",
    "no",
    "na",
    "nos",
    "nas",
    "em",
    "e",
    "qual",
    "quais",
    "quanto",
    "quantos",
    "tem",
    "têm",
    "estoque",
    "saldo",
    "item",
    "produto",
    "escola",
    "kg",
    "quilo",
    "quilos",
  ]);

  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !ignored.has(token));
}

function cleanTerm(value: string): string {
  return value
    .replace(/[?.!,;:]+$/g, "")
    .replace(/\b(kg|kgs|quilo|quilos|un|und|unidade|unidades|pct|pacote|pacotes|litro|litros)\b/gi, "")
    .replace(/^(?:a|o)\s+/gi, "")
    .replace(/^(?:a\s+|o\s+)?escola\s+/gi, "")
    .replace(/\b(no|na|do|da|de|em|estoque|escola)\b$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(value: string, patterns: RegExp[]): RegExpExecArray | null {
  for (const pattern of patterns) {
    const match = pattern.exec(value);
    if (match?.[1]) return match;
  }
  return null;
}

function inferIntent(message: string, history: ChatbotHistoryMessage[] = []): SqlIntent | null {
  const compact = message.trim().replace(/\s+/g, " ").replace(/[?.!,;:]+$/g, "");
  const normalized = normalizeText(compact);

  let schoolsWithProductMatch = firstMatch(compact, [
    /\b(?:qual|quais)\s+escolas?\s+(?:possuem|possui|tem|t[eê]m)\s+(.+?)\s+(?:no|em)\s+estoque\b/i,
    /\b(?:qual|quais)\s+escolas?\s+(?:est[aã]o\s+com|com)\s+(.+?)\s+(?:no|em)\s+estoque\b/i,
  ]);

  schoolsWithProductMatch = schoolsWithProductMatch ?? firstMatch(compact, [
    /\b(?:existe|existem|ha)\s+(?:alguma|algumas)?\s*escolas?\s+(?:com|que\s+(?:tem|tenha|possu[ia]))\s+(.+?)\s+(?:no|em)\s+estoque\b/i,
  ]);

  if (schoolsWithProductMatch?.[1]) {
    const produtoNome = cleanTerm(schoolsWithProductMatch[1]);
    if (produtoNome) {
      return { intent: "estoque.escolas_com_produto", produtoNome };
    }
  }

  const schoolFirstStockMatch = firstMatch(compact, [
    /\b(?:quantos?|quanto)\s+(.+?)\s+(?:tem|possui|possuem)\s+(?:de|do|da)\s+(.+)$/i,
  ]);

  if (schoolFirstStockMatch?.[1] && schoolFirstStockMatch?.[2]) {
    return {
      intent: "estoque.produto_na_escola",
      produtoNome: cleanTerm(schoolFirstStockMatch[2]),
      escolaNome: cleanTerm(schoolFirstStockMatch[1]),
    };
  }

  const quantityProductAtSchoolMatch = firstMatch(compact, [
    /\b(?:quantos?|quanto)\s*(?:kg|kgs|quilo|quilos|un|und|pct|pacotes?)?\s*(?:de|do|da)\s+(.+?)\s+(?:tem|possui|possuem|ha|hÃƒÂ¡)\s+(?:no|na|em)\s+(.+)$/i,
  ]);

  if (quantityProductAtSchoolMatch?.[1] && quantityProductAtSchoolMatch?.[2]) {
    return {
      intent: "estoque.produto_na_escola",
      produtoNome: cleanTerm(quantityProductAtSchoolMatch[1]),
      escolaNome: cleanTerm(quantityProductAtSchoolMatch[2]),
    };
  }

  const stockAtSchoolMatch = firstMatch(compact, [
    /\b(?:qual|quanto|quantos?)\s+(?:o\s+)?(?:estoque|saldo)\s+(?:de|do|da)\s+(.+?)\s+(?:no|na)\s+(.+)$/i,
    /\b(?:quantos?|quanto|qual)\s*(?:kg|kgs|quilo|quilos)?\s*(?:de|do|da)\s+(.+?)\s+(?:tem|ha|há|existe|existem)\s+(?:no|em)?\s*estoque\s+(?:da|do|de)\s+escola\s+(.+)$/i,
    /\b(?:quantos?|quanto|qual)\s*(?:kg|kgs|quilo|quilos)?\s*(?:de|do|da)?\s*([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s.'-]+?)\s+(?:tem|ha|há|existe|existem)\s+(?:no|em)?\s*estoque\s+(?:da|do|de)\s+(.+)$/i,
    /\b(?:qual|quanto|quantos?)\s+(?:o\s+)?(?:estoque|saldo)\s+(?:de|do|da)\s+(.+?)\s+(?:da|do|de)\s+(.+)$/i,
    /\b(?:estoque|saldo)\s+(?:de|do|da)\s+(.+?)\s+(?:da|do|de)\s+escola\s+(.+)$/i,
  ]);

  if (stockAtSchoolMatch?.[1] && stockAtSchoolMatch?.[2]) {
    return {
      intent: "estoque.produto_na_escola",
      produtoNome: cleanTerm(stockAtSchoolMatch[1]),
      escolaNome: cleanTerm(stockAtSchoolMatch[2]),
    };
  }

  const isShortRefinement = !/\b(estoque|saldo|escola|quanto|quantos|qual|quais)\b/.test(normalized);
  if (isShortRefinement) {
    const previous = [...history].reverse().find((item) => item.role === "user" && inferIntent(item.content));
    const previousIntent = previous ? inferIntent(previous.content) : null;
    if (previousIntent?.intent === "estoque.produto_na_escola" && previousIntent.escolaNome) {
      return {
        intent: "estoque.produto_na_escola",
        produtoNome: cleanTerm(compact),
        escolaNome: previousIntent.escolaNome,
      };
    }

    if (previousIntent?.intent === "estoque.escolas_com_produto") {
      return {
        intent: "estoque.escolas_com_produto",
        produtoNome: cleanTerm(compact),
      };
    }
  }

  return null;
}

async function resolverProduto(query: QueryFn, produtoNome: string): Promise<ProdutoCandidato[]> {
  const result = await query(
    `
      SELECT
        p.id,
        p.nome,
        COALESCE(um.codigo, 'UN') AS unidade
      FROM produtos p
      LEFT JOIN unidades_medida um ON um.id = p.unidade_medida_id
      WHERE COALESCE(p.ativo, true) = true
        AND LOWER(p.nome) LIKE LOWER($1)
      ORDER BY
        CASE WHEN LOWER(p.nome) = LOWER($2) THEN 0 ELSE 1 END,
        p.nome
      LIMIT 5
    `,
    [normalizeSearch(produtoNome), produtoNome.trim()],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    nome: String(row.nome),
    unidade: String(row.unidade || "UN"),
  }));
}

async function resolverEscola(query: QueryFn, escolaNome: string): Promise<EscolaCandidato[]> {
  const result = await query(
    `
      SELECT id, nome
      FROM escolas
      WHERE COALESCE(ativo, true) = true
        AND LOWER(nome) LIKE LOWER($1)
      ORDER BY
        CASE WHEN LOWER(nome) = LOWER($2) THEN 0 ELSE 1 END,
        nome
      LIMIT 5
    `,
    [normalizeSearch(escolaNome), escolaNome.trim()],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    nome: String(row.nome),
  }));
}

async function listarProdutosAtivos(query: QueryFn): Promise<ProdutoCandidato[]> {
  const result = await query(
    `
      SELECT
        p.id,
        p.nome,
        COALESCE(um.codigo, 'UN') AS unidade
      FROM produtos p
      LEFT JOIN unidades_medida um ON um.id = p.unidade_medida_id
      WHERE COALESCE(p.ativo, true) = true
      ORDER BY p.nome
      LIMIT 1000
    `,
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    nome: String(row.nome),
    unidade: String(row.unidade || "UN"),
  }));
}

async function listarEscolasAtivas(query: QueryFn): Promise<EscolaCandidato[]> {
  const result = await query(
    `
      SELECT id, nome
      FROM escolas
      WHERE COALESCE(ativo, true) = true
      ORDER BY nome
      LIMIT 1000
    `,
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    nome: String(row.nome),
  }));
}

function scoreEntity(question: string, entityName: string): number {
  const normalizedQuestion = normalizeText(question);
  const normalizedEntity = normalizeText(entityName);
  const entityTokens = tokenize(entityName);
  const questionTokens = new Set(tokenize(question));
  if (!entityTokens.length) return 0;

  if (normalizedQuestion.includes(normalizedEntity)) {
    return 100 + entityTokens.length;
  }

  let score = 0;
  for (const token of entityTokens) {
    if (questionTokens.has(token)) score += 1;
  }

  const coverage = score / entityTokens.length;
  if (score === 0) return 0;
  if (coverage >= 1) return 80 + score;
  if (score >= 2) return 40 + score;
  return score;
}

function chooseBestEntity<T extends { nome: string }>(
  question: string,
  entities: T[],
  options: { minScore?: number; requireUniqueTopScore?: boolean } = {},
): T | null {
  const minScore = options.minScore ?? 2;
  const scored = entities
    .map((entity) => ({ entity, score: scoreEntity(question, entity.nome) }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score || b.entity.nome.length - a.entity.nome.length);

  if (!scored.length) return null;
  if (options.requireUniqueTopScore && scored[1]?.score === scored[0].score) return null;
  return scored[0].entity;
}

async function resolverEscolaPorSimilaridade(
  query: QueryFn,
  escolaNome: string,
): Promise<EscolaCandidato | null> {
  const escolas = await listarEscolasAtivas(query);
  return chooseBestEntity(escolaNome, escolas, {
    minScore: 1,
    requireUniqueTopScore: true,
  });
}

function shouldAttemptSemanticStockLink(message: string): boolean {
  const normalized = normalizeText(message);
  return (
    /\b(estoque|saldo|item|produto|produtos?|qtd|quantidade)\b/.test(normalized) ||
    /\b(quanto|quantos|tem|possui|possuem)\b/.test(normalized) ||
    /\b(no|na|em)\b/.test(normalized)
  );
}

async function linkEntitiesFromQuestion(query: QueryFn, message: string): Promise<LinkedEntities> {
  const [produtos, escolas] = await Promise.all([
    listarProdutosAtivos(query),
    listarEscolasAtivas(query),
  ]);

  return {
    produto: chooseBestEntity(message, produtos) ?? undefined,
    escola: chooseBestEntity(message, escolas, {
      minScore: 1,
      requireUniqueTopScore: true,
    }) ?? undefined,
  };
}

function inferSemanticOperation(message: string, linked: LinkedEntities): SemanticOperation | null {
  const normalized = normalizeText(message);
  const mentionsStock = /\b(estoque|saldo|item|produto|produtos?)\b/.test(normalized);
  const asksStockByKnownEntities = linked.produto && linked.escola && shouldAttemptSemanticStockLink(message);
  if (!mentionsStock && !asksStockByKnownEntities) return null;

  const asksRanking =
    /\b(mais|maior|ranking|rank|top|maiores|ordenar|ordem)\b/.test(normalized) &&
    /\b(escola|escolas|onde|qual|quais)\b/.test(normalized);

  if (linked.produto && asksRanking) return "ranking_schools_by_product";
  if (linked.produto && linked.escola) return "product_at_school";
  if (linked.escola && !linked.produto) return "products_at_school";
  if (linked.produto) return "schools_with_product";

  return null;
}

function escolherUnicoProduto(candidatos: ProdutoCandidato[], produtoNome: string): ProdutoCandidato | null {
  const exactMatches = candidatos.filter((item) => normalizeText(item.nome) === normalizeText(produtoNome));
  if (candidatos.length > 1 && exactMatches.length !== 1) return null;
  return exactMatches[0] ?? candidatos[0] ?? null;
}

function escolherUnicaEscola(candidatos: EscolaCandidato[], escolaNome: string): EscolaCandidato | null {
  const exactMatches = candidatos.filter((item) => normalizeText(item.nome) === normalizeText(escolaNome));
  if (candidatos.length > 1 && exactMatches.length !== 1) return null;
  return exactMatches[0] ?? candidatos[0] ?? null;
}

async function executeSchoolsWithProductStock(query: QueryFn, produto: ProdutoCandidato): Promise<SqlAgentResult> {
  const sql = `
    SELECT
      es.id AS escola_id,
      es.nome AS escola_nome,
      SUM(ee.quantidade_delta) AS saldo_atual,
      MAX(ee.data_evento) AS ultima_atualizacao
    FROM estoque_eventos ee
    INNER JOIN escolas es ON es.id = ee.escola_id
    WHERE ee.escopo = 'escola'
      AND ee.produto_id = $1
      AND COALESCE(es.ativo, true) = true
    GROUP BY es.id, es.nome
    HAVING SUM(ee.quantidade_delta) > 0
    ORDER BY es.nome
    LIMIT 50
  `;
  const params = [produto.id];
  const result = await query(sql, params);
  const escolas = result.rows.map((row) => ({
    escolaId: Number(row.escola_id),
    escolaNome: String(row.escola_nome),
    saldoAtual: Number(row.saldo_atual ?? 0),
    ultimaAtualizacao: row.ultima_atualizacao ? new Date(row.ultima_atualizacao).toISOString() : null,
  }));

  const answer = escolas.length
    ? [`Escolas com ${produto.nome} em estoque:`, ...escolas.map((item) => `- ${item.escolaNome}: ${item.saldoAtual} ${produto.unidade}`)].join("\n")
    : `Nenhuma escola ativa possui ${produto.nome} em estoque.`;

  return {
    handled: true,
    intent: "estoque.escolas_com_produto",
    answer,
    sql: { name: "estoque.escolas_com_produto", params },
    data: { produto, escolas },
  };
}

async function executeSchoolRankingByProductStock(query: QueryFn, produto: ProdutoCandidato): Promise<SqlAgentResult> {
  const sql = `
    SELECT
      es.id AS escola_id,
      es.nome AS escola_nome,
      SUM(ee.quantidade_delta) AS saldo_atual,
      MAX(ee.data_evento) AS ultima_atualizacao
    FROM estoque_eventos ee
    INNER JOIN escolas es ON es.id = ee.escola_id
    WHERE ee.escopo = 'escola'
      AND ee.produto_id = $1
      AND COALESCE(es.ativo, true) = true
    GROUP BY es.id, es.nome
    HAVING SUM(ee.quantidade_delta) > 0
    ORDER BY saldo_atual DESC, es.nome
    LIMIT $2
  `;
  const params = [produto.id, 5];
  const result = await query(sql, params);
  const escolas = result.rows.map((row) => ({
    escolaId: Number(row.escola_id),
    escolaNome: String(row.escola_nome),
    saldoAtual: Number(row.saldo_atual ?? 0),
    ultimaAtualizacao: row.ultima_atualizacao ? new Date(row.ultima_atualizacao).toISOString() : null,
  }));

  const answer = escolas.length
    ? [
        `A escola com maior estoque de ${produto.nome} e ${escolas[0].escolaNome}, com ${escolas[0].saldoAtual} ${produto.unidade}.`,
        "Ranking:",
        ...escolas.map((item, index) => `${index + 1}. ${item.escolaNome}: ${item.saldoAtual} ${produto.unidade}`),
      ].join("\n")
    : `Nenhuma escola ativa possui ${produto.nome} em estoque.`;

  return {
    handled: true,
    intent: "estoque.ranking_escolas_por_produto",
    answer,
    sql: { name: "estoque.ranking_escolas_por_produto", params },
    data: { produto, escolas },
  };
}

async function executeProductsAtSchool(query: QueryFn, escola: EscolaCandidato): Promise<SqlAgentResult> {
  const sql = `
    SELECT
      p.id AS produto_id,
      p.nome AS produto_nome,
      COALESCE(um.codigo, 'UN') AS unidade,
      SUM(ee.quantidade_delta) AS saldo_atual,
      MAX(ee.data_evento) AS ultima_atualizacao
    FROM estoque_eventos ee
    INNER JOIN produtos p ON p.id = ee.produto_id
    LEFT JOIN unidades_medida um ON um.id = p.unidade_medida_id
    WHERE ee.escopo = 'escola'
      AND ee.escola_id = $1
      AND COALESCE(p.ativo, true) = true
    GROUP BY p.id, p.nome, um.codigo
    HAVING SUM(ee.quantidade_delta) > 0
    ORDER BY p.nome
    LIMIT 50
  `;
  const params = [escola.id];
  const result = await query(sql, params);
  const produtos = result.rows.map((row) => ({
    produtoId: Number(row.produto_id),
    produtoNome: String(row.produto_nome),
    unidade: String(row.unidade || "UN"),
    saldoAtual: Number(row.saldo_atual ?? 0),
    ultimaAtualizacao: row.ultima_atualizacao ? new Date(row.ultima_atualizacao).toISOString() : null,
  }));

  const answer = produtos.length
    ? [`Estoque atual de ${escola.nome}:`, ...produtos.map((item) => `- ${item.produtoNome}: ${item.saldoAtual} ${item.unidade}`)].join("\n")
    : `${escola.nome} nao possui itens com saldo positivo no estoque.`;

  return {
    handled: true,
    intent: "estoque.produtos_da_escola",
    answer,
    sql: { name: "estoque.produtos_da_escola", params },
    data: { escola, produtos },
  };
}

async function executeProductStockAtSchool(
  query: QueryFn,
  produto: ProdutoCandidato,
  escola: EscolaCandidato,
): Promise<SqlAgentResult> {
  const sql = `
    SELECT
      COALESCE(SUM(quantidade_delta), 0) AS saldo_atual,
      MAX(data_evento) AS ultima_atualizacao
    FROM estoque_eventos
    WHERE escopo = 'escola'
      AND produto_id = $1
      AND escola_id = $2
  `;
  const params = [produto.id, escola.id];
  const result = await query(sql, params);
  const row = result.rows[0] ?? {};
  const saldoAtual = Number(row.saldo_atual ?? 0);

  return {
    handled: true,
    intent: "estoque.produto_na_escola",
    answer: `${escola.nome} tem ${saldoAtual} ${produto.unidade} de ${produto.nome} em estoque.`,
    sql: { name: "estoque.produto_na_escola", params },
    data: {
      produto,
      escola,
      saldoAtual,
      ultimaAtualizacao: row.ultima_atualizacao ? new Date(row.ultima_atualizacao).toISOString() : null,
    },
  };
}

export async function executeSqlAgent(input: ExecuteSqlAgentInput): Promise<SqlAgentResult> {
  const query = input.query ?? defaultQuery;
  let intent = input.plannedIntent?.intent
    ? {
        intent: input.plannedIntent.intent,
        produtoNome: input.plannedIntent.produtoNome ? cleanTerm(input.plannedIntent.produtoNome) : "",
        escolaNome: input.plannedIntent.escolaNome ? cleanTerm(input.plannedIntent.escolaNome) : undefined,
      }
    : inferIntent(input.message, input.history ?? []);

  if (input.plannedIntent?.intent === "estoque.produtos_da_escola") {
    const escolaNome = cleanTerm(input.plannedIntent.escolaNome ?? "");
    if (!escolaNome) {
      return {
        handled: false,
        answer: "A intencao planejada nao informou a escola.",
        sql: { params: [] },
      };
    }

    const escolas = await resolverEscola(query, escolaNome);
    const escola = escolherUnicaEscola(escolas, escolaNome) ?? await resolverEscolaPorSimilaridade(query, escolaNome);
    if (!escola) {
      return {
        handled: true,
        intent: "estoque.produtos_da_escola",
        answer: `Nenhuma escola ativa encontrada para "${escolaNome}".`,
        sql: { name: "estoque.resolver_escola", params: [escolaNome] },
        data: { candidatosEscola: escolas },
      };
    }

    return executeProductsAtSchool(query, escola);
  }

  if (!intent && shouldAttemptSemanticStockLink(input.message)) {
    const linked = await linkEntitiesFromQuestion(query, input.message);
    const operation = inferSemanticOperation(input.message, linked);
    if (operation === "ranking_schools_by_product" && linked.produto) {
      return executeSchoolRankingByProductStock(query, linked.produto);
    }
    if (operation === "product_at_school" && linked.produto && linked.escola) {
      return executeProductStockAtSchool(query, linked.produto, linked.escola);
    }
    if (operation === "products_at_school" && linked.escola) {
      return executeProductsAtSchool(query, linked.escola);
    }
    if (operation === "schools_with_product" && linked.produto) {
      return executeSchoolsWithProductStock(query, linked.produto);
    }
  }

  if (!intent) {
    return {
      handled: false,
      answer: "Nao consegui mapear a pergunta para uma consulta SQL segura.",
      sql: { params: [] },
    };
  }

  if (input.plannedIntent && !intent.produtoNome) {
    return {
      handled: false,
      intent: intent.intent,
      answer: "A intencao planejada nao informou o produto.",
      sql: { params: [] },
    };
  }

  const produtos = await resolverProduto(query, intent.produtoNome);
  if (produtos.length === 0) {
    const linked = await linkEntitiesFromQuestion(query, input.message);
    if (linked.produto && linked.escola) {
      return executeProductStockAtSchool(query, linked.produto, linked.escola);
    }
    if (linked.produto && intent.intent === "estoque.escolas_com_produto") {
      return executeSchoolsWithProductStock(query, linked.produto);
    }

    return {
      handled: true,
      intent: intent.intent,
      answer: `Nenhum produto ativo encontrado para "${intent.produtoNome}".`,
      sql: { name: "estoque.resolver_produto", params: [intent.produtoNome] },
      data: { candidatosProduto: [] },
    };
  }

  const produto = escolherUnicoProduto(produtos, intent.produtoNome);
  if (!produto) {
    return {
      handled: true,
      intent: intent.intent,
      answer: ["Mais de um produto parecido foi encontrado. Refine o nome do produto.", ...produtos.map((item) => `- ${item.nome}`)].join("\n"),
      sql: { name: "estoque.resolver_produto", params: [intent.produtoNome] },
      data: { candidatosProduto: produtos },
    };
  }

  const intentOperation = inferSemanticOperation(input.message, { produto });
  if (intentOperation === "ranking_schools_by_product") {
    return executeSchoolRankingByProductStock(query, produto);
  }

  if (intent.intent === "estoque.escolas_com_produto") {
    return executeSchoolsWithProductStock(query, produto);
  }

  const escolas = await resolverEscola(query, intent.escolaNome ?? "");
  if (escolas.length === 0) {
    const escolaPorSimilaridade = await resolverEscolaPorSimilaridade(query, intent.escolaNome ?? input.message);
    if (escolaPorSimilaridade) {
      return executeProductStockAtSchool(query, produto, escolaPorSimilaridade);
    }

    return {
      handled: true,
      intent: intent.intent,
      answer: `Nenhuma escola ativa encontrada para "${intent.escolaNome}".`,
      sql: { name: "estoque.resolver_escola", params: [intent.escolaNome] },
      data: { produto, candidatosEscola: [] },
    };
  }

  const escola = escolherUnicaEscola(escolas, intent.escolaNome ?? "");
  if (!escola) {
    return {
      handled: true,
      intent: intent.intent,
      answer: ["Mais de uma escola parecida foi encontrada. Refine o nome da escola.", ...escolas.map((item) => `- ${item.nome}`)].join("\n"),
      sql: { name: "estoque.resolver_escola", params: [intent.escolaNome] },
      data: { produto, candidatosEscola: escolas },
    };
  }

  return executeProductStockAtSchool(query, produto, escola);
}
