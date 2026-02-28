import { api } from './client'
import { setAuth } from './client'

export async function login(email: string, senha: string) {
  const { data } = await api.post('/api/usuarios/login', { email, senha })
  const token: string = data.token
  if (token) {
    setAuth(token)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', JSON.stringify({ token, nome: data.nome, tipo: data.tipo }))
    }
  }
  return data as { token: string; nome: string; tipo: string; isSystemAdmin?: boolean }
}

export function logout() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('token')
  }
  setAuth(undefined)
}
