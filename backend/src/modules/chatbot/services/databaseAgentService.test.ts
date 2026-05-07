import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { executeDatabaseAgent } from "./databaseAgentService";
import type { ChatbotProvider } from "../providers/types";

const config = {
  enabled: true,
  provider: "ollama" as const,
  model: "qwen2.5:3b",
  baseUrl: "http://localhost:11434",
  timeoutMs: 60000,
  temperature: 0.2,
};

function createProvider(content: string | Error | Array<string | Error>): ChatbotProvider & { calls: any[] } {
  const calls: any[] = [];
  const contents = Array.isArray(content) ? [...content] : [content];
  return {
    calls,
    complete: async (input) => {
      calls.push(input);
      const next = contents.shift() ?? contents[contents.length - 1] ?? "";
      if (next instanceof Error) throw next;
      return { content: next };
    },
  };
}

function createQueryMock() {
  const calls: Array<{ sql: string; params: any[] }> = [];

  return {
    calls,
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });

      if (/FROM produtos p/.test(sql)) {
        return { rows: [{ id: 11, nome: "Arroz Polido Tipo 1", unidade: "KG" }] };
      }

      if (/FROM escolas/.test(sql)) {
        return { rows: [{ id: 4, nome: "EMEF Madre Paulina Fiore" }] };
      }

      if (/FROM estoque_eventos/.test(sql)) {
        return { rows: [{ saldo_atual: "18", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }] };
      }

      return { rows: [] };
    },
  };
}

