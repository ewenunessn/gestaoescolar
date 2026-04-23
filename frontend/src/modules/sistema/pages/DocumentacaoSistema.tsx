import React from 'react';
import { Box, Typography } from '@mui/material';

export default function DocumentacaoSistema() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Documentacao do Sistema
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Conteudo em construcao.
      </Typography>
    </Box>
  );
}
