import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calcularSaldoDepoisMovimento,
  ensureContratoSaldoSchema,
  estornarConsumoSaldoFaturamentoItem,
  normalizarDirecaoMovimento,
  obterAvisosTrocaModoSaldo,
  registrarConsumoSaldoFaturamentoItem,
  registrarMovimentoContratoProduto,
  saldoDisponivelContratoProdutoSql,
  validarQuantidadeMovimento,
} from "./contratoSaldoService";

describe("contratoSaldoService ledger rules", () => {
  it("normalizes movement direction from known movement types", () => {
    assert.equal(normalizarDirecaoMovimento("ENTRADA_CONTRATO"), "ENTRADA");
    assert.equal(normalizarDirecaoMovimento("DISTRIBUICAO"), "ENTRADA");
    assert.equal(normalizarDirecaoMovimento("ESTORNO"), "ENTRADA");
    assert.equal(normalizarDirecaoMovimento("SAIDA_CONSUMO"), "SAIDA");
    assert.equal(normalizarDirecaoMovimento("AJUSTE"), "AJUSTE");
  });

  it("rejects zero and negative movement quantities", () => {
    assert.throws(() => validarQuantidadeMovimento(0), {
      message: "Quantidade do movimento deve ser maior que zero",
    });
    assert.throws(() => validarQuantidadeMovimento(-1), {
      message: "Quantidade do movimento deve ser maior que zero",
    });
  });

  it("calculates new balance for entries, exits, reversals, and absolute adjustments", () => {
    assert.equal(calcularSaldoDepoisMovimento({ saldoAtual: 100, quantidade: 30, direcao: "ENTRADA" }), 130);
    assert.equal(calcularSaldoDepoisMovimento({ saldoAtual: 100, quantidade: 30, direcao: "SAIDA" }), 70);
    assert.equal(calcularSaldoDepoisMovimento({ saldoAtual: 100, quantidade: 80, direcao: "AJUSTE" }), 80);
  });

  it("blocks movements that would leave contract balance negative", () => {
    assert.throws(
      () => calcularSaldoDepoisMovimento({ saldoAtual: 20, quantidade: 30, direcao: "SAIDA" }),
      { message: "Saldo insuficiente para o movimento" },
    );
  });
});

describe("contratoSaldoService canonical schema", () => {
  it("creates canonical current balance and immutable ledger tables", async () => {
    const queries: string[] = [];
    const fakeClient = {
      query: async (sql: string) => {
        queries.push(sql);
        return { rows: [] };
      },
    };

    await ensureContratoSaldoSchema(fakeClient);

    const emittedSql = queries.join("\n");
    assert.match(emittedSql, /CREATE TABLE IF NOT EXISTS contrato_produto_saldos/);
    assert.match(emittedSql, /CREATE TABLE IF NOT EXISTS contrato_produto_ledger/);
    assert.match(emittedSql, /UNIQUE \(contrato_produto_id, modalidade_financeira_id\)/);
  });
});

describe("contratoSaldoService canonical configuration helpers", () => {
  it("counts current balances and movements from canonical tables", async () => {
    const queries: string[] = [];
    const fakeClient = {
      query: async (sql: string) => {
        queries.push(sql);
        if (sql.includes("AS saldos_modalidades")) {
          return {
            rows: [{
              saldos_modalidades: 2,
              saldos_itens: 1,
              movimentacoes_modalidades: 4,
              movimentacoes_itens: 3,
            }],
          };
        }
        return { rows: [] };
      },
    };

    const result = await obterAvisosTrocaModoSaldo(fakeClient);
    const emittedSql = queries.join("\n");

    assert.deepEqual(result, {
      saldos_modalidades: 2,
      saldos_itens: 1,
      movimentacoes_modalidades: 4,
      movimentacoes_itens: 3,
    });
    assert.match(emittedSql, /FROM contrato_produto_saldos WHERE modalidade_financeira_id IS NOT NULL/);
    assert.match(emittedSql, /FROM contrato_produto_saldos WHERE modalidade_financeira_id IS NULL/);
    assert.match(emittedSql, /FROM contrato_produto_ledger WHERE modalidade_financeira_id IS NOT NULL/);
  });

  it("uses canonical current balance table in shared available balance SQL", () => {
    const sql = saldoDisponivelContratoProdutoSql("cp", "0");

    assert.match(sql, /FROM contrato_produto_saldos cps/);
    assert.match(sql, /cps\.saldo_atual/);
    assert.match(sql, /cps\.modalidade_financeira_id IS NULL/);
    assert.match(sql, /SUM\(cpm2\.saldo_atual\)/);
    assert.match(sql, /cpm2\.modalidade_financeira_id IS NOT NULL/);
    assert.doesNotMatch(sql, /contrato_produtos_saldos cps/);
    assert.doesNotMatch(sql, /contrato_produtos_modalidades cpm2/);
  });
});

