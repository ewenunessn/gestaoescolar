import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { executeSqlAgent } from "./sqlAgentService";

function createQueryMock(rowsByCall: any[][]) {
  const calls: Array<{ sql: string; params: any[] }> = [];

  return {
    calls,
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      return { rows: rowsByCall[calls.length - 1] ?? [] };
    },
  };
}

function createFeijaoFioreQueryMock() {
  const calls: Array<{ sql: string; params: any[] }> = [];

  return {
    calls,
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });

      if (/LOWER\(p\.nome\) LIKE LOWER\(\$1\)/.test(sql)) {
        return /feij/i.test(String(params[0]))
          ? { rows: [{ id: 22, nome: "Feijão Preto", unidade: "KG" }] }
          : { rows: [] };
      }

      if (/LOWER\(nome\) LIKE LOWER\(\$1\)/.test(sql)) {
        return /fiore/i.test(String(params[0]))
          ? { rows: [{ id: 4, nome: "EMEF Madre Paulina Fiore" }] }
          : { rows: [] };
      }

      if (/FROM produtos p/.test(sql)) {
        return {
          rows: [
            { id: 22, nome: "Feijão Preto", unidade: "KG" },
            { id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" },
          ],
        };
      }

      if (/FROM escolas/.test(sql)) {
        return {
          rows: [
            { id: 4, nome: "EMEF Madre Paulina Fiore" },
            { id: 2, nome: "EMEF Centro" },
          ],
        };
      }

      if (/FROM estoque_eventos/.test(sql)) {
        return { rows: [{ saldo_atual: "18", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }] };
      }

      return { rows: [] };
    },
  };
}

