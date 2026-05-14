const CONFIG_KEY = "gestaoescolar-go-config";
const AUTH_KEY = "gestaoescolar-go-auth";

export type GoConfig = {
  baseUrl: string;
  tenantId: string;
  setupToken: string;
};

export type AuthState = {
  accessToken: string;
  refreshToken: string;
  user: { id: number; name: string; email: string };
  tenant: { id: string; name: string; slug: string };
  membership: { role: string; status: string };
  schools?: SchoolAccess[];
};

export type SchoolAccess = {
  schoolId: number;
  schoolName?: string;
  role: string;
};

export type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string; fields?: Record<string, string> };
};

export const defaultConfig = (): GoConfig => ({
  baseUrl: import.meta.env.VITE_GO_API_URL || "/api/v1",
  tenantId: "",
  setupToken: import.meta.env.VITE_SETUP_TOKEN || "dev-setup-token",
});

export function loadConfig(): GoConfig {
  try {
    return { ...defaultConfig(), ...JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}") };
  } catch {
    return defaultConfig();
  }
}

export function saveConfig(config: GoConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadAuth(): AuthState | null {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null") as AuthState | null;
  } catch {
    return null;
  }
}

export function saveAuth(auth: AuthState | null) {
  if (!auth) {
    localStorage.removeItem(AUTH_KEY);
    return;
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;

  constructor(message: string, status: number, code?: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export class GoApi {
  constructor(
    private getConfig: () => GoConfig,
    private getAuth: () => AuthState | null,
  ) {}

  async get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>("POST", path, body, headers);
  }

  async put<T>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }

  async delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }

  private async request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) {
    const config = this.getConfig();
    const auth = this.getAuth();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...extraHeaders,
    };
    if (config.tenantId) headers["X-Tenant-ID"] = config.tenantId;
    if (auth?.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;

    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (!response.ok) {
      const message = payload.error?.fields
        ? Object.values(payload.error.fields).join("; ")
        : payload.error?.code === "auth_conflict"
          ? "Essa prefeitura, slug ou convite ja existe. Use outro slug ou entre com o usuario ja criado."
          : payload.error?.code === "invalid_token"
            ? "Token invalido ou expirado. Use o token de convite gerado ao criar a prefeitura, nao o setup token."
            : payload.error?.message || `Erro HTTP ${response.status}`;
      throw new ApiError(message, response.status, payload.error?.code, payload.error?.fields);
    }
    return payload.data;
  }
}

export function toIdList(value: string) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

export function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
