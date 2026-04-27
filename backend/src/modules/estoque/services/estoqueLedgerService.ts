import type { PoolClient } from "pg";

import db from "../../../database";

export type StockScope = "central" | "escola";
export type StockEventOrigin =
  | "recebimento"
  | "transferencia"
  | "portal_escola"
  | "central_operador"
  | "sistema"
  | "estorno";

export type StockEventType =
  | "recebimento_central"
  | "transferencia_para_escola"
  | "entrada_manual_escola"
  | "saida_central"
  | "saida_escola"
  | "ajuste_estoque"
  | "estorno_evento";

export interface StockEventInput {
  tenant_id?: string | null;
  escopo: StockScope;
  escola_id?: number;
  produto_id: number;
  lote_id?: number;
  tipo_evento: StockEventType;
  origem: StockEventOrigin;
  quantidade_delta: number;
  quantidade_absoluta?: number;
  motivo?: string;
  observacao?: string;
  referencia_tipo?: string;
  referencia_id?: number;
  usuario_id?: number;
  usuario_nome_snapshot?: string;
  data_evento?: string;
  evento_estornado_id?: number;
}

export interface StockEventRow extends StockEventInput {
  id: number;
  created_at: string;
}

export interface BuildSchoolMovementInput {
  escolaId: number;
  produtoId: number;
  tipoMovimentacao: "entrada" | "saida" | "ajuste";
  quantidade: number;
  origem: Extract<StockEventOrigin, "portal_escola" | "central_operador">;
  motivo?: string;
  observacao?: string;
  usuario_id?: number;
  usuario_nome_snapshot?: string;
  tenant_id?: string | null;
}

export interface BuildCentralMovementInput {
  produtoId: number;
  tipoMovimentacao: "entrada" | "saida" | "ajuste";
  quantidade: number;
  origem?: Extract<StockEventOrigin, "recebimento" | "central_operador" | "sistema">;
  motivo?: string;
  observacao?: string;
  referencia_tipo?: string;
  referencia_id?: number;
  usuario_id?: number;
  usuario_nome_snapshot?: string;
  tenant_id?: string | null;
}

export interface RegisterTransferInput {
  escola_id: number;
  produto_id: number;
  quantidade: number;
  motivo?: string;
  observacao?: string;
  referencia_tipo?: string;
  referencia_id?: number;
  usuario_id?: number;
  usuario_nome_snapshot?: string;
  tenant_id?: string | null;
}

