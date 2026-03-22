import { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Paper, IconButton,
  List, ListItem, ListItemText, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import { listarGrupos, excluirGrupo, Grupo } from '../services/gruposIngredientes';
import { listarProdutos } from '../services/produtos';
import GerenciarGrupoDialog from '../components/GerenciarGrupoDialog';
import { useToast } from '../hooks/useToast';
import { usePageTitle } from '../contexts/PageTitleContext';

export default function GruposIngredientes() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [grupoEditando, setGrupoEditando] = useState<Grupo | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<Grupo | null>(null);
  const toast = useToast();
  const { setPageTitle, setBackPath } = usePageTitle();

  useEffect(() => {
    setPageTitle('Grupos de Ingredientes');
    setBackPath('/preparacoes');
    return () => { setPageTitle(''); setBackPath(null); };
  }, []);

  useEffect(() => {
    carregar();
    listarProdutos().then(setProdutos);
  }, []);

  async function carregar() {
    try {
      setGrupos(await listarGrupos());
    } catch {
      toast.error('Erro ao carregar grupos');
    }
  }

  async function handleExcluir(grupo: Grupo) {
    try {
      await excluirGrupo(grupo.id);
      toast.success('Grupo excluído');
      carregar();
    } catch {
      toast.error('Erro ao excluir grupo');
    }
    setConfirmarExclusao(null);
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <GroupWorkIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>Grupos de Ingredientes</Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => { setGrupoEditando(null); setDialogOpen(true); }}
        >
          Novo Grupo
        </Button>
      </Box>

      {grupos.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Nenhum grupo cadastrado.</Typography>
          <Typography variant="caption" color="text.secondary">
            Crie grupos com ingredientes que se repetem em várias refeições (ex: temperos básicos).
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {grupos.map(g => (
            <Paper key={g.id} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography fontWeight={600}>{g.nome}</Typography>
                  {g.descricao && <Typography variant="caption" color="text.secondary">{g.descricao}</Typography>}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {g.itens.map(i => (
                      <Chip key={i.produto_id} label={`${i.produto_nome} · ${i.per_capita}g`} size="small" variant="outlined" />
                    ))}
                    {g.itens.length === 0 && <Typography variant="caption" color="text.secondary">Sem ingredientes</Typography>}
                  </Box>
                </Box>
                <Box>
                  <IconButton size="small" onClick={() => { setGrupoEditando(g); setDialogOpen(true); }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setConfirmarExclusao(g)}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      <GerenciarGrupoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={carregar}
        grupo={grupoEditando}
        produtos={produtos}
      />

      <Dialog open={!!confirmarExclusao} onClose={() => setConfirmarExclusao(null)}>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography>Excluir o grupo "{confirmarExclusao?.nome}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarExclusao(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={() => confirmarExclusao && handleExcluir(confirmarExclusao)}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
