import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Chip,
  InputAdornment,
  CircularProgress,
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
} from '@mui/material';
import CompactPagination from '../components/CompactPagination';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  CalendarMonth as CalendarIcon,
  Delete as DeleteIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import StatusIndicator from '../components/StatusIndicator';
import SeletorPeriodoCalendario, { Periodo } from '../components/SeletorPeriodoCalendario';
import { guiaService } from '../services/guiaService';
import { useToast } from '../hooks/useToast';
import { gerarGuiasDemanda, GerarGuiasResponse } from '../services/planejamentoCompras';

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
  
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Modal nova competência
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  
  // Estados de validação e controle de mudanças
  const [formDataInicial, setFormDataInicial] = useState<any>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  // Exclusão
  const [confirmDelete, setConfirmDelete] = useState<Competencia | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal gerar guia de demanda
  const [openGerarGuia, setOpenGerarGuia] = useState(false);
  const [competenciaGerar, setCompetenciaGerar] = useState('');
  const [periodosGerar, setPeriodosGerar] = useState<Periodo[]>([]);
  const [seletorOpen, setSeletorOpen] = useState(false);
  const [gerandoGuias, setGerandoGuias] = useState(false);
  const [resultadoGuias, setResultadoGuias] = useState<GerarGuiasResponse | null>(null);

  useEffect(() => {
    loadCompetencias();
  }, []);

  const loadCompetencias = async () => {
    try {
      setLoading(true);
      const data = await guiaService.listarCompetencias();
      setCompetencias(data);
    } catch (error) {
      console.error('Erro ao carregar competências:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletarGuia = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await guiaService.deletarGuia(confirmDelete.guia_id);
      toast.success('Guia excluída', 'A guia e todos os seus itens foram removidos.');
      setConfirmDelete(null);
      loadCompetencias();
    } catch (error) {
      console.error('Erro ao deletar guia:', error);
      toast.error('Erro', 'Não foi possível excluir a guia.');
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
      toast.success('Sucesso!', 'Competência criada com sucesso!');
      setOpenModal(false);
      loadCompetencias();
    } catch (error) {
      console.error('Erro ao criar competência:', error);
    }
  };

  // Gerar lista de competências (últimos 12 meses + próximos 3)
  function gerarCompetenciasDisponiveis() {
    const competencias = [];
    const hoje = new Date();
    
    for (let i = -12; i <= 3; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const mesNome = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      competencias.push({
        valor: `${ano}-${mes}`,
        label: mesNome.charAt(0).toUpperCase() + mesNome.slice(1)
      });
    }
    
    return competencias;
  }

  const handleGerarGuias = async () => {
    if (!competenciaGerar || periodosGerar.length === 0) {
      toast.warning('Atenção', 'Defina a competência e ao menos um período');
      return;
    }
    setGerandoGuias(true);
    setResultadoGuias(null);
    try {
      const res = await gerarGuiasDemanda(
        competenciaGerar,
        periodosGerar,
        undefined // todas as escolas
      );
      setResultadoGuias(res);
      if (res.total_criadas > 0) {
        toast.success('Guias geradas', `${res.total_criadas} guia(s) de demanda criada(s) com sucesso`);
        loadCompetencias(); // Recarregar lista
      } else {
        const motivos = res.erros?.map((e) => e.motivo).join('; ') || 'Verifique os erros abaixo';
        toast.error('Nenhuma guia criada', motivos);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Não foi possível gerar as guias';
      toast.error('Erro', msg);
    } finally {
      setGerandoGuias(false);
    }
  };

  const handleFecharModalGerar = () => {
    setOpenGerarGuia(false);
    setCompetenciaGerar('');
    setPeriodosGerar([]);
    setResultadoGuias(null);
  };

  const filteredCompetencias = useMemo(() => {
    return competencias.filter(c => 
      (c.guia_nome ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${c.mes}/${c.ano}`.includes(searchTerm)
    );
  }, [competencias, searchTerm]);

  const paginatedCompetencias = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredCompetencias.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCompetencias, page, rowsPerPage]);

  const getMesNome = (mes: number) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[mes - 1];
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
      'rascunho': 'default',
      'em_andamento': 'warning',
      'finalizada': 'success',
      'cancelada': 'error'
    };
    return statusMap[status] || 'default';
  };

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        <PageBreadcrumbs
          items={[
            { label: 'Guias de Demanda', icon: <CalendarIcon fontSize="small" /> }
          ]}
        />
        <PageHeader title="Guias de Demanda" />

        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar guias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                const inicial = {
                  mes: new Date().getMonth() + 1,
                  ano: new Date().getFullYear()
                };
                setFormData(inicial);
                setFormDataInicial(JSON.parse(JSON.stringify(inicial)));
                setOpenModal(true);
              }}
              size="small"
              sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
            >
              Nova Competência
            </Button>
            <Button
              variant="contained"
              startIcon={<TableChartIcon />}
              onClick={() => setOpenGerarGuia(true)}
              size="small"
              sx={{ bgcolor: '#1d4ed8', '&:hover': { bgcolor: '#1e40af' } }}
            >
              Gerar Guia de Demanda
            </Button>
          </Box>
        </Card>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {filteredCompetencias.length} {filteredCompetencias.length === 1 ? 'guia' : 'guias'}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : filteredCompetencias.length === 0 ? (
            <Box textAlign="center" py={8}>
              <CalendarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Nenhuma guia encontrada
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Competência</TableCell>
                      <TableCell>Nome</TableCell>
                      <TableCell align="center">Escolas</TableCell>
                      <TableCell align="center">Itens</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedCompetencias.map((comp) => (
                      <TableRow key={comp.guia_id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {getMesNome(comp.mes)}/{comp.ano}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {comp.guia_nome || `Guia ${comp.mes}/${comp.ano}`}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={comp.total_escolas} size="small" color="primary" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={comp.total_itens} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={comp.guia_status} 
                            size="small" 
                            color={getStatusColor(comp.guia_status)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="Ver Detalhes">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => navigate(`/guias-demanda/${comp.guia_id}`)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir guia e todos os itens">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setConfirmDelete(comp)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <CompactPagination
                count={filteredCompetencias.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </Box>
          )}
        </Box>
      </PageContainer>

      {/* Modal Nova Competência */}
      <Dialog 
        open={openModal} 
        onClose={() => {
          const hasChanges = formData.mes !== formDataInicial?.mes || formData.ano !== formDataInicial?.ano;
          if (hasChanges) {
            setConfirmClose(true);
          } else {
            setOpenModal(false);
          }
        }}
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            m: 0
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            Nova Competência
          </Typography>
          <IconButton
            size="small"
            onClick={() => {
              const hasChanges = formData.mes !== formDataInicial?.mes || formData.ano !== formDataInicial?.ano;
              if (hasChanges) {
                setConfirmClose(true);
              } else {
                setOpenModal(false);
              }
            }}
            sx={{ color: 'text.secondary' }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <FormControl fullWidth size="small">
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
            <FormControl fullWidth size="small">
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
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={() => {
            const hasChanges = formData.mes !== formDataInicial?.mes || formData.ano !== formDataInicial?.ano;
            if (hasChanges) {
              setConfirmClose(true);
            } else {
              setOpenModal(false);
            }
          }} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button onClick={handleCriarCompetencia} variant="contained">
            Criar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog confirmação exclusão */}
      <Dialog open={Boolean(confirmDelete)} onClose={() => !deleting && setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Excluir Guia de Demanda?</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2">
            Isso vai remover permanentemente a guia{' '}
            <strong>{confirmDelete ? `${getMesNome(confirmDelete.mes)}/${confirmDelete.ano}` : ''}</strong>{' '}
            e todos os seus <strong>{confirmDelete?.total_itens ?? 0} item(ns)</strong>. Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancelar</Button>
          <Button onClick={handleDeletarGuia} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação para fechar */}
      <Dialog 
        open={confirmClose} 
        onClose={() => setConfirmClose(false)}
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            m: 0
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            Descartar alterações?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Typography variant="body2">
            Você tem alterações não salvas. Deseja realmente descartar essas alterações?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={() => setConfirmClose(false)} variant="outlined" size="small">
            Continuar Editando
          </Button>
          <Button onClick={() => { setConfirmClose(false); setOpenModal(false); }} color="delete" variant="contained" size="small">
            Descartar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Gerar Guia de Demanda */}
      <Dialog 
        open={openGerarGuia} 
        onClose={handleFecharModalGerar}
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TableChartIcon />
            Gerar Guia de Demanda
          </Typography>
          <IconButton
            size="small"
            onClick={handleFecharModalGerar}
            sx={{ color: 'text.secondary' }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Selecione a competência e um ou mais períodos. Cada período gera uma guia de demanda com as quantidades por escola.
          </Alert>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Competência</InputLabel>
            <Select
              value={competenciaGerar}
              onChange={(e) => {
                setCompetenciaGerar(e.target.value);
                setPeriodosGerar([]);
                setResultadoGuias(null);
              }}
              label="Competência"
            >
              {gerarCompetenciasDisponiveis().map((comp) => (
                <MenuItem key={comp.valor} value={comp.valor}>
                  {comp.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {competenciaGerar && (
            <>
              {/* Lista de períodos selecionados */}
              {periodosGerar.length > 0 && (
                <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<CalendarIcon />}
                  onClick={() => setSeletorOpen(true)}
                  size="small"
                  fullWidth
                >
                  {periodosGerar.length === 0 ? 'Selecionar Período' : 'Adicionar Período'}
                </Button>
              </Box>
            </>
          )}

          {/* Resultado da geração de guias */}
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
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={handleFecharModalGerar} sx={{ color: 'text.secondary' }}>
            {resultadoGuias && resultadoGuias.total_criadas > 0 ? 'Fechar' : 'Cancelar'}
          </Button>
          {(!resultadoGuias || resultadoGuias.total_criadas === 0) && (
            <Button 
              onClick={handleGerarGuias} 
              variant="contained"
              disabled={gerandoGuias || !competenciaGerar || periodosGerar.length === 0}
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
    </Box>
  );
};

export default GuiasDemandaLista;
