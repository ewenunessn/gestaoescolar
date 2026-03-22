/// <reference types="vite/client" />
import { apiWithRetry } from "./api";
import { config } from "../config/config";

export async function login(email: string, password: string) {
  try {
    console.log("🔐 Tentando login...");
    const loginData: any = {
      email,
      senha: password,
    };
    
    const { data } = await apiWithRetry.post("/auth/login", loginData);
    console.log("✅ Login realizado com sucesso");
    
    const result = data.data || data;
    
    return result;
  } catch (err) {
    console.error("❌ Login falhou:", err);
    throw err;
  }
}

export async function register(user: {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
}) {
  try {
    console.log("👤 Tentando registro...");
    const { data } = await apiWithRetry.post("/auth/register", user);
    console.log("✅ Registro realizado com sucesso");
    return data.data || data; // Handle both new format {success, data} and old format
  } catch (err) {
    console.error("❌ Registro falhou:", err);
    throw err;
  }
}

export function isAuthenticated(): boolean {
  const token = localStorage.getItem("token");
  return !!token;
}

export function logout() {
  console.log("🚪 Fazendo logout...");
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
    console.log("❌ Token inválido ou expirado");
    logout();
    return false;
  }
}
