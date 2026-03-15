import React, { useEffect } from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../contexts/PageTitleContext';

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

export default function PageBreadcrumbs({ items, onBack }: PageBreadcrumbsProps) {
  const navigate = useNavigate();
  const { setBackPath } = usePageTitle();

  useEffect(() => {
    // Determina o caminho de volta: item anterior com path, ou callback
    if (onBack) {
      // onBack é função — não podemos passar para o headbar, usa navigate(-1) como fallback
      setBackPath('__back__');
    } else if (items.length > 1) {
      const prev = items[items.length - 2];
      setBackPath(prev.path || '__back__');
    }
    return () => setBackPath(null);
  }, []);

  return (
    <Box sx={{ mb: 0.5 }}>
      <Breadcrumbs sx={{ fontSize: '0.75rem' }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          if (isLast || !item.path) {
            return (
              <Typography
                key={index}
                color="text.primary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem' }}
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
                gap: 0.5,
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
