import type { ChatbotConfig } from "../config/chatbotConfig";
import type { ChatbotMessage, ChatbotProvider } from "../providers/types";
import type { AgentRuntimeEvent } from "../agent/events";
import { createReadOnlyPolicy } from "../agent/policy";
import { AgentToolBlockedError, runAgentRuntime } from "../agent/runtime";
import { createToolRegistry } from "../agent/toolRegistry";

type QueryFn = (sql: string, params?: any[]) => Promise<{ rows: any[] }>;

export interface DatabaseAgentHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export type DatabaseAgentToolName =
  | "database.consultar_mapa"
  | "database.consultar_schema"
  | "database.buscar_produto"
  | "database.buscar_escola"
  | "database.consultar_saldo_produto_escola"
  | "database.listar_produtos_da_escola"
  | "database.listar_escolas_com_produto"
  | "database.consultar_estoque_positivo_produto"
  | "database.listar_escolas_com_produtos_relacionados"
  | "database.executar_select_seguro"
  | "nutrilog.consultar_estoque"
  | "nutrilog.consultar_cardapio"
  | "nutrilog.consultar_demanda"
  | "nutrilog.consultar_pedido"
  | "nutrilog.consultar_entrega"
  | "nutrilog.consultar_faturamento";

export interface ExecuteDatabaseAgentInput {
  message: string;
  history?: DatabaseAgentHistoryMessage[];
  config: ChatbotConfig;
  provider: ChatbotProvider;
  query?: QueryFn;
  maxSteps?: number;
}

export interface DatabaseAgentTraceItem {
  tool: DatabaseAgentToolName;
  input: Record<string, unknown>;
  output: unknown;
}

export interface DatabaseAgentResult {
  handled: boolean;
  answer: string;
  toolsUsed: string[];
  trace: DatabaseAgentTraceItem[];
  fallbackContent?: string;
  toolData?: unknown;
}

