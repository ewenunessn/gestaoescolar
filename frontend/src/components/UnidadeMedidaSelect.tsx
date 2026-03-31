import React from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { useUnidadesMedida } from '../hooks/queries/useUnidadesMedidaQueries';
import { UnidadeMedida } from '../services/unidadesMedida';

interface UnidadeMedidaSelectProps {
  value: number | null;
  onChange: (unidadeId: number | null) => void;
  tipo?: 'massa' | 'volume' | 'unidade';
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export default function UnidadeMedidaSelect({
  value,
  onChange,
  tipo,
  label = 'Unidade de Medida',
  error,
  helperText,
  required,
  disabled,
  size = 'medium'
}: UnidadeMedidaSelectProps) {
  const { data: unidades, isLoading } = useUnidadesMedida(tipo);

  const unidadeSelecionada = unidades?.find(u => u.id === value) || null;

  // Agrupar por tipo
  const unidadesAgrupadas = React.useMemo(() => {
    if (!unidades) return [];
    
    const grupos: Record<string, UnidadeMedida[]> = {
      massa: [],
      volume: [],
      unidade: []
    };
    
    unidades.forEach(u => {
      if (grupos[u.tipo]) {
        grupos[u.tipo].push(u);
      }
    });
    
    return [
      { tipo: 'massa', label: 'Massa', unidades: grupos.massa },
      { tipo: 'volume', label: 'Volume', unidades: grupos.volume },
      { tipo: 'unidade', label: 'Unidade', unidades: grupos.unidade }
    ].filter(g => g.unidades.length > 0);
  }, [unidades]);

  return (
    <Autocomplete
      value={unidadeSelecionada}
      onChange={(_, newValue) => onChange(newValue?.id || null)}
      options={unidades || []}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      groupBy={(option) => {
        const tipoLabels = {
          massa: 'Massa',
          volume: 'Volume',
          unidade: 'Unidade'
        };
        return tipoLabels[option.tipo];
      }}
      getOptionLabel={(option) => `${option.nome} (${option.codigo})`}
      loading={isLoading}
      disabled={disabled}
      size={size}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
