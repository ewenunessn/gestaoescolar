import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControlLabel, IconButton, Switch, TextField, Tooltip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../components/DataTable";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { useToast } from "../../../hooks/useToast";
import { ConfirmDialog } from "../../../components/BaseDialog";
import {
  listarTiposRefeicao,
  criarTipoRefeicao,
  atualizarTipoRefeicao,
  deletarTipoRefeicao,
  TipoRefeicao,
  formatarHorario
} from "../../../services/tiposRefeicao";

const TiposRefeicaoPage: React.FC = () => {
  const toast = useToast();

  const [tipos, setTipos] = useState<TipoRefeicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [editando, setEditando] = useState<TipoRefeicao | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    chave: '',
    horario: '',
    ordem: 0,
    ativo: true
  });

  useEffect(() => {
    loadTipos();
  }, []);

  const loadTipos = async () => {
    try {
      setLoading(true);
      const data = await listarTiposRefeicao();
      setTipos(data);
    } catch (err) {
      toast.error('Erro ao carregar tipos de refeição');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tipo?: TipoRefeicao) => {
    if (tipo) {
      setEditando(tipo);
      setFormData({
        nome: tipo.nome,
        chave: tipo.chave,
        horario: tipo.horario.substring(0, 5),
        ordem: tipo.ordem,
        ativo: tipo.ativo
      });
    } else {
      setEditando(null);
      setFormData({
        nome: '',
        chave: '',
        horario: '',
        ordem: tipos.length + 1,
        ativo: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditando(null);
    setFormData({
      nome: '',
      chave: '',
      horario: '',
      ordem: 0,
      ativo: true
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.nome || !formData.chave || !formData.horario) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      if (!/^\d{2}:\d{2}$/.test(formData.horario)) {
        toast.error('Horário inválido. Use o formato HH:MM');
        return;
      }

      const horarioCompleto = `${formData.horario}:00`;

      if (editando) {
        await atualizarTipoRefeicao(editando.id, {
          ...formData,
          horario: horarioCompleto
        });
        toast.success('Tipo de refeição atualizado!');
      } else {
        await criarTipoRefeicao({
          nome: formData.nome,
          chave: formData.chave,
          horario: horarioCompleto,
          ordem: formData.ordem
        });
        toast.success('Tipo de refeição criado!');
      }

      handleCloseDialog();
      loadTipos();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar tipo de refeição');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletarTipoRefeicao(id);
      toast.success('Tipo de refeição excluído!');
      setConfirmDelete(null);
      loadTipos();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir tipo de refeição');
    }
  };

  const gerarChave = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const columns: ColumnDef<TipoRefeicao>[] = useMemo(() => [
    {
      accessorKey: 'nome',
      header: 'Nome',
      size: 200,
    },
    {
      accessorKey: 'chave',
      header: 'Chave',
      size: 150,
      cell: ({ getValue }) => (
        <Chip label={getValue() as string} size="small" variant="outlined" />
      ),
    },
    {
      accessorKey: 'horario',
      header: 'Horário',
      size: 100,
      cell: ({ getValue }) => formatarHorario(getValue() as string),
    },
    {
      accessorKey: 'ordem',
      header: 'Ordem',
      size: 80,
    },
    {
      accessorKey: 'ativo',
      header: 'Status',
      size: 100,
      cell: ({ getValue, row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          {getValue() ? (
            <Chip label="Ativo" size="small" color="success" variant="outlined" icon={<CheckCircleIcon fontSize="small" />} />
          ) : (
            <Chip label="Inativo" size="small" color="error" variant="outlined" icon={<CancelIcon fontSize="small" />} />
          )}
        </Box>
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => handleOpenDialog(row.original)}
              color="primary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              onClick={() => setConfirmDelete(row.original.id)}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], []);

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: 'background.default', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader
          title="Tipos de Refeição"
          totalCount={tipos.length}
          breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Cardápios' }, { label: 'Tipos de Refeição' }]}
        />

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            title="Tipos de Refeição"
            data={tipos}
            columns={columns}
            loading={loading}
            onCreateClick={() => handleOpenDialog()}
            createButtonLabel="Novo Tipo"
          />
        </Box>
      </PageContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editando ? 'Editar Tipo de Refeição' : 'Novo Tipo de Refeição'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome"
              fullWidth
              required
              value={formData.nome}
              onChange={(e) => {
                const nome = e.target.value;
                setFormData({
                  ...formData,
                  nome,
                  chave: formData.chave || gerarChave(nome)
                });
              }}
              placeholder="Ex: Desjejum"
            />

            <TextField
              label="Chave"
              fullWidth
              required
              value={formData.chave}
              onChange={(e) => setFormData({ ...formData, chave: e.target.value })}
              placeholder="Ex: desjejum"
              helperText="Identificador único (sem espaços ou caracteres especiais)"
            />

            <TextField
              label="Horário"
              type="time"
              fullWidth
              required
              value={formData.horario}
              onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
            />

            <TextField
              label="Ordem"
              type="number"
              fullWidth
              value={formData.ordem}
              onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
              helperText="Define a ordem de exibição"
            />

            {editando && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  />
                }
                label="Ativo"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editando ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete !== null && handleDelete(confirmDelete)}
        title="Excluir Tipo de Refeição"
        message="Tem certeza que deseja excluir este tipo de refeição? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        severity="error"
      />
    </Box>
  );
};

export default TiposRefeicaoPage;
