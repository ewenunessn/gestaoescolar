import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calcularAlocacaoAutomatica } from "./alocacaoAgriculturaService";

const modalidades = [
  { id: 1, nome: "AEE", valor_repasse: 0.5 },
  { id: 2, nome: "Creche", valor_repasse: 0.5 },
];

const configBase = {
  ativo: true,
  percentual_agricultura: 45,
  modalidade_base_ids: [1, 2],
  fornecedor_tipos_agricultura: ["cooperativa", "individual"],
  distribuir_excedente: false,
};

describe("calcularAlocacaoAutomatica", () => {
  it("distribui item da agricultura apenas entre bases FNDE proporcionais", () => {
    const resultado = calcularAlocacaoAutomatica({
      config: configBase,
      modalidadesBase: modalidades,
      modalidades,
      itens: [
        {
          pedido_item_id: 10,
          contrato_produto_id: 100,
          produto_nome: "Frango",
          unidade: "KG",
          quantidade_pedido: 100,
          quantidade_disponivel: 100,
          preco_unitario: 10,
          tipo_fornecedor: "cooperativa",
        },
      ],
    });

    assert.deepEqual(
      resultado.itens.map((item) => ({
        modalidade_id: item.modalidade_id,
        quantidade_alocada: item.quantidade_alocada,
      })),
      [
        { modalidade_id: 1, quantidade_alocada: 50 },
        { modalidade_id: 2, quantidade_alocada: 50 },
      ],
    );
    assert.equal(resultado.resumo.quantidade_nao_alocada, 0);
    assert.equal(resultado.regra.percentual_agricultura, 45);
  });

  it("distribui o excedente da agricultura pela proporcao normal quando configurado", () => {
    const resultado = calcularAlocacaoAutomatica({
      config: { ...configBase, distribuir_excedente: true },
      modalidadesBase: modalidades,
      modalidades,
      itens: [
        {
          pedido_item_id: 10,
          contrato_produto_id: 100,
          produto_nome: "Frango",
          unidade: "KG",
          quantidade_pedido: 100,
          quantidade_disponivel: 100,
          preco_unitario: 10,
          tipo_fornecedor: "individual",
        },
      ],
    });

    assert.deepEqual(
      resultado.itens.map((item) => ({
        modalidade_id: item.modalidade_id,
        quantidade_alocada: item.quantidade_alocada,
      })),
      [
        { modalidade_id: 1, quantidade_alocada: 50 },
        { modalidade_id: 2, quantidade_alocada: 50 },
      ],
    );
    assert.equal(resultado.resumo.quantidade_nao_alocada, 0);
  });

  it("mantem fornecedores comuns na distribuicao proporcional por repasse", () => {
    const resultado = calcularAlocacaoAutomatica({
      config: configBase,
      modalidadesBase: modalidades,
      modalidades,
      itens: [
        {
          pedido_item_id: 20,
          contrato_produto_id: 200,
          produto_nome: "Arroz",
          unidade: "KG",
          quantidade_pedido: 80,
          quantidade_disponivel: 80,
          preco_unitario: 5,
          tipo_fornecedor: "empresa",
        },
      ],
    });

    assert.deepEqual(
      resultado.itens.map((item) => item.quantidade_alocada),
      [40, 40],
    );
  });

  it("reduz o peso convencional das bases FNDE pela reserva global da agricultura", () => {
    const resultado = calcularAlocacaoAutomatica({
      config: { ...configBase, percentual_agricultura: 45 },
      modalidadesBase: [
        { id: 1, nome: "Modalidade 1", valor_repasse: 300 },
        { id: 2, nome: "Modalidade 2", valor_repasse: 500 },
      ],
      modalidades: [
        { id: 1, nome: "Modalidade 1", valor_repasse: 300 },
        { id: 2, nome: "Modalidade 2", valor_repasse: 500 },
        { id: 3, nome: "Modalidade 3", valor_repasse: 200 },
      ],
      itens: [
        {
          pedido_item_id: 20,
          contrato_produto_id: 200,
          produto_nome: "Alho",
          unidade: "KG",
          quantidade_pedido: 100,
          quantidade_disponivel: 100,
          preco_unitario: 1,
          tipo_fornecedor: "empresa",
        },
      ],
    });

    assert.deepEqual(resultado.itens.map((item) => item.quantidade_alocada), [23.86, 39.77, 36.37]);
  });

  it("rejeita regra de agricultura ativa sem repasse FNDE valido", () => {
    assert.throws(
      () =>
        calcularAlocacaoAutomatica({
          config: configBase,
          modalidadesBase: [{ id: 3, nome: "FNDE", valor_repasse: 0 }],
          modalidades,
          itens: [],
        }),
      /repasse FNDE/i,
    );
  });

  it("soma os repasses de multiplas modalidades base FNDE antes de dividir a reserva", () => {
    const resultado = calcularAlocacaoAutomatica({
      config: { ...configBase, modalidade_base_ids: [1, 2] },
      modalidadesBase: [
        { id: 1, nome: "Modalidade 1", valor_repasse: 300 },
        { id: 2, nome: "Modalidade 2", valor_repasse: 500 },
      ],
      modalidades: [
        { id: 1, nome: "Modalidade 1", valor_repasse: 300 },
        { id: 2, nome: "Modalidade 2", valor_repasse: 500 },
        { id: 3, nome: "Modalidade 3", valor_repasse: 200 },
      ],
      itens: [
        {
          pedido_item_id: 10,
          contrato_produto_id: 100,
          produto_nome: "Frango",
          unidade: "KG",
          quantidade_pedido: 100,
          quantidade_disponivel: 100,
          preco_unitario: 10,
          tipo_fornecedor: "cooperativa",
        },
      ],
    });

    assert.deepEqual(resultado.itens.map((item) => item.quantidade_alocada), [37.5, 62.5]);
    assert.equal(resultado.resumo.valor_meta_agricultura, 450);
    assert.equal(resultado.resumo.valor_reservado_agricultura, 450);
  });
});
