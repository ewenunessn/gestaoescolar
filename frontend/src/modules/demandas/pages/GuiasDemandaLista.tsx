import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
  Divider,
  Typography,
  Chip,
  CircularProgress,
  Popover,
  Checkbox,
  FormControlLabel,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  CalendarMonth as CalendarIcon,
  Delete as DeleteIcon,
  TableChart as TableChartIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { ColumnDef } from "@tanstack/react-table";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import SeletorPeriodoCalendario, { Periodo } from "../../../components/SeletorPeriodoCalendario";
import { JobProgressModal } from "../../../components/JobProgressModal";
import { guiaService } from "../../../services/guiaService";
import { useToast } from "../../../hooks/useToast";
import {
  buscarStatusGeracaoGuiaDemanda,
  iniciarGeracaoGuiaDemanda,
  GerarGuiasResponse,
} from "../../../services/guiaDemandaGenerationService";
import { listarCardapiosDisponiveis, CardapioDisponivel } from "../../../services/demanda";
import { DataTable } from "../../../components/DataTable";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import useRealtimeRefresh from "../../../hooks/useRealtimeRefresh";

interface Competencia {
  mes: number;
  ano: number;
  guia_id: number;
  guia_nome: string;
  guia_status: string;
  competencia_mes_ano?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
  total_itens: number;
  total_escolas: number;
  qtd_pendente: number;
  qtd_programada: number;
  qtd_parcial: number;
  qtd_entregue: number;
  qtd_cancelado: number;
}

