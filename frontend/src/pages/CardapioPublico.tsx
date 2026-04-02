import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import api from '../services/api';
import { initPdfMake } from '../utils/cardapioPdfGenerators';

interface Refeicao {
  id: number;
  nome: string;
  descricao?: string;
  tipo_refeicao?: string;
}

interface FichaTecnica {
  refeicao: any;
  produtos: any[];
  custo_total: number;
}

const CardapioPublico: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fichaTecnica, setFichaTecnica] = useState<FichaTecnica | null>(null);
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (!dataParam) {
      setError('Dados do cardápio não encontrados');
      setLoading(false);
      return;
    }

    try {
      const qrData = JSON.parse(decodeURIComponent(dataParam));
      carregarRefeicoes(qrData.refeicoesIds);
    } catch (err) {
      setError('Erro ao processar dados do QR Code');
      setLoading(false);
    }
  }, [searchParams]);

  const carregarRefeicoes = async (ids: number[]) => {
    try {
      setLoading(true);
      console.log('Carregando refeições com IDs:', ids);
      const promises = ids.map(id => api.get(`/refeicoes/${id}`));
      const responses = await Promise.all(promises);
      // A API retorna { success: true, data: {...} }
      const refeicoesData = responses.map(r => r.data.data || r.data);
      console.log('Refeições carregadas:', refeicoesData);
      setRefeicoes(refeicoesData);
    } catch (err) {
      console.error('Erro ao carregar refeições:', err);
      setError('Erro ao carregar refeições');
    } finally {
      setLoading(false);
    }
  };

  const handleRefeicaoClick = async (refeicaoId: number) => {
    console.log('Clicou na refeição ID:', refeicaoId);
    
    if (!refeicaoId) {
      console.error('ID da refeição é undefined!');
      setError('ID da refeição inválido');
      return;
    }
    
    setLoadingFicha(true);
    setOpenDialog(true);
    setPdfUrl(null);

    try {
      // Buscar ficha técnica
      console.log('Buscando ficha técnica para refeição:', refeicaoId);
      const response = await api.get(`/refeicoes/${refeicaoId}/ficha-tecnica`);
      console.log('Ficha técnica recebida:', response.data);
      setFichaTecnica(response.data);
      
      // Gerar PDF
      await gerarPDFFichaTecnica(response.data);
    } catch (err) {
      console.error('Erro ao carregar ficha técnica:', err);
      setError('Erro ao carregar ficha técnica');
    } finally {
      setLoadingFicha(false);
    }
  };

  const gerarPDFFichaTecnica = async (ficha: FichaTecnica) => {
    try {
      const pdfMake = await initPdfMake();
      
      const tableBody: any[] = [
        [
          { text: 'Produto', style: 'tableHeader', fillColor: '#4a5568', color: 'white' },
          { text: 'Quantidade', style: 'tableHeader', fillColor: '#4a5568', color: 'white', alignment: 'center' },
          { text: 'Unidade', style: 'tableHeader', fillColor: '#4a5568', color: 'white', alignment: 'center' },
          { text: 'Custo Unit.', style: 'tableHeader', fillColor: '#4a5568', color: 'white', alignment: 'right' },
          { text: 'Custo Total', style: 'tableHeader', fillColor: '#4a5568', color: 'white', alignment: 'right' }
        ]
      ];

      ficha.produtos.forEach((produto: any) => {
        tableBody.push([
          { text: produto.produto_nome || '', fontSize: 9 },
          { text: produto.quantidade?.toFixed(2) || '0', fontSize: 9, alignment: 'center' },
          { text: produto.unidade_medida || '', fontSize: 9, alignment: 'center' },
          { text: `R$ ${produto.custo_unitario?.toFixed(2) || '0.00'}`, fontSize: 9, alignment: 'right' },
          { text: `R$ ${produto.custo_total?.toFixed(2) || '0.00'}`, fontSize: 9, alignment: 'right' }
        ]);
      });

      tableBody.push([
        { text: 'TOTAL', colSpan: 4, bold: true, fontSize: 10, fillColor: '#e2e8f0', alignment: 'right' },
        {},
        {},
        {},
        { text: `R$ ${ficha.custo_total?.toFixed(2) || '0.00'}`, bold: true, fontSize: 10, fillColor: '#e2e8f0', alignment: 'right' }
      ]);

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        content: [
          {
            text: 'FICHA TÉCNICA DE PREPARAÇÃO',
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },
          {
            text: ficha.refeicao.nome.toUpperCase(),
            style: 'subheader',
            alignment: 'center',
            margin: [0, 0, 0, 10]
          },
          {
            text: ficha.refeicao.descricao || '',
            fontSize: 10,
            alignment: 'center',
            margin: [0, 0, 0, 20],
            color: '#666666'
          },
          {
            table: {
              headerRows: 1,
              widths: ['*', 80, 60, 80, 80],
              body: tableBody
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cccccc',
              vLineColor: () => '#cccccc'
            }
          }
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            color: '#2d3748'
          },
          subheader: {
            fontSize: 14,
            bold: true,
            color: '#4a5568'
          },
          tableHeader: {
            bold: true,
            fontSize: 10
          }
        }
      };

      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      
      pdfDocGenerator.getDataUrl().then((dataUrl: string) => {
        setPdfUrl(dataUrl);
      });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfUrl && fichaTecnica) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `ficha-tecnica-${fichaTecnica.refeicao.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      link.click();
    }
  };

  const handlePrintPDF = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      printWindow?.print();
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Carregando cardápio...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <RestaurantIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Cardápio Escolar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Clique em uma preparação para ver a ficha técnica
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && refeicoes.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Debug: {refeicoes.length} refeições carregadas. 
            IDs: {refeicoes.map(r => r.id || 'undefined').join(', ')}
          </Alert>
        )}

        <List>
          {refeicoes.map((refeicao, index) => (
            <React.Fragment key={`refeicao-fragment-${refeicao.id}-${index}`}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleRefeicaoClick(refeicao.id)}
                  disabled={!refeicao.id}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': {
                      bgcolor: 'primary.50'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {refeicao.nome}
                        {!refeicao.id && ' (ID inválido)'}
                      </Typography>
                    }
                    secondary={refeicao.descricao}
                  />
                  <Chip
                    label="Ver Ficha Técnica"
                    color="primary"
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </ListItemButton>
              </ListItem>
              {index < refeicoes.length - 1 && <Divider key={`divider-${refeicao.id}-${index}`} />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Dialog para visualizar PDF */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {fichaTecnica?.refeicao.nome}
            </Typography>
            <IconButton onClick={() => setOpenDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingFicha ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Gerando ficha técnica...</Typography>
            </Box>
          ) : pdfUrl ? (
            <Box sx={{ width: '100%', height: '70vh' }}>
              <iframe
                src={pdfUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Ficha Técnica PDF"
              />
            </Box>
          ) : (
            <Alert severity="error">Erro ao carregar PDF</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Fechar
          </Button>
          <Button
            onClick={handlePrintPDF}
            startIcon={<PrintIcon />}
            disabled={!pdfUrl}
          >
            Imprimir
          </Button>
          <Button
            onClick={handleDownloadPDF}
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={!pdfUrl}
          >
            Baixar PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CardapioPublico;
