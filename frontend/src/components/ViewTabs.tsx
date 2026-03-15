import React from 'react';
import { Box } from '@mui/material';

export interface ViewTab {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface ViewTabsProps {
  value: string | number;
  onChange: (value: any) => void;
  tabs: ViewTab[];
}

const ViewTabs: React.FC<ViewTabsProps> = ({ value, onChange, tabs }) => {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        bgcolor: '#f1f3f5',
        borderRadius: '8px',
        p: '3px',
        gap: '2px',
      }}
    >
      {tabs.map((tab) => {
        const isSelected = value === tab.value;
        return (
          <Box
            key={String(tab.value)}
            onClick={() => onChange(tab.value)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? 'text.primary' : 'text.secondary',
              bgcolor: isSelected ? '#ffffff' : 'transparent',
              border: isSelected ? '1px solid #dee2e6' : '1px solid transparent',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: isSelected ? '#ffffff' : 'rgba(0,0,0,0.04)',
                color: 'text.primary',
              },
            }}
          >
            {tab.icon && (
              <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '1rem' }}>
                {tab.icon}
              </Box>
            )}
            {tab.label}
          </Box>
        );
      })}
    </Box>
  );
};

export default ViewTabs;
