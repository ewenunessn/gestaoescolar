import type { ChatbotConfig } from "../config/chatbotConfig";
import type { ChatbotMessage, ChatbotProvider } from "../providers/types";
import { createChatbotProvider } from "../providers/providerFactory";
import {
  executeDatabaseAgent,
  type DatabaseAgentResult,
  type ExecuteDatabaseAgentInput,
} from "./databaseAgentService";
import {
  construirContextoOperacionalEstoque,
  type ConstruirContextoOperacionalInput,
  type ContextoOperacionalEstoqueResult,
} from "../tools/estoqueTools";
import {
  executeSqlAgent,
  type ExecuteSqlAgentInput,
  type PlannedSqlAgentIntent,
  type SqlAgentResult,
} from "./sqlAgentService";

export interface ChatbotHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatbotTools {
  construirContextoOperacional(input: ConstruirContextoOperacionalInput): Promise<ContextoOperacionalEstoqueResult>;
  executarSqlAgent?(input: ExecuteSqlAgentInput): Promise<SqlAgentResult>;
  executarDatabaseAgent?(input: ExecuteDatabaseAgentInput): Promise<DatabaseAgentResult>;
}

export interface CreateChatbotResponseInput {
  message: string;
  history?: ChatbotHistoryMessage[];
  config: ChatbotConfig;
  provider?: ChatbotProvider;
  tools?: ChatbotTools;
}

export interface CreateChatbotResponseResult {
  answer: string;
  toolsUsed: string[];
  toolData?: unknown;
}

const SYSTEM_PROMPT = [
  "Voce e um assistente operacional do sistema NutriLog.",
  "Responda em portugues do Brasil, de forma objetiva e util.",
  "Quando receber dados estruturados do backend, use apenas esses dados para responder.",
  "Nao invente registros, datas, escolas, usuarios ou saldos.",
  "Se os dados indicarem ambiguidade, peca refinamento de forma direta.",
].join("\n");

const DATA_NEEDS_PROMPT = [
  "Classifique a mensagem para o NutriLog. Responda somente JSON valido, sem markdown.",
  'Campos: intent, produtoNome, escolaNome, precisaDados, termosProdutos, termosEscolas, periodoDias, pergunta.',
  'Intents: "estoque.produto_na_escola", "estoque.escolas_com_produto", "estoque.ranking_escolas_por_produto", "estoque.produtos_da_escola" ou null.',
  "Use precisaDados=true para estoque, saldo, produto, escola, atualizacao ou pendencia. Use false para saudacao/conversa comum.",
  'Ranking/top/maior/mais estoque por produto => intent "estoque.ranking_escolas_por_produto".',
  'Exemplo: usuario="lista a escola com maior estoque de arroz polido" resposta={"intent":"estoque.ranking_escolas_por_produto","produtoNome":"arroz polido","escolaNome":null,"precisaDados":true,"termosProdutos":["arroz polido"],"termosEscolas":[],"periodoDias":null,"pergunta":"lista a escola com maior estoque de arroz polido"}',
].join("\n");

function sanitizeMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("Mensagem vazia");
  if (trimmed.length > 4000) throw new Error("Mensagem muito longa");
  return trimmed;
}

function sanitizeHistory(history: ChatbotHistoryMessage[] = []): ChatbotHistoryMessage[] {
  return history
    .filter((item) => (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .slice(-8)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 2000) }));
}

function buildGenericMessages(input: {
  message: string;
  history: ChatbotHistoryMessage[];
}): ChatbotMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...input.history,
    { role: "user", content: input.message },
  ];
}

function buildDataRequestMessages(input: {
  message: string;
  history: ChatbotHistoryMessage[];
}): ChatbotMessage[] {
  return [
    { role: "system", content: DATA_NEEDS_PROMPT },
    ...input.history,
    { role: "user", content: input.message },
  ];
}

