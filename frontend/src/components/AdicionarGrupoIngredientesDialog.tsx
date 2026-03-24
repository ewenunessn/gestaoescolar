import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, List, ListItemButton,
  ListItemText, Chip, CircularProgress, Tabs, Tab,
  IconButton, Tooltip,
} from '@mui/material';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { listarGrupos, excluirGrupo, Grupo } from '../services/gruposIngredientes';
import GerenciarGrupoDialog from './GerenciarGrupoDialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (itens: Array<{ produto_id: number; per_capita: number; tipo_medida: string }>) => void;
  produtos: Array<{ id: number; nome: string }>;
}

export default function AdicionarGrupoIngredientesDialog({ open, onClose, onSelect, produtos }: Props) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecionado, setSelecionado] = useState<Grupo | null>(null);
  const [tab, setTab] = useState(0);
  const [gerenciarOpen, setGerenciarOpen] = useState(false);
  const [grupoEditando, setGrupoEditando] = useState<Grupo | null>(null);

  useEffect(() => {
    if (open) {
      setSelecionado(null);
      setTab(0);
      carregar();
    }
  }, [open]);

  async function carregar() {
    setLoading(true);
    try { setGrupos(await listarGrupos()); }
    finally { setLoading(false); }
  }

  async function handleExcluir(g: Grupo) {
    if (!confirm(`Excluir o grupo "${g.nome}"?`)) return;
    await excluirGrupo(g.id);
    carregar();
  }

  function handleConfirm() {
    if (!selecionado) return;
    onSelect(selecionado.itens.map(i => ({
      produto_id: i.produto_id,
      per_capita: Number(i.per_capita),
      tipo_medida: i.tipo_medida,
    })));
    onClose();
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle component="div">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupWorkIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>Grupos de Ingredientes</Typography>
          </Box>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Usar grupo" sx={{ fontSize: '0.8rem', minHeight: 40 }} />
            <Tab label="Gerenciar grupos" sx={{ fontSize: '0.8rem', minHeight: 40 }} />
          </Tabs>
        </Box>

        <DialogContent sx={{ minHeight: 280 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : tab === 0 ? (
            /* Aba: Usar grupo */
            grupos.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                Nenhum grupo cadastrado. Vá para a aba "Gerenciar grupos" para criar.
              </Typography>
            ) : (
              <List dense disablePadding>
                {grupos.map(g => (
                  <ListItemButton
                    key={g.id}
                    selected={selecionado?.id === g.id}
                    onClick={() => setSelecionado(g)}
                    sx={{ borderRadius: 1, mb: 0.5, border: '1px solid', borderColor: selecionado?.id === g.id ? 'primary.main' : 'divider' }}
                  >
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>{g.nome}</Typography>}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {g.itens.length === 0
                            ? <Typography component="span" variant="caption" color="text.secondary">Sem ingredientes</Typography>
                            : g.itens.map(i => (
                              <Chip key={i.produto_id} label={`${i.produto_nome} ${i.per_capita}g`} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                            ))}
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )
          ) : (
            /* Aba: Gerenciar grupos */
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button size="small" startIcon={<AddIcon />} variant="outlined"
                  onClick={() => { setGrupoEditando(null); setGerenciarOpen(true); }}>
                  Novo grupo
                </Button>
              </Box>
              {grupos.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  Nenhum grupo cadastrado.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {grupos.map(g => (
                    <Box key={g.id} sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', py: 0.75 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={500}>{g.nome}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {g.itens.length} ingrediente(s)
                          {g.itens.length > 0 && `: ${g.itens.map(i => i.produto_nome).join(', ')}`}
                        </Typography>
                      </Box>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => { setGrupoEditando(g); setGerenciarOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" onClick={() => handleExcluir(g)}>
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button size="small" onClick={onClose}>Fechar</Button>
          {tab === 0 && (
            <Button size="small" variant="contained" disabled={!selecionado} onClick={handleConfirm}>
              Adicionar{selecionado ? ` (${selecionado.itens.length})` : ''}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <GerenciarGrupoDialog
        open={gerenciarOpen}
        onClose={() => setGerenciarOpen(false)}
        onSaved={carregar}
        grupo={grupoEditando}
        produtos={produtos}
      />
    </>
  );
}
