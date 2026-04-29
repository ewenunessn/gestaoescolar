import test from "node:test";
import assert from "node:assert/strict";

import { getDeliveryReviewBlocker } from "./deliveryPhotoReview";

test("blocks delivery review without receiver, driver, or photo", () => {
  assert.equal(
    getDeliveryReviewBlocker({ nomeRecebedor: "", nomeEntregador: "Joao", fotoUri: "file:///foto.jpg" }),
    "Informe o nome de quem recebeu a entrega",
  );
  assert.equal(
    getDeliveryReviewBlocker({ nomeRecebedor: "Maria", nomeEntregador: "", fotoUri: "file:///foto.jpg" }),
    "Informe o nome de quem entregou",
  );
  assert.equal(
    getDeliveryReviewBlocker({ nomeRecebedor: "Maria", nomeEntregador: "Joao", fotoUri: "" }),
    "Informe uma foto da mercadoria entregue",
  );
});

test("allows delivery review when required fields are present", () => {
  assert.equal(
    getDeliveryReviewBlocker({
      nomeRecebedor: "Maria",
      nomeEntregador: "Joao",
      fotoUri: "file:///foto.jpg",
    }),
    null,
  );
});
