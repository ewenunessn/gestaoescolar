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
} from '@mui/material';
import CompactPagination from '../components/CompactPagination';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  CalendarMonth as CalendarIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import StatusIndicator from '../components/StatusIndicator';
import { guiaService } from '../services/guiaService';
import { useToast } from '../hooks/useToast';

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
    </Box>
  );
};

export default GuiasDemandaLista;