export interface RegisterTransferResult {
  central_evento: StockEventRow;
  escola_evento: StockEventRow;
}

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalNumber(value?: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function applyStockEvents(events: Array<{ quantidade_delta: number }>): number {
  return events.reduce((acc, event) => acc + Number(event.quantidade_delta || 0), 0);
}

export function validateStockDelta(input: {
  saldoAtual: number;
  quantidadeDelta: number;
}): void {
  if (!Number.isFinite(input.quantidadeDelta) || input.quantidadeDelta === 0) {
    throw new Error("Quantidade invalida para a movimentacao");
  }

  if (input.saldoAtual + input.quantidadeDelta < 0) {
    throw new Error("Saldo insuficiente para a movimentacao");
  }
}

export function buildEstornoEvent(
  event: Omit<StockEventInput, "quantidade_absoluta"> & { id: number },
): StockEventInput {
  return {
    tenant_id: event.tenant_id ?? null,
    escopo: event.escopo,
    escola_id: event.escola_id,
    produto_id: event.produto_id,
    lote_id: event.lote_id,
    tipo_evento: "estorno_evento",
    origem: "estorno",
    quantidade_delta: Number(event.quantidade_delta) * -1,
    motivo: `Estorno do evento ${event.id}${event.motivo ? `: ${event.motivo}` : ""}`,
    observacao: event.observacao,
    referencia_tipo: event.referencia_tipo ?? "estoque_eventos",
    referencia_id: event.referencia_id ?? event.id,
    usuario_id: event.usuario_id,
    usuario_nome_snapshot: event.usuario_nome_snapshot,
    evento_estornado_id: event.id,
  };
}

export function buildSchoolMovementEvent(
  input: BuildSchoolMovementInput,
): StockEventInput {
  if (!Number.isFinite(input.quantidade) || input.quantidade <= 0) {
    throw new Error("Quantidade invalida para a movimentacao");
  }

  if (input.tipoMovimentacao === "entrada") {
    return {
      tenant_id: input.tenant_id ?? null,
      escopo: "escola",
      escola_id: input.escolaId,
      produto_id: input.produtoId,
      tipo_evento: "entrada_manual_escola",
      origem: input.origem,
      quantidade_delta: input.quantidade,
      motivo: input.motivo,
      observacao: input.observacao,
      usuario_id: input.usuario_id,
      usuario_nome_snapshot: input.usuario_nome_snapshot,
    };
  }

  if (input.tipoMovimentacao === "saida") {
    return {
      tenant_id: input.tenant_id ?? null,
      escopo: "escola",
      escola_id: input.escolaId,
      produto_id: input.produtoId,
      tipo_evento: "saida_escola",
      origem: input.origem,
      quantidade_delta: input.quantidade * -1,
      motivo: input.motivo,
      observacao: input.observacao,
      usuario_id: input.usuario_id,
      usuario_nome_snapshot: input.usuario_nome_snapshot,
    };
  }

  return {
    tenant_id: input.tenant_id ?? null,
    escopo: "escola",
    escola_id: input.escolaId,
    produto_id: input.produtoId,
    tipo_evento: "ajuste_estoque",
    origem: input.origem,
    quantidade_delta: 0,
    quantidade_absoluta: input.quantidade,
    motivo: input.motivo,
    observacao: input.observacao,
    usuario_id: input.usuario_id,
    usuario_nome_snapshot: input.usuario_nome_snapshot,
  };
}

export function buildCentralMovementEvent(
  input: BuildCentralMovementInput,
): StockEventInput {
  if (!Number.isFinite(input.quantidade) || input.quantidade <= 0) {
    throw new Error("Quantidade invalida para a movimentacao");
  }

  const origem = input.origem ?? "central_operador";

  if (input.tipoMovimentacao === "entrada") {
    return {
      tenant_id: input.tenant_id ?? null,
      escopo: "central",
      produto_id: input.produtoId,
      tipo_evento: "recebimento_central",
      origem,
      quantidade_delta: input.quantidade,
      motivo: input.motivo,
      observacao: input.observacao,
      referencia_tipo: input.referencia_tipo,
      referencia_id: input.referencia_id,
      usuario_id: input.usuario_id,
      usuario_nome_snapshot: input.usuario_nome_snapshot,
    };
  }

  if (input.tipoMovimentacao === "saida") {
    return {
      tenant_id: input.tenant_id ?? null,
      escopo: "central",
      produto_id: input.produtoId,
      tipo_evento: "saida_central",
      origem,
      quantidade_delta: input.quantidade * -1,
      motivo: input.motivo,
      observacao: input.observacao,
      referencia_tipo: input.referencia_tipo,
      referencia_id: input.referencia_id,
      usuario_id: input.usuario_id,
      usuario_nome_snapshot: input.usuario_nome_snapshot,
    };
  }

  return {
    tenant_id: input.tenant_id ?? null,
    escopo: "central",
    produto_id: input.produtoId,
    tipo_evento: "ajuste_estoque",
    origem,
    quantidade_delta: 0,
    quantidade_absoluta: input.quantidade,
    motivo: input.motivo,
    observacao: input.observacao,
    referencia_tipo: input.referencia_tipo,
    referencia_id: input.referencia_id,
    usuario_id: input.usuario_id,
    usuario_nome_snapshot: input.usuario_nome_snapshot,
  };
}

function mapStockEventRow(row: any): StockEventRow {
  return {
    id: Number(row.id),
    tenant_id: row.tenant_id ?? null,
    escopo: row.escopo,
    escola_id: row.escola_id ? Number(row.escola_id) : undefined,
    produto_id: Number(row.produto_id),
    lote_id: row.lote_id ? Number(row.lote_id) : undefined,
    tipo_evento: row.tipo_evento,
    origem: row.origem,
    quantidade_delta: Number(row.quantidade_delta),
    quantidade_absoluta:
      row.quantidade_absoluta !== null && row.quantidade_absoluta !== undefined
        ? Number(row.quantidade_absoluta)
        : undefined,
    motivo: row.motivo ?? undefined,
    observacao: row.observacao ?? undefined,
    referencia_tipo: row.referencia_tipo ?? undefined,
    referencia_id: row.referencia_id ? Number(row.referencia_id) : undefined,
    usuario_id: row.usuario_id ? Number(row.usuario_id) : undefined,
    usuario_nome_snapshot: row.usuario_nome_snapshot ?? undefined,
    data_evento: row.data_evento,
    evento_estornado_id: row.evento_estornado_id
      ? Number(row.evento_estornado_id)
      : undefined,
    created_at: row.created_at,
  };
}

class EstoqueLedgerService {
  async appendEvent(input: StockEventInput): Promise<StockEventRow> {
    return db.transaction(async (client) => this.appendEventWithClient(client, input));
  }

  async appendEventWithClient(
    client: PoolClient,
    input: StockEventInput,
  ): Promise<StockEventRow> {
    const result = await client.query(
      `
        INSERT INTO estoque_eventos (
          tenant_id,
          escopo,
          escola_id,
          produto_id,
          lote_id,
          tipo_evento,
          origem,
          quantidade_delta,
          quantidade_absoluta,
          motivo,
          observacao,
          referencia_tipo,
          referencia_id,
          usuario_id,
          usuario_nome_snapshot,
          data_evento,
          evento_estornado_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          COALESCE($16::timestamp, CURRENT_TIMESTAMP),
          $17
        )
        RETURNING *
      `,
      [
        input.tenant_id ?? null,
        input.escopo,
        normalizeOptionalNumber(input.escola_id),
        input.produto_id,
        normalizeOptionalNumber(input.lote_id),
        input.tipo_evento,
        input.origem,
        Number(input.quantidade_delta),
        normalizeOptionalNumber(input.quantidade_absoluta),
        normalizeOptionalText(input.motivo),
        normalizeOptionalText(input.observacao),
        normalizeOptionalText(input.referencia_tipo),
        normalizeOptionalNumber(input.referencia_id),
        normalizeOptionalNumber(input.usuario_id),
        normalizeOptionalText(input.usuario_nome_snapshot),
        input.data_evento ?? null,
        normalizeOptionalNumber(input.evento_estornado_id),
      ],
    );

    return mapStockEventRow(result.rows[0]);
  }

  async listEventsByScope(scope: StockScope, escolaId?: number): Promise<StockEventRow[]> {
    const result = await db.query(
      `
        SELECT *
        FROM estoque_eventos
        WHERE escopo = $1
          AND ($2::integer IS NULL OR escola_id = $2)
        ORDER BY data_evento DESC, id DESC
      `,
      [scope, escolaId ?? null],
    );

    return result.rows.map(mapStockEventRow);
  }

  async getCurrentBalance(
    scope: StockScope,
    produtoId: number,
    escolaId?: number,
  ): Promise<number> {
    return db.transaction(async (client) =>
      this.getCurrentBalanceWithClient(client, scope, produtoId, escolaId),
    );
  }

  async getCurrentBalanceWithClient(
    client: PoolClient,
    scope: StockScope,
    produtoId: number,
    escolaId?: number,
  ): Promise<number> {
    const result = await client.query(
      `
        SELECT COALESCE(SUM(quantidade_delta), 0) AS saldo
        FROM estoque_eventos
        WHERE escopo = $1
          AND produto_id = $2
          AND ($3::integer IS NULL OR escola_id = $3)
      `,
      [scope, produtoId, escolaId ?? null],
    );

    return Number(result.rows[0]?.saldo ?? 0);
  }

  async registrarMovimentacaoEscolar(
    input: BuildSchoolMovementInput,
  ): Promise<StockEventRow> {
    return db.transaction(async (client) => {
      const saldoAtual = await this.getCurrentBalanceWithClient(
        client,
        "escola",
        input.produtoId,
        input.escolaId,
      );
      const event = buildSchoolMovementEvent(input);

      if (event.tipo_evento === "saida_escola") {
        validateStockDelta({ saldoAtual, quantidadeDelta: event.quantidade_delta });
        return this.appendEventWithClient(client, event);
      }

      if (event.tipo_evento === "ajuste_estoque") {
        const quantidadeAbsoluta = Number(event.quantidade_absoluta ?? 0);
        if (quantidadeAbsoluta < 0) {
          throw new Error("Quantidade invalida para a movimentacao");
        }

        return this.appendEventWithClient(client, {
          ...event,
          quantidade_delta: quantidadeAbsoluta - saldoAtual,
        });
      }

      return this.appendEventWithClient(client, event);
    });
  }

  async registrarMovimentacaoCentral(
    input: BuildCentralMovementInput,
  ): Promise<StockEventRow> {
    return db.transaction(async (client) => {
      const saldoAtual = await this.getCurrentBalanceWithClient(
        client,
        "central",
        input.produtoId,
      );
      const event = buildCentralMovementEvent(input);

      if (event.tipo_evento === "saida_central") {
        validateStockDelta({ saldoAtual, quantidadeDelta: event.quantidade_delta });
        return this.appendEventWithClient(client, event);
      }

      if (event.tipo_evento === "ajuste_estoque") {
        const quantidadeAbsoluta = Number(event.quantidade_absoluta ?? 0);
        if (quantidadeAbsoluta < 0) {
          throw new Error("Quantidade invalida para a movimentacao");
        }

        return this.appendEventWithClient(client, {
          ...event,
          quantidade_delta: quantidadeAbsoluta - saldoAtual,
        });
      }

      return this.appendEventWithClient(client, event);
    });
  }

  async registrarTransferenciaParaEscola(
    input: RegisterTransferInput,
  ): Promise<RegisterTransferResult> {
    return db.transaction(async (client) =>
      this.registrarTransferenciaParaEscolaWithClient(client, input),
    );
  }

  async registrarTransferenciaParaEscolaWithClient(
    client: PoolClient,
    input: RegisterTransferInput,
  ): Promise<RegisterTransferResult> {
    if (!Number.isFinite(input.quantidade) || input.quantidade <= 0) {
      throw new Error("Quantidade invalida para a movimentacao");
    }

    const saldoCentral = await this.getCurrentBalanceWithClient(
      client,
      "central",
      input.produto_id,
    );
    validateStockDelta({
      saldoAtual: saldoCentral,
      quantidadeDelta: Number(input.quantidade) * -1,
    });

    const central_evento = await this.appendEventWithClient(client, {
      tenant_id: input.tenant_id ?? null,
      escopo: "central",
      escola_id: Number(input.escola_id),
      produto_id: Number(input.produto_id),
      tipo_evento: "transferencia_para_escola",
      origem: "transferencia",
      quantidade_delta: Number(input.quantidade) * -1,
      motivo: input.motivo,
      observacao: input.observacao,
      referencia_tipo: input.referencia_tipo,
      referencia_id: input.referencia_id,
      usuario_id: input.usuario_id,
      usuario_nome_snapshot: input.usuario_nome_snapshot,
    });

    const escola_evento = await this.appendEventWithClient(client, {
      tenant_id: input.tenant_id ?? null,
      escopo: "escola",
      escola_id: Number(input.escola_id),
      produto_id: Number(input.produto_id),
      tipo_evento: "transferencia_para_escola",
      origem: "transferencia",
      quantidade_delta: Number(input.quantidade),
      motivo: input.motivo,
      observacao: input.observacao,
      referencia_tipo: input.referencia_tipo,
      referencia_id: input.referencia_id,
      usuario_id: input.usuario_id,
      usuario_nome_snapshot: input.usuario_nome_snapshot,
    });

    return { central_evento, escola_evento };
  }
}

export default new EstoqueLedgerService();