describe("sqlAgentService", () => {
  it("executes a planned product-at-school intent without parsing the original language", async () => {
    const db = createQueryMock([
      [{ id: 22, nome: "Feijão Preto", unidade: "KG" }],
      [{ id: 4, nome: "EMEF Madre Paulina Fiore" }],
      [{ saldo_atual: "18", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "how much black beans does Fiore have?",
      history: [],
      plannedIntent: {
        intent: "estoque.produto_na_escola",
        produtoNome: "feijão preto",
        escolaNome: "fiore",
      },
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(result.sql.params, [22, 4]);
    assert.equal(result.answer, "EMEF Madre Paulina Fiore tem 18 KG de Feijão Preto em estoque.");
  });

  it("answers which schools have a product in stock using a whitelisted query", async () => {
    const db = createQueryMock([
      [{ id: 20, nome: "Banana prata", unidade: "KG" }],
      [
        { escola_id: 1, escola_nome: "EMEF Centro", saldo_atual: "12.5", ultima_atualizacao: "2026-05-03T08:30:00.000Z" },
        { escola_id: 3, escola_nome: "EEEF Canutama", saldo_atual: "4", ultima_atualizacao: "2026-05-02T10:00:00.000Z" },
      ],
    ]);

    const result = await executeSqlAgent({
      message: "qual escola possui banana no estoque?",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.escolas_com_produto");
    assert.deepEqual(result.sql.params, [20]);
    assert.match(result.answer, /Banana prata/);
    assert.match(result.answer, /EMEF Centro: 12.5 KG/);
    assert.match(result.answer, /EEEF Canutama: 4 KG/);
    assert.match(db.calls[1].sql, /HAVING SUM\(ee\.quantidade_delta\) > 0/);
    assert.doesNotMatch(db.calls.map((call) => call.sql).join("\n"), /\b(update|delete|insert|drop|alter|truncate)\b/i);
  });

  it("answers product stock at a school using a whitelisted query", async () => {
    const db = createQueryMock([
      [{ id: 31, nome: "Frango Inteiro", unidade: "KG" }],
      [{ id: 12, nome: "EEEF Canutama" }],
      [{ saldo_atual: "24", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "quanto de frango inteiro tem no estoque da escola canutama",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(result.sql.params, [31, 12]);
    assert.equal(result.answer, "EEEF Canutama tem 24 KG de Frango Inteiro em estoque.");
    assert.doesNotMatch(db.calls.map((call) => call.sql).join("\n"), /\b(update|delete|insert|drop|alter|truncate)\b/i);
  });

  it("recognizes quantity questions with unit before the product and school after 'tem no'", async () => {
    const db = createQueryMock([
      [
        { id: 10, nome: "Arroz Parbolizado Tipo 1", unidade: "KG" },
        { id: 11, nome: "Arroz Polido Tipo 1", unidade: "KG" },
      ],
    ]);

    const result = await executeSqlAgent({
      message: "quantos kg de arroz tem no fiore?",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(db.calls[0].params, ["%arroz%", "arroz"]);
    assert.match(result.answer, /Mais de um produto parecido/);
    assert.match(result.answer, /Arroz Parbolizado Tipo 1/);
    assert.match(result.answer, /Arroz Polido Tipo 1/);
  });

  it("uses previous school context after a quantity question with ambiguous product", async () => {
    const db = createQueryMock([
      [{ id: 11, nome: "Arroz Polido Tipo 1", unidade: "KG" }],
      [{ id: 4, nome: "EMEF Madre Paulina Fiore" }],
      [{ saldo_atual: "42.5", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "arroz polido",
      history: [
        { role: "user", content: "quantos kg de arroz tem no fiore?" },
        {
          role: "assistant",
          content: [
            "Mais de um produto parecido foi encontrado. Refine o nome do produto.",
            "- Arroz Parbolizado Tipo 1",
            "- Arroz Polido Tipo 1",
          ].join("\n"),
        },
      ],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(db.calls[1].params, ["%fiore%", "fiore"]);
    assert.deepEqual(result.sql.params, [11, 4]);
    assert.equal(result.answer, "EMEF Madre Paulina Fiore tem 42.5 KG de Arroz Polido Tipo 1 em estoque.");
  });

  it("answers product stock when the school is mentioned after estoque without the word escola", async () => {
    const db = createQueryMock([
      [{ id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" }],
      [{ id: 4, nome: "EMEF Madre Paulina Fiore" }],
      [{ saldo_atual: "42.5", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "quanto arroz polido tem no estoque do fiore",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(result.sql.params, [10, 4]);
    assert.equal(result.answer, "EMEF Madre Paulina Fiore tem 42.5 KG de Arroz Polido Tipo 1 em estoque.");
  });

  it("answers school-first product stock questions", async () => {
    const db = createQueryMock([
      [{ id: 22, nome: "Feijão Preto", unidade: "KG" }],
      [{ id: 4, nome: "EMEF Madre Paulina Fiore" }],
      [{ saldo_atual: "18", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "quanto o fiore tem de feijão preto?",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(db.calls[0].params, ["%feijão%preto%", "feijão preto"]);
    assert.deepEqual(db.calls[1].params, ["%fiore%", "fiore"]);
    assert.deepEqual(result.sql.params, [22, 4]);
    assert.equal(result.answer, "EMEF Madre Paulina Fiore tem 18 KG de Feijão Preto em estoque.");
  });

  const fioreFeijaoPhrases = [
    "quanto o fiore tem de feijão preto?",
    "o fiore tem quanto de feijão preto?",
    "tem feijão preto no fiore?",
    "feijão preto no fiore",
    "saldo feijão preto fiore",
    "estoque fiore feijão preto",
    "qtd de feijão preto na fiore",
    "quantidade de feijão preto escola fiore",
  ];

  for (const phrase of fioreFeijaoPhrases) {
    it(`answers product stock from natural phrase: ${phrase}`, async () => {
      const db = createFeijaoFioreQueryMock();

      const result = await executeSqlAgent({
        message: phrase,
        history: [],
        query: db.query,
      });

      assert.equal(result.handled, true);
      assert.equal(result.intent, "estoque.produto_na_escola");
      assert.deepEqual(result.sql.params, [22, 4]);
      assert.equal(result.answer, "EMEF Madre Paulina Fiore tem 18 KG de Feijão Preto em estoque.");
      assert.doesNotMatch(db.calls.map((call) => call.sql).join("\n"), /\b(update|delete|insert|drop|alter|truncate)\b/i);
    });
  }

  it("falls back to semantic school matching when literal school qualifiers do not match", async () => {
    const db = createQueryMock([
      [{ id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" }],
      [],
      [
        { id: 2, nome: "EMEF Centro" },
        { id: 4, nome: "EMEF Madre Paulina Fiore" },
      ],
      [{ saldo_atual: "42.5", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "qual estoque do arroz polido na escola tempo integral fiore?",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(db.calls[1].params, ["%tempo%integral%fiore%", "tempo integral fiore"]);
    assert.deepEqual(result.sql.params, [10, 4]);
    assert.equal(result.answer, "EMEF Madre Paulina Fiore tem 42.5 KG de Arroz Polido Tipo 1 em estoque.");
  });

  it("answers product stock from 'qual estoque de produto da escola' wording", async () => {
    const db = createQueryMock([
      [{ id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" }],
      [{ id: 80, nome: "CMEI Berço da Liberdade" }],
      [{ saldo_atual: "17", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "qual estoque de arroz polido do berço da Liberdade",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(result.sql.params, [10, 80]);
    assert.equal(result.answer, "CMEI Berço da Liberdade tem 17 KG de Arroz Polido Tipo 1 em estoque.");
  });

  it("answers product stock from 'qual estoque da product no school' wording", async () => {
    const db = createQueryMock([
      [{ id: 21, nome: "Banana prata", unidade: "KG" }],
      [{ id: 80, nome: "CMEI Berço da Liberdade" }],
      [{ saldo_atual: "8", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "qual estoque da banana prata no berço da Liberdade",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(db.calls[0].params, ["%banana%prata%", "banana prata"]);
    assert.deepEqual(db.calls[1].params, ["%berço%da%Liberdade%", "berço da Liberdade"]);
    assert.deepEqual(result.sql.params, [21, 80]);
    assert.equal(result.answer, "CMEI Berço da Liberdade tem 8 KG de Banana prata em estoque.");
  });

  it("answers free word order product stock questions by linking registered entities", async () => {
    const db = createQueryMock([
      [
        { id: 21, nome: "Banana prata", unidade: "KG" },
        { id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" },
      ],
      [
        { id: 80, nome: "CMEI Berço da Liberdade" },
        { id: 4, nome: "EMEF Madre Paulina Fiore" },
      ],
      [{ saldo_atual: "8", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "quanto tem no estoque do berço da Liberdade o item banana prata",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(result.sql.params, [21, 80]);
    assert.equal(result.answer, "CMEI Berço da Liberdade tem 8 KG de Banana prata em estoque.");
  });

  it("answers which school has the highest stock for a product using semantic planning", async () => {
    const db = createQueryMock([
      [
        { id: 21, nome: "Banana prata", unidade: "KG" },
        { id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" },
      ],
      [
        { id: 80, nome: "CMEI Berço da Liberdade" },
        { id: 4, nome: "EMEF Madre Paulina Fiore" },
      ],
      [
        { escola_id: 80, escola_nome: "CMEI Berço da Liberdade", saldo_atual: "18", ultima_atualizacao: "2026-05-03T08:30:00.000Z" },
        { escola_id: 4, escola_nome: "EMEF Madre Paulina Fiore", saldo_atual: "7", ultima_atualizacao: "2026-05-02T10:00:00.000Z" },
      ],
    ]);

    const result = await executeSqlAgent({
      message: "qual escola tem mais estoque de banana prata?",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.ranking_escolas_por_produto");
    assert.deepEqual(result.sql.params, [21, 5]);
    assert.match(result.answer, /maior estoque de Banana prata/);
    assert.match(result.answer, /CMEI Berço da Liberdade/);
    assert.match(result.answer, /18 KG/);
    assert.match(db.calls[2].sql, /ORDER BY saldo_atual DESC/);
  });

  it("answers products available at a school using semantic planning", async () => {
    const db = createQueryMock([
      [
        { id: 21, nome: "Banana prata", unidade: "KG" },
        { id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" },
      ],
      [
        { id: 80, nome: "CMEI Berço da Liberdade" },
        { id: 4, nome: "EMEF Madre Paulina Fiore" },
      ],
      [
        { produto_id: 21, produto_nome: "Banana prata", unidade: "KG", saldo_atual: "8", ultima_atualizacao: "2026-05-03T08:30:00.000Z" },
        { produto_id: 10, produto_nome: "Arroz Polido Tipo 1", unidade: "KG", saldo_atual: "3", ultima_atualizacao: "2026-05-02T10:00:00.000Z" },
      ],
    ]);

    const result = await executeSqlAgent({
      message: "o que tem no estoque do berço da liberdade?",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produtos_da_escola");
    assert.deepEqual(result.sql.params, [80]);
    assert.match(result.answer, /CMEI Berço da Liberdade/);
    assert.match(result.answer, /Banana prata: 8 KG/);
    assert.match(result.answer, /Arroz Polido Tipo 1: 3 KG/);
  });

  it("does not match a school token from inside a product word", async () => {
    const db = createQueryMock([
      [
        { id: 21, nome: "Banana prata", unidade: "KG" },
        { id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" },
      ],
      [
        { id: 8, nome: "EEEFM Profª Ana Teles" },
      ],
    ]);

    const result = await executeSqlAgent({
      message: "meu superior pediu para você olhar quanto tem de banana nos estoque das escolas, me devolve um lista",
      history: [],
      query: db.query,
    });

    assert.equal(result.handled, false);
    assert.doesNotMatch(result.answer, /Ana Teles|itens com saldo positivo/i);
  });

  it("uses previous school context for short product refinements", async () => {
    const db = createQueryMock([
      [{ id: 31, nome: "Frango Inteiro", unidade: "KG" }],
      [{ id: 12, nome: "EEEF Canutama" }],
      [{ saldo_atual: "24", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "frango inteiro",
      history: [
        { role: "user", content: "quanto de frango tem no estoque da escola canutama" },
        { role: "assistant", content: "Mais de um produto parecido foi encontrado. Refine o nome do produto." },
      ],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(result.sql.params, [31, 12]);
    assert.equal(result.answer, "EEEF Canutama tem 24 KG de Frango Inteiro em estoque.");
  });

  it("uses previous schools-with-product context for short product refinements", async () => {
    const db = createQueryMock([
      [{ id: 44, nome: "Polpa De Fruta (Goiaba)", unidade: "KG" }],
      [{ escola_id: 8, escola_nome: "CMEI Berco da Liberdade", saldo_atual: "12", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
      message: "goiaba",
      history: [
        { role: "user", content: "existe alguma escola com fruta no estoque?" },
        {
          role: "assistant",
          content: [
            "Mais de um produto parecido foi encontrado. Refine o nome do produto.",
            "- Polpa De Fruta (Acerola)",
            "- Polpa De Fruta (Goiaba)",
          ].join("\n"),
        },
      ],
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.escolas_com_produto");
    assert.deepEqual(result.sql.params, [44]);
    assert.match(result.answer, /CMEI Berco da Liberdade/);
    assert.match(result.answer, /Polpa De Fruta \(Goiaba\)/);
  });

  it("uses previous school context when the original question includes 'na escola'", async () => {
    const db = createQueryMock([
      [{ id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" }],
      [{ id: 4, nome: "EMEF Madre Paulina Fiore" }],
      [{ saldo_atual: "42.5", ultima_atualizacao: "2026-05-03T08:30:00.000Z" }],
    ]);

    const result = await executeSqlAgent({
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
      query: db.query,
    });

    assert.equal(result.handled, true);
    assert.equal(result.intent, "estoque.produto_na_escola");
    assert.deepEqual(db.calls[1].params, ["%Fiore%", "Fiore"]);
    assert.deepEqual(result.sql.params, [10, 4]);
    assert.equal(result.answer, "EMEF Madre Paulina Fiore tem 42.5 KG de Arroz Polido Tipo 1 em estoque.");
  });
});