describe("contratoSaldoService canonical movement", () => {
  function createMovementClient(saldoAtual = 100) {
    const calls: { sql: string; params: any[] }[] = [];
    const fakeClient = {
      calls,
      query: async (sql: string, params: any[] = []): Promise<any> => {
        calls.push({ sql, params });
        if (sql.includes("FROM contrato_produtos cp")) {
          return {
            rows: [{
              id: 10,
              quantidade_contratada: "100",
              contrato_status: "ativo",
              contrato_ativo: true,
              data_inicio: "2026-01-01",
              data_fim: "2026-12-31",
            }],
          };
        }
        if (sql.includes("FROM contrato_produto_saldos")) {
          return {
            rows: [{
              id: 77,
              contrato_produto_id: 10,
              modalidade_financeira_id: null,
              saldo_inicial: "100",
              saldo_atual: String(saldoAtual),
              quantidade_consumida: String(100 - saldoAtual),
            }],
          };
        }
        if (sql.includes("INSERT INTO contrato_produto_ledger")) {
          return { rows: [{ id: 123 }] };
        }
        if (sql.includes("UPDATE contrato_produto_saldos")) {
          return { rows: [{ id: 77, saldo_atual: params[0], quantidade_consumida: params[1] }] };
        }
        return { rows: [] };
      },
    };
    return fakeClient;
  }

  it("registers outgoing consumption as immutable ledger and updates current balance", async () => {
    const fakeClient = createMovementClient(100);

    const result = await registrarMovimentoContratoProduto(fakeClient, {
      contratoProdutoId: 10,
      tipoMovimento: "SAIDA_CONSUMO",
      quantidade: 25,
      descricao: "Consumo de faturamento",
      origemTipo: "faturamento_item",
      origemId: 55,
      criadoPor: 9,
    });

    assert.equal(result.ledgerId, 123);
    assert.equal(result.saldoAntes, 100);
    assert.equal(result.saldoDepois, 75);
    assert.match(fakeClient.calls.map((call) => call.sql).join("\n"), /FOR UPDATE/);

    const ledgerCall = fakeClient.calls.find((call) => call.sql.includes("INSERT INTO contrato_produto_ledger"));
    assert.ok(ledgerCall);
    assert.deepEqual(ledgerCall.params.slice(0, 8), [
      10,
      null,
      "SAIDA_CONSUMO",
      "SAIDA",
      25,
      100,
      75,
      "Consumo de faturamento",
    ]);

    const updateCall = fakeClient.calls.find((call) => call.sql.includes("UPDATE contrato_produto_saldos"));
    assert.ok(updateCall);
    assert.equal(updateCall.params[0], 75);
    assert.equal(updateCall.params[1], 25);
  });

  it("registers absolute adjustment with explicit final balance and preserved consumption", async () => {
    const fakeClient = createMovementClient(80);

    const result = await registrarMovimentoContratoProduto(fakeClient, {
      contratoProdutoId: 10,
      tipoMovimento: "AJUSTE",
      quantidade: 20,
      saldoDepois: 60,
      descricao: "Ajuste de saldo inicial",
    });

    assert.equal(result.saldoAntes, 80);
    assert.equal(result.saldoDepois, 60);

    const ledgerCall = fakeClient.calls.find((call) => call.sql.includes("INSERT INTO contrato_produto_ledger"));
    assert.ok(ledgerCall);
    assert.deepEqual(ledgerCall.params.slice(0, 8), [
      10,
      null,
      "AJUSTE",
      "AJUSTE",
      20,
      80,
      60,
      "Ajuste de saldo inicial",
    ]);

    const updateCall = fakeClient.calls.find((call) => call.sql.includes("UPDATE contrato_produto_saldos"));
    assert.ok(updateCall);
    assert.equal(updateCall.params[0], 60);
    assert.equal(updateCall.params[1], 20);
  });

  it("rejects outgoing movement above available balance without inserting ledger", async () => {
    const fakeClient = createMovementClient(20);

    await assert.rejects(
      () => registrarMovimentoContratoProduto(fakeClient, {
        contratoProdutoId: 10,
        tipoMovimento: "SAIDA_CONSUMO",
        quantidade: 30,
      }),
      { message: "Saldo insuficiente para o movimento" },
    );

    assert.equal(fakeClient.calls.some((call) => call.sql.includes("INSERT INTO contrato_produto_ledger")), false);
    assert.equal(fakeClient.calls.some((call) => call.sql.includes("UPDATE contrato_produto_saldos")), false);
  });

  it("registers faturamento consumption through canonical ledger", async () => {
    const fakeClient = createMovementClient(100);
    const originalQuery = fakeClient.query;
    fakeClient.query = async (sql: string, params: any[] = []) => {
      fakeClient.calls.push({ sql, params });
      if (sql.includes("FROM faturamentos_itens fi")) {
        return {
          rows: [{
            id: 55,
            faturamento_pedido_id: 7,
            pedido_item_id: 88,
            modalidade_id: 3,
            quantidade_alocada: "25",
            consumo_registrado: false,
            saldo_consumo_modo: null,
            saldo_consumo_ref_id: null,
            contrato_produto_id: 10,
            produto_nome: "Arroz",
          }],
        };
      }
      if (sql.includes("SELECT valor FROM configuracoes_sistema")) {
        return { rows: [{ valor: JSON.stringify({ modulo_principal: "contratos", mostrar_ambos: false }) }] };
      }
      return originalQuery(sql, params);
    };

    const result = await registrarConsumoSaldoFaturamentoItem(fakeClient, {
      faturamentoId: 7,
      itemId: 55,
      usuarioId: 9,
    });

    assert.equal(result.changed, true);
    assert.equal(result.modo, "contratos");
    assert.equal(result.movimentoId, 123);
    assert.equal(fakeClient.calls.some((call) => call.sql.includes("INSERT INTO contrato_produto_ledger")), true);
    assert.equal(fakeClient.calls.some((call) => /INSERT INTO\s+contrato_produtos_saldos_historico/.test(call.sql)), false);
  });

  it("reverts faturamento consumption with reverse ledger movement instead of deleting history", async () => {
    const fakeClient = createMovementClient(75);
    const originalQuery = fakeClient.query;
    fakeClient.query = async (sql: string, params: any[] = []) => {
      fakeClient.calls.push({ sql, params });
      if (sql.includes("FROM faturamentos_itens fi")) {
        return {
          rows: [{
            id: 55,
            faturamento_pedido_id: 7,
            pedido_item_id: 88,
            modalidade_id: 3,
            quantidade_alocada: "25",
            consumo_registrado: true,
            saldo_consumo_modo: "contratos",
            saldo_consumo_ref_id: 123,
            contrato_produto_id: 10,
            produto_nome: "Arroz",
          }],
        };
      }
      if (sql.includes("FROM contrato_produto_ledger")) {
        return {
          rows: [{
            id: 123,
            contrato_produto_id: 10,
            modalidade_financeira_id: null,
            quantidade: "25",
            tipo_movimento: "SAIDA_CONSUMO",
          }],
        };
      }
      return originalQuery(sql, params);
    };

    const result = await estornarConsumoSaldoFaturamentoItem(fakeClient, {
      faturamentoId: 7,
      itemId: 55,
    });

    assert.equal(result.changed, true);
    const ledgerCall = fakeClient.calls.find((call) =>
      call.sql.includes("INSERT INTO contrato_produto_ledger") && call.params[2] === "ESTORNO"
    );
    assert.ok(ledgerCall);
    assert.equal(ledgerCall.params[10], 123);
    assert.equal(fakeClient.calls.some((call) => call.sql.includes("DELETE FROM")), false);
  });
});
