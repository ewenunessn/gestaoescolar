import React, { useState, useEffect } from 'react';
import {
  alpha,
  Popover,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

export interface FilterField {
  type: 'text' | 'select' | 'date' | 'dateRange' | 'custom';
  label: string;
  key: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
  customRender?: (value: any, onChange: (value: any) => void) => React.ReactNode;
}

export interface TableFilterProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: Record<string, any>) => void;
  fields: FilterField[];
  initialValues?: Record<string, any>;
  showSearch?: boolean;
  searchPlaceholder?: string;
  anchorEl?: HTMLElement | null;
}

const TableFilter: React.FC<TableFilterProps> = ({
  open,
  onClose,
  onApply,
  fields,
  initialValues = {},
  showSearch = true,
  searchPlaceholder = 'Buscar...',
  anchorEl,
}) => {
  const theme = useTheme();
  const [filters, setFilters] = useState<Record<string, any>>(initialValues);

  // Atualizar filtros quando initialValues mudar
  useEffect(() => {
    setFilters(initialValues);
  }, [initialValues]);

  const handleChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = (key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const handleResetAll = () => {
    setFilters({});
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const renderField = (field: FilterField) => {
    const value = filters[field.key] || '';

    switch (field.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            size="small"
            placeholder={field.placeholder || 'Digite...'}
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth size="small">
            <Select
              value={value}
              onChange={(e: SelectChangeEvent) => handleChange(field.key, e.target.value)}
              displayEmpty
              sx={{
                borderRadius: '8px',
                bgcolor: 'background.paper',
                '& .MuiSelect-select': {
                  py: 1.2,
                },
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
                '&:hover fieldset': {
                  borderColor: alpha(theme.palette.text.primary, 0.18),
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              }}
            >
              <MenuItem value="">
                <em>Todos</em>
              </MenuItem>
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'dateRange':
        return (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                De:
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={filters[`${field.key}_from`] || ''}
                onChange={(e) => handleChange(`${field.key}_from`, e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                Até:
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={filters[`${field.key}_to`] || ''}
                onChange={(e) => handleChange(`${field.key}_to`, e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
              />
            </Box>
          </Box>
        );

      case 'custom':
        return field.customRender?.(value, (val) => handleChange(field.key, val));

      default:
        return null;
    }
  };

  // Não renderizar se não estiver aberto ou não houver anchorEl
  if (!open || !anchorEl) {
    return null;
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '12px',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.palette.mode === 'light' ? '0 14px 30px rgba(31,36,48,0.08)' : '0 16px 34px rgba(0,0,0,0.22)',
            minWidth: 400,
            maxWidth: 500,
            maxHeight: '80vh',
            overflow: 'hidden',
          },
        },
      }}
      disableScrollLock
      elevation={8}
      marginThreshold={0}
      sx={{
        '& .MuiPopover-paper': {
          marginTop: '2px',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', letterSpacing: '-0.02em' }}>
          Filtros
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ maxHeight: 'calc(80vh - 140px)', overflowY: 'auto' }}>
        {/* Busca por palavra-chave */}
        {showSearch && (
          <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Busca
              </Typography>
              {filters.search && (
                <Button
                  size="small"
                  onClick={() => handleReset('search')}
                  sx={{
                    color: 'primary.main',
                    textTransform: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    minWidth: 'auto',
                    p: 0,
                    '&:hover': {
                      bgcolor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Reset
                </Button>
              )}
            </Box>
            <TextField
              fullWidth
              size="small"
              placeholder={searchPlaceholder}
              value={filters.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  bgcolor: 'background.paper',
                  '& fieldset': {
                    borderColor: theme.palette.divider,
                  },
                  '&:hover fieldset': {
                    borderColor: alpha(theme.palette.text.primary, 0.18),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />
          </Box>
        )}

        {/* Campos de filtro */}
        {fields.map((field) => (
          <Box key={field.key} sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.82rem' }}>
                {field.label}
              </Typography>
              {filters[field.key] && (
                <Button
                  size="small"
                  onClick={() => handleReset(field.key)}
                  sx={{
                    color: 'primary.main',
                    textTransform: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    minWidth: 'auto',
                    p: 0,
                    '&:hover': {
                      bgcolor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Reset
                </Button>
              )}
            </Box>
            {renderField(field)}
          </Box>
        ))}
      </Box>

      {/* Ações */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          p: 2.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
        }}
      >
        <Button
          variant="outlined"
          onClick={handleResetAll}
          sx={{
            flex: 1,
            textTransform: 'none',
            borderRadius: '8px',
            borderColor: theme.palette.divider,
            color: 'text.secondary',
            fontWeight: 600,
            py: 1,
            '&:hover': {
              borderColor: alpha(theme.palette.text.primary, 0.18),
              bgcolor: alpha(theme.palette.text.primary, 0.03),
            },
          }}
        >
          Limpar
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          sx={{
            flex: 1,
            textTransform: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            py: 1,
          }}
        >
          Aplicar
        </Button>
      </Box>
    </Popover>
  );
};

export default TableFilter;
