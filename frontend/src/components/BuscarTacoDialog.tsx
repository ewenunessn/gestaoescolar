import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, List, ListItemButton, ListItemText,
  Typography, Box, CircularProgress, Chip, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { buscarTaco, mapearTacoParaComposicao, TacoAlimento } from '../services/taco';

interface BuscarTacoDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (composicao: ReturnType<typeof mapearTacoParaComposicao>, nomeAlimento: string, alimento: TacoAlimento) => void;
  onSelectAlimento?: (alimento: TacoAlimento) => void;
  initialQuery?: string;
}

export default function BuscarTacoDialog({ open, onClose, onSelect, onSelectAlimento, initialQuery }: BuscarTacoDialogProps) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<TacoAlimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResultados([]); setBuscou(false); return; }
    setLoading(true);
    try {
      const res = await buscarTaco(q.trim());
      setResultados(res);
      setBuscou(true);
    } catch {
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pré-preencher e buscar quando abrir com initialQuery
  React.useEffect(() => {
    if (open && initialQuery) {
      setQuery(initialQuery);
      buscar(initialQuery);
    }
    if (!open) {
      setQuery('');
      setResultados([]);
      setBuscou(false);
    }
  }, [open, initialQuery, buscar]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => buscar(v), 400);
  };

  const handleSelect = (alimento: TacoAlimento) => {
    if (onSelectAlimento) {
      onSelectAlimento(alimento);
    } else {
      onSelect(mapearTacoParaComposicao(alimento), alimento.nome, alimento);
    }
    handleClose();
  };

  const handleClose = () => {
    setQuery('');
    setResultados([]);
    setBuscou(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }} component="div">
        <Typography variant="subtitle1" fontWeight={600}>Buscar na Tabela TACO</Typography>
        <Typography variant="caption" color="text.secondary">
          Tabela Brasileira de Composição de Alimentos — UNICAMP, 4ª edição
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ex: arroz, feijão, frango..."
          value={query}
          onChange={handleChange}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : null,
          }}
          sx={{ mb: 1.5 }}
        />

        {buscou && resultados.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            Nenhum alimento encontrado para "{query}"
          </Typography>
        )}

        {resultados.length > 0 && (
          <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
            {resultados.map((alimento) => (
              <ListItemButton
                key={alimento.id}
                onClick={() => handleSelect(alimento)}
                sx={{ borderRadius: 1, mb: 0.5, border: '1px solid', borderColor: 'divider' }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={500}>{alimento.nome}</Typography>
                      {alimento.categoria && (
                        <Chip label={alimento.categoria} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {[
                        alimento.energia_kcal != null && `${alimento.energia_kcal} kcal`,
                        alimento.proteina_g != null && `Prot: ${alimento.proteina_g}g`,
                        alimento.carboidratos_g != null && `Carb: ${alimento.carboidratos_g}g`,
                        alimento.lipideos_g != null && `Lip: ${alimento.lipideos_g}g`,
                      ].filter(Boolean).join(' · ')}
                      {' '}(por 100g)
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {!buscou && !loading && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
            Digite o nome do alimento para buscar
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button size="small" onClick={handleClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
}
