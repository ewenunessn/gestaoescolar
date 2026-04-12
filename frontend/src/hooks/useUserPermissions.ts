import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from './useCurrentUser';
import api from '../services/api';

export interface UserPermission {
  modulo_slug: string;
  nivel: number;
  origem: string;
}

/**
 * Hook que carrega as permissões granulares do usuário atual.
 * Admin e systemAdmin têm todas as permissões.
 * Sem polling — o backend protege todas as rotas diretamente.
 */
export function useUserPermissions() {
  const { user, loading: loadingUser } = useCurrentUser();
  const [permissions, setPermissions] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (!user) return;

    if (user.tipo === 'admin' || user.isSystemAdmin) {
      setPermissions(new Map());
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/usuarios/me/permissoes`);
      const { permissoes_diretas, permissoes_funcao } = res.data.data;

      const map = new Map<string, number>();
      for (const p of permissoes_funcao) {
        map.set(p.modulo_slug, p.nivel);
      }
      for (const p of permissoes_diretas) {
        map.set(p.modulo_slug, p.nivel);
      }

      setPermissions(map);
    } catch (err) {
      console.error('Erro ao carregar permissões:', err);
      setPermissions(new Map());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback((moduloSlug: string, minNivel: number = 1): boolean => {
    if (user?.tipo === 'admin' || user?.isSystemAdmin) return true;
    return (permissions.get(moduloSlug) ?? 0) >= minNivel;
  }, [user, permissions]);

  const hasLeitura = useCallback((moduloSlug: string) => hasPermission(moduloSlug, 1), [hasPermission]);
  const hasEscrita = useCallback((moduloSlug: string) => hasPermission(moduloSlug, 2), [hasPermission]);
  const hasAdmin = useCallback((moduloSlug: string) => hasPermission(moduloSlug, 3), [hasPermission]);

  return {
    permissions,
    loading: loading || loadingUser,
    hasLeitura,
    hasEscrita,
    hasAdmin,
    hasPermission,
  };
}
