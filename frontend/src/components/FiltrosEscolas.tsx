import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Popover,
  Divider,
  Chip,
} from '@mui/material';

interface FiltrosEscolasProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  filters: {
    status: string;
    administracao: string;
  };
  onFiltersChange: (filters: { status: string; administracao: string }) => void;
}

const FiltrosEscolas: React.FC<FiltrosEscolasProps> = ({ anchorEl, onClose, filters, onFiltersChange }) => {
  const handleStatusChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, status: value });
  }, [filters, onFiltersChange]);

  const handleAdministracaoChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, administracao: value });
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({ status: 'todos', administracao: 'todos' });
  }, [onFiltersChange]);

  const handleRemoveStatusFilter = useCallback(() => {
    onFiltersChange({ ...filters, status: 'todos' });
  }, [filters, onFiltersChange]);

  const handleRemoveAdministracaoFilter = useCallback(() => {
    onFiltersChange({ ...filters, administracao: 'todos' });
  }, [filters, onFiltersChange]);

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      disablePortal
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <Box sx={{ p: 2, minWidth: 280 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Filtros
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            label="Status"
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="ativo">Ativas</MenuItem>
            <MenuItem value="inativo">Inativas</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Administração</InputLabel>
          <Select
            value={filters.administracao}
            label="Administração"
            onChange={(e) => handleAdministracaoChange(e.target.value)}
          >
            <MenuItem value="todos">Todas</MenuItem>
            <MenuItem value="municipal">Municipal</MenuItem>
            <MenuItem value="estadual">Estadual</MenuItem>
            <MenuItem value="federal">Federal</MenuItem>
            <MenuItem value="particular">Particular</MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
          >
            Limpar
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onClose}
          >
            Aplicar
          </Button>
        </Box>
        
        {/* Indicador de filtros ativos */}
        {(filters.status !== 'todos' || filters.administracao !== 'todos') && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Filtros ativos:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {filters.status !== 'todos' && (
                <Chip
                  label={`Status: ${filters.status === 'ativo' ? 'Ativas' : 'Inativas'}`}
                  size="small"
                  onDelete={handleRemoveStatusFilter}
                />
              )}
              {filters.administracao !== 'todos' && (
                <Chip
                  label={`Adm: ${filters.administracao.charAt(0).toUpperCase() + filters.administracao.slice(1)}`}
                  size="small"
                  onDelete={handleRemoveAdministracaoFilter}
                />
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Popover>
  );
};

export default FiltrosEscolas;
