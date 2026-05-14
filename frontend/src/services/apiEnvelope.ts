type Envelope = {
  success?: boolean;
  data?: unknown;
  meta?: unknown;
  message?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function defineCompatProperty(target: Record<string, unknown>, key: string, value: unknown) {
  if (hasOwn(target, key)) return;

  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: true,
  });
}

export function adaptApiEnvelopeForLegacyClients<T>(payload: T): T {
  if (!isObject(payload)) return payload;

  const envelope = payload as Envelope;
  if (envelope.success !== true || !hasOwn(payload, "data")) {
    return payload;
  }

  const data = envelope.data;
  if (!isObject(data)) {
    return payload;
  }

  const target = data as Record<string, unknown>;
  defineCompatProperty(target, "success", true);
  defineCompatProperty(target, "data", data);

  if (hasOwn(payload, "meta")) {
    defineCompatProperty(target, "meta", envelope.meta);
  }

  if (hasOwn(payload, "message")) {
    defineCompatProperty(target, "message", envelope.message);
  }

  return target as T;
}
