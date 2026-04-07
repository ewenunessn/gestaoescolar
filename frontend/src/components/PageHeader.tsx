import { Box, Typography, Chip } from '@mui/material';
import PageBreadcrumbs from './PageBreadcrumbs';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  totalCount?: number;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  totalCount,
  subtitle,
  breadcrumbs,
  action,
  children,
}: PageHeaderProps) {
  return (
    <Box sx={{ mb: 2 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <PageBreadcrumbs items={breadcrumbs} />
      )}

      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        mt: breadcrumbs ? 0.75 : 0,
        mb: 0.25,
      }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: '1.375rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>

        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>

      {(totalCount !== undefined || subtitle) && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: '0.8125rem',
            mt: 0.25,
            mb: 0.5,
          }}
        >
          {subtitle || `Exibindo ${totalCount} resultado${totalCount !== 1 ? 's' : ''}`}
        </Typography>
      )}

      {children && <Box sx={{ mt: 1 }}>{children}</Box>}
    </Box>
  );
}
