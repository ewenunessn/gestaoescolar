import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import api from '../services/api';

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
  total_itens: number;
  status: string;
  itens: ComprovanteItem[];
}

interface Escola {
  id: number;
  nome: string;
}

export default function ComprovantesEntrega() {
  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [escolaFiltro, setEscolaFiltro] = useState<number | ''>('');
  const [numeroFiltro, setNumeroFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Modal de detalhes
  const [comprovanteDetalhes, setComprovanteDetalhes] = useState<Comprovante | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    carregarEscolas();
    carregarComprovantes();
  }, []);

  const carregarEscolas = async () => {
    try {
      const response = await api.get('/escolas');
      // A API pode retornar um objeto com a propriedade 'escolas' ou diretamente um array
      const escolasData = Array.isArray(response.data) ? response.data : (response.data.escolas || []);
      setEscolas(escolasData);
    } catch (err) {
      console.error('Erro ao carregar escolas:', err);
      setEscolas([]); // Garantir que sempre seja um array
    }
  };

  const carregarComprovantes = async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = '/entregas/comprovantes?limit=100';
      
      if (escolaFiltro) {
        url = `/entregas/comprovantes/escola/${escolaFiltro}?limit=100`;
      }
      
      const response = await api.get(url);
      let dados = response.data.comprovantes || response.data;
      
      // Aplicar filtros locais
      if (numeroFiltro) {
        dados = dados.filter((c: Comprovante) => 
          c.numero_comprovante.toLowerCase().includes(numeroFiltro.toLowerCase())
        );
      }
      
      if (dataInicio) {
        dados = dados.filter((c: Comprovante) => 
          new Date(c.data_entrega) >= new Date(dataInicio)
        );
      }
      
      if (dataFim) {
        const fim = new Date(dataFim);
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

  const abrirDetalhes = async (id: number) => {
    try {
      const response = await api.get(`/entregas/comprovantes/${id}`);
      setComprovanteDetalhes(response.data);
      setModalAberto(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao carregar detalhes');
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setComprovanteDetalhes(null);
  };

  const imprimirDireto = async (id: number) => {
    try {
      const response = await api.get(`/entregas/comprovantes/${id}`);
      const comprovante = response.data;
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      const html = gerarHTMLImpressao(comprovante);
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao imprimir comprovante');
    }
  };

  const imprimirComprovante = async () => {
    if (!comprovanteDetalhes) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = gerarHTMLImpressao(comprovanteDetalhes);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const gerarHTMLImpressao = (comprovante: Comprovante) => {
    const dataFormatada = new Date(comprovante.data_entrega).toLocaleString('pt-BR');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comprovante ${comprovante.numero_comprovante}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            color: #1976d2;
          }
          .header h2 {
            margin: 5px 0;
            color: #666;
            font-size: 18px;
          }
          .info-section {
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            margin-bottom: 10px;
          }
          .info-label {
            font-weight: bold;
            width: 200px;
          }
          .info-value {
            flex: 1;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #1976d2;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 45%;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #333;
            margin-top: 60px;
            padding-top: 10px;
          }
          .signature-image {
            max-width: 300px;
            max-height: 150px;
            border: 1px solid #ddd;
            padding: 10px;
            margin: 20px auto;
            display: block;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COMPROVANTE DE ENTREGA</h1>
          <h2>${comprovante.numero_comprovante}</h2>
        </div>
        
        <div class="info-section">
          <div class="info-row">
            <div class="info-label">Escola:</div>
            <div class="info-value">${comprovante.escola_nome}</div>
          </div>
          ${comprovante.escola_endereco ? `
          <div class="info-row">
            <div class="info-label">Endereço:</div>
            <div class="info-value">${comprovante.escola_endereco}</div>
          </div>
          ` : ''}
          <div class="info-row">
            <div class="info-label">Data da Entrega:</div>
            <div class="info-value">${dataFormatada}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Entregador:</div>
            <div class="info-value">${comprovante.nome_quem_entregou}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Recebedor:</div>
            <div class="info-value">${comprovante.nome_quem_recebeu}${comprovante.cargo_recebedor ? ` (${comprovante.cargo_recebedor})` : ''}</div>
          </div>
          ${comprovante.observacao ? `
          <div class="info-row">
            <div class="info-label">Observações:</div>
            <div class="info-value">${comprovante.observacao}</div>
          </div>
          ` : ''}
        </div>
        
        <h3>Itens Entregues</h3>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Unidade</th>
              ${comprovante.itens.some(i => i.lote) ? '<th>Lote</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${comprovante.itens.map(item => `
              <tr>
                <td>${item.produto_nome}</td>
                <td style="text-align: right;">${formatarQuantidade(item.quantidade_entregue)}</td>
                <td>${item.unidade}</td>
                ${comprovante.itens.some(i => i.lote) ? `<td>${item.lote || '-'}</td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${comprovante.assinatura_base64 ? `
        <div style="margin-top: 40px;">
          <h3>Assinatura Digital do Recebedor</h3>
          <img src="${comprovante.assinatura_base64}" class="signature-image" alt="Assinatura" />
        </div>
        ` : ''}
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">
              ${comprovante.nome_quem_entregou}<br>
              <small>Entregador</small>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              ${comprovante.nome_quem_recebeu}<br>
              <small>Recebedor${comprovante.cargo_recebedor ? ` - ${comprovante.cargo_recebedor}` : ''}</small>
            </div>
          </div>
        </div>
        
        <div class="footer">
          Documento gerado em ${new Date().toLocaleString('pt-BR')}<br>
          Sistema de Gestão Escolar
        </div>
      </body>
      </html>
    `;
  };

  const formatarQuantidade = (valor: number): string => {
    if (Number.isInteger(valor)) {
      return valor.toString();
    }
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  };

  const limparFiltros = () => {
    setEscolaFiltro('');
    setNumeroFiltro('');
    setDataInicio('');
    setDataFim('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Comprovantes de Entrega
        </Typography>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Escola"
              value={escolaFiltro}
              onChange={(e) => setEscolaFiltro(e.target.value as number | '')}
              size="small"
            >
              <MenuItem value="">Todas</MenuItem>
              {escolas.map((escola) => (
                <MenuItem key={escola.id} value={escola.id}>
                  {escola.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Número do Comprovante"
              value={numeroFiltro}
              onChange={(e) => setNumeroFiltro(e.target.value)}
              size="small"
              placeholder="COMP-2026-03-00001"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Data Início"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Data Fim"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={carregarComprovantes}
              sx={{ height: '40px' }}
            >
              Buscar
            </Button>
          </Grid>
        </Grid>
        {(escolaFiltro || numeroFiltro || dataInicio || dataFim) && (
          <Box sx={{ mt: 2 }}>
            <Button size="small" onClick={limparFiltros}>
              Limpar Filtros
            </Button>
          </Box>
        )}
      </Paper>

      {/* Estatísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Comprovantes
              </Typography>
              <Typography variant="h4">
                {comprovantes.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Itens Entregues
              </Typography>
              <Typography variant="h4">
                {comprovantes.reduce((sum, c) => sum + c.total_itens, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Escolas Atendidas
              </Typography>
              <Typography variant="h4">
                {new Set(comprovantes.map(c => c.escola_id)).size}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Número</TableCell>
              <TableCell>Escola</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Entregador</TableCell>
              <TableCell>Recebedor</TableCell>
              <TableCell align="center">Itens</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : comprovantes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhum comprovante encontrado
                </TableCell>
              </TableRow>
            ) : (
              comprovantes.map((comprovante) => (
                <TableRow key={comprovante.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {comprovante.numero_comprovante}
                    </Typography>
                  </TableCell>
                  <TableCell>{comprovante.escola_nome}</TableCell>
                  <TableCell>
                    {new Date(comprovante.data_entrega).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>{comprovante.nome_quem_entregou}</TableCell>
                  <TableCell>{comprovante.nome_quem_recebeu}</TableCell>
                  <TableCell align="center">
                    <Chip label={comprovante.total_itens} size="small" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={comprovante.status}
                      size="small"
                      color={comprovante.status === 'finalizado' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => abrirDetalhes(comprovante.id)}
                      title="Ver detalhes"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => imprimirDireto(comprovante.id)}
                      title="Imprimir"
                    >
                      <PrintIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
                
                {comprovanteDetalhes.assinatura_base64 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Assinatura Digital do Recebedor
                    </Typography>
                    <Box
                      component="img"
                      src={comprovanteDetalhes.assinatura_base64}
                      alt="Assinatura"
                      sx={{
                        maxWidth: '300px',
                        maxHeight: '150px',
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        p: 1,
                        display: 'block'
                      }}
                    />
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
    </Box>
  );
}