interface ToolExecutionResult {
  blocked?: boolean;
  message?: string;
  data: unknown;
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

const DATABASE_AGENT_KNOWLEDGE = [
  "Mapa operacional do banco NutriLog para consultas somente leitura:",
  "- escolas: escolas cadastradas. Colunas principais: id, nome, ativo.",
  "- produtos: catalogo de alimentos/produtos. Colunas principais: id, nome, unidade_medida_id, ativo.",
  "- unidades_medida: unidade exibida do produto. Colunas principais: id, codigo.",
  "- escolas: cadastro das escolas. Colunas principais: id, nome, endereco, municipio, telefone, nome_gestor, administracao, rota, ativo, codigo, email.",
  "- modalidades: cadastro de modalidades de atendimento. Colunas principais: id, nome, descricao, ativo, valor_repasse, codigo_financeiro.",
  "- escola_modalidades: quantidade atual de alunos por escola e modalidade. Colunas principais: escola_id, modalidade_id, quantidade_alunos, turno.",
  "- escolas_modalidades: quantidade de alunos por escola, modalidade e ano letivo quando houver historico anual. Colunas principais: escola_id, modalidade_id, quantidade_alunos, ano_letivo.",
  "- estoque_eventos: movimentacoes de estoque. Colunas principais: escola_id, produto_id, escopo, quantidade_delta, data_evento.",
  "- Estoque atual de um produto em uma escola = SUM(estoque_eventos.quantidade_delta) filtrando escopo = 'escola', produto_id e escola_id.",
  "- Produtos de uma escola = agrupar estoque_eventos por produto_id e manter HAVING SUM(quantidade_delta) > 0.",
  "- Escolas com um produto = agrupar estoque_eventos por escola_id e manter HAVING SUM(quantidade_delta) > 0.",
  "- Total de alunos de uma escola = SUM(quantidade_alunos) em escola_modalidades ou escolas_modalidades, juntando escolas e modalidades.",
  "- Alunos por modalidade = GROUP BY modalidade em escola_modalidades ou escolas_modalidades, com JOIN em modalidades.",
  "- Informacoes de uma escola = buscar em escolas por nome aproximado e retornar campos cadastrais relevantes.",
  "- Para apelidos, regioes, erros de digitacao ou nomes incompletos de produtos/escolas, busque candidatos e escolha pelo contexto; se houver empate real, peca refinamento.",
  "- Para mais de um produto na mesma pergunta, use IN/ANY ou agregue os produtos relacionados em uma consulta read-only.",
  "- Nunca altere dados. Use somente ferramentas de leitura e consultas SELECT.",
].join("\n");

const DATABASE_AGENT_PROMPT = [
  "Voce e um agente de banco de dados somente leitura do sistema NutriLog.",
  "Seu trabalho e responder perguntas sobre dados cadastrados usando ferramentas controladas.",
  "Voce pode conversar em qualquer idioma, mas responda ao usuario em portugues do Brasil.",
  "Use o historico para resolver continuacoes curtas, por exemplo quando o usuario troca apenas o produto ou a escola.",
  "Nao invente registros. Se faltar dado ou houver ambiguidade, use ferramentas para buscar candidatos ou peca refinamento.",
  DATABASE_AGENT_KNOWLEDGE,
  "Ferramentas disponiveis:",
  '- database.consultar_mapa: retorna o mapa semantico do banco. Input: {}.',
  '- database.consultar_schema: lista tabelas e colunas do schema publico. Input: {"tabela": string | null}.',
  '- database.buscar_produto: busca produto ativo por nome aproximado. Input: {"termo": string}.',
  '- database.buscar_escola: busca escola ativa por nome aproximado. Input: {"termo": string}.',
  '- database.consultar_saldo_produto_escola: consulta saldo por IDs ja resolvidos. Input: {"produtoId": number, "escolaId": number}.',
  '- database.listar_produtos_da_escola: lista produtos com saldo positivo em uma escola. Input: {"escolaId": number}.',
  '- database.consultar_estoque_positivo_produto: busca produto por termo e lista escolas com saldo positivo dele em uma unica ferramenta. Input: {"termo": string}. Use esta ferramenta para perguntas como "existe escola com estoque positivo de banana?".',
  '- database.listar_escolas_com_produto: lista escolas com saldo positivo de um produto ja resolvido por ID. Input: {"produtoId": number}.',
  '- database.listar_escolas_com_produtos_relacionados: lista saldo agregado nas escolas para varios produtos relacionados. Input: {"produtoIds": number[], "termo": string}.',
  '- database.executar_select_seguro: executa SELECT/WITH read-only quando as ferramentas especificas nao cobrirem a pergunta. Input: {"sql": string, "params": any[]}.',
  '- nutrilog.consultar_estoque: consulta saldos de estoque por termo de produto ou escola. Input: {"termo": string | null, "limite": number | null}.',
  '- nutrilog.consultar_cardapio: consulta cardapios por nome, mes ou ano. Input: {"termo": string | null, "limite": number | null}.',
  '- nutrilog.consultar_demanda: consulta demandas de escolas por oficio, escola, objeto ou status. Input: {"termo": string | null, "limite": number | null}.',
  '- nutrilog.consultar_pedido: consulta pedidos por numero, escola, status ou competencia. Input: {"termo": string | null, "limite": number | null}.',
  '- nutrilog.consultar_entrega: consulta historico de entregas por escola, produto, entregador ou recebedor. Input: {"termo": string | null, "limite": number | null}.',
  '- nutrilog.consultar_faturamento: consulta faturamentos por numero, pedido ou status. Input: {"termo": string | null, "limite": number | null}.',
  "Responda sempre com JSON valido, sem markdown.",
  "Para usar ferramenta:",
  '{"action":"tool","tool":"database.buscar_produto","input":{"termo":"arroz polido"}}',
  "Para finalizar uma resposta baseada em banco:",
  '{"action":"final","needsDatabase":true,"answer":"resposta final"}',
  "Para indicar que a mensagem nao precisa de banco:",
  '{"action":"final","needsDatabase":false,"answer":""}',
].join("\n");

const defaultQuery: QueryFn = async (sql, params = []) => {
  const db = (await import("../../../database")).default;
  return db.query(sql, params);
};

function normalizeSearch(value: string): string {
  return `%${value.trim().replace(/\s+/g, "%")}%`;
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toLimit(value: unknown): number {
  const parsed = toNumber(value);
  if (!parsed) return 20;
  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuestionForSearch(value: string): string {
  let normalized = normalizeText(value);
  const replacements: Array<[RegExp, string]> = [
    [/\bpolished rice\b/g, "arroz polido"],
    [/\bblack beans?\b/g, "feijao preto"],
    [/\brice\b/g, "arroz"],
    [/\bbeans?\b/g, "feijao"],
    [/\bbananas?\b/g, "banana"],
    [/\bkilograms?\b|\bkgs?\b/g, "kg"],
    [/\bschools?\b/g, "escolas"],
    [/\bschool\b/g, "escola"],
    [/\bstock|inventory\b/g, "estoque"],
    [/\bhow many\b|\bhow much\b/g, "quanto"],
    [/\blooking for\b/g, "procura"],
  ];

  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.replace(/\s+/g, " ").trim();
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
    "tipo",
    "produto",
    "produtos",
    "escola",
    "escolas",
    "estoque",
    "estoques",
    "saldo",
    "kg",
    "un",
  ]);

  return normalizeQuestionForSearch(value)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !ignored.has(token));
}

