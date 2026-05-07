import { alpha, Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PageBreadcrumbs from './PageBreadcrumbs';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface PageHeaderProps {
  title: React.ReactNode;
  totalCount?: number;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
  topAction?: React.ReactNode;
  children?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
  topAction,
  children,
  onBack,
  backLabel = 'Voltar',
}: PageHeaderProps) {
  const theme = useTheme();

  return (
    <>
      <Box
        sx={{
          mb: subtitle || children ? 1.25 : 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            minHeight: 32,
            width: '100%',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            {onBack && (
              <Tooltip title={backLabel}>
                <IconButton
                  size="small"
                  onClick={onBack}
                  sx={{
                    width: 28,
                    height: 28,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: theme.palette.mode === 'dark'
                      ? alpha('#000000', 0.64)
                      : alpha(theme.palette.background.paper, 0.9),
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
          {topAction && <Box sx={{ flexShrink: 0 }}>{topAction}</Box>}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            width: '100%',
          }}
        >
          {typeof title === 'string' ? (
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
          ) : (
            title
          )}

          {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
        </Box>
      </Box>

      {(subtitle || children) && (
        <Box
          sx={{
            mb: 2.5,
            p: { xs: 1.75, md: 2 },
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          {subtitle && (
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
              {subtitle}
            </Typography>
          )}

          {children && (
            <Box
              sx={{
                mt: subtitle ? 1.25 : 0,
                pt: subtitle ? 1.25 : 0,
                borderTop: subtitle
                  ? `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.08 : 0.1)}`
                  : 'none',
              }}
            >
              {children}
            </Box>
          )}
        </Box>
      )}
    </>
  );
}
