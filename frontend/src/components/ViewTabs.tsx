import React from 'react';
import { Box, Typography, Chip, useTheme, SxProps, Theme } from '@mui/material';

export interface ViewTab {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface ViewTabsProps {
  value: string | number;
  onChange: (v: string | number) => void;
  tabs: ViewTab[];
  size?: 'sm' | 'md';
  className?: string;
  sx?: SxProps<Theme>;
}

const ViewTabs: React.FC<ViewTabsProps> = ({
  value,
  onChange,
  tabs,
  size = 'md',
  className,
  sx,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const trackBg = isDark ? '#21262d' : '#e8eaed';
  const trackBorder = isDark ? '#30363d' : 'transparent';
  const knobBg = isDark ? '#2d333b' : '#ffffff';
  const knobBorder = isDark ? '#363b42' : '#d0d7de';
  const textMuted = isDark ? '#8b949e' : '#656d76';
  const textPrimary = isDark ? '#e6edf3' : '#1f2328';
  const hoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const sepColor = isDark ? '#30363d' : '#d0d7de';

  const height = size === 'sm' ? '28px' : '32px';
  const px = size === 'sm' ? '12px' : '16px';
  const fontSize = size === 'sm' ? '0.75rem' : '0.8125rem';

  return (
    <Box
      role="tablist"
      className={className}
      sx={{
        display: 'inline-flex',
        height,
        bgcolor: trackBg,
        border: `1px solid ${trackBorder}`,
        borderRadius: '8px',
        p: '3px',
        gap: '2px',
      }}
    >
      {tabs.map((tab, index) => {
        const isSelected = value === tab.value;
        const isNextSelected = tabs[index + 1]?.value === value;
        const isPrevSelected = index > 0 && tabs[index - 1]?.value === value;

        return (
          <Box
            key={String(tab.value)}
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(tab.value);
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px,
              py: '4px',
              borderRadius: '6px',
              fontSize,
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? textPrimary : textMuted,
              bgcolor: isSelected ? knobBg : 'transparent',
              borderColor: isSelected ? knobBorder : 'transparent',
              border: isSelected ? `1px solid ${knobBorder}` : 'none',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              position: 'relative',
              '&:hover': {
                bgcolor: isSelected ? knobBg : hoverBg,
                color: isSelected ? textPrimary : textMuted,
              },
              // Hide separator when next to selected
              '&::after': {
                content: '"|"',
                position: 'absolute',
                right: '-2px',
                color: sepColor,
                fontSize: '0.625rem',
                visibility: isSelected || isNextSelected ? 'hidden' : 'visible',
                userSelect: 'none',
                pointerEvents: 'none',
              },
              '&:last-child::after': {
                display: 'none',
              },
            }}
          >
            {tab.icon && (
              <Box sx={{ display: 'flex', alignItems: 'center', color: isSelected ? textPrimary : textMuted, transition: 'color 0.15s' }}>
                {tab.icon}
              </Box>
            )}
            <Typography
              component="span"
              sx={{ lineHeight: 1, fontSize: 'inherit', fontWeight: 'inherit' }}
            >
              {tab.label}
            </Typography>
            {tab.badge !== undefined && tab.badge > 0 && (
              <Chip
                label={tab.badge}
                size="small"
                sx={{
                  height: 14,
                  minWidth: 14,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  borderRadius: '7px',
                  px: 0.3,
                  bgcolor: isSelected
                    ? 'rgba(88,166,255,0.25)'
                    : isDark
                      ? 'rgba(88,166,255,0.15)'
                      : 'rgba(9,105,218,0.12)',
                  color: isDark ? '#58a6ff' : '#0969da',
                  border: 'none',
                  ml: 0.5,
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default ViewTabs;