function shouldTrySemanticStockAnswer(message: string): boolean {
  const normalized = normalizeQuestionForSearch(message);
  return /\b(estoque|estoques|saldo|quanto|quantos|kg|quilo|quilos|procura)\b/.test(normalized);
}

function isLikelyShortRefinement(message: string): boolean {
  const normalized = normalizeQuestionForSearch(message);
  if (/\b(oi|ola|olÃ¡|bom dia|boa tarde|boa noite|obrigado|obrigada)\b/.test(normalized)) {
    return false;
  }

  if (shouldTrySemanticStockAnswer(message)) {
    return false;
  }

  const tokens = tokenize(message);
  return tokens.length > 0 && tokens.length <= 5;
}

function buildSemanticMessageWithHistory(
  message: string,
  history: DatabaseAgentHistoryMessage[],
): string {
  if (!isLikelyShortRefinement(message)) return message;

  const recentStockQuestion = [...history]
    .reverse()
    .find((item) => item.role === "user" && shouldTrySemanticStockAnswer(item.content));

  if (!recentStockQuestion) return message;
  return [
    recentStockQuestion.content,
    `Refinamento do usuario: ${message}`,
  ].join("\n");
}

function sanitizeHistory(history: DatabaseAgentHistoryMessage[] = []): DatabaseAgentHistoryMessage[] {
  return history
    .filter((item) => (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .slice(-8)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 2000) }));
}

function buildInitialMessages(input: {
  message: string;
  history: DatabaseAgentHistoryMessage[];
}): ChatbotMessage[] {
  return [
    { role: "system", content: DATABASE_AGENT_PROMPT },
    ...input.history,
    { role: "user", content: input.message },
  ];
}

function isDatabaseToolName(value: unknown): value is DatabaseAgentToolName {
  return value === "database.consultar_mapa" ||
    value === "database.consultar_schema" ||
    value === "database.buscar_produto" ||
    value === "database.buscar_escola" ||
    value === "database.consultar_saldo_produto_escola" ||
    value === "database.listar_produtos_da_escola" ||
    value === "database.listar_escolas_com_produto" ||
    value === "database.consultar_estoque_positivo_produto" ||
    value === "database.listar_escolas_com_produtos_relacionados" ||
    value === "database.executar_select_seguro" ||
    value === "nutrilog.consultar_estoque" ||
    value === "nutrilog.consultar_cardapio" ||
    value === "nutrilog.consultar_demanda" ||
    value === "nutrilog.consultar_pedido" ||
    value === "nutrilog.consultar_entrega" ||
    value === "nutrilog.consultar_faturamento";
}

async function consultarSchema(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const tabela = toString(input.tabela);
  const result = await query(
    `
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ($1::text = '' OR table_name = $1)
      ORDER BY table_name, ordinal_position
      LIMIT 300
    `,
    [tabela],
  );

  return { data: { tabela: tabela || null, colunas: result.rows } };
}

