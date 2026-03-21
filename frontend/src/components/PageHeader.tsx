import { Box, Typography, Chip } from '@mui/material';
import StatusIndicator from './StatusIndicator';
import { useEffect } from 'react';
import { usePageTitle } from '../contexts/PageTitleContext';
import PageBreadcrumbs from './PageBreadcrumbs';

interface StatusLegendItem {
  status: string;
  label: string;
  count: number;
}

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  totalCount?: number;
  statusLegend?: StatusLegendItem[];
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  onBack?: () => void;
}

export default function PageHeader({ 
  title, 
  totalCount, 
  statusLegend, 
  subtitle,
  breadcrumbs,
  onBack 
}: PageHeaderProps) {
  const { setPageTitle } = usePageTitle();

  useEffect(() => {
    setPageTitle(title);
    return () => setPageTitle('');
  }, [title, setPageTitle]);

  return (
    <Box sx={{ mb: 2 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <PageBreadcrumbs items={breadcrumbs} onBack={onBack} />
      )}
      
      {(subtitle || totalCount !== undefined) && (
        <Typography variant="body2" sx={{ 
          color: 'text.secondary', 
          mb: 1.5,
          fontSize: '0.875rem'
        }}>
          {subtitle || `Exibindo ${totalCount} resultado${totalCount !== 1 ? 's' : ''}`}
        </Typography>
      )}

      {statusLegend && statusLegend.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {statusLegend.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <StatusIndicator status={item.status} size="small" />
              <Typography variant="caption" sx={{ 
                color: 'text.secondary',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                fontWeight: 500,
                letterSpacing: '0.3px'
              }}>
                {item.label}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: 'text.primary',
                fontWeight: 600,
                fontSize: '0.7rem'
              }}>
                {item.count}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}