describe("databaseAgentService", () => {
  it("runs a read-only tool loop when semantic shortcuts do not resolve the question", async () => {
    const provider = createProvider([
      JSON.stringify({
        action: "tool",
        tool: "database.buscar_produto",
        input: { termo: "arroz polido" },
      }),
      JSON.stringify({
        action: "tool",
        tool: "database.buscar_escola",
        input: { termo: "fiore" },
      }),
      JSON.stringify({
        action: "tool",
        tool: "database.consultar_saldo_produto_escola",
        input: { produtoId: 11, escolaId: 4 },
      }),
      JSON.stringify({
        action: "final",
        needsDatabase: true,
        answer: "EMEF Madre Paulina Fiore tem 18 KG de Arroz Polido Tipo 1 em estoque.",
      }),
    ]);
    const db = createQueryMock();

    const result = await executeDatabaseAgent({
      message: "use o banco para responder a consulta guiada desta conversa",
      history: [],
      config,
      provider,
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.answer, "EMEF Madre Paulina Fiore tem 18 KG de Arroz Polido Tipo 1 em estoque.");
    assert.deepEqual(result.toolsUsed, [
      "database.buscar_produto",
      "database.buscar_escola",
      "database.consultar_saldo_produto_escola",
    ]);
    assert.equal(provider.calls.length, 4);
    assert.match(provider.calls[0].messages[0].content, /estoque_eventos/);
    assert.doesNotMatch(db.calls.map((call) => call.sql).join("\n"), /\b(insert|update|delete|drop|alter|truncate)\b/i);
  });

  it("answers an English product-at-school stock question with an AI generated final answer", async () => {
    const provider = createProvider([
      JSON.stringify({ action: "tool", tool: "database.buscar_produto", input: { termo: "polished rice" } }),
      JSON.stringify({ action: "tool", tool: "database.buscar_escola", input: { termo: "Berco da Liberdade" } }),
      JSON.stringify({ action: "tool", tool: "database.consultar_saldo_produto_escola", input: { produtoId: 11, escolaId: 7 } }),
      JSON.stringify({ action: "final", needsDatabase: true, answer: "CMEI Berco da Liberdade tem 115 KG de Arroz Polido Tipo 1 em estoque." }),
    ]);
    const calls: Array<{ sql: string; params: any[] }> = [];

    const result = await executeDatabaseAgent({
      message: "Looking for how many kilograms of polished rice are in the school BerÃ§o da Liberdade",
      history: [],
      config,
      provider,
      query: async (sql, params = []) => {
        calls.push({ sql, params });

        if (/FROM produtos p/.test(sql)) {
          return {
            rows: [
              { id: 11, nome: "Arroz Polido Tipo 1", unidade: "KG" },
              { id: 12, nome: "Arroz Parbolizado Tipo 1", unidade: "KG" },
            ],
          };
        }

        if (/FROM escolas/.test(sql) && !/INNER JOIN/.test(sql)) {
          return {
            rows: [
              { id: 7, nome: "CMEI BerÃ§o da Liberdade" },
              { id: 8, nome: "EEEFM ProfÂª Ana Teles" },
            ],
          };
        }

        if (/FROM estoque_eventos/.test(sql)) {
          return { rows: [{ saldo_atual: "115", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }] };
        }

        return { rows: [] };
      },
    });

    assert.equal(result.handled, true);
    assert.equal(provider.calls.length, 4);
    assert.match(result.answer, /CMEI Ber.+o da Liberdade tem 115 KG de Arroz Polido Tipo 1 em estoque/);
    assert.deepEqual(result.toolsUsed, [
      "database.buscar_produto",
      "database.buscar_escola",
      "database.consultar_saldo_produto_escola",
    ]);
    assert.deepEqual(calls.at(-1)?.params, [11, 7]);
    assert.match(provider.calls.at(-2).messages.at(-1).content, /Resultado da ferramenta database\.consultar_saldo_produto_escola/);
  });

  it("uses recent stock context when the user sends a short product refinement", async () => {
    const provider = createProvider([
      JSON.stringify({ action: "tool", tool: "database.buscar_produto", input: { termo: "arroz polido" } }),
      JSON.stringify({ action: "tool", tool: "database.buscar_escola", input: { termo: "fiore" } }),
      JSON.stringify({ action: "tool", tool: "database.consultar_saldo_produto_escola", input: { produtoId: 11, escolaId: 4 } }),
      JSON.stringify({ action: "final", needsDatabase: true, answer: "EMEF Madre Paulina Fiore tem 18 KG de Arroz Polido Tipo 1 em estoque." }),
    ]);
    const calls: Array<{ sql: string; params: any[] }> = [];

    const result = await executeDatabaseAgent({
      message: "arroz polido",
      history: [
        { role: "user", content: "qual estoque de arroz na escola Fiore" },
        {
          role: "assistant",
          content: [
            "Mais de um produto parecido foi encontrado. Refine o nome do produto.",
            "- Arroz Parbolizado Tipo 1",
            "- Arroz Polido Tipo 1",
          ].join("\n"),
        },
      ],
      config,
      provider,
      query: async (sql, params = []) => {
        calls.push({ sql, params });

        if (/FROM produtos p/.test(sql)) {
          return {
            rows: [
              { id: 11, nome: "Arroz Polido Tipo 1", unidade: "KG" },
              { id: 12, nome: "Arroz Parbolizado Tipo 1", unidade: "KG" },
            ],
          };
        }

        if (/FROM escolas/.test(sql) && !/INNER JOIN/.test(sql)) {
          return { rows: [{ id: 4, nome: "EMEF Madre Paulina Fiore" }] };
        }

        if (/FROM estoque_eventos/.test(sql)) {
          return { rows: [{ saldo_atual: "18", ultima_atualizacao: null }] };
        }

        return { rows: [] };
      },
    });

    assert.equal(result.handled, true);
    assert.equal(provider.calls.length, 4);
    assert.equal(result.answer, "EMEF Madre Paulina Fiore tem 18 KG de Arroz Polido Tipo 1 em estoque.");
    assert.deepEqual(result.toolsUsed, [
      "database.buscar_produto",
      "database.buscar_escola",
      "database.consultar_saldo_produto_escola",
    ]);
    assert.deepEqual(calls.at(-1)?.params, [11, 4]);
  });

  it("answers a natural request for product stock across schools as a school list", async () => {
    const provider = createProvider([
      JSON.stringify({ action: "tool", tool: "database.buscar_produto", input: { termo: "banana" } }),
      JSON.stringify({ action: "tool", tool: "database.listar_escolas_com_produto", input: { produtoId: 20 } }),
      JSON.stringify({ action: "final", needsDatabase: true, answer: "Escolas com Banana Prata em estoque:\n- CMEI Berco da Liberdade: 9 KG\n- EEEFM Profa Ana Teles: 14 KG" }),
    ]);

    const result = await executeDatabaseAgent({
      message: "meu superior pediu para vocÃª olhar quanto tem de banana nos estoque das escolas, me devolve um lista",
      history: [],
      config,
      provider,
      query: async (sql, params = []) => {
        if (/FROM produtos p/.test(sql)) {
          return { rows: [{ id: 20, nome: "Banana Prata", unidade: "KG" }] };
        }

        if (/FROM escolas/.test(sql) && !/INNER JOIN/.test(sql)) {
          return { rows: [{ id: 8, nome: "EEEFM ProfÂª Ana Teles" }] };
        }

        if (/INNER JOIN escolas/.test(sql)) {
          assert.deepEqual(params, [20]);
          return {
            rows: [
              { escola_id: 7, escola_nome: "CMEI BerÃ§o da Liberdade", saldo_atual: "9", ultima_atualizacao: null },
              { escola_id: 8, escola_nome: "EEEFM ProfÂª Ana Teles", saldo_atual: "14", ultima_atualizacao: null },
            ],
          };
        }

        return { rows: [] };
      },
    });

    assert.equal(result.handled, true);
    assert.equal(provider.calls.length, 3);
    assert.deepEqual(result.toolsUsed, ["database.buscar_produto", "database.listar_escolas_com_produto"]);
    assert.match(result.answer, /Escolas com Banana Prata em estoque:/);
    assert.match(result.answer, /CMEI Ber.+o da Liberdade: 9 KG/);
    assert.match(result.answer, /EEEFM Prof.+ Ana Teles: 14 KG/);
    assert.doesNotMatch(result.answer, /nao possui itens com saldo positivo/i);
  });

  it("adds the general sum when listing product stock across schools asks for total", async () => {
    const provider = createProvider([
      JSON.stringify({ action: "tool", tool: "database.buscar_produto", input: { termo: "banana prata" } }),
      JSON.stringify({ action: "tool", tool: "database.listar_escolas_com_produto", input: { produtoId: 20 } }),
      JSON.stringify({ action: "final", needsDatabase: true, answer: "Escolas com Banana Prata em estoque:\n- Anexo Edna de Paula: 25 KG\n- UPEIF Nucleo Educacional Fiore: 22 KG\nTotal geral: 166 KG" }),
    ]);

    const result = await executeDatabaseAgent({
      message: "quais escolas possuem saldo positivo de banana prata no estoque, quero a listagem individual e a soma geral",
      history: [],
      config,
      provider,
      query: async (sql, params = []) => {
        if (/FROM produtos p/.test(sql)) {
          return { rows: [{ id: 20, nome: "Banana Prata", unidade: "KG" }] };
        }

        if (/FROM escolas/.test(sql) && !/INNER JOIN/.test(sql)) {
          return { rows: [] };
        }

        if (/INNER JOIN escolas/.test(sql)) {
          assert.deepEqual(params, [20]);
          return {
            rows: [
              { escola_id: 1, escola_nome: "Anexo Edna de Paula", saldo_atual: "25" },
              { escola_id: 7, escola_nome: "CMEI BerÃ§o da Liberdade", saldo_atual: "41" },
              { escola_id: 10, escola_nome: "CMEI Florescer", saldo_atual: "29" },
              { escola_id: 12, escola_nome: "CMEI Jardim Juritis", saldo_atual: "34" },
              { escola_id: 14, escola_nome: "EMEIF Mara Begot", saldo_atual: "15" },
              { escola_id: 16, escola_nome: "UPEIF NÃºcleo Educacional Fiore", saldo_atual: "22" },
            ],
          };
        }

        return { rows: [] };
      },
    });

    assert.equal(result.handled, true);
    assert.equal(provider.calls.length, 3);
    assert.match(result.answer, /Anexo Edna de Paula: 25 KG/);
    assert.match(result.answer, /UPEIF N.+cleo Educacional Fiore: 22 KG/);
    assert.match(result.answer, /Total geral: 166 KG/);
  });

  it("sends free-form presentation instructions to the AI composer", async () => {
    const provider = createProvider([
      JSON.stringify({ action: "tool", tool: "database.buscar_produto", input: { termo: "banana prata" } }),
      JSON.stringify({ action: "tool", tool: "database.listar_escolas_com_produto", input: { produtoId: 20 } }),
      JSON.stringify({ action: "final", needsDatabase: true, answer: "Escolas com Banana Prata em estoque, do maior para o menor:\n- CMEI Berco da Liberdade: 41 KG\n- CMEI Jardim Juritis: 34 KG\n- CMEI Florescer: 29 KG\n- Anexo Edna de Paula: 25 KG\n- UPEIF Nucleo Educacional Fiore: 22 KG\n- EMEIF Mara Begot: 15 KG" }),
    ]);

    const result = await executeDatabaseAgent({
      message: "quais escolas possuem saldo positivo de banana prata no estoque, quero a listagem do que tem mais para o que tem menos",
      history: [],
      config,
      provider,
      query: async (sql, params = []) => {
        if (/FROM produtos p/.test(sql)) {
          return { rows: [{ id: 20, nome: "Banana Prata", unidade: "KG" }] };
        }

        if (/FROM escolas/.test(sql) && !/INNER JOIN/.test(sql)) {
          return { rows: [] };
        }

        if (/INNER JOIN escolas/.test(sql)) {
          assert.deepEqual(params, [20]);
          return {
            rows: [
              { escola_id: 1, escola_nome: "Anexo Edna de Paula", saldo_atual: "25" },
              { escola_id: 7, escola_nome: "CMEI BerÃ§o da Liberdade", saldo_atual: "41" },
              { escola_id: 10, escola_nome: "CMEI Florescer", saldo_atual: "29" },
              { escola_id: 12, escola_nome: "CMEI Jardim Juritis", saldo_atual: "34" },
              { escola_id: 14, escola_nome: "EMEIF Mara Begot", saldo_atual: "15" },
              { escola_id: 16, escola_nome: "UPEIF NÃºcleo Educacional Fiore", saldo_atual: "22" },
            ],
          };
        }

        return { rows: [] };
      },
    });

    assert.equal(result.handled, true);
    assert.equal(provider.calls.length, 3);
    assert.match(result.answer, /CMEI Ber.+o da Liberdade: 41 KG/);
    assert.match(result.answer, /CMEI Jardim Juritis: 34 KG/);
    assert.match(result.answer, /EMEIF Mara Begot: 15 KG/);
    assert.match(provider.calls[0].messages[1].content, /do que tem mais para o que tem menos/);
    assert.match(provider.calls.at(-2).messages.at(-1).content, /saldo_atual/);
  });

  it("aggregates multiple matching banana products across schools without asking for refinement", async () => {
    const provider = createProvider([
      JSON.stringify({ action: "tool", tool: "database.buscar_produto", input: { termo: "banana" } }),
      JSON.stringify({ action: "tool", tool: "database.listar_escolas_com_produtos_relacionados", input: { produtoIds: [20, 21], termo: "banana" } }),
      JSON.stringify({ action: "final", needsDatabase: true, answer: "Estoque de banana nas escolas:\n- CMEI Berco da Liberdade: 9 KG\n- EEEFM Profa Ana Teles: 14 KG" }),
    ]);
    const calls: Array<{ sql: string; params: any[] }> = [];

    const result = await executeDatabaseAgent({
      message: "meu superior pediu para você olhar quanto tem de banana nos estoque das escolas, me devolve um lista",
      history: [],
      config,
      provider,
      query: async (sql, params = []) => {
        calls.push({ sql, params });

        if (/FROM produtos p/.test(sql)) {
          return {
            rows: [
              { id: 20, nome: "Banana Prata", unidade: "KG" },
              { id: 21, nome: "Banana Nanica", unidade: "KG" },
              { id: 30, nome: "Arroz Polido Tipo 1", unidade: "KG" },
            ],
          };
        }

        if (/FROM escolas/.test(sql) && !/INNER JOIN/.test(sql)) {
          return { rows: [{ id: 8, nome: "EEEFM Profª Ana Teles" }] };
        }

        if (/INNER JOIN escolas/.test(sql)) {
          assert.deepEqual(params, [[20, 21]]);
          return {
            rows: [
              { escola_id: 7, escola_nome: "CMEI Berço da Liberdade", saldo_atual: "9" },
              { escola_id: 8, escola_nome: "EEEFM Profª Ana Teles", saldo_atual: "14" },
            ],
          };
        }

        return { rows: [] };
      },
    });

    assert.equal(result.handled, true);
    assert.equal(provider.calls.length, 3);
    assert.deepEqual(result.toolsUsed, ["database.buscar_produto", "database.listar_escolas_com_produtos_relacionados"]);
    assert.match(result.answer, /Estoque de banana nas escolas:/);
    assert.match(result.answer, /CMEI Ber.+o da Liberdade: 9 KG/);
    assert.match(result.answer, /EEEFM Prof.+ Ana Teles: 14 KG/);
    assert.doesNotMatch(result.answer, /Mais de um produto parecido|nao possui itens/i);
  });

  it("executes only validated SELECT statements through the generic SQL tool", async () => {
    const provider = createProvider([
      JSON.stringify({
        action: "tool",
        tool: "database.executar_select_seguro",
        input: {
          sql: "SELECT nome FROM escolas WHERE COALESCE(ativo, true) = true ORDER BY nome LIMIT 5",
          params: [],
        },
      }),
      JSON.stringify({
        action: "final",
        needsDatabase: true,
        answer: "Encontrei 1 escola ativa: EMEF Madre Paulina Fiore.",
      }),
    ]);
    const calls: Array<{ sql: string; params: any[] }> = [];

    const result = await executeDatabaseAgent({
      message: "liste algumas escolas ativas",
      history: [],
      config,
      provider,
      query: async (sql, params = []) => {
        calls.push({ sql, params });
        return { rows: [{ nome: "EMEF Madre Paulina Fiore" }] };
      },
    });

    assert.equal(result.handled, true);
    assert.deepEqual(result.toolsUsed, ["database.executar_select_seguro"]);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /^SELECT nome FROM escolas/i);
    assert.equal(result.answer, "Encontrei 1 escola ativa: EMEF Madre Paulina Fiore.");
  });

  it("can inspect database schema before deciding where to query", async () => {
    const provider = createProvider([
      JSON.stringify({
        action: "tool",
        tool: "database.consultar_schema",
        input: { tabela: "escolas" },
      }),
      JSON.stringify({
        action: "final",
        needsDatabase: true,
        answer: "A tabela escolas possui as colunas id, nome e ativo.",
      }),
    ]);
    const calls: Array<{ sql: string; params: any[] }> = [];

    const result = await executeDatabaseAgent({
      message: "quais campos existem na tabela de escolas?",
      history: [],
      config,
      provider,
      query: async (sql, params = []) => {
        calls.push({ sql, params });
        return {
          rows: [
            { table_name: "escolas", column_name: "id", data_type: "integer" },
            { table_name: "escolas", column_name: "nome", data_type: "character varying" },
            { table_name: "escolas", column_name: "ativo", data_type: "boolean" },
          ],
        };
      },
    });

    assert.equal(result.handled, true);
    assert.deepEqual(result.toolsUsed, ["database.consultar_schema"]);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /information_schema\.columns/);
    assert.deepEqual(calls[0].params, ["escolas"]);
    assert.equal(result.answer, "A tabela escolas possui as colunas id, nome e ativo.");
  });

  it('answers "existe alguma escola ckm estoque positivo de laranja pera" through the agentic tool loop', async () => {
    const provider = createProvider([
      JSON.stringify({
        action: "tool",
        tool: "database.buscar_produto",
        input: { termo: "laranja pera" },
      }),
      JSON.stringify({
        action: "tool",
        tool: "database.listar_escolas_com_produto",
        input: { produtoId: 44 },
      }),
      JSON.stringify({
        action: "final",
        needsDatabase: true,
        answer: "Sim. A EMEF Centro tem 32 KG de Laranja Pera em estoque positivo.",
      }),
    ]);
    const calls: Array<{ sql: string; params: any[] }> = [];

    const result = await executeDatabaseAgent({
      message: "existe alguma escola ckm estoque positivo de laranja pera",
      history: [],
      config,
      provider,
      query: async (sql, params = []) => {
        calls.push({ sql, params });

        if (/FROM produtos p/.test(sql)) {
          assert.deepEqual(params, ["%laranja%pera%", "laranja pera"]);
          return { rows: [{ id: 44, nome: "Laranja Pera", unidade: "KG" }] };
        }

        if (/INNER JOIN escolas/.test(sql)) {
          assert.deepEqual(params, [44]);
          return {
            rows: [
              {
                escola_id: 9,
                escola_nome: "EMEF Centro",
                saldo_atual: "32",
                ultima_atualizacao: "2026-05-04T10:00:00.000Z",
              },
            ],
          };
        }

        return { rows: [] };
      },
    });

    assert.equal(result.handled, true);
    assert.deepEqual(result.toolsUsed, [
      "database.buscar_produto",
      "database.listar_escolas_com_produto",
    ]);
    assert.equal(provider.calls.length, 3);
    assert.match(provider.calls[0].messages[1].content, /ckm estoque positivo de laranja pera/);
    assert.match(provider.calls.at(-2).messages.at(-1).content, /Resultado da ferramenta database\.listar_escolas_com_produto/);
    assert.equal(result.answer, "Sim. A EMEF Centro tem 32 KG de Laranja Pera em estoque positivo.");
  });

  it("runs NutriLog domain tools as read-only agent actions", async () => {
    const cases = [
      {
        tool: "nutrilog.consultar_estoque",
        input: { termo: "arroz", limite: 5 },
        expectedTable: /FROM estoque_eventos/i,
        answer: "Consultei o estoque.",
      },
      {
        tool: "nutrilog.consultar_cardapio",
        input: { termo: "abril", limite: 5 },
        expectedTable: /FROM cardapios_modalidade/i,
        answer: "Consultei os cardapios.",
      },
      {
        tool: "nutrilog.consultar_demanda",
        input: { termo: "oficio", limite: 5 },
        expectedTable: /FROM demandas_escolas/i,
        answer: "Consultei as demandas.",
      },
      {
        tool: "nutrilog.consultar_pedido",
        input: { termo: "PED", limite: 5 },
        expectedTable: /FROM pedidos/i,
        answer: "Consultei os pedidos.",
      },
      {
        tool: "nutrilog.consultar_entrega",
        input: { termo: "EMEF", limite: 5 },
        expectedTable: /FROM historico_entregas/i,
        answer: "Consultei as entregas.",
      },
      {
        tool: "nutrilog.consultar_faturamento",
        input: { termo: "PED", limite: 5 },
        expectedTable: /FROM faturamentos/i,
        answer: "Consultei o faturamento.",
      },
    ] as const;

    for (const item of cases) {
      const provider = createProvider([
        JSON.stringify({
          action: "tool",
          tool: item.tool,
          input: item.input,
        }),
        JSON.stringify({
          action: "final",
          needsDatabase: true,
          answer: item.answer,
        }),
      ]);
      const calls: Array<{ sql: string; params: any[] }> = [];

      const result = await executeDatabaseAgent({
        message: `consulte usando ${item.tool}`,
        history: [],
        config,
        provider,
        query: async (sql, params = []) => {
          calls.push({ sql, params });
          return { rows: [{ id: 1, nome: "Registro de teste" }] };
        },
      });

      assert.equal(result.handled, true);
      assert.equal(result.answer, item.answer);
      assert.deepEqual(result.toolsUsed, [item.tool]);
      assert.equal(calls.length, 1);
      assert.match(calls[0].sql, item.expectedTable);
      assert.doesNotMatch(calls[0].sql, /\b(insert|update|delete|drop|alter|truncate)\b/i);
    }
  });

  it("blocks unsafe SQL generated by the model before it reaches the database", async () => {
    const provider = createProvider(JSON.stringify({
      action: "tool",
      tool: "database.executar_select_seguro",
      input: { sql: "DELETE FROM escolas", params: [] },
    }));
    const calls: Array<{ sql: string; params: any[] }> = [];

    const result = await executeDatabaseAgent({
      message: "apague as escolas",
      history: [],
      config,
      provider,
      query: async (sql, params = []) => {
        calls.push({ sql, params });
        return { rows: [] };
      },
    });

    assert.equal(result.handled, true);
    assert.equal(calls.length, 0);
    assert.deepEqual(result.toolsUsed, ["database.executar_select_seguro"]);
    assert.match(result.answer, /somente consultas de leitura/i);
  });
});



