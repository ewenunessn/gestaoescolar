import { Box, Typography, Card, CardContent } from '@mui/material';
import { SvgIconComponent } from '@mui/icons-material';

interface EmptyStateProps {
  icon: SvgIconComponent;
  message: string;
  description?: string;
}

export default function EmptyState({ icon: Icon, message, description }: EmptyStateProps) {
  return (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 6 }}>
        <Icon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          {message}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            {description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
