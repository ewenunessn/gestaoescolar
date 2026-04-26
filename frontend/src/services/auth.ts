/// <reference types="vite/client" />
import { apiWithRetry } from "./api";

type LogoutOptions = {
  redirect?: boolean;
};

const AUTH_STORAGE_KEYS = ["token", "user", "perfil", "nome"] as const;

export async function login(email: string, password: string) {
  try {
    const loginData: any = {
      email,
      senha: password,
    };

    const { data } = await apiWithRetry.post("/auth/login", loginData);
    const result = data.data || data;

    return result;
  } catch (err) {
    console.error("Login falhou:", err);
    throw err;
  }
}

export function isAuthenticated(): boolean {
  const token = localStorage.getItem("token");
  return !!token;
}

export function getLoginRedirectTarget(): string {
  return window.desktopShell?.isDesktop ? "#/login" : "/login";
}

export function redirectToLogin(): void {
  const target = getLoginRedirectTarget();

  if (window.desktopShell?.isDesktop) {
    window.location.hash = target;
    return;
  }

  window.location.href = target;
}

export function clearAuthSession(): void {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function notifyAuthChanged(): void {
  window.dispatchEvent(new Event("auth-changed"));
}

export function logout(options: LogoutOptions = {}) {
  const { redirect = true } = options;

  clearAuthSession();
  notifyAuthChanged();

  if (redirect) {
    redirectToLogin();
  }
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export async function validateToken(): Promise<boolean> {
  try {
    const token = getToken();
    if (!token) return false;

    await apiWithRetry.get("/usuarios/me");
    return true;
  } catch (error) {
    logout();
    return false;
  }
}
