import React from 'react';
import { Breadcrumbs, Link, Typography, Box, alpha, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface PageBreadcrumbsProps {
  items?: BreadcrumbItem[];
  breadcrumbs?: BreadcrumbItem[];
}

export default function PageBreadcrumbs({ items, breadcrumbs }: PageBreadcrumbsProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const breadcrumbItems = items || breadcrumbs;

  if (!breadcrumbItems || breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <Box className="data-breadcrumb-area" sx={{ minHeight: 22 }}>
      <Breadcrumbs
        aria-label="breadcrumb"
        separator=">"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 0.75,
            color: alpha(theme.palette.text.secondary, 0.65),
            fontSize: '0.8rem',
          },
        }}
      >
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const commonSx = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '0.76rem',
            fontWeight: 600,
          };

          if (isLast || !item.path) {
            return (
              <Typography
                key={index}
                className="data-breadcrumb-current"
                sx={{
                  ...commonSx,
                  color: 'text.secondary',
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
              className="data-breadcrumb-link"
              underline="none"
              onClick={() => navigate(item.path!)}
              sx={{
                ...commonSx,
                color: 'text.secondary',
                cursor: 'pointer',
                '&:hover': {
                  color: 'text.primary',
                },
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
