import React from 'react';
import { Breadcrumbs, Link, Typography, Box, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function PageBreadcrumbs({ items, onBack, showBackButton = true }: PageBreadcrumbsProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (items.length > 1 && items[items.length - 2].path) {
      // Navegar para o item anterior no breadcrumb
      navigate(items[items.length - 2].path!);
    } else {
      // Fallback: voltar na história do navegador
      navigate(-1);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {showBackButton && (
          <IconButton 
            onClick={handleBack}
            size="small"
            sx={{ 
              bgcolor: 'background.paper', 
              boxShadow: 1,
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        
        <Breadcrumbs>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            
            if (isLast || !item.path) {
              return (
                <Typography 
                  key={index}
                  color="text.primary" 
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  {item.icon}
                  {item.label}
                </Typography>
              );
            }

            return (
              <Link
                key={index}
                color="inherit"
                onClick={() => navigate(item.path!)}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Box>
    </Box>
  );
}