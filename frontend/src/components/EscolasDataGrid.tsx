import React, { useMemo, useState, useCallback } from 'react';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableOptions,
  MRT_GlobalFilterTextField,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFullScreenButton,
} from 'material-react-table';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import StatusIndicator from './StatusIndicator';
import { Escola } from '../types/escola';
import { useToast } from '../hooks/useToast';
import { useCriarEscola, useAtualizarEscola, useExcluirEscola } from '../hooks/queries';
import * as XLSX from 'xlsx';

interface EscolasDataGridProps {
  escolas: Escola[];
  loading: boolean;
  onRefresh: () => void;
  onViewEscola: (escola: Escola) => void;
}

const EscolasDataGrid: React.FC<EscolasDataGridProps> = React.memo(({
  escolas,
  loading,
  onRefresh,
  onViewEscola,
}) => {
  const criarEscolaMutation = useCriarEscola();
  const atualizarEscolaMutation = useAtualizarEscola();
  const excluirEscolaMutation = useExcluirEscola();
  const toast = useToast();

  // Estados do modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEscola, setEditingEscola] = useState<Escola | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [escolaToDelete, setEscolaToDelete] = useState<Escola | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    municipio: '',
    telefone: '',
    nome_gestor: '',
    administracao: '' as '' | 'municipal' | 'estadual' | 'federal' | 'particular',
    ativo: true,
    total_alunos: 0,
  });

  // Definir colunas da tabela
  const columns = useMemo<MRT_ColumnDef<Escola>[]>(
    () => [
      {
        accessorKey: 'nome',
        header: 'Nome da Escola',
        size: 250,
        Cell: ({ cell, row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {cell.getValue<string>()}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        accessorKey: 'endereco',
        header: 'Endereço',
        size: 200,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {cell.getValue<string>() || '-'}
          </Typography>
        ),
      },
      {
        accessorKey: 'telefone',
        header: 'Telefone',
        size: 120,
        Cell: ({ cell }) => (
          <Typography variant="body2">
            {cell.getValue<string>() || '-'}
          </Typography>
        ),
      },
      {
        accessorKey: 'nome_gestor',
        header: 'Gestor',
        size: 150,
        Cell: ({ cell }) => (
          <Typography variant="body2">
            {cell.getValue<string>() || '-'}
          </Typography>
        ),
      },
      {
        accessorKey: 'municipio',
        header: 'Município',
        size: 150,
        Cell: ({ cell }) => (
          <Typography variant="body2">
            {cell.getValue<string>() || '-'}
          </Typography>
        ),
      },
      {
        accessorKey: 'administracao',
        header: 'Administração',
        size: 120,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          if (!value) return '-';
          
          const colorMap = {
            municipal: 'primary',
            estadual: 'secondary',
            federal: 'success',
            particular: 'warning',
          } as const;

          return (
            <Chip
              label={value.charAt(0).toUpperCase() + value.slice(1)}
              color={colorMap[value as keyof typeof colorMap] || 'default'}
              size="small"
              variant="outlined"
            />
          );
        },
        filterVariant: 'select',
        filterSelectOptions: [
          { label: 'Municipal', value: 'municipal' },
          { label: 'Estadual', value: 'estadual' },
          { label: 'Federal', value: 'federal' },
          { label: 'Particular', value: 'particular' },
        ],
      },
      {
        accessorKey: 'total_alunos',
        header: 'Total Alunos',
        size: 100,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            {cell.getValue<number>() || 0}
          </Typography>
        ),
      },
      {
        accessorKey: 'ativo',
        header: 'Status',
        size: 100,
        Cell: ({ cell }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusIndicator 
              status={cell.getValue<boolean>() ? 'ativo' : 'inativo'} 
              size="small" 
            />
            <Typography variant="body2">
              {cell.getValue<boolean>() ? 'Ativo' : 'Inativo'}
            </Typography>
          </Box>
        ),
        filterVariant: 'select',
        filterSelectOptions: [
          { label: 'Ativo', value: 'true' },
          { label: 'Inativo', value: 'false' },
        ],
      },
    ],
    []
  );

  // Funções do modal com useCallback para evitar re-renders
  const handleOpenModal = useCallback((escola?: Escola) => {
    if (escola) {
      setEditingEscola(escola);
      setFormData({
        nome: escola.nome,
        endereco: escola.endereco || '',
        municipio: escola.municipio || '',
        telefone: escola.telefone || '',
        nome_gestor: escola.nome_gestor || '',
        administracao: escola.administracao || '',
        ativo: escola.ativo,
        total_alunos: escola.total_alunos || 0,
      });
    } else {
      setEditingEscola(null);
      setFormData({
        nome: '',
        endereco: '',
        municipio: '',
        telefone: '',
        nome_gestor: '',
        administracao: '',
        ativo: true,
        total_alunos: 0,
      });
    }
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingEscola(null);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      if (editingEscola) {
        await atualizarEscolaMutation.mutateAsync({ 
          id: editingEscola.id, 
          data: formData 
        });
        toast.success('Escola atualizada com sucesso!');
      } else {
        await criarEscolaMutation.mutateAsync(formData);
        toast.success('Escola criada com sucesso!');
      }
      
      handleCloseModal();
      onRefresh();
    } catch (error) {
      toast.error('Erro ao salvar escola');
    }
  }, [editingEscola, formData, atualizarEscolaMutation, criarEscolaMutation, toast, handleCloseModal, onRefresh]);

  const handleDelete = useCallback(async () => {
    if (!escolaToDelete) return;
    
    try {
      await excluirEscolaMutation.mutateAsync(escolaToDelete.id);
      toast.success('Escola removida com sucesso!');
      setDeleteConfirmOpen(false);
      setEscolaToDelete(null);
      onRefresh();
    } catch (error) {
      toast.error('Erro ao remover escola');
    }
  }, [escolaToDelete, excluirEscolaMutation, toast, onRefresh]);

  // Função para exportar dados com useCallback
  const handleExportData = useCallback(() => {
    const exportData = escolas.map(escola => ({
      Nome: escola.nome,
      Endereço: escola.endereco || '',
      Município: escola.municipio || '',
      Telefone: escola.telefone || '',
      Gestor: escola.nome_gestor || '',
      Administração: escola.administracao || '',
      'Total Alunos': escola.total_alunos || 0,
      Status: escola.ativo ? 'Ativo' : 'Inativo',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Escolas');
    XLSX.writeFile(wb, 'escolas.xlsx');
  }, [escolas]);

  return (
    <>
      <MaterialReactTable
        columns={columns}
        data={escolas}
        state={{
          isLoading: loading,
        }}
        enableColumnFilterModes
        enableColumnOrdering
        enableGrouping={false} // Desabilitar agrupamento por padrão para melhor performance
        enableColumnPinning
        enableFacetedValues={false} // Desabilitar para melhor performance
        enableRowActions
        enableRowSelection
        enableColumnResizing
        enableDensityToggle
        enableFullScreenToggle
        enableGlobalFilterModes
        enablePagination
        enableSorting
        enableBottomToolbar
        enableTopToolbar
        enableRowVirtualization // Habilitar virtualização para melhor performance
        initialState={{
          density: 'compact',
          pagination: { pageSize: 50, pageIndex: 0 }, // Aumentar pageSize para menos paginação
          showColumnFilters: false,
          showGlobalFilter: true,
        }}
        muiTableContainerProps={{
          sx: {
            minHeight: '500px',
            maxHeight: '70vh', // Limitar altura para melhor performance
          },
        }}
        muiTableProps={{
          sx: {
            tableLayout: 'fixed',
          },
        }}
        muiTableBodyProps={{
          sx: {
            '& tr:hover': {
              backgroundColor: 'action.hover',
            },
          },
        }}
        positionActionsColumn="last"
        renderRowActions={({ row }) => {
          const escola = row.original;
          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Visualizar">
                <IconButton
                  size="small"
                  onClick={() => onViewEscola(escola)}
                >
                  <ViewIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Editar">
                <IconButton
                  size="small"
                  onClick={() => handleOpenModal(escola)}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setEscolaToDelete(escola);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          );
        }}
        renderTopToolbarCustomActions={({ table }) => (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenModal()}
              size="small"
            >
              Nova Escola
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportData}
              size="small"
            >
              Exportar
            </Button>
          </Box>
        )}
        renderToolbarInternalActions={({ table }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <MRT_GlobalFilterTextField table={table} />
            <MRT_ShowHideColumnsButton table={table} />
            <MRT_ToggleDensePaddingButton table={table} />
            <MRT_ToggleFullScreenButton table={table} />
          </Box>
        )}
      />

      {/* Modal de Criação/Edição */}
      <Dialog 
        open={modalOpen} 
        onClose={handleCloseModal} 
        maxWidth="md" 
        fullWidth
        disableEscapeKeyDown={false}
        keepMounted={false} // Não manter montado para melhor performance
      >
        <DialogTitle>
          {editingEscola ? 'Editar Escola' : 'Nova Escola'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nome da Escola"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              fullWidth
              required
              size="small"
            />
            <TextField
              label="Endereço"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Município"
              value={formData.municipio}
              onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Nome do Gestor"
              value={formData.nome_gestor}
              onChange={(e) => setFormData({ ...formData, nome_gestor: e.target.value })}
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Administração</InputLabel>
              <Select
                value={formData.administracao}
                onChange={(e) => setFormData({ ...formData, administracao: e.target.value as any })}
                label="Administração"
              >
                <MenuItem value="municipal">Municipal</MenuItem>
                <MenuItem value="estadual">Estadual</MenuItem>
                <MenuItem value="federal">Federal</MenuItem>
                <MenuItem value="particular">Particular</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Total de Alunos"
              type="number"
              value={formData.total_alunos}
              onChange={(e) => setFormData({ ...formData, total_alunos: parseInt(e.target.value) || 0 })}
              fullWidth
              size="small"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                />
              }
              label="Escola Ativa"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={criarEscolaMutation.isPending || atualizarEscolaMutation.isPending}
          >
            {criarEscolaMutation.isPending || atualizarEscolaMutation.isPending ? 'Salvando...' : (editingEscola ? 'Atualizar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta ação não pode ser desfeita.
          </Alert>
          <Typography>
            Tem certeza que deseja excluir a escola "{escolaToDelete?.nome}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

EscolasDataGrid.displayName = 'EscolasDataGrid';

export default EscolasDataGrid;