import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Chip,
  Container,
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
  OutlinedInput
} from '@mui/material';
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
  QrCode2 as QrCodeIcon
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { guiaService } from '../services/guiaService';
import { rotaService } from '../modules/entregas/services/rotaService';
import { RotaEntrega } from '../modules/entregas/types/rota';
import { format } from 'date-fns';
import QRCode from 'qrcode';

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

interface RomaneioPorEscola {
  escola: string;
  rota?: string;
  itens: ItemRomaneio[];
}

const Romaneio: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemRomaneio[]>([]);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<string>('pendente');
  const [rotaIds, setRotaIds] = useState<number[]>([]);
  const [rotas, setRotas] = useState<RotaEntrega[]>([]);
  const [agrupamento, setAgrupamento] = useState<'escola' | 'produto'>('produto');

  // Estado para o modal de detalhes
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    produto_nome: string;
    data: string;
    escolas: { id: number; nome: string; quantidade: number; status: string; rota?: string }[];
  } | null>(null);

  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [itemStatusEditing, setItemStatusEditing] = useState<any>(null);
  const { success, error: showError } = useNotification();
  
  // Estado para QR Code
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQRDialog, setShowQRDialog] = useState(false);

  const carregarRotas = async () => {
    try {
      const data = await rotaService.listarRotas();
      setRotas(data);
    } catch (err) {
      console.error('Erro ao carregar rotas:', err);
    }
  };

  const carregarRomaneio = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await guiaService.listarRomaneio({
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: status === 'todos' ? undefined : status,
        rota_id: rotaIds.length === 1 ? rotaIds[0] : undefined
      });
      setItens(Array.isArray(data) ? data : []);
      
      // Gerar QR Code automaticamente se houver rotas selecionadas
      if (rotaIds.length > 0) {
        await gerarQRCodeAutomatico();
      } else {
        setQrCodeUrl('');
      }
    } catch (err) {
      console.error('Erro ao carregar romaneio:', err);
      setError('Erro ao carregar dados do romaneio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRotas();
    carregarRomaneio();
  }, []);

  const handlePrint = async () => {
    // Gerar QR Code antes de imprimir se houver rotas selecionadas
    if (rotaIds.length > 0 && !qrCodeUrl) {
      await gerarQRCodeAutomatico();
      // Aguardar um pouco para o QR Code ser renderizado
      setTimeout(() => {
        window.print();
      }, 300);
    } else {
      window.print();
    }
  };

  const gerarQRCodeAutomatico = async () => {
    if (rotaIds.length === 0 || !dataInicio || !dataFim) {
      return;
    }

    try {
      const rotasSelecionadas = rotas.filter(r => rotaIds.includes(r.id));
      
      // Obter nome do usuário logado
      const token = localStorage.getItem('token');
      let geradoPor = 'Sistema';
      if (token) {
        try {
          const parsed = JSON.parse(token);
          geradoPor = parsed.nome || parsed.usuario?.nome || 'Sistema';
        } catch (e) {
          geradoPor = 'Sistema';
        }
      }

      const qrData = {
        rotaIds: rotaIds,
        rotaNomes: rotasSelecionadas.map(r => r.nome),
        dataInicio,
        dataFim,
        geradoEm: new Date().toISOString(),
        geradoPor
      };

      const jsonData = JSON.stringify(qrData);
      
      const qrUrl = await QRCode.toDataURL(jsonData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  };

  // Agrupar itens por escola
  const dadosAgrupadosEscola = React.useMemo(() => {
    const grupos: Record<string, RomaneioPorEscola> = {};
    
    itens.forEach(item => {
      if (!grupos[item.escola_nome]) {
        grupos[item.escola_nome] = {
          escola: item.escola_nome,
          rota: item.escola_rota,
          itens: []
        };
      }
      grupos[item.escola_nome].itens.push(item);
    });

    return Object.values(grupos).sort((a, b) => a.escola.localeCompare(b.escola));
  }, [itens]);

  // Agrupar itens por data e produto
  const dadosAgrupadosProduto = React.useMemo(() => {
    const grupos: Record<string, {
      data: string;
      produtos: Record<string, {
        produto_nome: string;
        unidade: string;
        quantidade_total: number;
        escolas: { id: number; nome: string; quantidade: number; status: string; rota?: string }[];
      }>
    }> = {};

    itens.forEach(item => {
      const data = item.data_entrega.split('T')[0];
      
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

      grupos[data].produtos[chaveProduto].quantidade_total += Number(item.quantidade);
      grupos[data].produtos[chaveProduto].escolas.push({
        id: item.id,
        nome: item.escola_nome,
        quantidade: Number(item.quantidade),
        status: item.status,
        rota: item.escola_rota
      });
    });

    // Converter para array e ordenar
    return Object.values(grupos)
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(grupo => ({
        ...grupo,
        produtos: Object.values(grupo.produtos).sort((a, b) => {
          const nomeCompare = a.produto_nome.localeCompare(b.produto_nome);
          if (nomeCompare !== 0) return nomeCompare;
          return a.unidade.localeCompare(b.unidade);
        })
      }));
  }, [itens]);

  const handleOpenDetails = (produto: string, data: string, escolas: { id: number; nome: string; quantidade: number; status: string; rota?: string }[]) => {
    setSelectedProduct({
      produto_nome: produto,
      data: data,
      escolas: escolas
    });
    setModalOpen(true);
  };

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

  const handleOpenStatusMenu = (event: React.MouseEvent<HTMLElement>, item: any) => {
    setStatusMenuAnchor(event.currentTarget);
    setItemStatusEditing(item);
  };

  const handleCloseStatusMenu = () => {
    setStatusMenuAnchor(null);
    setItemStatusEditing(null);
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!itemStatusEditing) return;

    try {
      const itemId = itemStatusEditing.id;
      
      if (!itemId) {
        showError('Item sem identificador para atualização');
        return;
      }

      await guiaService.atualizarProdutoEscola(itemId, { status: newStatus });
      success(`Status atualizado para ${getStatusItemLabel(newStatus)}`);
      
      // Atualizar lista localmente
      if (selectedProduct) {
        const updatedEscolas = selectedProduct.escolas.map(esc => 
          esc.id === itemId ? { ...esc, status: newStatus } : esc
        );
        setSelectedProduct({ ...selectedProduct, escolas: updatedEscolas });
      }
      
      // Recarregar dados gerais
      carregarRomaneio();
      
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      showError('Erro ao atualizar status do item');
    } finally {
      handleCloseStatusMenu();
    }
  };

  const handleCloseDetails = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Filtros - Não imprimir */}
      <Box sx={{ mb: 4, '@media print': { display: 'none' } }}>
        <Typography variant="h4" gutterBottom>
          Romaneio de Entrega
        </Typography>
        
        <Card>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
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
                  >
                    {rotas.map((rota) => (
                      <MenuItem key={rota.id} value={rota.id}>
                        <Checkbox checked={rotaIds.includes(rota.id)} />
                        <ListItemText primary={rota.nome} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Data Início"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Data Fim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    label="Status"
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <MenuItem value="todos">Todos (Ativos)</MenuItem>
                    <MenuItem value="pendente">Pendente</MenuItem>
                    <MenuItem value="programada">Programada</MenuItem>
                    <MenuItem value="em_rota">Em Rota</MenuItem>
                    <MenuItem value="entregue">Entregue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={carregarRomaneio}
                  fullWidth
                >
                  Buscar
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  fullWidth
                >
                  Imprimir
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Tipo de Visualização:
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant={agrupamento === 'escola' ? 'contained' : 'outlined'}
                    onClick={() => setAgrupamento('escola')}
                    size="small"
                  >
                    Por Escola
                  </Button>
                  <Button
                    variant={agrupamento === 'produto' ? 'contained' : 'outlined'}
                    onClick={() => setAgrupamento('produto')}
                    size="small"
                  >
                    Por Produto (Consolidado)
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box id="printable-area">
          {/* Cabeçalho de Impressão */}
          <Box sx={{ display: 'none', '@media print': { display: 'block' }, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Romaneio de Entrega</Typography>
                <Box sx={{ borderBottom: '2px solid #000', pb: 1, mb: 2 }}>
                  <Typography variant="subtitle1">
                    <strong>Período:</strong> {format(new Date(dataInicio), 'dd/MM/yyyy')} a {format(new Date(dataFim), 'dd/MM/yyyy')}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>Rota:</strong> {rotaIds.length === 0 ? 'Todas as Rotas' : 
                      rotaIds.length === rotas.length ? 'Todas as Rotas' :
                      rotas.filter(r => rotaIds.includes(r.id)).map(r => r.nome).join(', ')}
                  </Typography>
                </Box>
              </Box>
              {qrCodeUrl && rotaId && (
                <Box sx={{ ml: 3, textAlign: 'center' }}>
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    style={{ 
                      width: '120px', 
                      height: '120px',
                      border: '2px solid #000',
                      padding: '4px',
                      backgroundColor: '#fff'
                    }} 
                  />
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: '9px' }}>
                    Escaneie para filtrar entregas
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <style type="text/css" media="print">
            {`
              @page { size: auto; margin: 10mm; }
              body { background-color: white !important; -webkit-print-color-adjust: exact; }
              .MuiCard-root { box-shadow: none !important; border: none !important; margin: 0 !important; }
              .MuiPaper-root { box-shadow: none !important; }
              .MuiTableCell-root { border-bottom: 1px solid #ddd !important; padding: 8px !important; }
              .MuiTableHead-root .MuiTableCell-root { background-color: #f5f5f5 !important; font-weight: bold !important; -webkit-print-color-adjust: exact; }
              /* Esconder elementos de UI que possam ter vazado */
              button, input, select, .MuiIconButton-root { display: none !important; }
            `}
          </style>

          {agrupamento === 'escola' ? (
            dadosAgrupadosEscola.length === 0 ? (
              <Alert severity="info">Nenhum item encontrado para os filtros selecionados.</Alert>
            ) : (
              dadosAgrupadosEscola.map((grupo) => (
                <Card key={grupo.escola} sx={{ mb: 3, breakInside: 'avoid' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6">
                        {grupo.escola}
                      </Typography>
                      {grupo.rota && (
                        <Chip label={`Rota: ${grupo.rota}`} size="small" color="primary" variant="outlined" />
                      )}
                    </Box>
                    
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Produto</TableCell>
                            <TableCell align="right">Qtd</TableCell>
                            <TableCell>Unid</TableCell>
                            <TableCell>Data Entrega</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Obs</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {grupo.itens.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.produto_nome}</TableCell>
                              <TableCell align="right">{item.quantidade}</TableCell>
                              <TableCell>{item.unidade}</TableCell>
                              <TableCell>{format(new Date(item.data_entrega), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={item.status || 'Pendente'} 
                                  size="small" 
                                  color={
                                    item.status === 'entregue' ? 'success' : 
                                    item.status === 'em_rota' ? 'warning' : 'default'
                                  } 
                                />
                              </TableCell>
                              <TableCell>{item.observacao}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))
            )
          ) : (
            // Visualização por Produto (Consolidado)
            dadosAgrupadosProduto.length === 0 ? (
              <Alert severity="info">Nenhum item encontrado para os filtros selecionados.</Alert>
            ) : (
              dadosAgrupadosProduto.map((grupoData) => (
                <Card key={grupoData.data} sx={{ mb: 3, breakInside: 'avoid' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #eee', pb: 1 }}>
                      Data de Entrega: {format(new Date(grupoData.data), 'dd/MM/yyyy')}
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Produto</TableCell>
                            <TableCell align="center">Quantidade Total</TableCell>
                            <TableCell align="center">Unidade</TableCell>
                            <TableCell align="center" sx={{ '@media print': { display: 'none' } }}>Escolas</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {grupoData.produtos.map((produto, idx) => (
                            <TableRow key={idx}>
                              <TableCell sx={{ fontWeight: 'bold' }}>{produto.produto_nome}</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold' }}>{produto.quantidade_total}</TableCell>
                              <TableCell align="center">{produto.unidade}</TableCell>
                              <TableCell align="center" sx={{ '@media print': { display: 'none' } }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<VisibilityIcon />}
                                  onClick={() => handleOpenDetails(produto.produto_nome, grupoData.data, produto.escolas)}
                                >
                                  Ver Detalhes ({produto.escolas.length})
                                </Button>
                                {/* Versão para impressão - lista simples */}
                                <Box sx={{ display: 'none', '@media print': { display: 'block', mt: 1 } }}>
                                  {produto.escolas.map((esc, i) => (
                                    <Typography key={i} variant="caption" display="block" sx={{ fontSize: '0.8rem' }}>
                                      {esc.nome} {esc.rota ? `(${esc.rota})` : ''}
                                    </Typography>
                                  ))}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))
            )
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
                  Data: {format(new Date(selectedProduct.data), 'dd/MM/yyyy')}
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
            <DialogContent dividers>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Escola</TableCell>
                      <TableCell align="right">Quantidade</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedProduct.escolas.map((esc, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{esc.nome}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{esc.quantidade}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Chip
                              icon={getStatusItemIcon(esc.status || 'pendente')}
                              label={getStatusItemLabel(esc.status || 'pendente')}
                              size="small"
                              color={getStatusItemColor(esc.status || 'pendente') as any}
                              variant={esc.status === 'pendente' || !esc.status ? 'outlined' : 'filled'}
                              sx={{ fontWeight: 'bold' }}
                            />
                            <IconButton 
                              size="small" 
                              onClick={(e) => handleOpenStatusMenu(e, esc)}
                              sx={{ ml: 1 }}
                              color="primary"
                              title="Alterar Status"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
                <strong>Rota:</strong> {rotaId ? rotas.find(r => r.id === Number(rotaId))?.nome : ''}<br/>
                <strong>Período:</strong> {format(new Date(dataInicio), 'dd/MM/yyyy')} até {format(new Date(dataFim), 'dd/MM/yyyy')}
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
          >
            Imprimir Romaneio
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
    </Container>
  );
};

export default Romaneio;
