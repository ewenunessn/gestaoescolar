import React from 'react';
import { Box, Typography, Avatar, Skeleton } from '@mui/material';
import { useInstituicao } from '../hooks/useInstituicao';

interface InstituicaoInfoProps {
  showLogo?: boolean;
  showContact?: boolean;
  variant?: 'full' | 'compact' | 'minimal';
}

const InstituicaoInfo: React.FC<InstituicaoInfoProps> = ({ 
  showLogo = true, 
  showContact = false, 
  variant = 'full' 
}) => {
  const { instituicao, loading, error } = useInstituicao();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {showLogo && <Skeleton variant="circular" width={60} height={60} />}
        <Box>
          <Skeleton variant="text" width={200} height={24} />
          <Skeleton variant="text" width={150} height={20} />
        </Box>
      </Box>
    );
  }

  if (error || !instituicao) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {showLogo && (
          <Avatar sx={{ width: 60, height: 60, bgcolor: 'grey.200' }}>
            ?
          </Avatar>
        )}
        <Typography variant="h6" color="textSecondary">
          Secretaria Municipal de Educação
        </Typography>
      </Box>
    );
  }

  const renderContent = () => {
    switch (variant) {
      case 'minimal':
        return (
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {instituicao.nome}
          </Typography>
        );
      
      case 'compact':
        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {instituicao.nome}
            </Typography>
            {instituicao.endereco && (
              <Typography variant="body2" color="textSecondary">
                {instituicao.endereco}
              </Typography>
            )}
          </Box>
        );
      
      case 'full':
      default:
        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {instituicao.nome}
            </Typography>
            
            {instituicao.endereco && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                📍 {instituicao.endereco}
              </Typography>
            )}
            
            {showContact && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {instituicao.telefone && (
                  <Typography variant="body2" color="textSecondary">
                    📞 {instituicao.telefone}
                  </Typography>
                )}
                {instituicao.email && (
                  <Typography variant="body2" color="textSecondary">
                    ✉️ {instituicao.email}
                  </Typography>
                )}
                {instituicao.site && (
                  <Typography variant="body2" color="textSecondary">
                    🌐 {instituicao.site}
                  </Typography>
                )}
              </Box>
            )}
            
            {instituicao.secretario_nome && (
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {instituicao.secretario_nome}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {instituicao.secretario_cargo}
                </Typography>
              </Box>
            )}
          </Box>
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      {showLogo && instituicao.logo_url && (
        <Avatar
          src={instituicao.logo_url.startsWith('data:') 
            ? instituicao.logo_url 
            : `http://localhost:3000${instituicao.logo_url}`
          }
          sx={{ width: 60, height: 60 }}
        />
      )}
      {renderContent()}
    </Box>
  );
};

export default InstituicaoInfo;