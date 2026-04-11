/// <reference types="vite/client" />
import { apiWithRetry } from "./api";

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
    console.error("❌ Login falhou:", err);
    throw err;
  }
}

export function isAuthenticated(): boolean {
  const token = localStorage.getItem("token");
  return !!token;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("perfil");
  localStorage.removeItem("nome");
  window.location.href = "/login";
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

// Função para verificar se o token ainda é válido
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
