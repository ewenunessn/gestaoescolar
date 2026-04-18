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
  breadcrumbs?: BreadcrumbItem[];
}

export default function PageBreadcrumbs({ items, breadcrumbs }: PageBreadcrumbsProps) {
  const navigate = useNavigate();

  const breadcrumbItems = items || breadcrumbs;

  if (!breadcrumbItems || breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <Box className="data-breadcrumb-area">
      <Breadcrumbs aria-label="breadcrumb" separator="›">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          if (isLast || !item.path) {
            return (
              <Typography
                key={index}
                className="data-breadcrumb-current"
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
              onClick={() => navigate(item.path!)}
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
