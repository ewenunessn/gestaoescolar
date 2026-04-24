import { alpha, Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
  onBack?: () => void;
  backLabel?: string;
}

export default function PageHeader({
  title,
  totalCount,
  subtitle,
  breadcrumbs,
  action,
  children,
  onBack,
  backLabel = 'Voltar',
}: PageHeaderProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        mb: 2.5,
        p: { xs: 1.75, md: 2 },
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {(onBack || (breadcrumbs && breadcrumbs.length > 0)) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 28 }}>
          {onBack && (
            <Tooltip title={backLabel}>
              <IconButton
                size="small"
                onClick={onBack}
                sx={{
                  width: 28,
                  height: 28,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.default',
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                  },
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <PageBreadcrumbs items={breadcrumbs} />
          )}
        </Box>
      )}

      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        mt: (breadcrumbs || onBack) ? 0.75 : 0,
        mb: 0.5,
      }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: '1.2rem', md: '1.42rem' },
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.15,
            color: 'text.primary',
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
            fontSize: '0.84rem',
            mt: 0.1,
            mb: 0.25,
            maxWidth: 720,
          }}
        >
          {subtitle || `Exibindo ${totalCount} resultado${totalCount !== 1 ? 's' : ''}`}
        </Typography>
      )}

      {children && (
        <Box
          sx={{
            mt: 1.25,
            pt: 1.25,
            borderTop: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.08 : 0.1)}`,
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}
