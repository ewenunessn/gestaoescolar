import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { ArrowBack, Lock } from '@mui/icons-material';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { useUserRole } from '../hooks/useUserRole';

interface PermissionGuardProps {
  children: React.ReactNode;
  moduloSlug: string;
  minNivel?: number;
  fallbackPath?: string;
}

/**
 * Protege rotas contra acesso direto via URL.
 * Se o usuário não tem permissão, mostra tela de acesso negado.
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  moduloSlug,
  minNivel = 1,
  fallbackPath = '/dashboard',
}) => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { hasPermission, loading } = useUserPermissions();

  // Admin tem acesso total — bypass direto
  if (isAdmin) {
    return <>{children}</>;
  }

  // Enquanto carrega, não mostra nada (evita flash)
  if (loading) return null;

  const allowed = hasPermission(moduloSlug, minNivel);

  if (!allowed) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 2,
          textAlign: 'center',
        }}
      >
        <Lock sx={{ fontSize: 48, color: 'error.main', opacity: 0.6 }} />
        <Typography variant="h5" fontWeight={600}>
          Acesso Restrito
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
          Você não tem permissão para acessar esta área.
          Entre em contato com o administrador do sistema.
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate(fallbackPath)}
          sx={{ mt: 2 }}
        >
          Voltar ao Dashboard
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;
