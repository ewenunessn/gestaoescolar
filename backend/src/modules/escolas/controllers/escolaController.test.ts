import assert from "node:assert/strict";
import { describe, it } from "node:test";

import db from "../../../database";
import { cacheService } from "../../../utils/cacheService";
import { criarEscola, editarEscola, removerEscola } from "./escolaController";

describe("escolaController", { concurrency: false }, () => {
  it("rejects create requests missing required fields before querying the database", async () => {
    const originalQuery = db.query;
    let queried = false;

    (db as any).query = async () => {
      queried = true;
      return { rows: [] };
    };

    try {
      const response = await invoke(criarEscola, {
        body: { nome: "", codigo: "001", municipio: "Limeira" },
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.success, false);
      assert.equal(response.body.message, "Campos obrigatorios ausentes");
      assert.equal(queried, false);
    } finally {
      (db as any).query = originalQuery;
    }
  });

  it("rejects update requests missing required fields before querying the database", async () => {
    const originalQuery = db.query;
    let queried = false;

    (db as any).query = async () => {
      queried = true;
      return { rows: [] };
    };

    try {
      const response = await invoke(editarEscola, {
        params: { id: "10" },
        body: { nome: "EMEF Central", codigo: "", municipio: "Limeira" },
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.success, false);
      assert.equal(response.body.message, "Campos obrigatorios ausentes");
      assert.equal(queried, false);
    } finally {
      (db as any).query = originalQuery;
    }
  });

  it("awaits cache invalidation before returning a create response", async () => {
    const originalQuery = db.query;
    const originalInvalidateEntity = cacheService.invalidateEntity;
    const order: string[] = [];

    (db as any).query = async () => ({
      rows: [{ id: 1, nome: "EMEF Central", codigo: "001", municipio: "Limeira", ativo: true }],
    });

    (cacheService as any).invalidateEntity = async (entityType: string) => {
      assert.equal(entityType, "escolas");
      order.push("invalidate:start");
      await Promise.resolve();
      order.push("invalidate:end");
    };

    try {
      const response = await invoke(criarEscola, {
        body: { nome: "EMEF Central", codigo: "001", municipio: "Limeira" },
        onJson: () => order.push("json"),
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(order, ["invalidate:start", "invalidate:end", "json"]);
    } finally {
      (db as any).query = originalQuery;
      (cacheService as any).invalidateEntity = originalInvalidateEntity;
    }
  });

  it("removes schools with a soft delete", async () => {
    const originalQuery = db.query;
    const originalInvalidateEntity = cacheService.invalidateEntity;
    const calls: Array<{ sql: string; params: unknown[] }> = [];

    (db as any).query = async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: [{ id: 7, nome: "EMEF Central", ativo: false }] };
    };
    (cacheService as any).invalidateEntity = async () => {};

    try {
      const response = await invoke(removerEscola, { params: { id: "7" } });

      assert.equal(response.statusCode, 200);
      assert.match(calls[0].sql, /UPDATE escolas\s+SET\s+ativo = false/i);
      assert.doesNotMatch(calls[0].sql, /DELETE FROM escolas/i);
      assert.deepEqual(calls[0].params, ["7"]);
      assert.equal(response.body.data.ativo, false);
    } finally {
      (db as any).query = originalQuery;
      (cacheService as any).invalidateEntity = originalInvalidateEntity;
    }
  });
});

async function invoke(
  handler: (req: any, res: any) => Promise<any>,
  options: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    onJson?: () => void;
  },
): Promise<{ statusCode: number; body: any }> {
  let statusCode = 200;
  let body: any;

  const req = {
    params: options.params || {},
    body: options.body || {},
  };

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: any) {
      options.onJson?.();
      body = payload;
      return res;
    },
  };

  await handler(req, res);

  return { statusCode, body };
}
