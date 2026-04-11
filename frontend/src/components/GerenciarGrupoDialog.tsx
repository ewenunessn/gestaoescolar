import { useState, useEffect } from 'react';
import {
  Button, TextField, Box, Typography, IconButton,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Autocomplete, Divider, Chip, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { grupoServiceExtended, Grupo, GrupoItem } from '../services/gruposIngredientes';
import { BaseDialog, FormDialog } from './BaseDialog';

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
  const [tipoMedida, setTipoMedida] = useState('gramas');
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
      setTipoMedida('gramas');
    }
  }, [open, grupo]);

  function adicionarItem() {
    if (!produtoSel || !perCapita || Number(perCapita) <= 0) return;
    if (itens.find(i => i.produto_id === produtoSel.id)) return; // já existe
    setItens(prev => [...prev, {
      produto_id: produtoSel.id,
      produto_nome: produtoSel.nome,
      per_capita: perCapita,
      tipo_medida: tipoMedida,
    }]);
    setProdutoSel(null);
    setPerCapita('');
    setTipoMedida('gramas');
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
        await grupoServiceExtended.atualizar(grupoId, { nome, descricao });
      } else {
        const novo = await grupoServiceExtended.criar({ nome, descricao });
        grupoId = novo.id;
      }
      await grupoServiceExtended.salvarItensGrupo(grupoId!, itens.map(i => ({
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

  const getUnidadeLabel = (tipo: string) => {
    switch (tipo) {
      case 'gramas': return 'g';
      case 'unidade': return 'un';
      case 'mililitros': return 'ml';
      default: return tipo;
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={grupo ? 'Editar Grupo' : 'Novo Grupo de Ingredientes'}
      onSave={handleSave}
      loading={saving}
      disableSave={!nome.trim()}
    >
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
          label="Per capita"
          type="number"
          value={perCapita}
          onChange={e => setPerCapita(e.target.value)}
          size="small"
          sx={{ width: 100 }}
          inputProps={{ min: 0, step: 0.1 }}
        />
        <FormControl size="small" sx={{ width: 100 }}>
          <InputLabel>Unidade</InputLabel>
          <Select
            value={tipoMedida}
            onChange={e => setTipoMedida(e.target.value)}
            label="Unidade"
          >
            <MenuItem value="gramas">g</MenuItem>
            <MenuItem value="unidade">un</MenuItem>
            <MenuItem value="mililitros">ml</MenuItem>
          </Select>
        </FormControl>
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
                secondary={`${item.per_capita}${getUnidadeLabel(item.tipo_medida)} per capita`}
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
    </FormDialog>
  );
}
