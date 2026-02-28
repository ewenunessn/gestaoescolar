import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'https://gestaoescolar-backend.vercel.app'

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

export function setAuth(token?: string) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export function handleAxiosError(e: any): string {
  if (e.response?.data?.message) return e.response.data.message
  if (e.response?.data?.error) return e.response.data.error
  return e.message || 'Erro desconhecido'
}

// Inicializar com token salvo (se existir)
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null
if (stored) {
  try {
    const parsed = JSON.parse(stored)
    if (parsed?.token) setAuth(parsed.token)
  } catch {
    // token simples
    setAuth(stored || undefined)
  }
}
