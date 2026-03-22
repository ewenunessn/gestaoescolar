import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, IconButton,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Autocomplete, Divider, Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Grupo, GrupoItem, salvarItensGrupo, criarGrupo, atualizarGrupo } from '../services/gruposIngredientes';

interface Produto { id: number; nome: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  grupo?: Grupo | null;
  produtos: Produto[];
}

export default function GerenciarGrupoDialog({ open, onClose, onSaved, grupo, produtos }: Props) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [itens, setItens] = useState<Array<{ produto_id: number; produto_nome: string; per_capita: string; tipo_medida: string }>>([]);
  const [produtoSel, setProdutoSel] = useState<Produto | null>(null);
  const [perCapita, setPerCapita] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(grupo?.nome || '');
      setDescricao(grupo?.descricao || '');
      setItens(grupo?.itens.map(i => ({
        produto_id: i.produto_id,
        produto_nome: i.produto_nome,
        per_capita: String(i.per_capita),
        tipo_medida: i.tipo_medida,
      })) || []);
      setProdutoSel(null);
      setPerCapita('');
    }
  }, [open, grupo]);

  function adicionarItem() {
    if (!produtoSel || !perCapita || Number(perCapita) <= 0) return;
    if (itens.find(i => i.produto_id === produtoSel.id)) return; // já existe
    setItens(prev => [...prev, {
      produto_id: produtoSel.id,
      produto_nome: produtoSel.nome,
      per_capita: perCapita,
      tipo_medida: 'gramas',
    }]);
    setProdutoSel(null);
    setPerCapita('');
  }

  function removerItem(produtoId: number) {
    setItens(prev => prev.filter(i => i.produto_id !== produtoId));
  }

  async function handleSave() {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      let grupoId = grupo?.id;
      if (grupoId) {
        await atualizarGrupo(grupoId, nome, descricao);
      } else {
        const novo = await criarGrupo(nome, descricao);
        grupoId = novo.id;
      }
      await salvarItensGrupo(grupoId!, itens.map(i => ({
        produto_id: i.produto_id,
        per_capita: Number(i.per_capita),
        tipo_medida: i.tipo_medida,
      })));
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const produtosDisponiveis = produtos.filter(p => !itens.find(i => i.produto_id === p.id));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle component="div">
        <Typography variant="subtitle1" fontWeight={600}>
          {grupo ? 'Editar Grupo' : 'Novo Grupo de Ingredientes'}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Nome do grupo" value={nome} onChange={e => setNome(e.target.value)} required size="small" fullWidth />
          <TextField label="Descrição (opcional)" value={descricao} onChange={e => setDescricao(e.target.value)} size="small" fullWidth />

          <Divider><Typography variant="caption">Ingredientes do grupo</Typography></Divider>

          {/* Adicionar item */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Autocomplete
              options={produtosDisponiveis}
              getOptionLabel={o => o.nome}
              value={produtoSel}
              onChange={(_, v) => setProdutoSel(v)}
              size="small"
              sx={{ flex: 1 }}
              renderInput={params => <TextField {...params} label="Produto" />}
            />
            <TextField
              label="Per capita (g)"
              type="number"
              value={perCapita}
              onChange={e => setPerCapita(e.target.value)}
              size="small"
              sx={{ width: 120 }}
              inputProps={{ min: 0, step: 0.1 }}
            />
            <IconButton onClick={adicionarItem} disabled={!produtoSel || !perCapita} color="primary" sx={{ mt: 0.5 }}>
              <AddIcon />
            </IconButton>
          </Box>

          {/* Lista de itens */}
          {itens.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
              Nenhum ingrediente adicionado
            </Typography>
          ) : (
            <List dense disablePadding>
              {itens.map(item => (
                <ListItem key={item.produto_id} disableGutters sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemText
                    primary={item.produto_nome}
                    secondary={`${item.per_capita}g per capita`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => removerItem(item.produto_id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small">Cancelar</Button>
        <Button onClick={handleSave} variant="contained" size="small" disabled={saving || !nome.trim()}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
