import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validarAdicaoRefeicaoDia } from "./cardapioController";

describe("validarAdicaoRefeicaoDia", () => {
  const cardapio = { ano: 2026, mes: 2 };

  it("rejects meal without products", () => {
    assert.equal(
      validarAdicaoRefeicaoDia({
        cardapio,
        refeicao: { ativo: true },
        produtoStats: { total_produtos: 0, total_produtos_com_per_capita: 0 },
        dia: 2,
      }),
      "A preparacao selecionada nao possui produtos cadastrados.",
    );
  });

  it("rejects inactive meal", () => {
    assert.equal(
      validarAdicaoRefeicaoDia({
        cardapio,
        refeicao: { ativo: false },
        produtoStats: { total_produtos: 1, total_produtos_com_per_capita: 1 },
        dia: 2,
      }),
      "A preparacao selecionada esta inativa.",
    );
  });

  it("rejects invalid day for menu month", () => {
    assert.equal(
      validarAdicaoRefeicaoDia({
        cardapio,
        refeicao: { ativo: true },
        produtoStats: { total_produtos: 1, total_produtos_com_per_capita: 1 },
        dia: 30,
      }),
      "Dia invalido para o mes do cardapio.",
    );
  });

  it("rejects sunday", () => {
    assert.equal(
      validarAdicaoRefeicaoDia({
        cardapio: { ano: 2026, mes: 5 },
        refeicao: { ativo: true },
        produtoStats: { total_produtos: 1, total_produtos_com_per_capita: 1 },
        dia: 3,
      }),
      "Nao e permitido adicionar refeicoes aos domingos.",
    );
  });

  it("accepts active meal with products and positive per capita on a valid non-sunday", () => {
    assert.equal(
      validarAdicaoRefeicaoDia({
        cardapio,
        refeicao: { ativo: true },
        produtoStats: { total_produtos: 1, total_produtos_com_per_capita: 1 },
        dia: 2,
      }),
      null,
    );
  });
});
