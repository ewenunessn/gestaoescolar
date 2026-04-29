import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(process.cwd(), 'apps/entregador-native/src/screens/EscolaDetalheScreen.tsx'),
  'utf8',
);

function getSuccessBlock(): string {
  const start = source.indexOf("if (etapa === 'sucesso')");
  assert.notEqual(start, -1, 'success screen block should exist');

  const end = source.indexOf("if (etapa === 'revisao')", start);
  assert.notEqual(end, -1, 'review screen block should follow success screen block');

  return source.slice(start, end);
}

test('delivery success screen does not expose item count or background sync details', () => {
  const successBlock = getSuccessBlock();

  assert.doesNotMatch(successBlock, /itensSelecionados\.length/);
  assert.doesNotMatch(successBlock, /Entrega salva neste aparelho/);
  assert.doesNotMatch(successBlock, /Sincronizando em segundo plano/);
  assert.doesNotMatch(successBlock, /sincronizada quando voltar online/i);
  assert.match(successBlock, /Entrega confirmada com sucesso/);
});

test('delivered item history does not expose cancellation or reversal action', () => {
  assert.doesNotMatch(source, /cancelarEntregaItem/);
  assert.doesNotMatch(source, /Cancelar\s*\/\s*estornar/i);
  assert.doesNotMatch(source, /onPress=\{\(\) => cancelarEntrega/);
  assert.doesNotMatch(source, /O estoque sera estornado/i);
});

test('delivery review stores a required merchandise photo in comprovante outbox data', () => {
  assert.match(source, /fotoMercadoria/);
  assert.match(source, /Informe uma foto da mercadoria entregue/);
  assert.match(source, /foto_local_uri:\s*fotoMercadoria\.uri/);
  assert.match(source, /foto_content_type:\s*'image\/jpeg'/);
});