const GuiasDemandaLista: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Estados principais
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados de filtro
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState({
    status: 'todos',
    mes: 'todos',
  });

  // Modal nova competência
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  const [formDataInicial, setFormDataInicial] = useState<any>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  // Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [competenciaToDelete, setCompetenciaToDelete] = useState<Competencia | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal gerar guia de demanda
  const [openGerarGuia, setOpenGerarGuia] = useState(false);
  const [competenciaGerar, setCompetenciaGerar] = useState('');
  const [periodosGerar, setPeriodosGerar] = useState<Periodo[]>([]);
  const [seletorOpen, setSeletorOpen] = useState(false);
  const [considerarFatorCorrecao, setConsiderarFatorCorrecao] = useState(true);
  const [gerandoGuias, setGerandoGuias] = useState(false);
  const [resultadoGuias, setResultadoGuias] = useState<GerarGuiasResponse | null>(null);

  // Cardápios disponíveis para a competência
  const [cardapiosDisponiveis, setCardapiosDisponiveis] = useState<CardapioDisponivel[]>([]);
  const [cardapiosSelecionados, setCardapiosSelecionados] = useState<number[]>([]);
  const [loadingCardapios, setLoadingCardapios] = useState(false);
  
  // Job progress
  const [jobProgressOpen, setJobProgressOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);

  useEffect(() => {
    loadCompetencias();
  }, []);

  const loadCompetencias = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await guiaService.listarCompetencias();
      setCompetencias(data);
    } catch (error) {
      console.error('Erro ao carregar competências:', error);
      toast.error('Erro ao carregar guias de demanda');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useRealtimeRefresh({
    domains: ['guias'],
    onRefresh: () => {
      loadCompetencias(false);
    },
  });

  const getMesNome = (mes: number) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[mes - 1];
  };

  const getStatusColor = (status: string): 'default' | 'warning' | 'success' | 'error' => {
    const statusMap: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
      'rascunho': 'default',
      'em_andamento': 'warning',
      'finalizada': 'success',
      'cancelada': 'error'
    };
    return statusMap[status] || 'default';
  };

  // Filtrar competências
  const competenciasFiltradas = useMemo(() => {
    return competencias.filter((comp) => {
      // Filtro de status
      if (filters.status !== 'todos' && comp.guia_status !== filters.status) {
        return false;
      }

      // Filtro de mês
      if (filters.mes !== 'todos' && comp.mes.toString() !== filters.mes) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Ordenar por ano e mês (mais recente primeiro)
      if (a.ano !== b.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });
  }, [competencias, filters]);

  // Definir colunas
  const columns = useMemo<ColumnDef<Competencia>[]>(() => [
    {
      accessorKey: 'guia_id',
      header: 'ID',
      size: 80,
      enableSorting: true,
    },
    {
      id: 'competencia',
      header: 'Competência',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {getMesNome(row.original.mes)}/{row.original.ano}
        </Typography>
      ),
    },
    {
      accessorKey: 'guia_nome',
      header: 'Nome',
      size: 250,
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <Typography variant="body2">
          {getValue() as string || `Guia ${row.original.mes}/${row.original.ano}`}
        </Typography>
      ),
    },
    {
      accessorKey: 'total_escolas',
      header: 'Escolas',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Chip label={String(getValue() || 0)} size="small" color="primary" />
      ),
    },
    {
      accessorKey: 'total_itens',
      header: 'Itens',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Chip label={String(getValue() || 0)} size="small" />
      ),
    },
    {
      accessorKey: 'guia_status',
      header: 'Status',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => {
        const status = getValue() as string;
        return (
          <Chip
            label={status}
            size="small"
            color={getStatusColor(status)}
          />
        );
      },
    },
    {
      id: 'actions',
      header: 'Ações',
      size: 120,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Ver Detalhes">
            <IconButton
              size="small"
              onClick={() => navigate(`/guias-demanda/${row.original.guia_id}`)}
              color="primary"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              color="delete"
              onClick={() => openDeleteModal(row.original)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [navigate]);

  const handleRowClick = useCallback((comp: Competencia) => {
    navigate(`/guias-demanda/${comp.guia_id}`);
  }, [navigate]);

  const openDeleteModal = (comp: Competencia) => {
    setCompetenciaToDelete(comp);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setCompetenciaToDelete(null);
  };

  const handleDelete = async () => {
    if (!competenciaToDelete) return;
    try {
      setDeleting(true);
      await guiaService.deletarGuia(competenciaToDelete.guia_id);
      toast.success('Guia excluída com sucesso!');
      closeDeleteModal();
      loadCompetencias();
    } catch (error) {
      console.error('Erro ao deletar guia:', error);
      toast.error('Não foi possível excluir a guia.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCriarCompetencia = async () => {
    try {
      await guiaService.criarGuia({
        mes: formData.mes,
        ano: formData.ano,
        nome: `Guia ${formData.mes}/${formData.ano}`,
        observacao: ''
      });
      toast.success('Competência criada com sucesso!');
      setOpenModal(false);
      loadCompetencias();
    } catch (error) {
      console.error('Erro ao criar competência:', error);
      toast.error('Erro ao criar competência');
    }
  };

  const carregarCardapios = useCallback(async (competencia?: string) => {
    const comp = competencia || competenciaGerar;
    if (!comp) return;
    const [ano, mes] = comp.split('-').map(Number);
    setLoadingCardapios(true);
    setCardapiosDisponiveis([]);
    setCardapiosSelecionados([]);
    try {
      const cardapios = await listarCardapiosDisponiveis({ mes, ano });
      setCardapiosDisponiveis(cardapios);
      setCardapiosSelecionados(cardapios.map(c => c.id));
    } catch (error) {
      console.error('Erro ao carregar cardápios:', error);
    } finally {
      setLoadingCardapios(false);
    }
  }, [competenciaGerar]);

  const toggleCardapio = (id: number) => {
    setCardapiosSelecionados(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleTodosCardapios = () => {
    if (cardapiosSelecionados.length === cardapiosDisponiveis.length) {
      setCardapiosSelecionados([]);
    } else {
      setCardapiosSelecionados(cardapiosDisponiveis.map(c => c.id));
    }
  };

  const handleGerarGuias = async () => {
    if (!competenciaGerar || periodosGerar.length === 0) {
      toast.warning('Defina a competência e ao menos um período');
      return;
    }
    
    if (cardapiosDisponiveis.length > 0 && cardapiosSelecionados.length === 0) {
      toast.warning('Selecione ao menos um cardÃƒÂ¡pio para gerar a guia');
      return;
    }

    try {
      // Iniciar job assíncrono
      setGerandoGuias(true);
      const response = await iniciarGeracaoGuiaDemanda({
        competencia: competenciaGerar,
        periodos: periodosGerar,
        considerar_indice_coccao: false,
        considerar_fator_correcao: considerarFatorCorrecao,
        cardapio_ids: cardapiosSelecionados.length > 0 ? cardapiosSelecionados : undefined,
      });
      
      // Fechar modal de configuração
      setOpenGerarGuia(false);
      
      // Abrir modal de progresso
      setCurrentJobId(response.job_id);
      setJobProgressOpen(true);
      
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Não foi possível iniciar a geração de guias';
      toast.error(msg);
    } finally {
      setGerandoGuias(false);
    }
  };

  const handleJobComplete = (resultado: any) => {
    if (resultado) {
      toast.success(`Guia gerada com sucesso! ${resultado.total_produtos} produtos, ${resultado.total_itens} itens, ${resultado.total_escolas} escolas.`);
      loadCompetencias();
    }
  };

  const handleCloseJobProgress = () => {
    setJobProgressOpen(false);
    setCurrentJobId(null);
    setCompetenciaGerar('');
    setPeriodosGerar([]);
    setResultadoGuias(null);
  };

  const handleFecharModalGerar = () => {
    setOpenGerarGuia(false);
    setCompetenciaGerar('');
    setPeriodosGerar([]);
    setResultadoGuias(null);
    setCardapiosDisponiveis([]);
    setCardapiosSelecionados([]);
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 56px)',
        bgcolor: 'background.default',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PageContainer fullHeight>
        <PageHeader
          title="Guias de Demanda"
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Guias de Demanda' },
          ]}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" color="primary" startIcon={<TableChartIcon />} onClick={() => setOpenGerarGuia(true)}
                sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 500 }}>
                Gerar Guia de Demanda
              </Button>
              <Button variant="contained" color="add" startIcon={<AddIcon />} onClick={() => {
                const inicial = {
                  mes: new Date().getMonth() + 1,
                  ano: new Date().getFullYear()
                };
                setFormData(inicial);
                setFormDataInicial(JSON.parse(JSON.stringify(inicial)));
                setOpenModal(true);
              }}
                sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 500 }}>
                Nova Competência
              </Button>
            </Box>
          }
        />

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            title="Guias de Demanda"
            data={competenciasFiltradas}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar guias..."
            onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
          />
        </Box>
      </PageContainer>

      {/* Popover de Filtros */}
      <Popover
        open={Boolean(filterAnchorEl)}
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
            <InputLabel>Mês</InputLabel>
            <Select
              value={filters.mes}
              label="Mês"
              onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
            >
              <MenuItem value="todos">Todos</MenuItem>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                <MenuItem key={mes} value={mes.toString()}>
                  {getMesNome(mes)}
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
              <MenuItem value="rascunho">Rascunho</MenuItem>
              <MenuItem value="em_andamento">Em Andamento</MenuItem>
              <MenuItem value="finalizada">Finalizada</MenuItem>
              <MenuItem value="cancelada">Cancelada</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFilters({ mes: 'todos', status: 'todos' });
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
          {(filters.mes !== 'todos' || filters.status !== 'todos') && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: 'block' }}
              >
                Filtros ativos:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {filters.mes !== 'todos' && (
                  <Chip
                    label={`Mês: ${getMesNome(parseInt(filters.mes))}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, mes: 'todos' })}
                  />
                )}
                {filters.status !== 'todos' && (
                  <Chip
                    label={`Status: ${filters.status}`}
                    size="small"
                    onDelete={() => setFilters({ ...filters, status: 'todos' })}
                  />
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Popover>

      {/* Modal Nova Competência */}
      <Dialog open={openModal} onClose={() => {
        const hasChanges = formData.mes !== formDataInicial?.mes || formData.ano !== formDataInicial?.ano;
        if (hasChanges) {
          setConfirmClose(true);
        } else {
          setOpenModal(false);
        }
      }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                Nova Competência
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Selecione o mês e ano
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => {
              const hasChanges = formData.mes !== formDataInicial?.mes || formData.ano !== formDataInicial?.ano;
              if (hasChanges) {
                setConfirmClose(true);
              } else {
                setOpenModal(false);
              }
            }} sx={{ color: 'text.secondary' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Mês</InputLabel>
              <Select
                value={formData.mes}
                label="Mês"
                onChange={(e) => setFormData({ ...formData, mes: Number(e.target.value) })}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                  <MenuItem key={mes} value={mes}>
                    {getMesNome(mes)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Ano</InputLabel>
              <Select
                value={formData.ano}
                label="Ano"
                onChange={(e) => setFormData({ ...formData, ano: Number(e.target.value) })}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((ano) => (
                  <MenuItem key={ano} value={ano}>
                    {ano}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => {
            const hasChanges = formData.mes !== formDataInicial?.mes || formData.ano !== formDataInicial?.ano;
            if (hasChanges) {
              setConfirmClose(true);
            } else {
              setOpenModal(false);
            }
          }} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleCriarCompetencia} variant="contained">
            Criar Competência
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a guia{' '}
            <strong>{competenciaToDelete ? `${getMesNome(competenciaToDelete.mes)}/${competenciaToDelete.ano}` : ''}</strong>
            {' '}e todos os seus <strong>{competenciaToDelete?.total_itens ?? 0} item(ns)</strong>? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteModal} disabled={deleting}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Excluindo...' : 'Excluir'}
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
          <Button onClick={() => { setConfirmClose(false); setOpenModal(false); }} color="error" variant="contained">
            Descartar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Gerar Guia de Demanda */}
      <Dialog open={openGerarGuia} onClose={handleFecharModalGerar} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TableChartIcon />
              <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                Gerar Guia de Demanda
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleFecharModalGerar} sx={{ color: 'text.secondary' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Selecione a competência e um ou mais períodos. Cada período gera uma guia de demanda com as quantidades por escola.
          </Alert>

          <Box sx={{ mb: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel size="small">Mês</InputLabel>
              <Select
                size="small"
                label="Mês"
                value={competenciaGerar ? competenciaGerar.split('-')[1] : ''}
                onChange={(e) => {
                  const ano = competenciaGerar ? competenciaGerar.split('-')[0] : String(new Date().getFullYear());
                  const mes = e.target.value;
                  const novaComp = `${ano}-${mes}`;
                  setCompetenciaGerar(novaComp);
                  setPeriodosGerar([]);
                  setResultadoGuias(null);
                  setCardapiosDisponiveis([]);
                  setCardapiosSelecionados([]);
                  if (novaComp) carregarCardapios(novaComp);
                }}
              >
                {[
                  ['01','Janeiro'],['02','Fevereiro'],['03','Março'],['04','Abril'],
                  ['05','Maio'],['06','Junho'],['07','Julho'],['08','Agosto'],
                  ['09','Setembro'],['10','Outubro'],['11','Novembro'],['12','Dezembro'],
                ].map(([val, label]) => (
                  <MenuItem key={val} value={val}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ width: 110 }}>
              <InputLabel size="small">Ano</InputLabel>
              <Select
                size="small"
                label="Ano"
                value={competenciaGerar ? competenciaGerar.split('-')[0] : String(new Date().getFullYear())}
                onChange={(e) => {
                  const mes = competenciaGerar ? competenciaGerar.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0');
                  const ano = e.target.value;
                  const novaComp = `${ano}-${mes}`;
                  setCompetenciaGerar(novaComp);
                  setPeriodosGerar([]);
                  setResultadoGuias(null);
                  setCardapiosDisponiveis([]);
                  setCardapiosSelecionados([]);
                  if (novaComp) carregarCardapios(novaComp);
                }}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(ano => (
                  <MenuItem key={ano} value={String(ano)}>{ano}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {competenciaGerar && (
            <>
              {/* Seleção de Cardápios */}
              {loadingCardapios ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, py: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">Carregando cardápios...</Typography>
                </Box>
              ) : cardapiosDisponiveis.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Cardápios disponíveis
                    </Typography>
                    <Button size="small" onClick={toggleTodosCardapios} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                      {cardapiosSelecionados.length === cardapiosDisponiveis.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </Button>
                  </Box>
                  <List
                    dense
                    disablePadding
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 180, overflow: 'auto' }}
                  >
                    {cardapiosDisponiveis.map((cardapio) => {
                      const selected = cardapiosSelecionados.includes(cardapio.id);

                      return (
                        <ListItem key={cardapio.id} disablePadding divider>
                          <ListItemButton selected={selected} onClick={() => toggleCardapio(cardapio.id)}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <Checkbox
                                edge="start"
                                checked={selected}
                                tabIndex={-1}
                                disableRipple
                                size="small"
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={cardapio.nome}
                              secondary={cardapio.modalidade_nome || `${cardapio.total_refeicoes} refeicao(oes)`}
                              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                              secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                            />
                            {cardapio.modalidade_nome && (
                              <Chip label={cardapio.modalidade_nome} size="small" sx={{ height: 18, fontSize: '0.65rem', ml: 1 }} />
                            )}
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {cardapiosSelecionados.length} de {cardapiosDisponiveis.length} selecionado(s)
                  </Typography>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Nenhum cardápio encontrado para esta competência.
                </Alert>
              )}
              {periodosGerar.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {periodosGerar.map((p, idx) => (
                    <Chip
                      key={idx}
                      label={`Período ${idx + 1}: ${p.data_inicio} → ${p.data_fim}`}
                      onDelete={() => setPeriodosGerar(prev => prev.filter((_, i) => i !== idx))}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              )}

              <Button
                variant="outlined"
                startIcon={<CalendarIcon />}
                onClick={() => setSeletorOpen(true)}
                size="small"
                fullWidth
              >
                {periodosGerar.length === 0 ? 'Selecionar Período' : 'Adicionar Período'}
              </Button>

              {/* Opções de Cálculo */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
                  Opções de Cálculo
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={considerarFatorCorrecao}
                      onChange={(e) => setConsiderarFatorCorrecao(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Considerar Fator de Correção (FC)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ajusta a quantidade considerando perda no pré-preparo
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </>
          )}

          {resultadoGuias && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              {resultadoGuias.guias_criadas.map((g) => (
                <Alert
                  key={g.guia_id}
                  severity="success"
                  sx={{ mb: 1 }}
                  action={
                    <Button size="small" onClick={() => {
                      handleFecharModalGerar();
                      navigate(`/guias-demanda/${g.guia_id}`);
                    }}>
                      Ver Guia
                    </Button>
                  }
                >
                  Guia #{g.guia_id} — {g.total_escolas} escola(s), {g.total_produtos} produto(s), {g.total_itens} item(ns)
                  {g.periodos && g.periodos.length > 0 && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      {g.periodos.length === 1
                        ? `Período: ${g.periodos[0].data_inicio} → ${g.periodos[0].data_fim}`
                        : `${g.periodos.length} períodos: ${g.periodos[0].data_inicio} → ${g.periodos[g.periodos.length - 1].data_fim}`}
                    </Typography>
                  )}
                </Alert>
              ))}
              {resultadoGuias.erros?.map((e, i) => (
                <Alert key={i} severity="error" sx={{ mb: 1 }}>
                  {e.motivo}
                </Alert>
              ))}
              {resultadoGuias.total_criadas > 0 && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip label={`${resultadoGuias.total_criadas} guia(s) criada(s)`} color="success" size="small" />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleFecharModalGerar} variant="outlined">
            {resultadoGuias && resultadoGuias.total_criadas > 0 ? 'Fechar' : 'Cancelar'}
          </Button>
          {(!resultadoGuias || resultadoGuias.total_criadas === 0) && (
            <Button
              onClick={handleGerarGuias}
              variant="contained"
              disabled={
                gerandoGuias ||
                loadingCardapios ||
                !competenciaGerar ||
                periodosGerar.length === 0 ||
                (cardapiosDisponiveis.length > 0 && cardapiosSelecionados.length === 0)
              }
              startIcon={gerandoGuias ? <CircularProgress size={18} /> : <TableChartIcon />}
              sx={{ bgcolor: '#1d4ed8', '&:hover': { bgcolor: '#1e40af' } }}
            >
              {gerandoGuias ? 'Gerando...' : `Gerar Guia${periodosGerar.length !== 1 ? 's' : ''} (${periodosGerar.length} período${periodosGerar.length !== 1 ? 's' : ''})`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Seletor de Período via Calendário */}
      <SeletorPeriodoCalendario
        open={seletorOpen}
        onClose={() => setSeletorOpen(false)}
        onConfirm={(p) => setPeriodosGerar(prev => [...prev, p])}
        periodosExistentes={periodosGerar}
        competencia={competenciaGerar || undefined}
        titulo={periodosGerar.length === 0 ? 'Selecionar 1º Período' : `Adicionar Período ${periodosGerar.length + 1}`}
      />

      {/* Modal de Progresso do Job */}
      <JobProgressModal
        open={jobProgressOpen}
        jobId={currentJobId}
        onClose={handleCloseJobProgress}
        onComplete={handleJobComplete}
        buscarStatus={buscarStatusGeracaoGuiaDemanda}
      />

      <LoadingOverlay
        open={deleting}
        message={deleting ? 'Excluindo guia...' : 'Processando...'}
      />
    </Box>
  );
};

export default GuiasDemandaLista;
