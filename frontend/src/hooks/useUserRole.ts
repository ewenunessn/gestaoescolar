import { useCurrentUser } from './useCurrentUser';

/**
 * Fonte única de verdade para o tipo de usuário.
 *
 * isEscolaUser  → usuário vinculado a uma escola (escola_id presente) e não é admin.
 *                 Acessa apenas o Portal Escola, sem seletor de período nem
 *                 notificações do sistema central.
 *
 * isAdmin       → tipo === 'admin' ou isSystemAdmin === true.
 *                 Acesso total ao sistema.
 */
export function useUserRole() {
  const { user, loading } = useCurrentUser();

  const isAdmin = !!(user?.tipo === 'admin' || user?.isSystemAdmin);
  const isEscolaUser = !!(user?.escola_id && !isAdmin);

  return { user, loading, isAdmin, isEscolaUser };
}
