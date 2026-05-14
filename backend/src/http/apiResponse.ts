import { NextFunction, Request, Response } from "express";

type PlainObject = Record<string, unknown>;

const INTERNAL_ERROR_MESSAGE = "Erro interno do servidor";
const VALIDATION_ERROR_MESSAGE = "Dados invalidos";

function isPlainObject(value: unknown): value is PlainObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: PlainObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function normalizeApiSuccessPayload(payload: unknown): PlainObject {
  if (Array.isArray(payload)) {
    return {
      success: true,
      data: payload,
    };
  }

  if (!isPlainObject(payload)) {
    return {
      success: true,
      data: payload ?? null,
    };
  }

  if (payload.success === false) {
    return normalizeApiErrorPayload(400, payload);
  }

  if (payload.success === true) {
    return {
      ...payload,
      data: hasOwn(payload, "data") ? payload.data : null,
      success: true,
    };
  }

  if (hasOwn(payload, "data")) {
    return {
      ...payload,
      success: true,
    };
  }

  return {
    success: true,
    data: payload,
  };
}

function inferErrorMessage(payload: unknown, fallback: string): string {
  if (isPlainObject(payload)) {
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  }

  if (typeof payload === "string" && payload.trim()) return payload;
  return fallback;
}

function inferErrorCode(statusCode: number, payload: unknown): string {
  if (isPlainObject(payload)) {
    const nestedError = payload.error;
    if (isPlainObject(nestedError) && typeof nestedError.code === "string") return nestedError.code;
    if (typeof payload.code === "string") return payload.code;
  }

  if (statusCode === 400) return "BAD_REQUEST";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  if (statusCode === 422) return "VALIDATION_ERROR";
  if (statusCode === 429) return "RATE_LIMITED";
  return "HTTP_ERROR";
}

export function normalizeApiErrorPayload(statusCode: number, payload: unknown): PlainObject {
  if (statusCode >= 500) {
    return {
      success: false,
      message: INTERNAL_ERROR_MESSAGE,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: INTERNAL_ERROR_MESSAGE,
      },
    };
  }

  const fallbackMessage = statusCode === 422 ? VALIDATION_ERROR_MESSAGE : "Requisicao invalida";
  const message = inferErrorMessage(payload, fallbackMessage);
  const code = inferErrorCode(statusCode, payload);
  const response: PlainObject = {
    success: false,
    message,
    error: {
      code,
      message,
    },
  };

  if (isPlainObject(payload)) {
    if (hasOwn(payload, "errors")) response.errors = payload.errors;
    if (hasOwn(payload, "fields")) response.fields = payload.fields;
    if (hasOwn(payload, "details")) response.details = payload.details;
  }

  return response;
}

export function apiResponseEnvelope(req: Request, res: Response, next: NextFunction) {
  const shouldNormalize = req.path.startsWith("/api") || req.path.startsWith("/bff");
  const isOpenApiJson = req.path === "/api/openapi.json";

  if (!shouldNormalize || isOpenApiJson) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);

  res.json = ((body?: unknown) => {
    if (res.statusCode === 204) return originalJson(body);

    const isLegacyErrorPayload = res.statusCode < 400 && isPlainObject(body) && body.success === false;
    if (isLegacyErrorPayload) {
      res.status(400);
    }

    const normalizedBody = res.statusCode >= 400
      ? normalizeApiErrorPayload(res.statusCode, body)
      : normalizeApiSuccessPayload(body);

    return originalJson(normalizedBody);
  }) as Response["json"];

  next();
}
