import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Skeleton,
  Box,
} from '@mui/material';

const ProductCardSkeleton: React.FC = () => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flexGrow: 1, pt: 3 }}>
        {/* Nome do produto */}
        <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={24} sx={{ mb: 2 }} />

        {/* Fornecedor */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Skeleton variant="circular" width={16} height={16} sx={{ mr: 0.5 }} />
          <Skeleton variant="text" width="70%" height={20} />
        </Box>

        {/* Preço */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Skeleton variant="circular" width={16} height={16} sx={{ mr: 0.5 }} />
          <Skeleton variant="text" width="50%" height={28} />
        </Box>

        {/* Disponibilidade */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Skeleton variant="circular" width={16} height={16} sx={{ mr: 0.5 }} />
          <Skeleton variant="text" width="60%" height={20} />
        </Box>

        {/* Contrato */}
        <Skeleton variant="text" width="40%" height={16} />
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Skeleton variant="rectangular" width="70%" height={36} sx={{ mr: 1, borderRadius: 1 }} />
        <Skeleton variant="circular" width={36} height={36} />
      </CardActions>
    </Card>
  );
};

export default ProductCardSkeleton;