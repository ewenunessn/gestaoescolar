import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { usePageTitle } from '../contexts/PageTitleContext';
import { useToast } from '../hooks/useToast';
import StatusIndicator from '../components/StatusIndicator';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import { DataTableAdvanced } from '../components/DataTableAdvanced';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Grid,
  Divider,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import api from '../services/api';
import { buscarInstituicao, Instituicao } from '../services/instituicao';
import { initPdfMake, buildPdfDoc, buildTable } from '../utils/pdfUtils';

interface ComprovanteItem {
  id: number;
  produto_nome: string;
  quantidade_entregue: number;
  unidade: string;
  lote?: string;
}

interface Comprovante {
  id: number;
  numero_comprovante: string;
  escola_id: number;
  escola_nome: string;
  escola_endereco?: string;
  data_entrega: string;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  cargo_recebedor?: string;
  observacao?: string;
  assinatura_base64?: string;
  total_itens: number;
  status: string;
  itens: ComprovanteItem[];
}

interface Escola {
  id: number;
  nome: string;
}

export default function ComprovantesEntrega() {
  const { setPageTitle } = usePageTitle();
  const toast = useToast();
  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
  
  // Filtros
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  // Modal de detalhes
  const [comprovanteDetalhes, setComprovanteDetalhes] = useState<Comprovante | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    setPageTitle('Comprovantes de Entrega');
    return () => setPageTitle('');
  }, [setPageTitle]);

  useEffect(() => {
    buscarInstituicao().then(setInstituicao).catch(() => {});
    carregarEscolas();
    carregarComprovantes();
  }, []);

  const carregarEscolas = async () => {
    try {
      const response = await api.get('/escolas');
      const escolasData = Array.isArray(response.data) ? response.data : (response.data.escolas || []);
      setEscolas(escolasData);
    } catch (err) {
      console.error('Erro ao carregar escolas:', err);
      setEscolas([]);
    }
  };

  const carregarComprovantes = async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = '/entregas/comprovantes?limit=100';
      
      if (filters.escola) {
        url = `/entregas/comprovantes/escola/${filters.escola}?limit=100`;
      }
      
      const response = await api.get(url);
      let dados = response.data.comprovantes || response.data;
      
      // Aplicar filtros locais
      if (filters.numero) {
        dados = dados.filter((c: Comprovante) => 
          c.numero_comprovante.toLowerCase().includes(filters.numero.toLowerCase())
        );
      }
      
      if (filters.dataInicio) {
        dados = dados.filter((c: Comprovante) => 
          new Date(c.data_entrega) >= new Date(filters.dataInicio)
        );
      }
      
      if (filters.dataFim) {
        const fim = new Date(filters.dataFim);
        fim.setHours(23, 59, 59, 999);
        dados = dados.filter((c: Comprovante) => 
          new Date(c.data_entrega) <= fim
        );
      }
      
      setComprovantes(dados);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar comprovantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarComprovantes();
  }, [filters]);

  const abrirDetalhes = async (id: number) => {
    try {
      const response = await api.get(`/entregas/comprovantes/${id}`);
      setComprovanteDetalhes(response.data);
      setModalAberto(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao carregar detalhes');
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setComprovanteDetalhes(null);
  };

  const imprimirDireto = async (id: number) => {
    try {
      const response = await api.get(`/entregas/comprovantes/${id}`);
      await gerarPdfComprovante(response.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao imprimir comprovante');
    }
  };

  const imprimirComprovante = async () => {
    if (!comprovanteDetalhes) return;
    await gerarPdfComprovante(comprovanteDetalhes);
  };

  const gerarPdfComprovante = async (comprovante: Comprovante) => {
    const dataFormatada = new Date(comprovante.data_entrega + 'T12:00:00').toLocaleString('pt-BR');
    const temLote = comprovante.itens.some(i => i.lote);

    const infoRows: any[] = [
      [{ text: 'Escola:', bold: true }, comprovante.escola_nome],
      ...(comprovante.escola_endereco ? [[{ text: 'Endereço:', bold: true }, comprovante.escola_endereco]] : []),
      [{ text: 'Data da Entrega:', bold: true }, dataFormatada],
      [{ text: 'Entregador:', bold: true }, comprovante.nome_quem_entregou],
      [{ text: 'Recebedor:', bold: true }, `${comprovante.nome_quem_recebeu}${comprovante.cargo_recebedor ? ` (${comprovante.cargo_recebedor})` : ''}`],
      ...(comprovante.observacao ? [[{ text: 'Observações:', bold: true }, comprovante.observacao]] : []),
    ];

    const headers = ['Produto', 'Quantidade', 'Unidade', ...(temLote ? ['Lote'] : [])];
    const rows = comprovante.itens.map(item => [
      item.produto_nome,
      formatarQuantidade(item.quantidade_entregue),
      item.unidade,
      ...(temLote ? [item.lote || '-'] : []),
    ]);
    const widths = temLote ? ['*', 70, 60, 70] : ['*', 80, 70];

    const assinaturaBlock: any[] = comprovante.assinatura_base64
      ? [
          { text: 'Assinatura Digital do Recebedor', style: 'sectionTitle' },
          { image: comprovante.assinatura_base64, width: 200, height: 80, alignment: 'center', margin: [0, 4, 0, 4] },
        ]
      : [];

    const content: any[] = [
      {
        table: {
          widths: [120, '*'],
          body: infoRows.map(([label, value]) => [
            { text: label, fontSize: 9, bold: true },
            { text: value, fontSize: 9 },
          ]),
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      },
      { text: `Itens Entregues (${comprovante.itens.length})`, style: 'sectionTitle' },
      buildTable(headers, rows, widths),
      ...assinaturaBlock,
      {
        columns: [
          {
            stack: [
              { text: '\n\n\n', },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.8 }] },
              { text: comprovante.nome_quem_entregou, fontSize: 9, alignment: 'center', margin: [0, 4, 0, 0] },
              { text: 'Entregador', fontSize: 8, color: '#666', alignment: 'center' },
            ],
            width: '*',
          },
          {
            stack: [
              { text: '\n\n\n' },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.8 }] },
              { text: comprovante.nome_quem_recebeu, fontSize: 9, alignment: 'center', margin: [0, 4, 0, 0] },
              { text: `Recebedor${comprovante.cargo_recebedor ? ` — ${comprovante.cargo_recebedor}` : ''}`, fontSize: 8, color: '#666', alignment: 'center' },
            ],
            width: '*',
          },
        ],
        margin: [0, 20, 0, 0],
      },
    ];

    const pdfMake = await initPdfMake();
    const doc = buildPdfDoc({
      instituicao,
      title: 'Comprovante de Entrega',
      subtitle: comprovante.numero_comprovante,
      content,
      showSignature: false,
    });
    pdfMake.createPdf(doc).download(`comprovante-${comprovante.numero_comprovante}.pdf`);
  };

  const formatarQuantidade = (valor: number): string => {
    if (Number.isInteger(valor)) {
      return valor.toLocaleString('pt-BR');
    }
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const excluirComprovante = async (id: number, numero: string) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o comprovante ${numero}?\n\nEsta ação não pode ser desfeita!`)) {
      return;
    }

    try {
      await api.delete(`/entregas/comprovantes/${id}/excluir`);
      toast.success('Comprovante excluído com sucesso!');
      carregarComprovantes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir comprovante');
    }
  };

  // Definir colunas da tabela
  const columns = useMemo<ColumnDef<Comprovante>[]>(() => [
    {
      accessorKey: 'numero_comprovante',
      header: 'Número',
      size: 180,
      cell: ({ row }) => (
        <Typography variant="body2" fontWeight="bold">
          {row.original.numero_comprovante}
        </Typography>
      )
    },
    {
      accessorKey: 'escola_nome',
      header: 'Escola',
      size: 200
    },
    {
      accessorKey: 'data_entrega',
      header: 'Data',
      size: 150,
      cell: ({ row }) => (
        new Date(row.original.data_entrega).toLocaleString('pt-BR')
      )
    },
    {
      accessorKey: 'nome_quem_entregou',
      header: 'Entregador',
      size: 150
    },
    {
      accessorKey: 'nome_quem_recebeu',
      header: 'Recebedor',
      size: 150
    },
    {
      accessorKey: 'total_itens',
      header: 'Itens',
      size: 80,
      align: 'center',
      cell: ({ row }) => (
        <Chip label={row.original.total_itens} size="small" color="primary" />
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 120,
      align: 'center',
      cell: ({ row }) => (
        <Chip
          label={row.original.status}
          size="small"
          color={row.original.status === 'finalizado' ? 'success' : 'default'}
        />
      )
    },
    {
      id: 'actions',
      header: 'Ações',
      size: 150,
      align: 'center',
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => abrirDetalhes(row.original.id)}
            title="Ver detalhes"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="secondary"
            onClick={() => imprimirDireto(row.original.id)}
            title="Imprimir"
          >
            <PrintIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => excluirComprovante(row.original.id, row.original.numero_comprovante)}
            title="Excluir permanentemente"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ], []);

  // Estatísticas
  const estatisticas = useMemo(() => ({
    total: comprovantes.length,
    totalItens: comprovantes.reduce((sum, c) => sum + c.total_itens, 0),
    escolasAtendidas: new Set(comprovantes.map(c => c.escola_id)).size
  }), [comprovantes]);

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader title="Comprovantes de Entrega" />

        {/* Estatísticas */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box sx={{ flex: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">Total de Comprovantes</Typography>
            <Typography variant="h5">{estatisticas.total}</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">Total de Itens</Typography>
            <Typography variant="h5">{estatisticas.totalItens}</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">Escolas Atendidas</Typography>
            <Typography variant="h5">{estatisticas.escolasAtendidas}</Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <DataTableAdvanced
          data={comprovantes}
          columns={columns}
          searchPlaceholder="Buscar comprovantes..."
          emptyMessage="Nenhum comprovante encontrado"
          emptyIcon={<DescriptionIcon sx={{ fontSize: 48, opacity: 0.2 }} />}
          loading={loading}
          actions={
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
              size="small"
            >
              Filtros
            </Button>
          }
        />

        {/* Popover de Filtros */}
        <Popover
          open={Boolean(filterAnchorEl)}
          anchorEl={filterAnchorEl}
          onClose={() => setFilterAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Box sx={{ p: 2, minWidth: 300 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Filtros
            </Typography>
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Escola</InputLabel>
              <Select
                value={filters.escola || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, escola: e.target.value }))}
                label="Escola"
              >
                <MenuItem value="">Todas</MenuItem>
                {escolas.map((escola) => (
                  <MenuItem key={escola.id} value={escola.id}>
                    {escola.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Número do Comprovante"
              value={filters.numero || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, numero: e.target.value }))}
              placeholder="COMP-2026-03-00001"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              size="small"
              type="date"
              label="Data Início"
              value={filters.dataInicio || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              size="small"
              type="date"
              label="Data Fim"
              value={filters.dataFim || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => {
                setFilters({});
                setFilterAnchorEl(null);
              }}
            >
              Limpar Filtros
            </Button>
          </Box>
        </Popover>

        {/* Modal de Detalhes */}
        <Dialog
          open={modalAberto}
          onClose={fecharModal}
          maxWidth="md"
          fullWidth
        >
          {comprovanteDetalhes && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    Comprovante {comprovanteDetalhes.numero_comprovante}
                  </Typography>
                  <IconButton onClick={fecharModal} size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Escola
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {comprovanteDetalhes.escola_nome}
                    </Typography>
                    {comprovanteDetalhes.escola_endereco && (
                      <Typography variant="body2" color="textSecondary">
                        {comprovanteDetalhes.escola_endereco}
                      </Typography>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Data da Entrega
                    </Typography>
                    <Typography variant="body1">
                      {new Date(comprovanteDetalhes.data_entrega).toLocaleString('pt-BR')}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Status
                    </Typography>
                    <Chip
                      label={comprovanteDetalhes.status}
                      color={comprovanteDetalhes.status === 'finalizado' ? 'success' : 'default'}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Entregador
                    </Typography>
                    <Typography variant="body1">
                      {comprovanteDetalhes.nome_quem_entregou}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Recebedor
                    </Typography>
                    <Typography variant="body1">
                      {comprovanteDetalhes.nome_quem_recebeu}
                      {comprovanteDetalhes.cargo_recebedor && (
                        <Typography variant="body2" color="textSecondary">
                          {comprovanteDetalhes.cargo_recebedor}
                        </Typography>
                      )}
                    </Typography>
                  </Grid>
                  
                  {comprovanteDetalhes.observacao && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Observações
                      </Typography>
                      <Typography variant="body1">
                        {comprovanteDetalhes.observacao}
                      </Typography>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Itens Entregues ({comprovanteDetalhes.total_itens})
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Produto</TableCell>
                            <TableCell align="right">Quantidade</TableCell>
                            <TableCell>Unidade</TableCell>
                            {comprovanteDetalhes.itens.some(i => i.lote) && (
                              <TableCell>Lote</TableCell>
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {comprovanteDetalhes.itens.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.produto_nome}</TableCell>
                              <TableCell align="right">
                                {formatarQuantidade(item.quantidade_entregue)}
                              </TableCell>
                              <TableCell>{item.unidade}</TableCell>
                              {comprovanteDetalhes.itens.some(i => i.lote) && (
                                <TableCell>{item.lote || '-'}</TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                  
                  {comprovanteDetalhes.assinatura_base64 && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Assinatura Digital do Recebedor
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          mt: 2
                        }}
                      >
                        <Box
                          component="img"
                          src={comprovanteDetalhes.assinatura_base64}
                          alt="Assinatura Digital"
                          sx={{
                            maxWidth: '300px',
                            maxHeight: '120px',
                            border: '1px solid #ddd',
                            borderRadius: 1,
                            p: 1,
                            backgroundColor: '#fff'
                          }}
                        />
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={fecharModal}>
                  Fechar
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={imprimirComprovante}
                >
                  Imprimir
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </PageContainer>
    </Box>
  );
}
