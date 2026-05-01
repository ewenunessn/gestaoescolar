import type { ReactNode } from 'react';
import { alpha, Box, Button, CircularProgress, Paper, Typography, useTheme } from '@mui/material';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import InboxRounded from '@mui/icons-material/InboxRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';

type StateFeedbackProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  minHeight?: number | string;
  compact?: boolean;
};

function StateShell({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  minHeight = 280,
  compact = false,
}: StateFeedbackProps) {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        minHeight: compact ? 'auto' : minHeight,
        p: compact ? 2 : { xs: 2.5, md: 4 },
        borderRadius: 1,
        borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.12 : 0.18),
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <Box sx={{ maxWidth: 460 }}>
        {icon && (
          <Box
            sx={{
              width: compact ? 36 : 44,
              height: compact ? 36 : 44,
              mx: 'auto',
              mb: compact ? 1 : 1.5,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
            }}
          >
            {icon}
          </Box>
        )}
        <Typography sx={{ fontSize: compact ? 14 : 16, fontWeight: 700, color: 'text.primary' }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ mt: 0.75, fontSize: compact ? 12.5 : 13.5, color: 'text.secondary' }}>
            {description}
          </Typography>
        )}
        {actionLabel && onAction && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshRounded />}
            onClick={onAction}
            sx={{ mt: compact ? 1.25 : 2, textTransform: 'none', fontWeight: 600 }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>
    </Paper>
  );
}

export function LoadingState({
  title = 'Carregando dados',
  description,
  minHeight,
  compact,
}: Partial<Pick<StateFeedbackProps, 'title' | 'description' | 'minHeight' | 'compact'>>) {
  return (
    <StateShell
      title={title}
      description={description}
      minHeight={minHeight}
      compact={compact}
      icon={<CircularProgress size={compact ? 20 : 24} />}
    />
  );
}

export function ErrorState(props: Omit<StateFeedbackProps, 'icon'>) {
  return <StateShell {...props} icon={<ErrorOutlineRounded fontSize="small" color="error" />} />;
}

export function EmptyState(props: Omit<StateFeedbackProps, 'icon'>) {
  return <StateShell {...props} icon={<InboxRounded fontSize="small" />} />;
}
