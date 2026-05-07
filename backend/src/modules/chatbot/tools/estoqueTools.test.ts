import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  construirContextoOperacionalEstoque,
  consultarAtualizacoesProdutoPorPeriodo,
  consultarEscolasComEstoque,
  consultarEstoqueProdutoNaEscola,
} from "./estoqueTools";

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

describe("estoqueTools", () => {
  it("lists updated and pending schools for a product period", async () => {
    const db = createQueryMock([
      [{ id: 10, nome: "Arroz branco tipo 1", unidade: "KG" }],
      [
        { id: 1, nome: "EMEF Centro" },
        { id: 2, nome: "EMEF Norte" },
        { id: 3, nome: "EMEF Sul" },
      ],
      [
        {
          escola_id: 1,
          escola_nome: "EMEF Centro",
          ultima_atualizacao: "2026-05-02T10:00:00.000Z",
          usuario_nome: "Ana",
          tipo_evento: "ajuste_estoque",
          quantidade_movimentada: "12.5",
          saldo_atual: "25.5",
        },
        {
          escola_id: 3,
          escola_nome: "EMEF Sul",
          ultima_atualizacao: "2026-05-03T08:30:00.000Z",
          usuario_nome: "Bruno",
          tipo_evento: "entrada_manual_escola",
          quantidade_movimentada: "4",
          saldo_atual: "9",
        },
      ],
    ]);

    const result = await consultarAtualizacoesProdutoPorPeriodo(
      { produtoNome: "arroz branco", dias: 2 },
      { query: db.query, now: new Date("2026-05-03T12:00:00.000Z") },
    );

    assert.equal(result.produto.id, 10);
    assert.equal(result.produto.nome, "Arroz branco tipo 1");
    assert.equal(result.periodo.dias, 2);
    assert.equal(result.totalEscolasAtivas, 3);
    assert.deepEqual(result.escolasAtualizadas.map((item) => item.escolaNome), ["EMEF Centro", "EMEF Sul"]);
    assert.deepEqual(result.escolasPendentes.map((item) => item.escolaNome), ["EMEF Norte"]);
    assert.equal(result.escolasAtualizadas[0].usuarioNome, "Ana");
    assert.equal(result.escolasAtualizadas[0].saldoAtual, 25.5);
    assert.equal(db.calls[2].params[0], 10);
    assert.equal(db.calls[2].params[1], "2026-05-01T12:00:00.000Z");
  });

  it("clamps the period to thirty days", async () => {
    const db = createQueryMock([
      [{ id: 10, nome: "Arroz branco", unidade: "KG" }],
      [{ id: 1, nome: "EMEF Centro" }],
      [],
    ]);

    const result = await consultarAtualizacoesProdutoPorPeriodo(
      { produtoNome: "arroz branco", dias: 90 },
      { query: db.query, now: new Date("2026-05-03T12:00:00.000Z") },
    );

    assert.equal(result.periodo.dias, 30);
    assert.equal(db.calls[2].params[1], "2026-04-03T12:00:00.000Z");
    assert.deepEqual(result.escolasPendentes.map((item) => item.escolaNome), ["EMEF Centro"]);
  });

  it("returns candidates when product name is ambiguous", async () => {
    const db = createQueryMock([
      [
        { id: 10, nome: "Arroz branco", unidade: "KG" },
        { id: 11, nome: "Arroz branco parboilizado", unidade: "KG" },
      ],
    ]);

    const result = await consultarAtualizacoesProdutoPorPeriodo(
      { produtoNome: "arroz", dias: 2 },
      { query: db.query, now: new Date("2026-05-03T12:00:00.000Z") },
    );

    assert.equal(result.status, "ambiguous_product");
    assert.deepEqual(result.candidatos?.map((item) => item.nome), [
      "Arroz branco",
      "Arroz branco parboilizado",
    ]);
    assert.equal(db.calls.length, 1);
  });

  it("reports product not found without querying schools", async () => {
    const db = createQueryMock([[]]);

    const result = await consultarAtualizacoesProdutoPorPeriodo(
      { produtoNome: "produto inexistente", dias: 2 },
      { query: db.query, now: new Date("2026-05-03T12:00:00.000Z") },
    );

    assert.equal(result.status, "product_not_found");
    assert.equal(db.calls.length, 1);
  });

  it("lists schools that have any positive stock", async () => {
    const db = createQueryMock([
      [
        {
          escola_id: 1,
          escola_nome: "EMEF Centro",
          produtos_com_estoque: "2",
          saldo_total_itens: "37.5",
          ultima_atualizacao: "2026-05-03T08:30:00.000Z",
        },
        {
          escola_id: 3,
          escola_nome: "EMEF Sul",
          produtos_com_estoque: "1",
          saldo_total_itens: "9",
          ultima_atualizacao: "2026-05-01T10:00:00.000Z",
        },
      ],
    ]);

    const result = await consultarEscolasComEstoque({ query: db.query });

    assert.equal(result.status, "ok");
    assert.equal(result.totalEscolasComEstoque, 2);
    assert.deepEqual(result.escolas.map((item) => item.escolaNome), ["EMEF Centro", "EMEF Sul"]);
    assert.equal(result.escolas[0].produtosComEstoque, 2);
    assert.equal(result.escolas[0].saldoTotalItens, 37.5);
    assert.match(db.calls[0].sql, /HAVING SUM\(ee\.quantidade_delta\) > 0/);
  });

  it("returns current product stock for a school", async () => {
    const db = createQueryMock([
      [{ id: 10, nome: "Arroz branco", unidade: "KG" }],
      [{ id: 4, nome: "EMEF Madre Paulina Fiore" }],
      [
        {
          saldo_atual: "42.5",
          ultima_atualizacao: "2026-05-03T08:30:00.000Z",
          ultimo_tipo_evento: "entrada_manual_escola",
          ultimo_usuario_nome: "Ana",
          ultima_quantidade_movimentada: "12.5",
        },
      ],
    ]);

    const result = await consultarEstoqueProdutoNaEscola(
      { produtoNome: "arroz", escolaNome: "fiore" },
      { query: db.query },
    );

    assert.equal(result.status, "ok");
    assert.equal(result.produto?.nome, "Arroz branco");
    assert.equal(result.escola?.nome, "EMEF Madre Paulina Fiore");
    assert.equal(result.saldoAtual, 42.5);
    assert.equal(result.ultimaAtualizacao, "2026-05-03T08:30:00.000Z");
    assert.equal(db.calls[2].params[0], 10);
    assert.equal(db.calls[2].params[1], 4);
  });

  it("builds operational stock context for the LLM", async () => {
    const db = createQueryMock([
      [{ id: 10, nome: "Arroz branco", unidade: "KG" }],
      [
        { id: 1, nome: "EMEF Centro" },
        { id: 2, nome: "EMEF Norte" },
      ],
      [
        {
          escola_id: 1,
          escola_nome: "EMEF Centro",
          ultima_atualizacao: "2026-05-03T08:30:00.000Z",
          usuario_nome: "Ana",
          tipo_evento: "ajuste_estoque",
          quantidade_movimentada: "5",
          saldo_atual: "15",
        },
      ],
    ]);

    const result = await construirContextoOperacionalEstoque(
      {
        termosProdutos: ["arroz branco"],
        periodoDias: 2,
      },
      { query: db.query, now: new Date("2026-05-03T12:00:00.000Z") },
    );

    assert.equal(result.tipo, "estoque");
    assert.deepEqual(result.filtros.termosProdutos, ["arroz branco"]);
    assert.equal(result.periodo.inicio, "2026-05-01T12:00:00.000Z");
    assert.equal(result.produtoSelecionado?.nome, "Arroz branco");
    assert.deepEqual(result.escolasComEstoque, []);
    assert.deepEqual(result.escolasAtualizadas.map((item) => item.escolaNome), ["EMEF Centro"]);
    assert.deepEqual(result.escolasPendentes.map((item) => item.escolaNome), ["EMEF Norte"]);
  });

  it("builds current school stock context for product-only availability questions", async () => {
    const db = createQueryMock([
      [{ id: 20, nome: "Banana prata", unidade: "KG" }],
      [
        {
          escola_id: 1,
          escola_nome: "EMEF Centro",
          saldo_atual: "12.5",
          ultima_atualizacao: "2026-05-03T08:30:00.000Z",
        },
        {
          escola_id: 3,
          escola_nome: "EEEF Canutama",
          saldo_atual: "4",
          ultima_atualizacao: "2026-05-02T10:00:00.000Z",
        },
      ],
    ]);

    const result = await construirContextoOperacionalEstoque(
      {
        termosProdutos: ["banana"],
        pergunta: "qual escola possui banana no estoque",
      },
      { query: db.query, now: new Date("2026-05-03T12:00:00.000Z") },
    );

    assert.equal(result.produtoSelecionado?.nome, "Banana prata");
    assert.deepEqual(result.escolasComProdutoEmEstoque.map((item) => item.escolaNome), ["EMEF Centro", "EEEF Canutama"]);
    assert.equal(result.escolasComProdutoEmEstoque[0].saldoAtual, 12.5);
    assert.deepEqual(result.escolasAtualizadas, []);
    assert.deepEqual(result.escolasPendentes, []);
    assert.match(db.calls[1].sql, /HAVING SUM\(ee\.quantidade_delta\) > 0/);
    assert.equal(db.calls[1].params[0], 20);
  });

  it("builds compact context for a product stock at school question", async () => {
    const db = createQueryMock([
      [{ id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" }],
      [{ id: 4, nome: "EMEF Bertila" }],
      [{ id: 10, nome: "Arroz Polido Tipo 1", unidade: "KG" }],
      [{ id: 4, nome: "EMEF Bertila" }],
      [
        {
          saldo_atual: "42.5",
          ultima_atualizacao: "2026-05-03T08:30:00.000Z",
          ultimo_tipo_evento: "entrada_manual_escola",
          ultimo_usuario_nome: "Ana",
          ultima_quantidade_movimentada: "12.5",
        },
      ],
    ]);

    const result = await construirContextoOperacionalEstoque(
      {
        termosProdutos: ["arroz polido"],
        termosEscolas: ["bertilla"],
      },
      { query: db.query, now: new Date("2026-05-03T12:00:00.000Z") },
    );

    assert.equal(result.saldoNaEscola?.status, "ok");
    assert.equal(result.saldoNaEscola?.produto?.nome, "Arroz Polido Tipo 1");
    assert.equal(result.saldoNaEscola?.escola?.nome, "EMEF Bertila");
    assert.equal(result.saldoNaEscola?.saldoAtual, 42.5);
    assert.deepEqual(result.escolasComEstoque, []);
    assert.deepEqual(result.escolasAtualizadas, []);
    assert.deepEqual(result.escolasPendentes, []);
    assert.equal(db.calls.some((call) => call.sql.includes("HAVING SUM(ee.quantidade_delta) > 0")), false);
    assert.equal(db.calls.some((call) => call.sql.includes("eventos_periodo")), false);
  });
});
