export interface ExistingDeliveryOperation {
  guia_produto_escola_id: number | string;
}

export function buildEntregaIdempotencySchemaSql(): string {
  return `
DO $$
BEGIN
  IF to_regclass('public.historico_entregas') IS NOT NULL THEN
    ALTER TABLE public.historico_entregas
      ADD COLUMN IF NOT EXISTS client_operation_id VARCHAR(100);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_historico_entregas_client_operation_id
      ON public.historico_entregas (client_operation_id)
      WHERE client_operation_id IS NOT NULL;
  END IF;
END $$;
`;
}

export function normalizeClientOperationId(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > 100) {
    throw new Error("client_operation_id deve ter no maximo 100 caracteres");
  }

  return normalized;
}

export function validateExistingOperationMatch(
  existing: ExistingDeliveryOperation,
  itemId: number,
): void {
  if (Number(existing.guia_produto_escola_id) !== Number(itemId)) {
    throw new Error("client_operation_id ja foi usado em outro item de entrega");
  }
}
