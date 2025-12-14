import { Box, Typography, Chip } from '@mui/material';
import StatusIndicator from './StatusIndicator';

interface StatusLegendItem {
  status: string;
  label: string;
  count: number;
}

interface PageHeaderProps {
  title: string;
  totalCount: number;
  statusLegend?: StatusLegendItem[];
  subtitle?: string;
}

export default function PageHeader({ title, totalCount, statusLegend, subtitle }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h5" sx={{ 
        fontWeight: 600, 
        color: 'text.primary',
        mb: 0.5,
        fontSize: '1.5rem'
      }}>
        {title}
      </Typography>
      
      <Typography variant="body2" sx={{ 
        color: 'text.secondary', 
        mb: 1.5,
        fontSize: '0.875rem'
      }}>
        {subtitle || `Exibindo ${totalCount} resultado${totalCount !== 1 ? 's' : ''}`}
      </Typography>

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