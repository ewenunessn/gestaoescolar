import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createChatbotResponse } from "./chatbotOrchestrator";
import type { ChatbotProvider } from "../providers/types";

function createProvider(content: string | Error | Array<string | Error>): ChatbotProvider & { calls: any[] } {
  const calls: any[] = [];
  const contents = Array.isArray(content) ? [...content] : [content];
  return {
    calls,
    complete: async (input) => {
      calls.push(input);
      const next = contents.shift() ?? [
        "Resposta gerada pela IA a partir dos dados estruturados:",
        "EMEF Centro, EMEF Madre Paulina Fiore, CMEI BerÃ§o da Liberdade.",
        "Arroz Polido Tipo 1: 42.5 KG. Banana prata: maior estoque e 17 KG.",
      ].join(" ");
      if (next instanceof Error) throw next;
      return { content: next };
    },
  };
}

describe("chatbotOrchestrator", () => {
  it("rejects requests when chatbot is disabled", async () => {
    await assert.rejects(
      () =>
        createChatbotResponse({
          message: "oi",
          history: [],
          config: {
            enabled: false,
            provider: "ollama",
            model: "llama3.1",
            baseUrl: "http://localhost:11434",
            timeoutMs: 60000,
            temperature: 0.2,
          },
          provider: createProvider(""),
        }),
      /Chatbot desativado/,
    );
  });

  it("uses the LLM to answer stock update questions from operational data", async () => {
    const provider = createProvider([
      JSON.stringify({
        precisaDados: true,
        termosProdutos: ["arroz branco"],
        periodoDias: 2,
      }),
      "Duas escolas atualizaram e uma esta pendente: EMEF Centro atualizou, EMEF Norte esta pendente.",
    ]);
    const contextCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "quais escolas ja atualizaram o estoque do arroz branco nos ultimos 2 dias e quais faltam?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "llama3.1",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async (input: any) => {
          contextCalls.push(input);
          return {
            tipo: "estoque",
            filtros: input,
            produtos: [{ id: 10, nome: "Arroz branco", unidade: "KG" }],
            escolasAtualizadas: [{ escolaId: 1, escolaNome: "EMEF Centro" }],
            escolasPendentes: [{ escolaId: 2, escolaNome: "EMEF Norte" }],
            observacoes: [],
          };
        },
        consultarAtualizacoesProdutoPorPeriodo: async () => {
          throw new Error("legacy tool should not be called directly");
        },
        consultarEscolasComEstoque: async () => {
          throw new Error("legacy tool should not be called directly");
        },
        consultarEstoqueProdutoNaEscola: async () => {
          throw new Error("legacy tool should not be called directly");
        },
      } as any,
    });

    assert.equal(contextCalls.length, 1);
    assert.deepEqual(contextCalls[0].termosProdutos, ["arroz branco"]);
    assert.equal(contextCalls[0].periodoDias, 2);
    assert.equal(provider.calls.length, 2);
    assert.deepEqual(result.toolsUsed, ["estoque.contextoOperacional"]);
    assert.match(result.answer, /EMEF Centro/);
    assert.match(result.answer, /EMEF Norte/);
    assert.doesNotMatch(provider.calls[0].messages[0].content, /saldo_produto_escola|atualizacoes_produto_periodo|escolas_com_estoque/);
  });

  it("answers generic questions without calling stock tools", async () => {
    const provider = createProvider([
      JSON.stringify({ precisaDados: false, termosProdutos: [], termosEscolas: [], pergunta: "o que voce consegue fazer?" }),
      "Posso ajudar com consultas do sistema.",
    ]);

    const result = await createChatbotResponse({
      message: "o que voce consegue fazer?",
      history: [{ role: "user", content: "ola" }],
      config: {
        enabled: true,
        provider: "ollama",
        model: "llama3.1",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async () => {
          throw new Error("context should not be called");
        },
        consultarAtualizacoesProdutoPorPeriodo: async () => {
          throw new Error("tool should not be called");
        },
        consultarEscolasComEstoque: async () => {
          throw new Error("tool should not be called");
        },
        consultarEstoqueProdutoNaEscola: async () => {
          throw new Error("tool should not be called");
        },
      } as any,
    });

    assert.equal(provider.calls.length, 2);
    assert.deepEqual(result.toolsUsed, []);
    assert.equal(result.answer, "Posso ajudar com consultas do sistema.");
  });

  it("answers school stock capability questions without querying operational data", async () => {
    const provider = createProvider("Sim. Me informe o nome da escola para consultar o estoque.");

    const result = await createChatbotResponse({
      message: "consegue ver o estoque de uma escola?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async () => ({
          handled: false,
          answer: "Nao consegui mapear a pergunta para uma consulta SQL segura.",
          sql: { params: [] },
        }),
        construirContextoOperacional: async () => {
          throw new Error("context should not be called for capability questions");
        },
      },
    });

    assert.equal(provider.calls.length, 1);
    assert.deepEqual(result.toolsUsed, []);
    assert.match(result.answer, /Sim/);
    assert.match(result.answer, /nome da escola/i);
    assert.doesNotMatch(result.answer, /escola_teste|Nenhuma escola ativa|LLM/i);
  });

  it("continues past a capability phrase when the same message includes a concrete school stock request", async () => {
    const provider = createProvider("should not be called");
    const databaseAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: [
        "consegue ver o estoque de uma escola?",
        "verifica o estoque da escola berÃ§o da liberdade, retorna apenas os que tiverem estoque",
      ].join("\n"),
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarDatabaseAgent: async (input: any) => {
          databaseAgentCalls.push(input);
          return {
            handled: true,
            answer: [
              "Estoque atual de CMEI BerÃ§o da Liberdade:",
              "- Arroz Polido Tipo 1: 115 KG",
              "- Banana prata: 41 KG",
              "- Frango Inteiro: 30 KG",
            ].join("\n"),
            toolsUsed: ["database.listar_produtos_da_escola"],
            trace: [],
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("legacy operational context should not be called");
        },
      } as any,
    });

    assert.equal(provider.calls.length, 0);
    assert.equal(databaseAgentCalls.length, 1);
    assert.deepEqual(result.toolsUsed, ["database.listar_produtos_da_escola"]);
    assert.match(result.answer, /CMEI BerÃ§o da Liberdade/);
    assert.doesNotMatch(result.answer, /Me informe o nome da escola/i);
  });

  it("does not treat a plain greeting as a product refinement from previous stock history", async () => {
    const provider = createProvider("Ola! Como posso ajudar hoje?");

    const result = await createChatbotResponse({
      message: "OI",
      history: [
        { role: "user", content: "qual estoque de biscoito na escola berÃ§o da liberdade?" },
        {
          role: "assistant",
          content: [
            "Mais de um produto parecido foi encontrado. Refine o nome do produto.",
            "- Biscoito Cream Cracker",
            "- Biscoito Maria Tradicional",
          ].join("\n"),
        },
      ],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarDatabaseAgent: async () => {
          throw new Error("database agent should not be called for plain greetings");
        },
        executarSqlAgent: async () => {
          throw new Error("sql agent should not be called for plain greetings");
        },
        construirContextoOperacional: async () => {
          throw new Error("stock context should not be called for plain greetings");
        },
      } as any,
    });

    assert.equal(provider.calls.length, 1);
    assert.deepEqual(result.toolsUsed, []);
    assert.match(result.answer, /Ola|Ol/i);
    assert.doesNotMatch(result.answer, /produto|Biscoito|refine/i);
  });

  it("drafts a WhatsApp stock update message without querying stale product history", async () => {
    const provider = createProvider("Prezadas equipes, bom dia. Solicito que atualizem o estoque da escola no sistema. Obrigado.");

    const result = await createChatbotResponse({
      message: "cria uma mensagem pedido para as escolas atualizarem o estoque, vou enviar por whasapp",
      history: [
        { role: "user", content: "qual escola possui milho para pipoca no estoque?" },
        { role: "assistant", content: "Nenhuma escola ativa possui Milho Para Pipoca em estoque." },
      ],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarDatabaseAgent: async () => {
          throw new Error("database agent should not be called for message drafts");
        },
        executarSqlAgent: async () => {
          throw new Error("sql agent should not be called for message drafts");
        },
        construirContextoOperacional: async () => {
          throw new Error("stock context should not be called for message drafts");
        },
      } as any,
    });

    assert.equal(provider.calls.length, 1);
    assert.deepEqual(result.toolsUsed, []);
    assert.match(result.answer, /Prezadas|Bom dia|Boa tarde/i);
    assert.match(result.answer, /atualiz/i);
    assert.match(result.answer, /estoque/i);
    assert.match(result.answer, /obrigad/i);
    assert.doesNotMatch(result.answer, /Milho Para Pipoca|Nenhuma escola ativa/i);
  });

  it("uses the read-only database agent before legacy stock planners when it handles the question", async () => {
    const provider = createProvider("should not be called");
    const databaseAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "How many of polished rice are in the Fiore?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarDatabaseAgent: async (input: any) => {
          databaseAgentCalls.push(input);
          return {
            handled: true,
            answer: "EMEF Madre Paulina Fiore tem 18 KG de Arroz Polido Tipo 1 em estoque.",
            toolsUsed: [
              "database.buscar_produto",
              "database.buscar_escola",
              "database.consultar_saldo_produto_escola",
            ],
            trace: [],
          };
        },
        executarSqlAgent: async () => {
          throw new Error("legacy SQL agent should not be called");
        },
        construirContextoOperacional: async () => {
          throw new Error("legacy operational context should not be called");
        },
      } as any,
    });

    assert.equal(databaseAgentCalls.length, 1);
    assert.equal(databaseAgentCalls[0].message, "How many of polished rice are in the Fiore?");
    assert.equal(provider.calls.length, 0);
    assert.deepEqual(result.toolsUsed, [
      "database.buscar_produto",
      "database.buscar_escola",
      "database.consultar_saldo_produto_escola",
    ]);
    assert.equal(result.answer, "EMEF Madre Paulina Fiore tem 18 KG de Arroz Polido Tipo 1 em estoque.");
  });

  it("uses LLM planning before SQL execution for stock intents", async () => {
    const provider = createProvider(JSON.stringify({
      intent: "estoque.escolas_com_produto",
      produtoNome: "banana",
      escolaNome: null,
      precisaDados: true,
      termosProdutos: ["banana"],
      termosEscolas: [],
      periodoDias: null,
      pergunta: "qual escola possui banana no estoque?",
    }));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "qual escola possui banana no estoque?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          return {
            handled: true,
            intent: "estoque.escolas_com_produto",
            answer: "Escolas com Banana prata em estoque:\n- EMEF Centro: 12.5 KG",
            sql: { name: "estoque.escolas_com_produto", params: [20] },
            data: {},
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("context should not be called when SQL agent handles the question");
        },
      },
    });

    assert.equal(provider.calls.length, 2);
    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(sqlAgentCalls[0].plannedIntent, {
      intent: "estoque.escolas_com_produto",
      produtoNome: "banana",
      escolaNome: undefined,
    });
    assert.deepEqual(result.toolsUsed, ["sqlAgent.estoque.escolas_com_produto"]);
    assert.match(result.answer, /EMEF Centro/);
  });

  it("uses the LLM to plan multilingual unstructured stock questions before SQL execution", async () => {
    const provider = createProvider(JSON.stringify({
      intent: "estoque.produto_na_escola",
      produtoNome: "feijÃ£o preto",
      escolaNome: "fiore",
    }));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "how much black beans does Fiore have?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          if (!input.plannedIntent) {
            return {
              handled: false,
              answer: "Nao consegui mapear a pergunta para uma consulta SQL segura.",
              sql: { params: [] },
            };
          }

          return {
            handled: true,
            intent: "estoque.produto_na_escola",
            answer: "EMEF Madre Paulina Fiore tem 18 KG de FeijÃ£o Preto em estoque.",
            sql: { name: "estoque.produto_na_escola", params: [22, 4] },
            data: {},
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("context should not be called when planned SQL handles the question");
        },
      },
    });

    assert.equal(provider.calls.length, 2);
    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(sqlAgentCalls[0].plannedIntent, {
      intent: "estoque.produto_na_escola",
      produtoNome: "feijÃ£o preto",
      escolaNome: "fiore",
    });
    assert.deepEqual(result.toolsUsed, ["sqlAgent.estoque.produto_na_escola"]);
    assert.match(result.answer, /Fiore/);
  });

  it("does not let deterministic parsing treat an English stock question as a product name", async () => {
    const provider = createProvider(JSON.stringify({
      intent: "estoque.produto_na_escola",
      produtoNome: "arroz polido",
      escolaNome: "fiore",
      precisaDados: true,
      termosProdutos: ["arroz polido"],
      termosEscolas: ["fiore"],
      periodoDias: null,
      pergunta: "How many of polished rice are in the Fiore",
    }));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "How many of polished rice are in the Fiore",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          if (!input.plannedIntent) {
            return {
              handled: true,
              intent: "estoque.produto_na_escola",
              answer: 'Nenhum produto ativo encontrado para "How many of polished rice are in the Fiore".',
              sql: { name: "estoque.resolver_produto", params: ["How many of polished rice are in the Fiore"] },
              data: {},
            };
          }

          return {
            handled: true,
            intent: "estoque.produto_na_escola",
            answer: "EMEF Madre Paulina Fiore tem 42.5 KG de Arroz Polido Tipo 1 em estoque.",
            sql: { name: "estoque.produto_na_escola", params: [10, 4] },
            data: {},
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("context should not be called when planned SQL handles the question");
        },
      },
    });

    assert.equal(provider.calls.length, 2);
    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(sqlAgentCalls[0].plannedIntent, {
      intent: "estoque.produto_na_escola",
      produtoNome: "arroz polido",
      escolaNome: "fiore",
    });
    assert.doesNotMatch(result.answer, /How many of polished rice/i);
    assert.match(result.answer, /Arroz Polido Tipo 1/);
  });

  it("uses the SQL agent for stock at school questions without the word escola", async () => {
    const provider = createProvider(JSON.stringify({
      intent: "estoque.produto_na_escola",
      produtoNome: "arroz polido",
      escolaNome: "fiore",
    }));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "quanto arroz polido tem no estoque do fiore",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          return {
            handled: true,
            intent: "estoque.produto_na_escola",
            answer: "EMEF Madre Paulina Fiore tem 42.5 KG de Arroz Polido Tipo 1 em estoque.",
            sql: { name: "estoque.produto_na_escola", params: [10, 4] },
            data: {},
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("context should not be called when SQL agent handles the question");
        },
      },
    });

    assert.equal(provider.calls.length, 2);
    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(sqlAgentCalls[0].plannedIntent, {
      intent: "estoque.produto_na_escola",
      produtoNome: "arroz polido",
      escolaNome: "fiore",
    });
    assert.deepEqual(result.toolsUsed, ["sqlAgent.estoque.produto_na_escola"]);
    assert.match(result.answer, /Fiore/);
    assert.match(result.answer, /42.5 KG/);
  });

  it("uses the SQL agent for 'qual estoque de product da school' questions", async () => {
    const provider = createProvider(JSON.stringify({
      intent: "estoque.produto_na_escola",
      produtoNome: "arroz polido",
      escolaNome: "berÃ§o da Liberdade",
    }));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "qual estoque de arroz polido do berÃ§o da Liberdade",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          return {
            handled: true,
            intent: "estoque.produto_na_escola",
            answer: "CMEI BerÃ§o da Liberdade tem 17 KG de Arroz Polido Tipo 1 em estoque.",
            sql: { name: "estoque.produto_na_escola", params: [10, 80] },
            data: {},
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("context should not be called when SQL agent handles the question");
        },
      },
    });

    assert.equal(provider.calls.length, 2);
    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(result.toolsUsed, ["sqlAgent.estoque.produto_na_escola"]);
    assert.match(result.answer, /BerÃ§o da Liberdade/);
    assert.match(result.answer, /17 KG/);
  });

  it("uses the SQL agent for free word order stock questions", async () => {
    const provider = createProvider(JSON.stringify({
      intent: "estoque.produto_na_escola",
      produtoNome: "banana prata",
      escolaNome: "berÃ§o da Liberdade",
    }));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "quanto tem no estoque do berÃ§o da Liberdade o item banana prata",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          return {
            handled: true,
            intent: "estoque.produto_na_escola",
            answer: "CMEI BerÃ§o da Liberdade tem 8 KG de Banana prata em estoque.",
            sql: { name: "estoque.produto_na_escola", params: [21, 80] },
            data: {},
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("context should not be called when SQL agent handles the question");
        },
      },
    });

    assert.equal(provider.calls.length, 2);
    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(result.toolsUsed, ["sqlAgent.estoque.produto_na_escola"]);
    assert.match(result.answer, /Banana prata/);
    assert.match(result.answer, /BerÃ§o da Liberdade/);
  });

  it("uses LLM planning for ranking stock questions", async () => {
    const provider = createProvider(JSON.stringify({
      intent: "estoque.ranking_escolas_por_produto",
      produtoNome: "banana prata",
    }));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "qual escola tem mais estoque de banana prata?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          return {
            handled: true,
            intent: "estoque.ranking_escolas_por_produto",
            answer: "A escola com maior estoque de Banana prata e CMEI BerÃ§o da Liberdade, com 18 KG.",
            sql: { name: "estoque.ranking_escolas_por_produto", params: [21, 5] },
            data: {},
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("context should not be called when SQL agent handles the question");
        },
      },
    });

    assert.equal(provider.calls.length, 1);
    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(result.toolsUsed, ["sqlAgent.estoque.ranking_escolas_por_produto"]);
    assert.match(result.answer, /maior estoque/);
  });

  it("uses LLM product terms when ranking intent omits produtoNome", async () => {
    const provider = createProvider(JSON.stringify({
      intent: "estoque.ranking_escolas_por_produto",
      produtoNome: null,
      termosProdutos: ["arroz polido"],
      precisaDados: true,
    }));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "lista a escola com maior estoque de arroz polido",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          return {
            handled: true,
            intent: "estoque.ranking_escolas_por_produto",
            answer: "A escola com maior estoque de Arroz Polido Tipo 1 e EMEF Madre Paulina Fiore, com 42.5 KG.",
            sql: { name: "estoque.ranking_escolas_por_produto", params: [1, 2] },
            data: {},
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("context should not be called when SQL agent handles the question");
        },
      },
    });

    assert.equal(provider.calls.length, 1);
    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(sqlAgentCalls[0].plannedIntent, {
      intent: "estoque.ranking_escolas_por_produto",
      produtoNome: "arroz polido",
      escolaNome: undefined,
    });
    assert.deepEqual(result.toolsUsed, ["sqlAgent.estoque.ranking_escolas_por_produto"]);
    assert.match(result.answer, /Arroz Polido/);
  });

  it("uses LLM planning for school inventory questions", async () => {
    const provider = createProvider(JSON.stringify({
      intent: "estoque.produtos_da_escola",
      escolaNome: "berÃ§o da liberdade",
    }));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "o que tem no estoque do berÃ§o da liberdade?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          return {
            handled: true,
            intent: "estoque.produtos_da_escola",
            answer: "Estoque atual de CMEI BerÃ§o da Liberdade:\n- Banana prata: 8 KG",
            sql: { name: "estoque.produtos_da_escola", params: [80] },
            data: {},
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("context should not be called when SQL agent handles the question");
        },
      },
    });

    assert.equal(provider.calls.length, 2);
    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(result.toolsUsed, ["sqlAgent.estoque.produtos_da_escola"]);
    assert.match(result.answer, /Banana prata/);
  });

  it("uses the LLM to answer natural stock availability questions from operational data", async () => {
    const provider = createProvider([
      JSON.stringify({
        precisaDados: true,
        termosProdutos: [],
        termosEscolas: [],
      }),
      "Sim. A EMEF Centro possui estoque de 2 produtos.",
    ]);
    const contextCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "existe alguma escola com estoque?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async (input: any) => {
          contextCalls.push(input);
          return {
            tipo: "estoque",
            filtros: input,
            escolasComEstoque: [
              {
                escolaId: 1,
                escolaNome: "EMEF Centro",
                produtosComEstoque: 2,
                saldoTotalItens: 37.5,
                ultimaAtualizacao: "2026-05-03T08:30:00.000Z",
              },
            ],
            observacoes: [],
          };
        },
        consultarAtualizacoesProdutoPorPeriodo: async () => {
          throw new Error("legacy tool should not be called directly");
        },
        consultarEscolasComEstoque: async () => {
          throw new Error("legacy tool should not be called directly");
        },
        consultarEstoqueProdutoNaEscola: async () => {
          throw new Error("legacy tool should not be called directly");
        },
      } as any,
    });

    assert.equal(contextCalls.length, 1);
    assert.equal(provider.calls.length, 2);
    assert.deepEqual(result.toolsUsed, ["estoque.contextoOperacional"]);
    assert.match(result.answer, /Sim/);
    assert.match(result.answer, /EMEF Centro/);
    assert.match(result.answer, /2 produtos/);
  });

  it('uses the LLM to answer "qual o estoque do arroz polido no bertilla" from operational data', async () => {
    const provider = createProvider([
      JSON.stringify({
        precisaDados: true,
        termosProdutos: ["arroz polido"],
        termosEscolas: ["bertilla"],
      }),
      "A EMEF Bertila tem 42,5 KG de Arroz Polido Tipo 1 em estoque.",
    ]);
    const contextCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "qual o estoque do arroz polido no bertilla",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async (input: any) => {
          contextCalls.push(input);
          return {
            tipo: "estoque",
            filtros: input,
            saldoNaEscola: {
              status: "ok",
              produto: { id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" },
              escola: { id: 4, nome: "EMEF Bertila" },
              saldoAtual: 42.5,
              ultimaAtualizacao: "2026-05-03T08:30:00.000Z",
              ultimoTipoEvento: "entrada_manual_escola",
              ultimoUsuarioNome: "Ana",
              ultimaQuantidadeMovimentada: 12.5,
              observacoes: [],
            },
            observacoes: [],
          };
        },
        consultarAtualizacoesProdutoPorPeriodo: async () => {
          throw new Error("legacy tool should not be called directly");
        },
        consultarEscolasComEstoque: async () => {
          throw new Error("legacy tool should not be called directly");
        },
        consultarEstoqueProdutoNaEscola: async () => {
          throw new Error("legacy tool should not be called directly");
        },
      } as any,
    });

    assert.equal(contextCalls.length, 1);
    assert.deepEqual(contextCalls[0].termosProdutos, ["arroz polido"]);
    assert.deepEqual(contextCalls[0].termosEscolas, ["bertilla"]);
    assert.equal(provider.calls.length, 2);
    assert.deepEqual(result.toolsUsed, ["estoque.contextoOperacional"]);
    assert.match(result.answer, /Arroz Polido Tipo 1/);
    assert.match(result.answer, /EMEF Bertila/);
    assert.match(result.answer, /42,5 KG/);
  });

  it('uses free terms from the LLM to answer "qual o estoque de feijÃ£o preto no Rafael Gomes"', async () => {
    const provider = createProvider([
      JSON.stringify({
        precisaDados: true,
        termosProdutos: ["feijÃ£o preto"],
        termosEscolas: ["Rafael Gomes"],
        periodoDias: null,
        pergunta: "qual o estoque de feijÃ£o preto no Rafael Gomes",
      }),
      "A EMEF Rafael Gomes tem 18 KG de FeijÃ£o Preto em estoque.",
    ]);
    const contextCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "qual o estoque de feijÃ£o preto no Rafael Gomes",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async (input: any) => {
          contextCalls.push(input);
          return {
            tipo: "estoque",
            filtros: {
              termosProdutos: input.termosProdutos,
              termosEscolas: input.termosEscolas,
              dias: 2,
            },
            periodo: {
              dias: 2,
              inicio: "2026-05-01T12:00:00.000Z",
              fim: "2026-05-03T12:00:00.000Z",
            },
            produtos: [{ id: 22, nome: "FeijÃƒÆ’Ã‚Â£o Preto", unidade: "KG" }],
            produtoSelecionado: { id: 22, nome: "FeijÃƒÆ’Ã‚Â£o Preto", unidade: "KG" },
            escolasCandidatas: [{ id: 7, nome: "EMEF Rafael Gomes" }],
            escolasComEstoque: [],
            escolasComProdutoEmEstoque: [],
            escolasAtualizadas: [],
            escolasPendentes: [],
            saldoNaEscola: {
              status: "ok",
              produto: { id: 22, nome: "FeijÃ£o Preto", unidade: "KG" },
              escola: { id: 7, nome: "EMEF Rafael Gomes" },
              saldoAtual: 18,
              ultimaAtualizacao: "2026-05-03T08:30:00.000Z",
              observacoes: [],
            },
            observacoes: [],
          };
        },
      },
    });

    assert.deepEqual(contextCalls[0].termosProdutos, ["feijÃ£o preto"]);
    assert.deepEqual(contextCalls[0].termosEscolas, ["Rafael Gomes"]);
    assert.equal(provider.calls.length, 2);
    assert.deepEqual(result.toolsUsed, ["estoque.contextoOperacional"]);
    assert.match(result.answer, /Rafael Gomes/);
    assert.match(result.answer, /FeijÃ£o Preto/);
    assert.match(result.answer, /18 KG/);
    assert.doesNotMatch(provider.calls[0].messages[0].content, /saldo_produto_escola|atualizacoes_produto_periodo|escolas_com_estoque/);
  });

  it("returns a controlled message when the LLM is unavailable for generic questions", async () => {
    const provider = createProvider(new Error("Ollama retornou HTTP 500"));

    const result = await createChatbotResponse({
      message: "o que voce consegue fazer?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async () => {
          throw new Error("context should not be called");
        },
      },
    });

    assert.equal(provider.calls.length, 1);
    assert.deepEqual(result.toolsUsed, []);
    assert.match(result.answer, /LLM/);
    assert.match(result.answer, /nao respondeu|indisponivel/i);
  });

  it("does not return deterministic stock answers when the LLM is unavailable for product and school stock questions", async () => {
    const provider = createProvider(new Error("Ollama retornou HTTP 500"));
    const contextCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "quantos kg de feijÃ£o preto tem no estoque do Rafael Gomes",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async (input: any) => {
          contextCalls.push(input);
          return {
            tipo: "estoque",
            filtros: {
              termosProdutos: input.termosProdutos,
              termosEscolas: input.termosEscolas,
              dias: 2,
            },
            periodo: {
              dias: 2,
              inicio: "2026-05-01T12:00:00.000Z",
              fim: "2026-05-03T12:00:00.000Z",
            },
            produtos: [{ id: 22, nome: "FeijÃ£o Preto", unidade: "KG" }],
            produtoSelecionado: { id: 22, nome: "FeijÃ£o Preto", unidade: "KG" },
            escolasCandidatas: [{ id: 7, nome: "EMEF Rafael Gomes" }],
            escolasComEstoque: [],
            escolasComProdutoEmEstoque: [],
            escolasAtualizadas: [],
            escolasPendentes: [],
            saldoNaEscola: {
              status: "ok",
              produto: { id: 22, nome: "FeijÃ£o Preto", unidade: "KG" },
              escola: { id: 7, nome: "EMEF Rafael Gomes" },
              saldoAtual: 18,
              ultimaAtualizacao: "2026-05-03T08:30:00.000Z",
              observacoes: [],
            },
            observacoes: [],
          };
        },
      },
    });

    assert.equal(provider.calls.length, 1);
    assert.equal(contextCalls.length, 0);
    assert.deepEqual(result.toolsUsed, []);
    assert.match(result.answer, /LLM/);
    assert.match(result.answer, /nao respondeu|indisponivel/i);
    assert.doesNotMatch(result.answer, /Feij.+o Preto|Rafael Gomes|18 KG/i);
  });

  it("does not use chat history to return deterministic stock refinements when the LLM is unavailable", async () => {
    const provider = createProvider(new Error("Ollama retornou HTTP 500"));
    const contextCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "frango inteiro",
      history: [
        {
          role: "user",
          content: "quanto de frango tem no estoque da escola canutama",
        },
        {
          role: "assistant",
          content: "Mais de um produto parecido foi encontrado. Refine o nome do produto.",
        },
      ],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async (input: any) => {
          contextCalls.push(input);
          return {
            tipo: "estoque",
            filtros: {
              termosProdutos: input.termosProdutos,
              termosEscolas: input.termosEscolas,
              dias: 2,
            },
            periodo: {
              dias: 2,
              inicio: "2026-05-01T12:00:00.000Z",
              fim: "2026-05-03T12:00:00.000Z",
            },
            produtos: [{ id: 31, nome: "Frango Inteiro", unidade: "KG" }],
            produtoSelecionado: { id: 31, nome: "Frango Inteiro", unidade: "KG" },
            escolasCandidatas: [{ id: 12, nome: "EEEF Canutama" }],
            escolasComEstoque: [],
            escolasComProdutoEmEstoque: [],
            escolasAtualizadas: [],
            escolasPendentes: [],
            saldoNaEscola: {
              status: "ok",
              produto: { id: 31, nome: "Frango Inteiro", unidade: "KG" },
              escola: { id: 12, nome: "EEEF Canutama" },
              saldoAtual: 24,
              ultimaAtualizacao: "2026-05-03T08:30:00.000Z",
              observacoes: [],
            },
            observacoes: [],
          };
        },
      },
    });

    assert.equal(provider.calls.length, 1);
    assert.equal(contextCalls.length, 0);
    assert.deepEqual(result.toolsUsed, []);
    assert.match(result.answer, /LLM/);
    assert.match(result.answer, /nao respondeu|indisponivel/i);
    assert.doesNotMatch(result.answer, /Frango Inteiro|Canutama|24 KG/i);
  });

  it("does not return deterministic product-only school stock availability answers when the LLM is unavailable", async () => {
    const provider = createProvider(new Error("Ollama retornou HTTP 500"));
    const contextCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "qual escola possui banana no estoque?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async (input: any) => {
          contextCalls.push(input);
          return {
            tipo: "estoque",
            filtros: {
              termosProdutos: input.termosProdutos,
              termosEscolas: input.termosEscolas,
              dias: 2,
            },
            periodo: {
              dias: 2,
              inicio: "2026-05-01T12:00:00.000Z",
              fim: "2026-05-03T12:00:00.000Z",
            },
            produtos: [{ id: 20, nome: "Banana prata", unidade: "KG" }],
            produtoSelecionado: { id: 20, nome: "Banana prata", unidade: "KG" },
            escolasCandidatas: [],
            escolasComEstoque: [],
            escolasComProdutoEmEstoque: [
              {
                escolaId: 1,
                escolaNome: "EMEF Centro",
                saldoAtual: 12.5,
                ultimaAtualizacao: "2026-05-03T08:30:00.000Z",
              },
              {
                escolaId: 3,
                escolaNome: "EEEF Canutama",
                saldoAtual: 4,
                ultimaAtualizacao: "2026-05-02T10:00:00.000Z",
              },
            ],
            escolasAtualizadas: [],
            escolasPendentes: [],
            observacoes: [],
          };
        },
      },
    });

    assert.equal(provider.calls.length, 1);
    assert.equal(contextCalls.length, 0);
    assert.deepEqual(result.toolsUsed, []);
    assert.match(result.answer, /LLM/);
    assert.match(result.answer, /nao respondeu|indisponivel/i);
    assert.doesNotMatch(result.answer, /Banana prata|EMEF Centro|12.5 KG|EEEF Canutama|4 KG/i);
  });

  it("overrides unsafe LLM extraction for product-only school stock availability questions", async () => {
    const provider = createProvider([
      JSON.stringify({
        precisaDados: true,
        termosProdutos: [],
        termosEscolas: ["possui banana no"],
        pergunta: "qual escola possui banana no estoque?",
      }),
      "A EMEF Centro possui banana em estoque.",
    ]);
    const contextCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "qual escola possui banana no estoque?",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async (input: any) => {
          contextCalls.push(input);
          return {
            tipo: "estoque",
            filtros: {
              termosProdutos: input.termosProdutos,
              termosEscolas: input.termosEscolas,
              dias: 2,
            },
            periodo: {
              dias: 2,
              inicio: "2026-05-01T12:00:00.000Z",
              fim: "2026-05-03T12:00:00.000Z",
            },
            produtos: [{ id: 20, nome: "Banana prata", unidade: "KG" }],
            produtoSelecionado: { id: 20, nome: "Banana prata", unidade: "KG" },
            escolasCandidatas: [],
            escolasComEstoque: [],
            escolasComProdutoEmEstoque: [
              {
                escolaId: 1,
                escolaNome: "EMEF Centro",
                saldoAtual: 12.5,
                ultimaAtualizacao: "2026-05-03T08:30:00.000Z",
              },
            ],
            escolasAtualizadas: [],
            escolasPendentes: [],
            observacoes: [],
          };
        },
      },
    });

    assert.equal(contextCalls.length, 1);
    assert.deepEqual(contextCalls[0].termosProdutos, ["banana"]);
    assert.deepEqual(contextCalls[0].termosEscolas, []);
    assert.equal(provider.calls.length, 2);
    assert.match(result.answer, /EMEF Centro/);
  });

  it("does not return fetched operational data when the LLM fails while drafting the final answer", async () => {
    const provider = createProvider([
      JSON.stringify({
        precisaDados: true,
        termosProdutos: ["feijÃ£o preto"],
        termosEscolas: ["Rafael Gomes"],
      }),
      new Error("fetch failed"),
    ]);

    const result = await createChatbotResponse({
      message: "qual o estoque de feijÃ£o preto no Rafael Gomes",
      history: [],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async () =>
          ({
            tipo: "estoque",
            filtros: {
              termosProdutos: ["feijÃ£o preto"],
              termosEscolas: ["Rafael Gomes"],
              dias: 2,
            },
            periodo: {
              dias: 2,
              inicio: "2026-05-01T12:00:00.000Z",
              fim: "2026-05-03T12:00:00.000Z",
            },
            produtos: [{ id: 22, nome: "FeijÃ£o Preto", unidade: "KG" }],
            produtoSelecionado: { id: 22, nome: "FeijÃ£o Preto", unidade: "KG" },
            escolasCandidatas: [{ id: 7, nome: "EMEF Rafael Gomes" }],
            escolasComEstoque: [],
            escolasComProdutoEmEstoque: [],
            escolasAtualizadas: [],
            escolasPendentes: [],
            saldoNaEscola: {
              status: "ok",
              produto: { id: 22, nome: "FeijÃ£o Preto", unidade: "KG" },
              escola: { id: 7, nome: "EMEF Rafael Gomes" },
              saldoAtual: 18,
              ultimaAtualizacao: "2026-05-03T08:30:00.000Z",
              observacoes: [],
            },
            observacoes: [],
          }) as any,
      },
    });

    assert.equal(provider.calls.length, 2);
    assert.deepEqual(result.toolsUsed, ["estoque.contextoOperacional"]);
    assert.match(result.answer, /LLM/);
    assert.match(result.answer, /nao respondeu|indisponivel/i);
    assert.doesNotMatch(result.answer, /Feij.+o Preto|Rafael Gomes|18/i);
  });

  it("uses the LLM to interpret a product refinement and answer from operational data", async () => {
    const provider = createProvider([
      JSON.stringify({
        precisaDados: true,
        termosProdutos: ["arroz polido"],
        periodoDias: 2,
      }),
      "O produto correto e Arroz Polido Tipo 1. No periodo analisado, a EMEF Centro atualizou o estoque e a EMEF Norte ainda esta pendente.",
    ]);
    const contextCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "arroz polido",
      history: [
        {
          role: "user",
          content: "quais escolas atualizaram o estoque do arroz nos ultimos 2 dias e quais faltam?",
        },
        {
          role: "assistant",
          content: [
            "Encontrei mais de um produto parecido. Refine o nome do produto:",
            "- Arroz Parbolizado Tipo 1",
            "- Arroz Polido Tipo 1",
            "- Cereal Em Po De Arroz",
          ].join("\n"),
        },
      ],
      config: {
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:3b",
        baseUrl: "http://localhost:11434",
        timeoutMs: 60000,
        temperature: 0.2,
      },
      provider,
      tools: {
        construirContextoOperacional: async (input: any) => {
          contextCalls.push(input);
          return {
            tipo: "estoque",
            filtros: input,
            produtos: [{ id: 11, nome: "Arroz Polido Tipo 1", unidade: "KG" }],
            escolasAtualizadas: [{ escolaId: 1, escolaNome: "EMEF Centro", saldoAtual: 15 }],
            escolasPendentes: [{ escolaId: 2, escolaNome: "EMEF Norte" }],
            observacoes: [],
          };
        },
        consultarAtualizacoesProdutoPorPeriodo: async () => {
          throw new Error("legacy tool should not be called directly");
        },
        consultarEscolasComEstoque: async () => {
          throw new Error("legacy tool should not be called directly");
        },
        consultarEstoqueProdutoNaEscola: async () => {
          throw new Error("legacy tool should not be called directly");
        },
      } as any,
    });

    assert.equal(provider.calls.length, 2);
    assert.equal(contextCalls.length, 1);
    assert.deepEqual(contextCalls[0].termosProdutos, ["arroz polido"]);
    assert.equal(contextCalls[0].periodoDias, 2);
    assert.deepEqual(result.toolsUsed, ["estoque.contextoOperacional"]);
    assert.match(result.answer, /Arroz Polido Tipo 1/);
    assert.match(result.answer, /EMEF Centro/);
    assert.match(result.answer, /EMEF Norte/);
  });

  it("uses SQL history fallback when LLM misses a short product refinement", async () => {
    const provider = createProvider(JSON.stringify({
      intent: null,
      produtoNome: null,
      precisaDados: false,
      termosProdutos: [],
      termosEscolas: [],
      pergunta: "goiaba",
    }));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "goiaba",
      history: [
        { role: "user", content: "existe alguma escola com fruta no estoque?" },
        {
          role: "assistant",
          content: [
            "Mais de um produto parecido foi encontrado. Por favor, refine o nome do produto:",
            "- Polpa De Fruta (Acerola)",
            "- Polpa De Fruta (Goiaba)",
          ].join("\n"),
        },
      ],
      config: {
        enabled: true,
        provider: "openai_compatible",
        model: "gemini-2.5-flash",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: "test",
        timeoutMs: 120000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          return {
            handled: true,
            intent: "estoque.escolas_com_produto",
            answer: "Escolas com Polpa De Fruta (Goiaba) em estoque:\n- CMEI Berco da Liberdade: 12 KG",
            sql: { name: "estoque.escolas_com_produto", params: [44] },
            data: {},
          };
        },
        construirContextoOperacional: async () => {
          throw new Error("context should not be called when SQL history fallback handles refinement");
        },
      } as any,
    });

    assert.equal(provider.calls.length, 1);
    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(result.toolsUsed, ["sqlAgent.estoque.escolas_com_produto"]);
    assert.match(result.answer, /Goiaba/);
    assert.doesNotMatch(result.answer, /LLM nao respondeu|indisponivel/i);
  });

  it("uses SQL history fallback for short refinements when the LLM request fails", async () => {
    const provider = createProvider(new Error("Gemini retornou HTTP 503"));
    const sqlAgentCalls: any[] = [];

    const result = await createChatbotResponse({
      message: "goiaba",
      history: [
        { role: "user", content: "existe alguma escola com fruta no estoque?" },
        {
          role: "assistant",
          content: [
            "Mais de um produto parecido foi encontrado. Por favor, refine o nome do produto:",
            "- Polpa De Fruta (Acerola)",
            "- Polpa De Fruta (Goiaba)",
          ].join("\n"),
        },
      ],
      config: {
        enabled: true,
        provider: "openai_compatible",
        model: "gemini-2.5-flash",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: "test",
        timeoutMs: 120000,
        temperature: 0.2,
      },
      provider,
      tools: {
        executarSqlAgent: async (input: any) => {
          sqlAgentCalls.push(input);
          return {
            handled: true,
            intent: "estoque.escolas_com_produto",
            answer: "Escolas com Polpa De Fruta (Goiaba) em estoque:\n- CMEI Berco da Liberdade: 12 KG",
            sql: { name: "estoque.escolas_com_produto", params: [44] },
            data: {},
          };
        },
      } as any,
    });

    assert.equal(sqlAgentCalls.length, 1);
    assert.deepEqual(result.toolsUsed, ["sqlAgent.estoque.escolas_com_produto"]);
    assert.match(result.answer, /Goiaba/);
    assert.doesNotMatch(result.answer, /LLM nao respondeu|indisponivel/i);
  });
});





