import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import TableFilter, { FilterField } from "../../../components/TableFilter";
import StatusIndicator from "../../../components/StatusIndicator";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import { useRomaneio, useRotas, useAtualizarProdutoEscola } from "../../../hooks/queries/useRomaneioQueries";
import { formatarQuantidade } from "../../../utils/formatters";
import { DataGrid } from "@mui/x-data-grid";
import { ptBR as dataGridPtBR } from "@mui/x-data-grid/locales";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableAdvanced } from "../../../components/DataTableAdvanced";
// Atualizado em 2026-03-08 13:46 - Todas as referências a dataInicio/dataFim agora usam filters.dataInicio/filters.dataFim
import {
  Box,
  Typography,
  Card,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ListItemText,
  Menu,
  ListItemIcon,
  Checkbox,
  OutlinedInput,
  InputAdornment,
  Divider,
  Chip
} from "@mui/material";
import {
  Print as PrintIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  Schedule as ScheduleIcon,
  Block as BlockIcon,
  Cancel as CancelIcon,
  PendingActions as PendingIcon,
  Edit as EditIcon,
  QrCode2 as QrCodeIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon
} from "@mui/icons-material";
import { useToast } from "../../../hooks/useToast";
import { format } from "date-fns";
import QRCode from "qrcode";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { buscarInstituicao, Instituicao } from "../../../services/instituicao";
import { buildPdfDoc, buildPdfMetadataBand, buildPdfSectionTitle, buildQrFooter, buildTable, initPdfMake, savePdfMakeDocument } from "../../../utils/pdfUtils";
import { buildRomaneioApiParams, parseRomaneioFiltersFromSearch } from "../utils/romaneioFilters";
import { buildRomaneioPdfFileName, buildRomaneioPdfRows, getRomaneioRouteLabel } from "../utils/romaneioPdf";
import { buildRomaneioQrPayload } from "../utils/romaneioQr";

interface ItemRomaneio {
  id: number;
  data_entrega: string;
  quantidade: number;
  unidade: string;
  observacao?: string;
  status: string;
  produto_nome: string;
  escola_nome: string;
  escola_rota?: string;
}

interface ProdutoAgrupado {
  produto_nome: string;
  unidade: string;
  quantidade_total: number;
  escolas: { id: number; nome: string; quantidade: number; status: string; rota?: string }[];
}

interface GrupoDataRomaneio {
  data: string;
  produtos: Record<string, ProdutoAgrupado>;
}

