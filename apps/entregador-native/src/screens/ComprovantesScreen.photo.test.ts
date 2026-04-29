import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "apps/entregador-native/src/screens/ComprovantesScreen.tsx"),
  "utf8",
);

test("comprovantes screen loads and renders merchandise photo read urls", () => {
  assert.match(source, /obterFotoComprovante/);
  assert.match(source, /fotoUrls/);
  assert.match(source, /carregarFotoComprovante/);
  assert.match(source, /Foto da mercadoria/);
  assert.match(source, /styles\.fotoMercadoria/);
});
