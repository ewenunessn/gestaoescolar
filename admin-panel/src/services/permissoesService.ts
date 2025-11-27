import api from './api';

export interface Modulo {
  id: number;
  nome: string;
  slug: string;
  descricao: string;
  icone: string;
  ordem: number;
  ativo: boolean;
}

export interface NivelPermissao {
  id: number;
  nome: string;
  slug: string;
  descricao: string;
  nivel: number;
}

export interface PermissaoUsuario {
  id: number;
  usuario_id: number;
  modulo_id: number;
  modulo_nome: string;
  modulo_slug: string;
  modulo_icone: string;
  nivel_permissao_id: number;
  nivel_nome: string;
  nivel_slug: string;
  nivel_valor: number;
}

export interface DefinirPermissaoRequest {
  modulo_id: number;
  nivel_permissao_id: number;
}

class PermissoesService {
  // Listar todos os módulos disponíveis
  async listarModulos(): Promise<Modulo[]> {
    const response = await api.get('/permissoes/modulos');
    return response.data.data;
  }

  // Listar níveis de permissão
  async listarNiveis(): Promise<NivelPermissao[]> {
    const response = await api.get('/permissoes/niveis');
    return response.data.data;
  }

  // Obter permissões de um usuário
  async obterPermissoesUsuario(usuarioId: number): Promise<PermissaoUsuario[]> {
    const response = await api.get(`/permissoes/usuario/${usuarioId}`);
    return response.data.data;
  }

  // Definir permissões de um usuário
  async definirPermissoesUsuario(
    usuarioId: number,
    permissoes: DefinirPermissaoRequest[]
  ): Promise<void> {
    await api.put(`/permissoes/usuario/${usuarioId}`, { permissoes });
  }

  // Verificar se usuário tem permissão em um módulo
  async verificarPermissao(usuarioId: number, moduloSlug: string): Promise<{
    tem_acesso: boolean;
    nivel: number;
    nivel_slug: string;
  }> {
    const response = await api.get(`/permissoes/usuario/${usuarioId}/modulo/${moduloSlug}`);
    return response.data.data;
  }
}

export default new PermissoesService();
