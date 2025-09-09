import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Skeleton,
  Divider,
} from '@mui/material';

const CartItemSkeleton: React.FC = () => {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            {/* Nome do produto */}
            <Skeleton variant="text" width="70%" height={32} sx={{ mb: 1 }} />
            
            {/* Unidade */}
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
            
            {/* Preço unitário */}
            <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Controles de quantidade */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
              <Skeleton variant="circular" width={32} height={32} />
            </Box>

            {/* Botão remover */}
            <Skeleton variant="circular" width={32} height={32} />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width="30%" height={20} />
          <Skeleton variant="text" width="20%" height={28} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default CartItemSkeleton;