function buildOperationalAnswerMessages(input: {
  message: string;
  history: ChatbotHistoryMessage[];
  dataRequest: ConstruirContextoOperacionalInput;
  context: ContextoOperacionalEstoqueResult;
}): ChatbotMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...input.history,
    {
      role: "user",
      content: [
        `Pergunta do usuario: ${input.message}`,
        "Termos de busca identificados pelo LLM:",
        JSON.stringify(input.dataRequest, null, 2),
        "Dados estruturados retornados pelo backend:",
        JSON.stringify(input.context, null, 2),
        "Pense sobre os dados e responda ao usuario. Se houver ambiguidade, peca refinamento com as opcoes disponiveis.",
      ].join("\n"),
    },
  ];
}

function buildInstructionalAnswerMessages(input: {
  message: string;
  history: ChatbotHistoryMessage[];
  instruction: string;
}): ChatbotMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...input.history,
    {
      role: "user",
      content: [
        `Mensagem do usuario: ${input.message}`,
        `Instrucao operacional para redigir a resposta: ${input.instruction}`,
        "Gere a resposta final naturalmente em portugues do Brasil. Nao use texto fixo predefinido.",
      ].join("\n"),
    },
  ];
}

function buildStructuredFinalAnswerMessages(input: {
  message: string;
  history: ChatbotHistoryMessage[];
  source: string;
  data: unknown;
}): ChatbotMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...input.history,
    {
      role: "user",
      content: [
        `Pergunta do usuario: ${input.message}`,
        `Fonte dos dados estruturados: ${input.source}`,
        JSON.stringify(input.data, null, 2),
        "Gere a resposta final a partir desses dados. Interprete instrucoes de apresentacao do usuario, como ordem, soma, tabela, filtro ou limite. Nao invente dados.",
      ].join("\n"),
    },
  ];
}

async function generateInstructionalAnswer(input: {
  provider: ChatbotProvider;
  config: ChatbotConfig;
  message: string;
  history: ChatbotHistoryMessage[];
  instruction: string;
}): Promise<string> {
  const completion = await input.provider.complete({
    config: input.config,
    messages: buildInstructionalAnswerMessages(input),
  });
  return completion.content;
}

async function generateStructuredFinalAnswer(input: {
  provider: ChatbotProvider;
  config: ChatbotConfig;
  message: string;
  history: ChatbotHistoryMessage[];
  source: string;
  data: unknown;
}): Promise<string> {
  const completion = await input.provider.complete({
    config: input.config,
    messages: buildStructuredFinalAnswerMessages(input),
  });
  return completion.content;
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return {};

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return {};
  }
}

function normalizeDataRequest(content: string, fallbackQuestion: string): ConstruirContextoOperacionalInput {
  const parsed = extractJsonObject(content);
  if (!parsed || typeof parsed !== "object") {
    return { precisaDados: false, termosProdutos: [], termosEscolas: [], pergunta: fallbackQuestion };
  }

  const data = parsed as Record<string, unknown>;
  const termosProdutos = Array.isArray(data.termosProdutos)
    ? data.termosProdutos.filter((item): item is string => typeof item === "string")
    : [];
  const termosEscolas = Array.isArray(data.termosEscolas)
    ? data.termosEscolas.filter((item): item is string => typeof item === "string")
    : [];

  return {
    precisaDados: data.precisaDados === true || data.precisaDadosEstoque === true,
    termosProdutos,
    termosEscolas,
    produtoNome: typeof data.produtoNome === "string" && data.produtoNome.trim() ? data.produtoNome.trim() : undefined,
    escolaNome: typeof data.escolaNome === "string" && data.escolaNome.trim() ? data.escolaNome.trim() : undefined,
    periodoDias: typeof data.periodoDias === "number" ? data.periodoDias : typeof data.dias === "number" ? data.dias : undefined,
    pergunta: typeof data.pergunta === "string" && data.pergunta.trim() ? data.pergunta.trim() : fallbackQuestion,
  };
}

