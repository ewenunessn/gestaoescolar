import { forwardRef } from 'react';
import { alpha, Box, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';

interface StatusIndicatorProps {
  status: string;
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase();
  
  // Status específicos das demandas
  if (statusLower === 'pendente') return '#ff9800'; // Laranja
  if (statusLower === 'enviado_semead' || statusLower === 'enviadas') return '#2196f3'; // Azul
  if (statusLower === 'atendido' || statusLower === 'atendidas') return '#4caf50'; // Verde
  if (statusLower === 'nao_atendido' || statusLower === 'não atendidas') return '#f44336'; // Vermelho
  
  // Status específicos das guias
  if (statusLower === 'aberta' || statusLower === 'abertas') return '#4caf50'; // Verde
  if (statusLower === 'fechada' || statusLower === 'fechadas') return '#9e9e9e'; // Cinza
  if (statusLower === 'cancelada' || statusLower === 'canceladas') return '#f44336'; // Vermelho
  
  // Status gerais - negativos/inativos primeiro para evitar conflito
  if (statusLower === 'inativo' || 
      statusLower.includes('cancelado') ||
      statusLower.includes('rejeitado') ||
      statusLower.includes('expirado') ||
      statusLower.includes('suspenso') ||
      statusLower.includes('bloqueado')) {
    return '#9e9e9e'; // Cinza
  }
  
  // Status gerais - positivos/ativos
  if (statusLower === 'ativo' || 
      statusLower.includes('aprovado') || 
      statusLower.includes('concluido') ||
      statusLower.includes('concluído') ||
      statusLower.includes('finalizado') ||
      statusLower.includes('entregue') ||
      statusLower.includes('pago') ||
      statusLower.includes('confirmado') ||
      statusLower.includes('vigente')) {
    return '#4caf50'; // Verde
  }
  
  // Status de atenção/pendente
  if (statusLower.includes('pendente') || 
      statusLower.includes('aguardando') ||
      statusLower.includes('em_andamento') ||
      statusLower.includes('em andamento') ||
      statusLower.includes('processando') ||
      statusLower.includes('rascunho') ||
      statusLower.includes('parcial')) {
    return '#ff9800'; // Laranja
  }
  
  // Status de erro/problema
  if (statusLower.includes('erro') || 
      statusLower.includes('falha') ||
      statusLower.includes('recusado') ||
      statusLower.includes('vencido')) {
    return '#f44336'; // Vermelho
  }
  
  // Status de estoque
  if (statusLower === 'success' || statusLower === 'normal') return '#4caf50'; // Verde
  if (statusLower === 'warning' || statusLower === 'vence em breve') return '#ff9800'; // Laranja
  if (statusLower === 'error' || statusLower === 'com vencidos') return '#f44336'; // Vermelho
  if (statusLower === 'default' || statusLower === 'sem estoque') return '#9e9e9e'; // Cinza
  
  // Default - Azul
  return '#2196f3';
};

const getSizePixels = (size: 'small' | 'medium' | 'large'): number => {
  switch (size) {
    case 'small': return 8;
    case 'large': return 12;
    default: return 10; // medium
  }
};

const getStatusIcon = (status: string) => {
  const statusLower = status.toLowerCase();

  if (
    statusLower === 'ativo' ||
    statusLower.includes('aprovado') ||
    statusLower.includes('concluido') ||
    statusLower.includes('concluído') ||
    statusLower.includes('finalizado') ||
    statusLower.includes('entregue') ||
    statusLower.includes('pago') ||
    statusLower.includes('confirmado') ||
    statusLower.includes('vigente') ||
    statusLower === 'success' ||
    statusLower === 'normal'
  ) {
    return CheckCircleOutlineIcon;
  }

  if (
    statusLower === 'inativo' ||
    statusLower.includes('cancelado') ||
    statusLower.includes('rejeitado') ||
    statusLower.includes('expirado') ||
    statusLower.includes('suspenso') ||
    statusLower.includes('bloqueado') ||
    statusLower === 'default' ||
    statusLower === 'sem estoque'
  ) {
    return CancelOutlinedIcon;
  }

  if (
    statusLower.includes('erro') ||
    statusLower.includes('falha') ||
    statusLower.includes('recusado') ||
    statusLower.includes('vencido') ||
    statusLower === 'error' ||
    statusLower === 'com vencidos'
  ) {
    return ErrorOutlineIcon;
  }

  if (
    statusLower.includes('pendente') ||
    statusLower.includes('aguardando') ||
    statusLower.includes('em_andamento') ||
    statusLower.includes('em andamento') ||
    statusLower.includes('processando') ||
    statusLower.includes('rascunho') ||
    statusLower.includes('parcial') ||
    statusLower === 'warning' ||
    statusLower === 'vence em breve'
  ) {
    return ScheduleOutlinedIcon;
  }

  return InfoOutlinedIcon;
};

const StatusIndicator = forwardRef<HTMLSpanElement, StatusIndicatorProps>(function StatusIndicator(
  { status, text, size = 'medium' },
  ref,
) {
  const color = getStatusColor(status);
  const dotSize = getSizePixels(size);
  const Icon = getStatusIcon(status);

  if (text) {
    const iconSize = size === 'large' ? 16 : 14;

    return (
      <Box
        component="span"
        ref={ref}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          width: 'fit-content',
          minWidth: size === 'small' ? 58 : 68,
          height: size === 'large' ? 28 : 24,
          px: size === 'small' ? 0.75 : 1,
          borderRadius: '999px',
          border: `1px solid ${alpha(color, 0.72)}`,
          bgcolor: alpha(color, 0.14),
          color,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        <Icon sx={{ fontSize: iconSize, flexShrink: 0 }} />
        <Typography
          component="span"
          sx={{
            color: 'inherit',
            fontSize: size === 'large' ? '0.78rem' : '0.72rem',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {text}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box ref={ref} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Box
        component="span"
        sx={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0
        }}
      />
      {text && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {text}
        </Typography>
      )}
    </Box>
  );
});

export default StatusIndicator;
