import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Autocomplete,
  Tooltip,
  Popover,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router";
import { useToast } from "../../../hooks/useToast";
import { CardapioModalidade, MESES } from "../../../services/cardapiosModalidade";
import { listarModalidades } from "../../../services/modalidadeService";
import { useNutricionistaQueries } from "../../../hooks/queries/useNutricionistaQueries";
import {
  useCardapiosModalidade,
  useCriarCardapioModalidade,
  useEditarCardapioModalidade,
  useRemoverCardapioModalidade
} from "../../../hooks/queries/useCardapioModalidadeQueries";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { DataTable } from "../../../components/DataTable";
import PageHeader from "../../../components/PageHeader";
import PageContainer from "../../../components/PageContainer";

const CardapiosModalidadePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // React Query hooks
  const { data: cardapios = [], isLoading: loading } = useCardapiosModalidade();
  const { data: nutricionistas = [] } = useNutricionistaQueries.useList();
  const criarCardapioMutation = useCriarCardapioModalidade();
  const editarCardapioMutation = useEditarCardapioModalidade();
  const removerCardapioMutation = useRemoverCardapioModalidade();

  // Garantir que cardapios é sempre um array
  const cardapiosArray = Array.isArray(cardapios) ? cardapios : [];

  // Estados principais
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardapioToDelete, setCardapioToDelete] = useState<CardapioModalidade | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  // Estados de filtro
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState({
    modalidade: 'todos',
    mes: 'todos',
    status: 'todos',
  });

  // Estados do formulário
  const [formData, setFormData] = useState({
    modalidade_id: '',
    modalidades_ids: [] as number[],
    nome: '',
    mes: '',
    ano: new Date().getFullYear().toString(),
    observacao: '',
    ativo: true,
    nutricionista_id: '',
    data_aprovacao_nutricionista: '',
    observacoes_nutricionista: ''
  });

  // Estados de validação
  const [erroCardapio, setErroCardapio] = useState("");
  const [touched, setTouched] = useState<any>({});
  const [formDataInicial, setFormDataInicial] = useState<any>(null);

  useEffect(() => {
    loadModalidades();
  }, []);

  const loadModalidades = async () => {
    try {
      const modalidadesData = await listarModalidades();
      setModalidades(modalidadesData);
    } catch (err: any) {
      console.error('Erro ao carregar modalidades:', err);
      toast.error('Erro ao carregar modalidades');
    }
  };

  // Filtrar cardápios
  const cardapiosFiltrados = useMemo(() => {
    return cardapiosArray.filter((cardapio) => {
      // Filtro de modalidade
      if (filters.modalidade !== 'todos' && cardapio.modalidade_id.toString() !== filters.modalidade) {
        return false;
      }

      // Filtro de mês
      if (filters.mes !== 'todos' && cardapio.mes.toString() !== filters.mes) {
        return false;
      }

      // Filtro de status
      if (filters.status === 'ativo' && !cardapio.ativo) return false;
      if (filters.status === 'inativo' && cardapio.ativo) return false;

      return true;
    }).sort((a, b) => {
      // Ordenar por ano e mês (mais recente primeiro)
      if (a.ano !== b.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });
  }, [cardapiosArray, filters]);

  // Definir colunas
  const columns = useMemo<ColumnDef<CardapioModalidade>[]>(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 80,
      enableSorting: true,
    },
    {
      accessorKey: 'nome',
      header: 'Nome',
      size: 250,
      enableSorting: true,
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {row.original.nome}
        </Typography>
      ),
    },
    {
      id: 'modalidades',
      header: 'Modalidades',
      size: 250,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {(row.original as any).modalidades_nomes ? (
            (row.original as any).modalidades_nomes.split(', ').map((nome: string, idx: number) => (
              <Chip key={idx} label={nome} size="small" variant="outlined" />
            ))
          ) : (
            <Chip label={row.original.modalidade_nome} size="small" variant="outlined" />
          )}
        </Box>
      ),
    },
    {
      id: 'competencia',
      header: 'Competência',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <Box display="flex" alignItems="center" gap={1}>
          <CalendarIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {MESES[row.original.mes]} / {row.original.ano}
          </Typography>
        </Box>
      ),
    },
    {
      accessorKey: 'total_refeicoes',
      header: 'Preparações',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as number | undefined;
        return <Chip label={String(value || 0)} size="small" color="primary" variant="outlined" />;
      },
    },
    {
      accessorKey: 'total_dias',
      header: 'Dias',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as number | undefined;
        return <Chip label={String(value || 0)} size="small" />;
      },
    },
    {
      accessorKey: 'ativo',
      header: 'Status',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Tooltip title={getValue() ? 'Ativo' : 'Inativo'}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: getValue() ? 'success.main' : 'error.main',
              display: 'inline-block',
            }}
          />
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Ver Calendário">
            <IconButton
              size="small"
              onClick={() => navigate(`/cardapios/${row.original.id}/calendario`)}
              color="primary"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => handleOpenDialog(row.original)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              onClick={() => openDeleteModal(row.original)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [navigate]);

  const handleRowClick = useCallback((cardapio: CardapioModalidade) => {
    navigate(`/cardapios/${cardapio.id}/calendario`);
  }, [navigate]);

  const hasUnsavedChanges = () => {
    if (!formDataInicial) return false;
    return JSON.stringify(formData) !== JSON.stringify(formDataInicial);
  };

  const handleOpenDialog = (cardapio?: CardapioModalidade) => {
    setErroCardapio("");
    setTouched({});
    if (cardapio) {
      setEditMode(true);
      setSelectedId(cardapio.id);

      // Converter data ISO para formato yyyy-MM-dd se necessário
      let dataAprovacao = cardapio.data_aprovacao_nutricionista || '';
      if (dataAprovacao && dataAprovacao.includes('T')) {
        dataAprovacao = dataAprovacao.split('T')[0];
      }

      // Obter modalidades do cardápio
      const modalidadesIds = (cardapio as any).modalidades_ids || [cardapio.modalidade_id];

      const formInicial = {
        modalidade_id: cardapio.modalidade_id?.toString() || '',
        modalidades_ids: modalidadesIds,
        nome: cardapio.nome,
        mes: cardapio.mes?.toString() || '',
        ano: cardapio.ano?.toString() || '',
        observacao: cardapio.observacao || '',
        ativo: cardapio.ativo,
        nutricionista_id: cardapio.nutricionista_id?.toString() || '',
        data_aprovacao_nutricionista: dataAprovacao,
        observacoes_nutricionista: cardapio.observacoes_nutricionista || ''
      };
      setFormData(formInicial);
      setFormDataInicial(JSON.parse(JSON.stringify(formInicial)));
    } else {
      setEditMode(false);
      setSelectedId(null);
      const formInicial = {
        modalidade_id: '',
        modalidades_ids: [],
        nome: '',
        mes: '',
        ano: new Date().getFullYear().toString(),
        observacao: '',
        ativo: true,
        nutricionista_id: '',
        data_aprovacao_nutricionista: '',
        observacoes_nutricionista: ''
      };
      setFormData(formInicial);
      setFormDataInicial(JSON.parse(JSON.stringify(formInicial)));
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    if (hasUnsavedChanges()) {
      setConfirmClose(true);
    } else {
      setOpenDialog(false);
    }
  };

  const confirmCloseDialog = () => {
    setConfirmClose(false);
    setOpenDialog(false);
  };

  const handleSubmit = async () => {
    try {
      // Validação
      if (formData.modalidades_ids.length === 0 || !formData.nome || !formData.mes || !formData.ano) {
        setErroCardapio('Preencha todos os campos obrigatórios');
        setTouched({ modalidades_ids: true, nome: true, mes: true, ano: true });
        return;
      }

      if (parseInt(formData.ano) < 2000 || parseInt(formData.ano) > 2100) {
        setErroCardapio('Ano deve estar entre 2000 e 2100');
        return;
      }

      const data = {
        modalidades_ids: formData.modalidades_ids,
        nome: formData.nome,
        mes: parseInt(formData.mes),
        ano: parseInt(formData.ano),
        observacao: formData.observacao || undefined,
        ativo: formData.ativo,
        nutricionista_id: formData.nutricionista_id ? parseInt(formData.nutricionista_id) : undefined,
        data_aprovacao_nutricionista: formData.data_aprovacao_nutricionista || undefined,
        observacoes_nutricionista: formData.observacoes_nutricionista || undefined
      };

      if (editMode && selectedId) {
        await editarCardapioMutation.mutateAsync({ id: selectedId, data });
        toast.success('Cardápio atualizado!');
      } else {
        await criarCardapioMutation.mutateAsync(data);
        toast.success('Cardápio criado!');
      }

      setOpenDialog(false);
      setErroCardapio("");
    } catch (err: any) {
      setErroCardapio(err.message || 'Erro ao salvar cardápio');
    }
  };

  const openDeleteModal = (cardapio: CardapioModalidade) => {
    setCardapioToDelete(cardapio);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setCardapioToDelete(null);
  };

  const handleDelete = async () => {
    if (!cardapioToDelete) return;
    try {
      await removerCardapioMutation.mutateAsync(cardapioToDelete.id);
      toast.success('Cardápio removido!');
      closeDeleteModal();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Erro ao remover. O cardápio pode estar em uso.';
      toast.error(errorMessage);
    }
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 56px)',
        bgcolor: '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PageContainer fullHeight>
        <PageHeader title="Cardápios" />

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            data={cardapiosFiltrados}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar cardápios..."
            onCreateClick={() => handleOpenDialog()}
            createButtonLabel="Novo Cardápio"
            onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
          />
        </Box>
      </PageContainer>

      {/* Popover de Filtros */}
      {/* Popover de Filtros - Renderização condicional para melhor performance */}
      {Boolean(filterAnchorEl) && (
        <Popover
          open={true}
          anchorEl={filterAnchorEl}
          onClose={() => setFilterAnchorEl(null)}
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
              <InputLabel>Modalidade</InputLabel>
              <Select
                value={filters.modalidade}
                label="Modalidade"
                onChange={(e) => setFilters({ ...filters, modalidade: e.target.value })}
              >
                <MenuItem value="todos">Todas</MenuItem>
                {modalidades.map((m) => (
                  <MenuItem key={m.id} value={m.id.toString()}>
                    {m.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Mês</InputLabel>
              <Select
                value={filters.mes}
                label="Mês"
                onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
              >
                <MenuItem value="todos">Todos</MenuItem>
                {Object.entries(MESES).map(([num, nome]) => (
                  <MenuItem key={num} value={num}>
                    {nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="ativo">Ativos</MenuItem>
                <MenuItem value="inativo">Inativos</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setFilters({ modalidade: 'todos', mes: 'todos', status: 'todos' });
                }}
              >
                Limpar
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => setFilterAnchorEl(null)}
              >
                Aplicar
              </Button>
            </Box>

            {/* Indicador de filtros ativos */}
            {(filters.modalidade !== 'todos' || filters.mes !== 'todos' || filters.status !== 'todos') && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 1, display: 'block' }}
                >
                  Filtros ativos:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {filters.modalidade !== 'todos' && (
                    <Chip
                      label={`Modalidade: ${
                        modalidades.find(m => m.id.toString() === filters.modalidade)?.nome || 'Selecionada'
                      }`}
                      size="small"
                      onDelete={() => setFilters({ ...filters, modalidade: 'todos' })}
                    />
                  )}
                  {filters.mes !== 'todos' && (
                    <Chip
                      label={`Mês: ${MESES[parseInt(filters.mes)]}`}
                      size="small"
                      onDelete={() => setFilters({ ...filters, mes: 'todos' })}
                    />
                  )}
                  {filters.status !== 'todos' && (
                    <Chip
                      label={`Status: ${filters.status === 'ativo' ? 'Ativos' : 'Inativos'}`}
                      size="small"
                      onDelete={() => setFilters({ ...filters, status: 'todos' })}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Popover>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                {editMode ? 'Editar Cardápio' : 'Novo Cardápio'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Preencha os dados do cardápio
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {erroCardapio && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">{erroCardapio}</Typography>
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            {/* Informações Básicas */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Informações Básicas
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    options={modalidades}
                    getOptionLabel={(option) => option.nome}
                    value={modalidades.filter(m => formData.modalidades_ids.includes(m.id))}
                    onChange={(_, newValue) => {
                      setFormData({ ...formData, modalidades_ids: newValue.map(m => m.id) });
                      if (erroCardapio) setErroCardapio("");
                    }}
                    onBlur={() => setTouched({ ...touched, modalidades_ids: true })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Modalidades"
                        required
                        error={touched.modalidades_ids && formData.modalidades_ids.length === 0}
                        helperText={
                          touched.modalidades_ids && formData.modalidades_ids.length === 0
                            ? "Selecione pelo menos uma modalidade"
                            : "Selecione uma ou mais modalidades para este cardápio"
                        }
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option.nome}
                          size="small"
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    noOptionsText="Nenhuma modalidade encontrada"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl
                    fullWidth
                    required
                    error={touched.mes && !formData.mes}
                  >
                    <InputLabel>Mês</InputLabel>
                    <Select
                      value={formData.mes}
                      onChange={(e) => {
                        const novoMes = e.target.value;
                        setFormData({ ...formData, mes: novoMes });
                        
                        // Atualizar nome automaticamente se não estiver em modo de edição
                        if (!editMode && novoMes && formData.ano) {
                          const mesNome = MESES[parseInt(novoMes)];
                          const descricao = formData.observacao || '';
                          const nomeBase = `Cardápio ${mesNome} ${formData.ano}`;
                          setFormData(prev => ({
                            ...prev,
                            mes: novoMes,
                            nome: descricao ? `${nomeBase} - ${descricao}` : nomeBase
                          }));
                        }
                        
                        if (erroCardapio) setErroCardapio("");
                      }}
                      onBlur={() => setTouched({ ...touched, mes: true })}
                      label="Mês"
                    >
                      {Object.entries(MESES).map(([num, nome]) => (
                        <MenuItem key={num} value={num}>
                          {nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Ano"
                    type="number"
                    fullWidth
                    required
                    value={formData.ano}
                    onChange={(e) => {
                      const novoAno = e.target.value;
                      setFormData({ ...formData, ano: novoAno });
                      
                      // Atualizar nome automaticamente se não estiver em modo de edição
                      if (!editMode && formData.mes && novoAno) {
                        const mesNome = MESES[parseInt(formData.mes)];
                        const descricao = formData.observacao || '';
                        const nomeBase = `Cardápio ${mesNome} ${novoAno}`;
                        setFormData(prev => ({
                          ...prev,
                          ano: novoAno,
                          nome: descricao ? `${nomeBase} - ${descricao}` : nomeBase
                        }));
                      }
                      
                      if (erroCardapio) setErroCardapio("");
                    }}
                    onBlur={() => setTouched({ ...touched, ano: true })}
                    error={touched.ano && !formData.ano}
                    helperText={touched.ano && !formData.ano ? "Campo obrigatório" : ""}
                    inputProps={{ min: 2000, max: 2100 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Descrição (Opcional)"
                    fullWidth
                    value={formData.observacao}
                    onChange={(e) => {
                      const descricao = e.target.value;
                      setFormData({ ...formData, observacao: descricao });
                      
                      // Atualizar nome automaticamente se não estiver em modo de edição
                      if (!editMode && formData.mes && formData.ano) {
                        const mesNome = MESES[parseInt(formData.mes)];
                        const nomeBase = `Cardápio ${mesNome} ${formData.ano}`;
                        setFormData(prev => ({
                          ...prev,
                          observacao: descricao,
                          nome: descricao ? `${nomeBase} - ${descricao}` : nomeBase
                        }));
                      }
                    }}
                    placeholder="Ex: Parcial, Integral, Especial..."
                    helperText="Esta descrição será adicionada ao nome do cardápio"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Nome do Cardápio (Gerado Automaticamente)"
                    fullWidth
                    required
                    value={formData.nome}
                    onChange={(e) => {
                      setFormData({ ...formData, nome: e.target.value });
                      if (erroCardapio) setErroCardapio("");
                    }}
                    onBlur={() => setTouched({ ...touched, nome: true })}
                    error={touched.nome && !formData.nome}
                    helperText={touched.nome && !formData.nome ? "Campo obrigatório" : "Você pode editar manualmente se necessário"}
                    disabled={!editMode}
                    InputProps={{
                      readOnly: !editMode,
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Aprovação Nutricional */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Aprovação Nutricional
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Nutricionista Responsável</InputLabel>
                    <Select
                      value={formData.nutricionista_id}
                      onChange={(e) => setFormData({ ...formData, nutricionista_id: e.target.value })}
                      label="Nutricionista Responsável"
                    >
                      <MenuItem value="">
                        <em>Nenhum</em>
                      </MenuItem>
                      {nutricionistas && Array.isArray(nutricionistas) && nutricionistas.filter(n => n.ativo).map((n) => (
                        <MenuItem key={n.id} value={n.id}>
                          {n.nome} - CRN-{n.crn_regiao} {n.crn}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {formData.nutricionista_id && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        label="Data de Aprovação"
                        type="date"
                        fullWidth
                        value={formData.data_aprovacao_nutricionista}
                        onChange={(e) => setFormData({ ...formData, data_aprovacao_nutricionista: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Observações do Nutricionista"
                        fullWidth
                        multiline
                        rows={2}
                        value={formData.observacoes_nutricionista}
                        onChange={(e) => setFormData({ ...formData, observacoes_nutricionista: e.target.value })}
                        placeholder="Observações técnicas sobre o cardápio..."
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>

            <Divider />

            {/* Status */}
            <Box>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.ativo ? 'ativo' : 'inativo'}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.value === 'ativo' })}
                  label="Status"
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            disabled={criarCardapioMutation.isPending || editarCardapioMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              criarCardapioMutation.isPending ||
              editarCardapioMutation.isPending ||
              formData.modalidades_ids.length === 0 ||
              !formData.nome.trim()
            }
            startIcon={
              (criarCardapioMutation.isPending || editarCardapioMutation.isPending) ? (
                <CircularProgress size={20} />
              ) : null
            }
          >
            {(criarCardapioMutation.isPending || editarCardapioMutation.isPending)
              ? 'Salvando...'
              : editMode
              ? 'Salvar Cardápio'
              : 'Criar Cardápio'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o cardápio "{cardapioToDelete?.nome}"? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteModal} disabled={removerCardapioMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={removerCardapioMutation.isPending}
          >
            {removerCardapioMutation.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação para fechar */}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            Descartar alterações?
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Você tem alterações não salvas. Deseja realmente descartar essas alterações?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClose(false)} variant="outlined">
            Continuar Editando
          </Button>
          <Button onClick={confirmCloseDialog} color="error" variant="contained">
            Descartar
          </Button>
        </DialogActions>
      </Dialog>

      <LoadingOverlay
        open={
          criarCardapioMutation.isPending ||
          editarCardapioMutation.isPending ||
          removerCardapioMutation.isPending
        }
        message={
          criarCardapioMutation.isPending
            ? 'Criando cardápio...'
            : editarCardapioMutation.isPending
            ? 'Salvando cardápio...'
            : removerCardapioMutation.isPending
            ? 'Excluindo cardápio...'
            : 'Processando...'
        }
      />
    </Box>
  );
};

export default CardapiosModalidadePage;
