import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  InputAdornment,
  IconButton,
  Typography,
  Collapse,
  Grid,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  ExpandLess,
  ExpandMore,
  TuneRounded,
} from '@mui/icons-material';
import { useTenant } from '../context/TenantContext';

interface TenantInventoryFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (value: string) => void;
  selectedStatus?: string;
  onStatusChange?: (value: string) => void;
  categories?: string[];
  statusOptions?: Array<{ value: string; label: string }>;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  placeholder?: string;
  showTenantInfo?: boolean;
  customFilters?: React.ReactNode;
}

const defaultStatusOptions = [
  { value: '', label: 'Todos' },
  { value: 'normal', label: 'Normal' },
  { value: 'atencao', label: 'Atenção' },
  { value: 'critico', label: 'Crítico' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'sem_estoque', label: 'Sem Estoque' },
];

export const TenantInventoryFilter: React.FC<TenantInventoryFilterProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory = '',
  onCategoryChange,
  selectedStatus = '',
  onStatusChange,
  categories = [],
  statusOptions = defaultStatusOptions,
  expanded = false,
  onExpandedChange,
  hasActiveFilters = false,
  onClearFilters,
  placeholder = 'Buscar produtos...',
  showTenantInfo = true,
  customFilters,
}) => {
  const { currentTenant, error: tenantError } = useTenant();

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  }, [onSearchChange]);

  const handleClearSearch = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  const handleCategoryChange = useCallback((event: any) => {
    onCategoryChange?.(event.target.value);
  }, [onCategoryChange]);

  const handleStatusChange = useCallback((event: any) => {
    onStatusChange?.(event.target.value);
  }, [onStatusChange]);

  const toggleExpanded = useCallback(() => {
    onExpandedChange?.(!expanded);
  }, [expanded, onExpandedChange]);

  // Show tenant error if present
  if (tenantError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Erro no contexto da organização: {tenantError}
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      {/* Tenant Info Header */}
      {showTenantInfo && currentTenant && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Organização:
          </Typography>
          <Chip 
            label={currentTenant.name} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary">
            Dados filtrados automaticamente por organização
          </Typography>
        </Box>
      )}

      {/* Main Filter Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {/* Search Field */}
        <TextField
          fullWidth
          size="small"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ 
            flex: 1, 
            minWidth: '200px',
            '& .MuiOutlinedInput-root': { borderRadius: '8px' }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Advanced Filters Toggle */}
        {(categories.length > 0 || statusOptions.length > 1 || customFilters) && (
          <Button
            variant={expanded || hasActiveFilters ? 'contained' : 'outlined'}
            startIcon={expanded ? <ExpandLess /> : <TuneRounded />}
            onClick={toggleExpanded}
            size="small"
            sx={{ position: 'relative' }}
          >
            Filtros
            {hasActiveFilters && !expanded && (
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: -2, 
                  right: -2, 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: 'error.main' 
                }} 
              />
            )}
          </Button>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && onClearFilters && (
          <Button 
            size="small" 
            onClick={onClearFilters} 
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Limpar
          </Button>
        )}
      </Box>

      {/* Advanced Filters */}
      <Collapse in={expanded} timeout={300}>
        <Box sx={{ 
          bgcolor: 'background.paper', 
          borderRadius: '12px', 
          p: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem' }}>
              Filtros Avançados
            </Typography>
            {hasActiveFilters && onClearFilters && (
              <Button 
                size="small" 
                onClick={onClearFilters} 
                sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.8rem' }}
              >
                Limpar Todos
              </Button>
            )}
          </Box>

          <Grid container spacing={2}>
            {/* Category Filter */}
            {categories.length > 0 && onCategoryChange && (
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    label="Categoria"
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Status Filter */}
            {statusOptions.length > 1 && onStatusChange && (
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    label="Status"
                  >
                    {statusOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Custom Filters */}
            {customFilters && (
              <Grid item xs={12}>
                {customFilters}
              </Grid>
            )}
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
};

export default TenantInventoryFilter;