async function buscarProduto(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const termo = toString(input.termo);
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
      LIMIT 10
    `,
    [normalizeSearch(termo), termo],
  );

  return { data: { termo, candidatos: result.rows } };
}

async function buscarEscola(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const termo = toString(input.termo);
  const result = await query(
    `
      SELECT id, nome
      FROM escolas
      WHERE COALESCE(ativo, true) = true
        AND LOWER(nome) LIKE LOWER($1)
      ORDER BY
        CASE WHEN LOWER(nome) = LOWER($2) THEN 0 ELSE 1 END,
        nome
      LIMIT 10
    `,
    [normalizeSearch(termo), termo],
  );

  return { data: { termo, candidatos: result.rows } };
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
  const normalizedQuestion = normalizeQuestionForSearch(question);
  const normalizedEntity = normalizeQuestionForSearch(entityName);
  const entityTokens = tokenize(entityName);
  const questionTokens = new Set(tokenize(question));
  if (!entityTokens.length) return 0;

  if (normalizedQuestion.includes(normalizedEntity)) {
    return 100 + entityTokens.length;
  }

  let tokenHits = 0;
  for (const token of entityTokens) {
    if (questionTokens.has(token)) tokenHits += 1;
  }

  if (tokenHits === 0) return 0;
  const coverage = tokenHits / entityTokens.length;
  if (coverage >= 1) return 80 + tokenHits;
  if (tokenHits >= 2) return 40 + tokenHits;
  return tokenHits;
}

async function consultarSaldoProdutoEscola(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const produtoId = toNumber(input.produtoId);
  const escolaId = toNumber(input.escolaId);
  if (!produtoId || !escolaId) {
    return { data: { erro: "produtoId e escolaId numericos sao obrigatorios." } };
  }

  const result = await query(
    `
      SELECT
        COALESCE(SUM(quantidade_delta), 0) AS saldo_atual,
        MAX(data_evento) AS ultima_atualizacao
      FROM estoque_eventos
      WHERE escopo = 'escola'
        AND produto_id = $1
        AND escola_id = $2
    `,
    [produtoId, escolaId],
  );

  return { data: { produtoId, escolaId, saldo: result.rows[0] ?? { saldo_atual: 0, ultima_atualizacao: null } } };
}

async function listarProdutosDaEscola(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const escolaId = toNumber(input.escolaId);
  if (!escolaId) {
    return { data: { erro: "escolaId numerico e obrigatorio." } };
  }

  const result = await query(
    `
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
      LIMIT 100
    `,
    [escolaId],
  );

  return { data: { escolaId, produtos: result.rows } };
}

async function listarEscolasComProduto(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const produtoId = toNumber(input.produtoId);
  if (!produtoId) {
    return { data: { erro: "produtoId numerico e obrigatorio." } };
  }

  const result = await query(
    `
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
      LIMIT 100
    `,
    [produtoId],
  );

  return { data: { produtoId, escolas: result.rows } };
}

async function consultarEstoquePositivoProduto(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const termo = toString(input.termo);
  if (!termo) {
    return { data: { erro: "termo e obrigatorio." } };
  }

  const produtoResult = await buscarProduto(query, { termo });
  const candidatos = (produtoResult.data as any)?.candidatos ?? [];
  if (!candidatos.length) {
    return { data: { termo, produto: null, candidatos: [], escolas: [] } };
  }

  const produto = candidatos[0];
  const escolasResult = await listarEscolasComProduto(query, { produtoId: produto.id });
  return {
    data: {
      termo,
      produto,
      candidatos,
      escolas: (escolasResult.data as any)?.escolas ?? [],
    },
  };
}

async function listarEscolasComProdutosRelacionados(
  query: QueryFn,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const produtoIds = Array.isArray(input.produtoIds)
    ? input.produtoIds.map(toNumber).filter((item): item is number => item !== null)
    : [];
  const termo = toString(input.termo);
  if (!produtoIds.length) {
    return { data: { erro: "produtoIds numericos sao obrigatorios." } };
  }

  const result = await query(
    `
      SELECT
        es.id AS escola_id,
        es.nome AS escola_nome,
        SUM(ee.quantidade_delta) AS saldo_atual,
        MAX(ee.data_evento) AS ultima_atualizacao
      FROM estoque_eventos ee
      INNER JOIN escolas es ON es.id = ee.escola_id
      WHERE ee.escopo = 'escola'
        AND ee.produto_id = ANY($1::int[])
        AND COALESCE(es.ativo, true) = true
      GROUP BY es.id, es.nome
      HAVING SUM(ee.quantidade_delta) > 0
      ORDER BY es.nome
      LIMIT 100
    `,
    [produtoIds],
  );

  return { data: { termo, produtoIds, escolas: result.rows } };
}

async function consultarNutriLogEstoque(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const termo = toString(input.termo);
  const limite = toLimit(input.limite);
  const result = await query(
    `
      SELECT
        p.id AS produto_id,
        p.nome AS produto_nome,
        es.id AS escola_id,
        es.nome AS escola_nome,
        COALESCE(um.codigo, 'UN') AS unidade,
        SUM(ee.quantidade_delta) AS saldo_atual,
        MAX(ee.data_evento) AS ultima_atualizacao
      FROM estoque_eventos ee
      INNER JOIN produtos p ON p.id = ee.produto_id
      LEFT JOIN unidades_medida um ON um.id = p.unidade_medida_id
      LEFT JOIN escolas es ON es.id = ee.escola_id
      WHERE ee.escopo = 'escola'
        AND ($1::text = ''
          OR LOWER(p.nome) LIKE LOWER($2)
          OR LOWER(COALESCE(es.nome, '')) LIKE LOWER($2))
      GROUP BY p.id, p.nome, es.id, es.nome, um.codigo
      HAVING SUM(ee.quantidade_delta) <> 0
      ORDER BY p.nome, es.nome
      LIMIT $3
    `,
    [termo, normalizeSearch(termo), limite],
  );

  return { data: { dominio: "estoque", termo: termo || null, limite, registros: result.rows } };
}

async function consultarNutriLogCardapio(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const termo = toString(input.termo);
  const limite = toLimit(input.limite);
  const result = await query(
    `
      SELECT
        cm.id,
        cm.nome,
        cm.mes,
        cm.ano,
        cm.ativo,
        cm.observacao,
        COUNT(crd.id) AS total_refeicoes
      FROM cardapios_modalidade cm
      LEFT JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
      WHERE $1::text = ''
        OR LOWER(cm.nome) LIKE LOWER($2)
        OR cm.mes::text = $1
        OR cm.ano::text = $1
      GROUP BY cm.id, cm.nome, cm.mes, cm.ano, cm.ativo, cm.observacao
      ORDER BY cm.ano DESC, cm.mes DESC, cm.nome
      LIMIT $3
    `,
    [termo, normalizeSearch(termo), limite],
  );

  return { data: { dominio: "cardapio", termo: termo || null, limite, registros: result.rows } };
}

async function consultarNutriLogDemanda(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const termo = toString(input.termo);
  const limite = toLimit(input.limite);
  const result = await query(
    `
      SELECT
        id,
        escola_id,
        escola_nome,
        numero_oficio,
        data_solicitacao,
        data_semead,
        objeto,
        descricao_itens,
        status,
        dias_solicitacao
      FROM demandas_escolas
      WHERE $1::text = ''
        OR LOWER(COALESCE(escola_nome, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(numero_oficio, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(objeto, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(status, '')) LIKE LOWER($2)
      ORDER BY data_solicitacao DESC NULLS LAST, id DESC
      LIMIT $3
    `,
    [termo, normalizeSearch(termo), limite],
  );

  return { data: { dominio: "demanda", termo: termo || null, limite, registros: result.rows } };
}

async function consultarNutriLogPedido(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const termo = toString(input.termo);
  const limite = toLimit(input.limite);
  const result = await query(
    `
      SELECT
        p.id,
        p.numero,
        p.data_pedido,
        p.status,
        p.valor_total,
        p.competencia_mes_ano,
        e.nome AS escola_nome
      FROM pedidos p
      LEFT JOIN escolas e ON e.id = p.escola_id
      WHERE $1::text = ''
        OR LOWER(COALESCE(p.numero, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(p.status, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(p.competencia_mes_ano, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(e.nome, '')) LIKE LOWER($2)
      ORDER BY p.data_pedido DESC NULLS LAST, p.id DESC
      LIMIT $3
    `,
    [termo, normalizeSearch(termo), limite],
  );

  return { data: { dominio: "pedido", termo: termo || null, limite, registros: result.rows } };
}

async function consultarNutriLogEntrega(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const termo = toString(input.termo);
  const limite = toLimit(input.limite);
  const result = await query(
    `
      SELECT
        he.id,
        he.data_entrega,
        he.quantidade_entregue,
        he.nome_quem_entregou,
        he.nome_quem_recebeu,
        e.nome AS escola_nome,
        p.nome AS produto_nome
      FROM historico_entregas he
      LEFT JOIN guia_produto_escola gpe ON gpe.id = he.guia_produto_escola_id
      LEFT JOIN escolas e ON e.id = gpe.escola_id
      LEFT JOIN produtos p ON p.id = gpe.produto_id
      WHERE $1::text = ''
        OR LOWER(COALESCE(he.nome_quem_entregou, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(he.nome_quem_recebeu, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(e.nome, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(p.nome, '')) LIKE LOWER($2)
      ORDER BY he.data_entrega DESC NULLS LAST, he.id DESC
      LIMIT $3
    `,
    [termo, normalizeSearch(termo), limite],
  );

  return { data: { dominio: "entrega", termo: termo || null, limite, registros: result.rows } };
}

async function consultarNutriLogFaturamento(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const termo = toString(input.termo);
  const limite = toLimit(input.limite);
  const result = await query(
    `
      SELECT
        f.id,
        f.numero,
        f.data_faturamento,
        f.status,
        f.valor_total,
        p.numero AS pedido_numero,
        p.competencia_mes_ano
      FROM faturamentos f
      LEFT JOIN pedidos p ON p.id = f.pedido_id
      WHERE $1::text = ''
        OR LOWER(COALESCE(f.numero, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(f.status, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(p.numero, '')) LIKE LOWER($2)
        OR LOWER(COALESCE(p.competencia_mes_ano, '')) LIKE LOWER($2)
      ORDER BY f.data_faturamento DESC NULLS LAST, f.id DESC
      LIMIT $3
    `,
    [termo, normalizeSearch(termo), limite],
  );

  return { data: { dominio: "faturamento", termo: termo || null, limite, registros: result.rows } };
}

function validateReadOnlySql(sqlInput: string): { ok: true; sql: string } | { ok: false; message: string } {
  const sql = sqlInput.trim().replace(/;+$/g, "");
  const normalized = sql.replace(/\s+/g, " ").toLowerCase();

  if (!/^(select|with)\b/i.test(sql)) {
    return { ok: false, message: "Este agente executa somente consultas de leitura." };
  }

  if (/[;]|--|\/\*|\*\//.test(sql)) {
    return { ok: false, message: "A consulta contem sintaxe nao permitida para execucao segura." };
  }

  if (/\b(insert|update|delete|drop|alter|truncate|create|replace|merge|grant|revoke|copy|call|execute)\b/.test(normalized)) {
    return { ok: false, message: "Este agente executa somente consultas de leitura." };
  }

  return { ok: true, sql: /\blimit\s+\d+\b/i.test(sql) ? sql : `${sql} LIMIT 100` };
}

async function executarSelectSeguro(query: QueryFn, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const sql = toString(input.sql);
  const validation = validateReadOnlySql(sql);
  if (validation.ok === false) {
    return {
      blocked: true,
      message: validation.message,
      data: { erro: validation.message },
    };
  }

  const params = Array.isArray(input.params)
    ? input.params.filter((item) => ["string", "number", "boolean"].includes(typeof item) || item === null).slice(0, 20)
    : [];
  const result = await query(validation.sql, params);
  return { data: { sql: validation.sql, params, rows: result.rows.slice(0, 100), rowCount: result.rows.length } };
}

async function executeTool(
  query: QueryFn,
  tool: DatabaseAgentToolName,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  if (tool === "database.consultar_mapa") return { data: { mapa: DATABASE_AGENT_KNOWLEDGE } };
  if (tool === "database.consultar_schema") return consultarSchema(query, input);
  if (tool === "database.buscar_produto") return buscarProduto(query, input);
  if (tool === "database.buscar_escola") return buscarEscola(query, input);
  if (tool === "database.consultar_saldo_produto_escola") return consultarSaldoProdutoEscola(query, input);
  if (tool === "database.listar_produtos_da_escola") return listarProdutosDaEscola(query, input);
  if (tool === "database.listar_escolas_com_produto") return listarEscolasComProduto(query, input);
  if (tool === "database.consultar_estoque_positivo_produto") return consultarEstoquePositivoProduto(query, input);
  if (tool === "database.listar_escolas_com_produtos_relacionados") {
    return listarEscolasComProdutosRelacionados(query, input);
  }
  if (tool === "nutrilog.consultar_estoque") return consultarNutriLogEstoque(query, input);
  if (tool === "nutrilog.consultar_cardapio") return consultarNutriLogCardapio(query, input);
  if (tool === "nutrilog.consultar_demanda") return consultarNutriLogDemanda(query, input);
  if (tool === "nutrilog.consultar_pedido") return consultarNutriLogPedido(query, input);
  if (tool === "nutrilog.consultar_entrega") return consultarNutriLogEntrega(query, input);
  if (tool === "nutrilog.consultar_faturamento") return consultarNutriLogFaturamento(query, input);
  return executarSelectSeguro(query, input);
}

function createDatabaseToolRegistry(query: QueryFn) {
  const registry = createToolRegistry();
  const register = (name: DatabaseAgentToolName, description: string) => {
    registry.register({
      name,
      description,
      readOnly: true,
      execute: async (toolInput) => {
        const result = await executeTool(query, name, toolInput);
        if (result.blocked) {
          throw new AgentToolBlockedError(
            result.message ?? "Nao posso executar essa consulta. O agente e somente leitura.",
            result.data,
          );
        }

        return result.data;
      },
    });
  };

  register("database.consultar_mapa", "Retorna o mapa semantico do banco NutriLog.");
  register("database.consultar_schema", "Lista tabelas e colunas do schema publico.");
  register("database.buscar_produto", "Busca produto ativo por nome aproximado.");
  register("database.buscar_escola", "Busca escola ativa por nome aproximado.");
  register("database.consultar_saldo_produto_escola", "Consulta saldo por produto e escola ja resolvidos.");
  register("database.listar_produtos_da_escola", "Lista produtos com saldo positivo em uma escola.");
  register("database.listar_escolas_com_produto", "Lista escolas com saldo positivo de um produto.");
  register(
    "database.consultar_estoque_positivo_produto",
    "Busca produto por termo e lista escolas com saldo positivo dele.",
  );
  register(
    "database.listar_escolas_com_produtos_relacionados",
    "Lista saldo agregado nas escolas para varios produtos relacionados.",
  );
  register("database.executar_select_seguro", "Executa SELECT/WITH read-only quando as ferramentas especificas nao cobrirem a pergunta.");
  register("nutrilog.consultar_estoque", "Consulta saldos de estoque por termo de produto ou escola.");
  register("nutrilog.consultar_cardapio", "Consulta cardapios por nome, mes ou ano.");
  register("nutrilog.consultar_demanda", "Consulta demandas de escolas por oficio, escola, objeto ou status.");
  register("nutrilog.consultar_pedido", "Consulta pedidos por numero, escola, status ou competencia.");
  register("nutrilog.consultar_entrega", "Consulta historico de entregas por escola, produto, entregador ou recebedor.");
  register("nutrilog.consultar_faturamento", "Consulta faturamentos por numero, pedido ou status.");

  return registry;
}

function buildTraceFromEvents(events: AgentRuntimeEvent[]): DatabaseAgentTraceItem[] {
  const actions = new Map<string, { tool: DatabaseAgentToolName; input: Record<string, unknown> }>();
  const trace: DatabaseAgentTraceItem[] = [];

  for (const event of events) {
    if (event.type === "action" && isDatabaseToolName(event.toolName)) {
      actions.set(event.id, { tool: event.toolName, input: event.input });
      continue;
    }

    if (event.type === "observation") {
      const action = actions.get(event.actionId);
      if (action) {
        trace.push({
          tool: action.tool,
          input: action.input,
          output: event.observation,
        });
      }
    }
  }

  return trace;
}

export async function executeDatabaseAgent(input: ExecuteDatabaseAgentInput): Promise<DatabaseAgentResult> {
  const query = input.query ?? defaultQuery;
  const history = sanitizeHistory(input.history);
  const messages = buildInitialMessages({
    message: buildSemanticMessageWithHistory(input.message, history),
    history,
  });
  const runtimeResult = await runAgentRuntime({
    provider: input.provider,
    config: input.config,
    initialMessages: messages,
    tools: createDatabaseToolRegistry(query),
    policy: createReadOnlyPolicy(),
    maxSteps: input.maxSteps ?? 4,
  });
  const trace = buildTraceFromEvents(runtimeResult.events);

  return {
    handled: runtimeResult.handled,
    answer: runtimeResult.answer,
    toolsUsed: runtimeResult.toolsUsed,
    trace,
    fallbackContent: runtimeResult.fallbackContent,
    toolData: trace,
  };
}