function normalizePlannedSqlIntent(content: string): PlannedSqlAgentIntent | null {
  const parsed = extractJsonObject(content);
  if (!parsed || typeof parsed !== "object") return null;

  const data = parsed as Record<string, unknown>;
  const intent = data.intent;
  if (
    intent !== "estoque.produto_na_escola" &&
    intent !== "estoque.escolas_com_produto" &&
    intent !== "estoque.ranking_escolas_por_produto" &&
    intent !== "estoque.produtos_da_escola"
  ) {
    return null;
  }

  const termosProdutos = Array.isArray(data.termosProdutos)
    ? data.termosProdutos.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
  const termosEscolas = Array.isArray(data.termosEscolas)
    ? data.termosEscolas.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
  const produtoNome = typeof data.produtoNome === "string" && data.produtoNome.trim()
    ? data.produtoNome.trim()
    : termosProdutos[0]?.trim();
  const escolaNome = typeof data.escolaNome === "string" && data.escolaNome.trim()
    ? data.escolaNome.trim()
    : termosEscolas[0]?.trim();

  if (
    (intent === "estoque.produto_na_escola" && (!produtoNome || !escolaNome)) ||
    (intent === "estoque.escolas_com_produto" && !produtoNome) ||
    (intent === "estoque.ranking_escolas_por_produto" && !produtoNome) ||
    (intent === "estoque.produtos_da_escola" && !escolaNome)
  ) {
    return null;
  }

  return { intent, produtoNome, escolaNome };
}

