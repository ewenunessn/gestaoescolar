import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

interface BackButtonProps {
  to?: string;
  label?: string;
}

export default function BackButton({ to, label }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
      <IconButton 
        onClick={handleClick}
        sx={{ 
          bgcolor: 'background.paper', 
          boxShadow: 1,
          '&:hover': {
            bgcolor: 'action.hover'
          }
        }}
      >
        <ArrowBackIcon />
      </IconButton>
      {label && (
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}
