import { Box, Typography } from '@mui/material';

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

export default function StatusIndicator({ status, text, size = 'medium' }: StatusIndicatorProps) {
  const color = getStatusColor(status);
  const dotSize = getSizePixels(size);
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
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
}