function normalizeTextForParsing(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isSchoolStockCapabilityQuestion(message: string): boolean {
  const normalized = normalizeTextForParsing(message);
  const asksCapability = /\b(consegue|conseguiria|pode|poderia|consigo|da para|tem como|voce consegue)\b/.test(normalized);
  const mentionsSchoolStock = /\bestoque\b/.test(normalized) && /\bescola\b/.test(normalized);

  return asksCapability && mentionsSchoolStock && !hasConcreteSchoolStockRequest(message);
}

function hasConcreteSchoolStockRequest(message: string): boolean {
  const normalized = normalizeTextForParsing(message);
  const mentionsStock = /\b(estoque|saldo)\b/.test(normalized);
  const mentionsSpecificSchool = /\bescola\s+(?!uma\b|alguma\b|qualquer\b|ativa\b|cadastrada\b)[a-z0-9]/.test(normalized);
  if (mentionsStock && mentionsSpecificSchool) return true;

  const commandPattern = /\b(verifica|verifique|olha|olhe|veja|consulte|consulta|liste|lista|listar|retorna|retorne|mostra|mostre|devolve|devolva)\b/;
  const commandIndex = normalized.search(commandPattern);
  if (commandIndex === -1) return false;

  const commandText = normalized.slice(commandIndex);
  return /\b(estoque|saldo)\b/.test(commandText) && /\bescola\b/.test(commandText);
}

function isRankingStockQuestion(message: string): boolean {
  const normalized = normalizeTextForParsing(message);
  return (
    /\b(estoque|saldo|produto|item)\b/.test(normalized) &&
    /\b(maior|mais|ranking|rank|top|maiores)\b/.test(normalized) &&
    /\b(escola|escolas|onde|qual|quais|lista|listar)\b/.test(normalized)
  );
}

function isShortRefinementMessage(message: string): boolean {
  const normalized = normalizeTextForParsing(message);
  return Boolean(normalized) && !/\b(estoque|saldo|escola|escolas|quanto|quantos|qual|quais|existe|existem)\b/.test(normalized);
}

function isPlainGreeting(message: string): boolean {
  const normalized = normalizeTextForParsing(message).replace(/[!.?,;:\s]+$/g, "");
  return /^(oi|ola|olá|bom dia|boa tarde|boa noite|hello|hi|hey)$/.test(normalized);
}

function formatPlainGreetingAnswer(): string {
  return "Olá! Como posso ajudar você hoje?";
}

function isStockUpdateDraftRequest(message: string): boolean {
  const normalized = normalizeTextForParsing(message);
  const asksDraft =
    /\b(cria|criar|escreve|escrever|redige|redigir|monte|monta|faca|faz|prepare|prepara)\b/.test(normalized) ||
    /\b(mensagem|texto|aviso|comunicado)\b/.test(normalized);
  const mentionsDelivery = /\b(whatsapp|whats|whasapp|zap|enviar|mandar|envio)\b/.test(normalized);
  const asksStockUpdate = /\batualiz\w*\b/.test(normalized) && /\bestoque\b/.test(normalized);
  const mentionsSchools = /\bescolas?\b/.test(normalized);

  return asksDraft && asksStockUpdate && (mentionsDelivery || mentionsSchools);
}

function formatStockUpdateDraftMessage(): string {
  return [
    "Prezadas equipes, bom dia.",
    "",
    "Solicitamos que atualizem o estoque da escola no sistema assim que possivel, conferindo todos os itens e quantidades disponiveis.",
    "",
    "Essa atualizacao e importante para mantermos os saldos corretos e organizarmos os proximos atendimentos.",
    "",
    "Obrigado pela colaboracao de todos.",
  ].join("\n");
}

function formatSchoolStockCapabilityAnswer(): string {
  return [
    "Sim. Consigo consultar o estoque de uma escola.",
    "Me informe o nome da escola para listar os itens com saldo positivo, ou diga tambem o produto se quiser consultar um item especifico.",
  ].join("\n");
}

function cleanExtractedTerm(value: string): string {
  return value
    .replace(/[?.!,;:]+$/g, "")
    .replace(/\b(kg|kgs|quilo|quilos|un|und|unidade|unidades|pct|pacote|pacotes|litro|litros)\b/gi, "")
    .replace(/\b(no|na|do|da|de|em|estoque|escola)\b$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstRegexMatch(value: string, patterns: RegExp[]): RegExpExecArray | null {
  for (const pattern of patterns) {
    const match = pattern.exec(value);
    if (match?.[1]) return match;
  }
  return null;
}

function inferDeterministicDataRequest(
  message: string,
  history: ChatbotHistoryMessage[] = [],
): ConstruirContextoOperacionalInput | null {
  const compact = message.trim().replace(/\s+/g, " ").replace(/[?.!,;:]+$/g, "");
  const normalized = normalizeTextForParsing(compact);
  const isStockQuestion =
    /\b(estoque|saldo|tem|quantos?|quanto|kg|quilo|quilos)\b/.test(normalized) &&
    /\b(escola|estoque|saldo|tem|kg|quilo|quilos)\b/.test(normalized);

  if (!isStockQuestion) {
    const previousStockQuestion = [...history]
      .reverse()
      .find((item) => item.role === "user" && inferDeterministicDataRequest(item.content));
    const previousRequest = previousStockQuestion
      ? inferDeterministicDataRequest(previousStockQuestion.content)
      : null;

    if (!previousRequest?.termosEscolas?.length) return null;

    const refinedProduct = cleanExtractedTerm(compact);
    if (!refinedProduct) return null;

    return {
      precisaDados: true,
      termosProdutos: [refinedProduct],
      termosEscolas: previousRequest.termosEscolas,
      pergunta: compact,
    };
  }

  const productOnlyStockMatch = firstRegexMatch(compact, [
    /\b(?:qual|quais)\s+escolas?\s+(?:possuem|possui|tem|t[eê]m)\s+(.+?)\s+(?:no|em)\s+estoque\b/i,
    /\b(?:qual|quais)\s+escolas?\s+(?:est[aã]o\s+com|com)\s+(.+?)\s+(?:no|em)\s+estoque\b/i,
  ]);

  if (productOnlyStockMatch?.[1]) {
    const productName = cleanExtractedTerm(productOnlyStockMatch[1]);
    if (productName) {
      return {
        precisaDados: true,
        termosProdutos: [productName],
        termosEscolas: [],
        pergunta: compact,
      };
    }
  }

  const schoolMatch = firstRegexMatch(compact, [
    /\b(?:na|no|da|do|de)\s+escola\s+(.+)$/i,
    /\bescola\s+(.+)$/i,
    /\b(?:estoque|saldo)\s+(?:da|do|de)\s+(.+)$/i,
    /\b(?:na|no)\s+([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s.'-]+)$/i,
  ]);

  const schoolName = cleanExtractedTerm(schoolMatch?.[1] ?? "");
  const productSource = schoolMatch ? compact.slice(0, schoolMatch.index).trim() : compact;
  const productMatch = firstRegexMatch(productSource, [
    /\b(?:quantos?|quanto|qual|quais)?\s*(?:kg|kgs|quilo|quilos|un|und|pct|pacote|pacotes)?\s*(?:de|do|da)\s+(.+?)\s+(?:tem|ha|há|existe|existem|no estoque|na escola|em estoque|$)/i,
    /\b(?:quantos?|quanto|qual|quais)?\s*(?:kg|kgs|quilo|quilos|un|und|pct|pacote|pacotes)?\s*([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s.'-]+?)\s+(?:tem|ha|há|existe|existem|no estoque|na escola|em estoque|$)/i,
    /\b(?:estoque|saldo)\s+(?:de|do|da)\s+(.+)$/i,
    /\bproduto\s+(.+)$/i,
  ]);
  const productName = cleanExtractedTerm(productMatch?.[1] ?? "");

  if (!productName && !schoolName) return null;

  return {
    precisaDados: true,
    termosProdutos: productName ? [productName] : [],
    termosEscolas: schoolName ? [schoolName] : [],
    pergunta: compact,
  };
}

function isProductOnlySchoolStockQuestion(input: ConstruirContextoOperacionalInput | null): boolean {
  return !!input?.pergunta &&
    input.termosProdutos?.length === 1 &&
    (input.termosEscolas?.length ?? 0) === 0 &&
    /\b(?:qual|quais)\s+escolas?\b/.test(normalizeTextForParsing(input.pergunta));
}

function formatProviderUnavailableAnswer(): string {
  return "O LLM nao respondeu ou esta indisponivel no momento. Nao consegui interpretar a pergunta com seguranca.";
}

function formatContextUnavailableAnswer(): string {
  return "O LLM entendeu que precisa consultar dados, mas nao consegui acessar o contexto operacional agora.";
}

export async function createChatbotResponse(
  input: CreateChatbotResponseInput,
): Promise<CreateChatbotResponseResult> {
  if (!input.config.enabled) {
    throw new Error("Chatbot desativado");
  }

  const message = sanitizeMessage(input.message);
  const history = sanitizeHistory(input.history);
  const provider = input.provider ?? createChatbotProvider(input.config);
  const tools = input.tools ?? {
    construirContextoOperacional: construirContextoOperacionalEstoque,
    executarSqlAgent: executeSqlAgent,
    executarDatabaseAgent: executeDatabaseAgent,
  };
  const sqlAgentExecutor = input.tools?.executarSqlAgent ?? (!input.tools ? executeSqlAgent : undefined);
  const databaseAgentExecutor = tools.executarDatabaseAgent;

  if (isSchoolStockCapabilityQuestion(message)) {
    return {
      answer: await generateInstructionalAnswer({
        provider,
        config: input.config,
        message,
        history,
        instruction: "Explique que voce consegue consultar o estoque de uma escola e peca o nome da escola. Mencione que o usuario pode informar tambem um produto especifico.",
      }).catch(() => formatProviderUnavailableAnswer()),
      toolsUsed: [],
    };
  }

  if (isPlainGreeting(message)) {
    return {
      answer: await generateInstructionalAnswer({
        provider,
        config: input.config,
        message,
        history,
        instruction: "Responda uma saudacao curta e ofereca ajuda com consultas do sistema.",
      }).catch(() => formatProviderUnavailableAnswer()),
      toolsUsed: [],
    };
  }

  if (isStockUpdateDraftRequest(message)) {
    return {
      answer: await generateInstructionalAnswer({
        provider,
        config: input.config,
        message,
        history,
        instruction: "Crie a mensagem solicitada pelo usuario para envio por WhatsApp. Nao consulte dados antigos do historico.",
      }).catch(() => formatProviderUnavailableAnswer()),
      toolsUsed: [],
    };
  }

  if (databaseAgentExecutor && !isRankingStockQuestion(message)) {
    try {
      const databaseAgentResult = await databaseAgentExecutor({
        message,
        history,
        config: input.config,
        provider,
      });
      if (databaseAgentResult.handled) {
        return {
          answer: databaseAgentResult.answer,
          toolsUsed: databaseAgentResult.toolsUsed,
          toolData: databaseAgentResult,
        };
      }
    } catch {
      // Se o agente de banco falhar, mantem os caminhos legados de interpretacao e ferramentas.
    }
  }

  let dataRequestCompletion;
  try {
    dataRequestCompletion = await provider.complete({
      config: input.config,
      messages: buildDataRequestMessages({ message, history }),
    });
  } catch {
    if (sqlAgentExecutor) {
      try {
        const sqlAgentResult = await sqlAgentExecutor({ message, history });
        if (sqlAgentResult.handled) {
          if (isShortRefinementMessage(message)) {
            return {
              answer: sqlAgentResult.answer,
              toolsUsed: [`sqlAgent.${sqlAgentResult.intent ?? "unknown"}`],
              toolData: sqlAgentResult,
            };
          }

          return {
            answer: formatProviderUnavailableAnswer(),
            toolsUsed: [`sqlAgent.${sqlAgentResult.intent ?? "unknown"}`],
            toolData: sqlAgentResult,
          };
        }
      } catch {
        // Sem LLM disponivel, nao ha resposta de negocio deterministica.
      }
    }

    return {
      answer: formatProviderUnavailableAnswer(),
      toolsUsed: [],
    };
  }

  const dataRequest = normalizeDataRequest(dataRequestCompletion.content, message);
  const plannedSqlIntent = normalizePlannedSqlIntent(dataRequestCompletion.content);
  if (plannedSqlIntent && sqlAgentExecutor) {
    try {
      const sqlAgentResult = await sqlAgentExecutor({ message, history, plannedIntent: plannedSqlIntent });
      if (sqlAgentResult.handled) {
        if (sqlAgentResult.intent === "estoque.ranking_escolas_por_produto") {
          return {
            answer: sqlAgentResult.answer,
            toolsUsed: [`sqlAgent.${sqlAgentResult.intent}`],
            toolData: sqlAgentResult,
          };
        }

        const answer = await generateStructuredFinalAnswer({
          provider,
          config: input.config,
          message,
          history,
          source: `sqlAgent.${sqlAgentResult.intent ?? "unknown"}`,
          data: sqlAgentResult,
        }).catch(() => formatProviderUnavailableAnswer());

        return {
          answer,
          toolsUsed: [`sqlAgent.${sqlAgentResult.intent ?? "unknown"}`],
          toolData: sqlAgentResult,
        };
      }
    } catch {
      // Se a intencao planejada falhar, continua pelo caminho de contexto operacional.
    }
  }

  if (sqlAgentExecutor) {
    try {
      const sqlAgentResult = await sqlAgentExecutor({ message, history });
      if (sqlAgentResult.handled && isShortRefinementMessage(message)) {
        return {
          answer: sqlAgentResult.answer,
          toolsUsed: [`sqlAgent.${sqlAgentResult.intent ?? "unknown"}`],
          toolData: sqlAgentResult,
        };
      }
    } catch {
      // Se o fallback SQL nao conseguir interpretar o historico, segue pelo contexto operacional.
    }
  }

  const deterministicDataRequest = inferDeterministicDataRequest(message, history);
  const effectiveDataRequest = isProductOnlySchoolStockQuestion(deterministicDataRequest)
    ? deterministicDataRequest
    : dataRequest;

  if (effectiveDataRequest.precisaDados || effectiveDataRequest.precisaDadosEstoque) {
    let toolData;
    try {
      toolData = await tools.construirContextoOperacional(effectiveDataRequest);
    } catch {
      return {
        answer: formatContextUnavailableAnswer(),
        toolsUsed: ["estoque.contextoOperacional"],
      };
    }

    let completion;
    try {
      completion = await provider.complete({
        config: input.config,
        messages: buildOperationalAnswerMessages({ message, history, dataRequest: effectiveDataRequest, context: toolData }),
      });
    } catch {
      return {
        answer: formatProviderUnavailableAnswer(),
        toolsUsed: ["estoque.contextoOperacional"],
        toolData,
      };
    }

    return {
      answer: completion.content,
      toolsUsed: ["estoque.contextoOperacional"],
      toolData,
    };
  }

  let completion;
  try {
    completion = await provider.complete({
      config: input.config,
      messages: buildGenericMessages({ message, history }),
    });
  } catch {
    return {
      answer: formatProviderUnavailableAnswer(),
      toolsUsed: [],
    };
  }

  return {
    answer: completion.content,
    toolsUsed: [],
  };
}
