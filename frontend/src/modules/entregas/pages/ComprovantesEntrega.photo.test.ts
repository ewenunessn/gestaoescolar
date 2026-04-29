import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "frontend/src/modules/entregas/pages/ComprovantesEntrega.tsx"),
  "utf8",
);

test("web comprovante details loads and renders merchandise photo read urls", () => {
  assert.match(source, /fotoComprovanteUrl/);
  assert.match(source, /carregarFotoComprovante/);
  assert.match(source, /\/entregas\/comprovantes\/\$\{id\}\/foto/);
  assert.match(source, /Foto da mercadoria/);
  assert.match(source, /alt="Foto da mercadoria entregue"/);
});