const Romaneio: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const location = useLocation();
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
  
  // Helper function para formatar datas com segurança
  const formatarDataSegura = (data: string | null | undefined, fallback: string = '—'): string => {
    if (!data || data.trim() === '') return fallback;
    try {
      const dataObj = new Date(data + 'T12:00:00');
      if (isNaN(dataObj.getTime())) return fallback;
      return format(dataObj, 'dd/MM/yyyy');
    } catch (e) {
      console.warn('Erro ao formatar data:', data, e);
      return fallback;
    }
  };
  
  // Filtros - NOVO SISTEMA
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const defaultRomaneioFilters = useMemo(() => {
    const hoje = new Date();
    return {
      dataInicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0],
      dataFim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0],
    };
  }, []);
  const initialRomaneioFilters = useMemo(
    () => parseRomaneioFiltersFromSearch(location.search, defaultRomaneioFilters),
    [location.search, defaultRomaneioFilters],
  );
  const [filters, setFilters] = useState<Record<string, any>>(() => initialRomaneioFilters.filters);
  const [rotaIds, setRotaIds] = useState<number[]>(() => initialRomaneioFilters.rotaIds);
  const romaneioApiParams = useMemo(
    () => buildRomaneioApiParams(filters as any, rotaIds),
    [filters, rotaIds],
  );
  
  // React Query hooks
  const { data: rotas = [], isLoading: loadingRotas } = useRotas();
  const { data: itens = [], isLoading: loading, error: queryError } = useRomaneio(romaneioApiParams);
  const atualizarProdutoEscolaMutation = useAtualizarProdutoEscola();
  
  const error = queryError ? 'Erro ao carregar dados do romaneio' : null;

  // Definir título da página
  useEffect(() => {
    setPageTitle('Romaneio de Entrega');
    return () => setPageTitle('');
  }, [setPageTitle]);

  // Estado para o modal de detalhes
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    produto_nome: string;
    data: string;
    escolas: { id: number; nome: string; quantidade: number; status: string; rota?: string }[];
  } | null>(null);

  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [itemStatusEditing, setItemStatusEditing] = useState<any>(null);
  const toast = useToast();
  
  // Estado para QR Code
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    buscarInstituicao().then(setInstituicao).catch(() => {});
  }, []);

  // Gerar QR Code automaticamente para o filtro atual do romaneio.
  useEffect(() => {
    if (filters.dataInicio && filters.dataFim) {
      gerarQRCodeAutomatico();
    } else {
      setQrCodeUrl('');
    }
  }, [rotaIds, filters.dataInicio, filters.dataFim, filters.status, rotas]);

  const handlePrint = async () => {
    if (dataGridRows.length === 0) {
      toast.error('Nenhum item encontrado para gerar o PDF');
      return;
    }

    try {
      setGerandoPdf(true);
      const qrUrl = qrCodeUrl || await gerarQRCodeAutomatico();
      const pdfMake = await initPdfMake();
      const rotaLabel = getRomaneioRouteLabel(rotaIds, rotas);
      const periodoLabel = filters.dataInicio && filters.dataFim
        ? `${formatarDataSegura(filters.dataInicio)} a ${formatarDataSegura(filters.dataFim)}`
        : 'Nao definido';
      const statusLabel = filters.status === 'todos' ? 'Todos (Ativos)' : getStatusItemLabel(filters.status);
      const tableRows = buildRomaneioPdfRows(dataGridRows);
      const qrMetadata = qrUrl
        ? [
            { image: qrUrl, width: 80, height: 80, alignment: 'center' },
            { text: 'Filtro do app', fontSize: 7, color: '#475569', alignment: 'center', margin: [0, 3, 0, 0] },
          ]
        : undefined;

      const content: any[] = [
        buildPdfMetadataBand(
          [
            { label: 'Periodo', value: periodoLabel },
            { label: 'Rota', value: rotaLabel },
            { label: 'Status', value: statusLabel },
            { label: 'Itens', value: dataGridRows.length },
          ],
          qrMetadata,
          { asideWidth: 112 },
        ),
        buildPdfSectionTitle('Itens Entregues', 4),
        buildTable(
          ['Data', 'Produto', 'Qtde Total', 'Und.', 'Escolas'],
          tableRows,
          [68, '*', 62, 44, 48],
          { compact: true },
        ),
      ];

      const romaneioMargins: [number, number, number, number] = [36, 34, 36, 88];
      const doc = buildPdfDoc({
        instituicao,
        title: 'Romaneio de Entrega',
        subtitle: `${periodoLabel} | ${rotaLabel}`,
        content,
        orientation: 'portrait',
        showSignature: false,
        pageMargins: romaneioMargins,
        customFooter: buildQrFooter({
          instituicao,
          orientation: 'portrait',
          pageMargins: romaneioMargins,
          footerNote: 'QR Code do filtro para carregar as informacoes no app',
        }),
      });

      await savePdfMakeDocument(pdfMake, doc, buildRomaneioPdfFileName(filters));
      toast.success('PDF do romaneio gerado com sucesso');
    } catch (error) {
      console.error('Erro ao gerar PDF do romaneio:', error);
      toast.error('Erro ao gerar PDF do romaneio');
    } finally {
      setGerandoPdf(false);
    }
  };

  const gerarQRCodeAutomatico = async () => {
    if (!filters.dataInicio || !filters.dataFim) {
      return null;
    }

    try {
      const qrData = buildRomaneioQrPayload({
        rotaIds,
        rotas,
        filters,
      });

      const jsonData = JSON.stringify(qrData);
      
      const qrUrl = await QRCode.toDataURL(jsonData, {
        errorCorrectionLevel: 'M',
        width: 720,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrUrl);
      return qrUrl;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error('Erro ao gerar QR Code');
      return null;
    }
  };

  // Definir campos de filtro (sem período)
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'todos', label: 'Todos (Ativos)' },
        { value: 'pendente', label: 'Pendente' },
        { value: 'programada', label: 'Programada' },
        { value: 'em_rota', label: 'Em Rota' },
        { value: 'entregue', label: 'Entregue' },
      ],
    },
  ], []);

  // Aplicar filtros locais (busca por palavra-chave)
  const filteredItens = useMemo(() => {
    return itens.filter((item: ItemRomaneio) => {
      // Busca por palavra-chave
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!(item.produto_nome?.toLowerCase().includes(searchLower) || 
              item.escola_nome?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      return true;
    });
  }, [itens, filters]);

  // Agrupar itens por data e produto (otimizado)
  const dadosAgrupadosProduto = useMemo(() => {
    const grupos: Record<string, GrupoDataRomaneio> = {};

    filteredItens.forEach((item: ItemRomaneio) => {
      // Validar se data_entrega existe e é válida
      if (!item.data_entrega) {
        return; // Pular itens sem data
      }
      
      const data = item.data_entrega.split('T')[0];
      
      // Validar se a data é válida
      const dataTest = new Date(data + 'T12:00:00');
      if (isNaN(dataTest.getTime())) {
        return; // Pular itens com data inválida
      }
      
      if (!grupos[data]) {
        grupos[data] = {
          data,
          produtos: {}
        };
      }

      // Chave única composta por nome do produto e unidade
      const chaveProduto = `${item.produto_nome}-${item.unidade}`;

      if (!grupos[data].produtos[chaveProduto]) {
        grupos[data].produtos[chaveProduto] = {
          produto_nome: item.produto_nome,
          unidade: item.unidade,
          quantidade_total: 0,
          escolas: []
        };
      }

      const produto = grupos[data].produtos[chaveProduto];
      produto.quantidade_total += Number(item.quantidade);
      produto.escolas.push({
        id: item.id,
        nome: item.escola_nome,
        quantidade: Number(item.quantidade),
        status: item.status,
        rota: item.escola_rota
      });
    });

    // Converter para array e ordenar (otimizado)
    return Object.values(grupos)
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((grupo: GrupoDataRomaneio) => ({
        data: grupo.data,
        produtos: Object.values(grupo.produtos).sort((a, b) => {
          const nomeCompare = a.produto_nome.localeCompare(b.produto_nome);
          return nomeCompare !== 0 ? nomeCompare : a.unidade.localeCompare(b.unidade);
        })
      }));
  }, [filteredItens]);

  // Legenda de status
  const statusLegend = useMemo(() => {
    const statusCounts = filteredItens.reduce((acc: Record<string, number>, item: ItemRomaneio) => {
      const status = item.status || 'pendente';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return [
      { status: 'default', label: 'PENDENTE', count: statusCounts.pendente || 0 },
      { status: 'primary', label: 'PROGRAMADA', count: statusCounts.programada || 0 },
      { status: 'info', label: 'EM ROTA', count: statusCounts.em_rota || 0 },
      { status: 'success', label: 'ENTREGUE', count: statusCounts.entregue || 0 }
    ];
  }, [filteredItens]);

  // Transformar dados para o DataGrid (memoizado para evitar recálculos)
  const dataGridRows = useMemo(() => {
    const rows: any[] = [];
    dadosAgrupadosProduto.forEach((grupoData) => {
      grupoData.produtos.forEach((produto) => {
        rows.push({
          id: `${grupoData.data}-${produto.produto_nome}-${produto.unidade}`,
          data_entrega: grupoData.data,
          data_entrega_formatada: formatarDataSegura(grupoData.data, 'Sem data'),
          produto_nome: produto.produto_nome,
          quantidade_total: produto.quantidade_total,
          quantidade_formatada: formatarQuantidade(produto.quantidade_total),
          unidade: produto.unidade,
          num_escolas: produto.escolas.length,
          escolas: produto.escolas,
        });
      });
    });
    return rows;
  }, [dadosAgrupadosProduto]);

  const tableColumns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: 'data_entrega_formatada',
      header: 'Data de Entrega',
      size: 140,
    },
    {
      accessorKey: 'produto_nome',
      header: 'Produto',
      size: 280,
      cell: ({ getValue }) => (
        <Typography variant="body2" fontWeight={600}>
          {String(getValue() || '')}
        </Typography>
      ),
    },
    {
      accessorKey: 'quantidade_formatada',
      header: 'Quantidade Total',
      size: 150,
      cell: ({ getValue }) => (
        <Typography variant="body2" textAlign="right" fontWeight={600}>
          {String(getValue() || '')}
        </Typography>
      ),
    },
    {
      accessorKey: 'unidade',
      header: 'Unidade',
      size: 100,
    },
    {
      accessorKey: 'num_escolas',
      header: 'Escolas',
      size: 110,
      cell: ({ getValue }) => (
        <Chip
          label={String(getValue() || 0)}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: 'actions',
      header: 'Acoes',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={() => handleOpenDetails(row.original.produto_nome, row.original.data_entrega, row.original.escolas)}
        >
          Detalhes
        </Button>
      ),
    },
  ], []);

  const handleApplyFilters = (newFilters: Record<string, any>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
  };

  const handleOpenDetails = useCallback((produto: string, data: string, escolas: { id: number; nome: string; quantidade: number; status: string; rota?: string }[]) => {
    setSelectedProduct({
      produto_nome: produto,
      data: data,
      escolas: escolas
    });
    setModalOpen(true);
  }, []);

  const getStatusItemIcon = (status: string) => {
    switch (status) {
      case 'entregue': return <CheckCircleIcon fontSize="small" />;
      case 'em_rota': return <LocalShippingIcon fontSize="small" />;
      case 'programada': return <ScheduleIcon fontSize="small" />;
      case 'suspenso': return <BlockIcon fontSize="small" />;
      case 'cancelado': return <CancelIcon fontSize="small" />;
      default: return <PendingIcon fontSize="small" />;
    }
  };

  const getStatusItemLabel = (status: string) => {
    switch (status) {
      case 'entregue': return 'Entregue';
      case 'em_rota': return 'Em Rota';
      case 'programada': return 'Programada';
      case 'suspenso': return 'Suspenso';
      case 'cancelado': return 'Cancelado';
      default: return 'Pendente';
    }
  };

  const getStatusItemColor = (status: string) => {
    switch (status) {
      case 'entregue': return 'success';
      case 'em_rota': return 'info';
      case 'programada': return 'primary';
      case 'suspenso': return 'warning';
      case 'cancelado': return 'error';
      default: return 'default';
    }
  };

  const handleOpenStatusMenu = useCallback((event: React.MouseEvent<HTMLElement>, item: any) => {
    setStatusMenuAnchor(event.currentTarget);
    setItemStatusEditing(item);
  }, []);

  const handleCloseStatusMenu = useCallback(() => {
    setStatusMenuAnchor(null);
    setItemStatusEditing(null);
  }, []);

  const handleChangeStatus = useCallback(async (newStatus: string) => {
    if (!itemStatusEditing) return;

    try {
      const itemId = itemStatusEditing.id;
      
      if (!itemId) {
        toast.error('Item sem identificador para atualização');
        return;
      }

      await atualizarProdutoEscolaMutation.mutateAsync({
        id: itemId,
        data: { status: newStatus }
      });
      
      toast.success(`Status atualizado para ${getStatusItemLabel(newStatus)}`);
      
      // Atualizar lista localmente
      if (selectedProduct) {
        const updatedEscolas = selectedProduct.escolas.map(esc => 
          esc.id === itemId ? { ...esc, status: newStatus } : esc
        );
        setSelectedProduct({ ...selectedProduct, escolas: updatedEscolas });
      }
      
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar status do item');
    } finally {
      handleCloseStatusMenu();
    }
  }, [itemStatusEditing, selectedProduct, atualizarProdutoEscolaMutation, toast, handleCloseStatusMenu]);

  const handleCloseDetails = useCallback(() => {
    setModalOpen(false);
    setSelectedProduct(null);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageContainer>
        <PageHeader
          title="Romaneio de Entrega"
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Entregas', path: '/entregas' },
            { label: 'Romaneio' },
          ]}
        />
        {/* Filtros - Não imprimir */}
        <Box sx={{ mb: 3, '@media print': { display: 'none' } }}>
        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar produto ou escola..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Data Início"
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                required
              />
              <TextField
                label="Data Fim"
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                required
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Rotas</InputLabel>
                <Select
                  multiple
                  value={rotaIds}
                  onChange={(e) => setRotaIds(e.target.value as number[])}
                  input={<OutlinedInput label="Rotas" />}
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'Todas';
                    if (selected.length === rotas.length) return 'Todas';
                    return rotas
                      .filter(r => selected.includes(r.id))
                      .map(r => r.nome)
                      .join(', ');
                  }}
                  sx={{ borderRadius: '8px' }}
                >
                  {rotas.map((rota) => (
                    <MenuItem key={rota.id} value={rota.id}>
                      <Checkbox checked={rotaIds.includes(rota.id)} />
                      <ListItemText primary={rota.nome} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={(e) => { setFilterAnchorEl(e.currentTarget); setFilterOpen(true); }}
                size="small"
              >
                Filtros
              </Button>
              <IconButton size="small" disabled={loading} title="Atualizar (dados atualizados automaticamente)">
                <RefreshIcon />
              </IconButton>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                disabled={loading || gerandoPdf}
                size="small"
              >
                {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
              </Button>
            </Box>
          </Box>
        </Card>

        <TableFilter
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={handleApplyFilters}
          fields={filterFields}
          initialValues={{
            status: filters.status,
          }}
          showSearch={false}
          anchorEl={filterAnchorEl}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {filteredItens.length} {filteredItens.length === 1 ? 'item' : 'itens'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {statusLegend.map((item) => (
              <Box key={item.status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusIndicator status={item.status} size="small" />
                <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                  {item.count}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Aviso sobre itens sem data */}
      {!loading && filteredItens.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Nenhum item com data de entrega programada
          </Typography>
          <Typography variant="body2">
            O Romaneio mostra apenas produtos que possuem data de entrega definida. 
            Para adicionar produtos ao romaneio:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <li>Acesse "Guia de Demanda" no menu</li>
            <li>Selecione uma guia e clique em "Itens"</li>
            <li>Ao adicionar produtos, defina a "Data Programada"</li>
          </Box>
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {/* Itens */}
          {dataGridRows.length === 0 ? (
            <Alert severity="info">
              Nenhum item encontrado para os filtros selecionados.
              {filteredItens.length === 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Dica: Certifique-se de que os produtos nas guias de demanda possuem data de entrega programada.
                  </Typography>
                </Box>
              )}
            </Alert>
          ) : (
            <Box sx={{ height: 'calc(100vh - 400px)', minHeight: 400, width: '100%' }}>
              <DataTableAdvanced
                title="Itens do Romaneio"
                data={dataGridRows}
                columns={tableColumns}
                searchPlaceholder="Buscar produto, data ou escola..."
                emptyMessage="Nenhum item encontrado para os filtros selecionados"
              />
            </Box>
          )}
        </Box>
      )}
      
      {/* Modal de Detalhes */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
      >
        {selectedProduct && (
          <>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" component="div">
                  {selectedProduct.produto_nome}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Data: {formatarDataSegura(selectedProduct.data, 'Sem data')}
                </Typography>
              </Box>
              <IconButton
                aria-label="close"
                onClick={handleCloseDetails}
                sx={{
                  color: (theme) => theme.palette.grey[500],
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, height: '60vh' }}>
              <DataGrid
                rows={selectedProduct.escolas.map((esc, idx) => ({ ...esc, rowId: idx }))}
                getRowId={(row) => row.rowId}
                columns={[
                  {
                    field: 'nome',
                    headerName: 'Escola',
                    flex: 1,
                    minWidth: 200,
                  },
                  {
                    field: 'quantidade',
                    headerName: 'Quantidade',
                    width: 120,
                    align: 'right',
                    headerAlign: 'right',
                    valueFormatter: (value) => formatarQuantidade(value),
                  },
                  {
                    field: 'status',
                    headerName: 'Status',
                    width: 200,
                    align: 'center',
                    headerAlign: 'center',
                    renderCell: (params) => (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Chip
                          icon={getStatusItemIcon(params.value || 'pendente')}
                          label={getStatusItemLabel(params.value || 'pendente')}
                          size="small"
                          color={getStatusItemColor(params.value || 'pendente') as any}
                          variant={params.value === 'pendente' || !params.value ? 'outlined' : 'filled'}
                          sx={{ fontWeight: 'bold' }}
                        />
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleOpenStatusMenu(e, params.row)}
                          color="primary"
                          title="Alterar Status"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ),
                  },
                ]}
                density="compact"
                disableRowSelectionOnClick
                disableColumnMenu
                hideFooter={selectedProduct.escolas.length <= 10}
                localeText={dataGridPtBR.components.MuiDataGrid.defaultProps.localeText}
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid #f0f0f0',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f5f5f5',
                    borderBottom: '2px solid #e0e0e0',
                  },
                }}
                // Virtualização para muitas escolas
                rowHeight={52}
                columnHeaderHeight={48}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Fechar</Button>
            </DialogActions>

            <Menu
              anchorEl={statusMenuAnchor}
              open={Boolean(statusMenuAnchor)}
              onClose={handleCloseStatusMenu}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => handleChangeStatus('pendente')}>
                <ListItemIcon>
                  <PendingIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Pendente</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleChangeStatus('programada')}>
                <ListItemIcon>
                  <ScheduleIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText>Programada</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleChangeStatus('em_rota')}>
                <ListItemIcon>
                  <LocalShippingIcon fontSize="small" color="info" />
                </ListItemIcon>
                <ListItemText>Em Rota</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleChangeStatus('entregue')}>
                <ListItemIcon>
                  <CheckCircleIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText>Entregue</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => handleChangeStatus('suspenso')}>
                <ListItemIcon>
                  <BlockIcon fontSize="small" color="warning" />
                </ListItemIcon>
                <ListItemText>Suspenso</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleChangeStatus('cancelado')}>
                <ListItemIcon>
                  <CancelIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Cancelado</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Dialog>

      {/* Dialog do QR Code */}
      <Dialog
        open={showQRDialog}
        onClose={() => setShowQRDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <QrCodeIcon color="primary" />
            <span>QR Code para Entrega</span>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            {qrCodeUrl && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'white',
                  borderRadius: 2,
                  boxShadow: 3
                }}
              >
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  style={{ 
                    width: '100%', 
                    maxWidth: 300,
                    display: 'block'
                  }} 
                />
              </Box>
            )}

            <Box 
              sx={{ 
                width: '100%',
                p: 2, 
                bgcolor: '#f5f5f5', 
                borderRadius: 1 
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Informações do QR Code:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Rota:</strong> {rotaIds.length === 0 ? 'Todas' : 
                  rotaIds.length === rotas.length ? 'Todas' :
                  rotas.filter(r => rotaIds.includes(r.id)).map(r => r.nome).join(', ')}<br/>
                <strong>Período:</strong> {filters.dataInicio && filters.dataFim
                  ? `${formatarDataSegura(filters.dataInicio)} até ${formatarDataSegura(filters.dataFim)}`
                  : 'Não definido'
                }
              </Typography>
            </Box>

            <Box 
              sx={{ 
                width: '100%',
                p: 2, 
                bgcolor: '#e3f2fd', 
                borderRadius: 1,
                border: '1px solid #90caf9'
              }}
            >
              <Typography variant="caption" sx={{ color: '#1565c0', fontWeight: 600 }}>
                📱 Instruções para o entregador:
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: '#1976d2', mt: 1 }}>
                1. Abra o app Entregador<br/>
                2. Faça login<br/>
                3. Clique no botão "Escanear QR Code" 📷<br/>
                4. Aponte a câmera para este código<br/>
                5. As entregas serão filtradas automaticamente
              </Typography>
            </Box>

            <Alert severity="info" sx={{ width: '100%' }}>
              O QR Code será incluído automaticamente no romaneio impresso
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>
            Fechar
          </Button>
          <Button 
            onClick={handlePrint}
            variant="contained"
            startIcon={<PrintIcon />}
            disabled={gerandoPdf}
          >
            {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <style>{`
        @media print {
          .print-none {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
      </PageContainer>

      {/* Modais fora do PageContainer */}
      
      {/* Loading Overlay */}
      <LoadingOverlay 
        open={atualizarProdutoEscolaMutation.isPending}
        message="Atualizando status..."
      />
    </Box>
  );
};

export default Romaneio;
