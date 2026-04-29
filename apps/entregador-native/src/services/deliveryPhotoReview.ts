export interface DeliveryReviewValidationInput {
  nomeRecebedor: string;
  nomeEntregador: string;
  fotoUri?: string | null;
}

export function getDeliveryReviewBlocker(input: DeliveryReviewValidationInput): string | null {
  if (!input.nomeRecebedor.trim()) {
    return "Informe o nome de quem recebeu a entrega";
  }

  if (!input.nomeEntregador.trim()) {
    return "Informe o nome de quem entregou";
  }

  if (!input.fotoUri) {
    return "Informe uma foto da mercadoria entregue";
  }

  return null;
}
