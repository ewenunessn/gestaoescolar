import { Box, Typography } from '@mui/material';

interface StatusIndicatorProps {
  status: string;
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase();
  
  // Status positivos/ativos - Verde
  if (statusLower.includes('ativo') || 
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
  
  // Status de atenção/pendente - Amarelo/Laranja
  if (statusLower.includes('pendente') || 
      statusLower.includes('aguardando') ||
      statusLower.includes('em_andamento') ||
      statusLower.includes('em andamento') ||
      statusLower.includes('processando') ||
      statusLower.includes('rascunho') ||
      statusLower.includes('parcial')) {
    return '#ff9800'; // Laranja
  }
  
  // Status negativos/inativos - Cinza/Preto
  if (statusLower.includes('inativo') || 
      statusLower.includes('cancelado') ||
      statusLower.includes('rejeitado') ||
      statusLower.includes('expirado') ||
      statusLower.includes('suspenso') ||
      statusLower.includes('bloqueado')) {
    return '#757575'; // Cinza
  }
  
  // Status de erro/problema - Vermelho
  if (statusLower.includes('erro') || 
      statusLower.includes('falha') ||
      statusLower.includes('recusado') ||
      statusLower.includes('vencido')) {
    return '#f44336'; // Vermelho
  }
  
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