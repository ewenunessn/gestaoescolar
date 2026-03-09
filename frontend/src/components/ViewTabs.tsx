import React from 'react';
import { Tabs, Tab } from '@mui/material';

export interface ViewTab {
  value: string;
  label: string;
}

interface ViewTabsProps {
  value: string;
  onChange: (value: string) => void;
  tabs: ViewTab[];
}

const ViewTabs: React.FC<ViewTabsProps> = ({ value, onChange, tabs }) => {
  return (
    <Tabs
      value={value}
      onChange={(e, newValue) => onChange(newValue)}
      sx={{
        minHeight: 42,
        '& .MuiTabs-indicator': {
          display: 'none',
        },
        '& .MuiTabs-flexContainer': {
          gap: 1,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          label={tab.label}
          sx={{
            minHeight: 42,
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#6c757d',
            bgcolor: value === tab.value ? '#ffffff' : 'transparent',
            border: '1px solid',
            borderColor: value === tab.value ? '#dee2e6' : 'transparent',
            borderRadius: '8px',
            px: 3,
            '&.Mui-selected': {
              color: '#212529',
              bgcolor: '#ffffff',
              borderColor: '#dee2e6',
            },
            '&:hover': {
              bgcolor: value === tab.value ? '#ffffff' : '#f8f9fa',
            },
          }}
        />
      ))}
    </Tabs>
  );
};

export default ViewTabs;
