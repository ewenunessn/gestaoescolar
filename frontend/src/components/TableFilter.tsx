import React, { useState, useEffect } from 'react';
import {
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
                bgcolor: '#ffffff',
                '& .MuiSelect-select': {
                  py: 1.5,
                },
                '& fieldset': {
                  borderColor: '#dee2e6',
                },
                '&:hover fieldset': {
                  borderColor: '#adb5bd',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#17a2b8',
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
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
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
          borderBottom: '1px solid #e9ecef',
          bgcolor: '#ffffff',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem', color: '#212529' }}>
          Filter
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#6c757d' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ maxHeight: 'calc(80vh - 140px)', overflowY: 'auto' }}>
        {/* Busca por palavra-chave */}
        {showSearch && (
          <Box sx={{ p: 2.5, borderBottom: '1px solid #e9ecef' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#212529', fontSize: '0.875rem' }}>
                Keyword search
              </Typography>
              {filters.search && (
                <Button
                  size="small"
                  onClick={() => handleReset('search')}
                  sx={{
                    color: '#17a2b8',
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
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
                    <SearchIcon sx={{ color: '#6c757d', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  bgcolor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#dee2e6',
                  },
                  '&:hover fieldset': {
                    borderColor: '#adb5bd',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#17a2b8',
                  },
                },
              }}
            />
          </Box>
        )}

        {/* Campos de filtro */}
        {fields.map((field) => (
          <Box key={field.key} sx={{ p: 2.5, borderBottom: '1px solid #e9ecef' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#212529', fontSize: '0.875rem' }}>
                {field.label}
              </Typography>
              {filters[field.key] && (
                <Button
                  size="small"
                  onClick={() => handleReset(field.key)}
                  sx={{
                    color: '#17a2b8',
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
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
          borderTop: '1px solid #e9ecef',
          bgcolor: '#ffffff',
        }}
      >
        <Button
          variant="outlined"
          onClick={handleResetAll}
          sx={{
            flex: 1,
            textTransform: 'none',
            borderRadius: '8px',
            borderColor: '#dee2e6',
            color: '#495057',
            fontWeight: 500,
            py: 1,
            '&:hover': {
              borderColor: '#adb5bd',
              bgcolor: '#f8f9fa',
            },
          }}
        >
          Reset all
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          sx={{
            flex: 1,
            textTransform: 'none',
            borderRadius: '8px',
            bgcolor: '#17a2b8',
            color: '#ffffff',
            fontWeight: 500,
            py: 1,
            '&:hover': {
              bgcolor: '#138496',
            },
          }}
        >
          Apply now
        </Button>
      </Box>
    </Popover>
  );
};

export default TableFilter;
