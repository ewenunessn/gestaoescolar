import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface PageBreadcrumbsProps {
  items?: BreadcrumbItem[];
  breadcrumbs?: BreadcrumbItem[]; // Alias para compatibilidade
}

export default function PageBreadcrumbs({ items, breadcrumbs }: PageBreadcrumbsProps) {
  const navigate = useNavigate();

  const breadcrumbItems = items || breadcrumbs;

  if (!breadcrumbItems || breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 0.25 }}>
      <Breadcrumbs
        aria-label="breadcrumb"
        sx={{ fontSize: '0.75rem' }}
      >
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          if (isLast || !item.path) {
            return (
              <Typography
                key={index}
                color="text.primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.4,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
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
                gap: 0.4,
                cursor: 'pointer',
                textDecoration: 'none',
                fontSize: '0.75rem',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
