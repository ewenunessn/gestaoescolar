import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  Button,
  Stack,
  Avatar
} from "@mui/material";
import {
  Restaurant as RestaurantIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Print as PrintIcon,
  CalendarToday as CalendarIcon,
  Info as InfoIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon
} from "@mui/icons-material";
import api from "../../../services/api";
import { initPdfMake, savePdfDocument } from "../../../utils/pdfUtils";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";

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
  const [pdfDocument, setPdfDocument] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [expandedRefeicao, setExpandedRefeicao] = useState<number | null>(null);

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
      const promises = ids.map(id => api.get(`/refeicoes/${id}`));
      const responses = await Promise.all(promises);
      // A API retorna { success: true, data: {...} }
      const refeicoesData = responses.map(r => r.data.data || r.data);
      setRefeicoes(refeicoesData);
    } catch (err) {
      console.error('Erro ao carregar refeições:', err);
      setError('Erro ao carregar refeições');
    } finally {
      setLoading(false);
    }
  };

  const handleRefeicaoClick = async (refeicaoId: number) => {
    
    if (!refeicaoId) {
      console.error('ID da refeição é undefined!');
      setError('ID da refeição inválido');
      return;
    }
    
    setLoadingFicha(true);
    setOpenDialog(true);
    setPdfUrl(null);
    setPdfDocument(null);

    try {
      // Buscar ficha técnica
      const response = await api.get(`/refeicoes/${refeicaoId}/ficha-tecnica`);
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
          { text: produto.unidade || '', fontSize: 9, alignment: 'center' },
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
      setPdfDocument(pdfDocGenerator);
      
      pdfDocGenerator.getDataUrl().then((dataUrl: string) => {
        setPdfUrl(dataUrl);
      });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    }
  };

  const handleDownloadPDF = async () => {
    if (pdfUrl && fichaTecnica) {
      const fileName = `ficha-tecnica-${fichaTecnica.refeicao.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`;

      if (window.desktopShell?.isDesktop && pdfDocument) {
        await savePdfDocument(pdfDocument, fileName);
        return;
      }

      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
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
      <Container maxWidth="md" sx={{ py: 12, textAlign: 'center' }}>
        <CircularProgress size={48} />
        <Typography sx={{ mt: 3, color: 'text.secondary' }}>Carregando cardápio...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ borderRadius: 6 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <PageBreadcrumbs items={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Cardápios', path: '/cardapios' },
        { label: 'Cardápio Público' },
      ]} />

      <Paper sx={{ p: 4, mb: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              mx: 'auto',
              mb: 3,
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            <RestaurantIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Cardápio Escolar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Explore as preparações e visualize as fichas técnicas
          </Typography>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && refeicoes.length > 0 && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 6 }}>
            Debug: {refeicoes.length} refeições carregadas.
            IDs: {refeicoes.map(r => r.id || 'undefined').join(', ')}
          </Alert>
        )}

        <List disablePadding>
          {refeicoes.map((refeicao, index) => (
            <React.Fragment key={`refeicao-${refeicao.id}-${index}`}>
              <ListItem disablePadding sx={{ mb: 2 }}>
                <ListItemButton
                  onClick={() => handleRefeicaoClick(refeicao.id)}
                  disabled={!refeicao.id}
                  sx={{
                    borderRadius: 2,
                    p: 2,
                    '&:hover': {
                      bgcolor: 'primary.10',
                      transform: 'translateX(4px)',
                      transition: 'all 0.2s ease'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                    <Box sx={{ mr: 3 }}>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: 'primary.20',
                          '&:hover': { bgcolor: 'primary.30' }
                        }}
                      >
                        <ReceiptIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                      </Avatar>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {refeicao.nome}
                        {!refeicao.id && ' (ID inválido)'}
                      </Typography>
                      {refeicao.descricao && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {refeicao.descricao}
                        </Typography>
                      )}
                      {refeicao.tipo_refeicao && (
                        <Chip
                          label={refeicao.tipo_refeicao}
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip
                        label="Ver Ficha Técnica"
                        color="primary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefeicaoClick(refeicao.id);
                        }}
                        sx={{
                          ml: 2,
                          '&:hover': { bgcolor: 'primary.dark' }
                        }}
                      />
                    </Box>
                  </Box>
                </ListItemButton>
              </ListItem>
              {index < refeicoes.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        {refeicoes.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <InfoIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nenhuma refeição encontrada
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Verifique o QR Code e tente novamente
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Card informativo */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'info.main' }}>
            <CalendarIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Dica
            </Typography>
            <Typography variant="body2" color="text.secondary">
              As fichas técnicas contêm informações detalhadas sobre ingredientes, quantidades e valores nutricionais
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Dialog para visualizar PDF */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 40, height: 40, mr: 2, bgcolor: 'primary.main' }}>
                <ReceiptIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {fichaTecnica?.refeicao.nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ficha Técnica de Preparação
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setOpenDialog(false)} sx={{ color: 'text.secondary' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {loadingFicha ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={48} />
              <Typography sx={{ mt: 3, color: 'text.secondary' }}>Gerando ficha técnica...</Typography>
            </Box>
          ) : pdfUrl ? (
            <Box sx={{ width: '100%', height: '75vh' }}>
              <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                <Chip
                  label="PDF Gerado"
                  color="success"
                  size="small"
                  icon={<DownloadIcon fontSize="small" />}
                />
              </Box>
              <iframe
                src={pdfUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 2
                }}
                title="Ficha Técnica PDF"
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                Erro ao carregar PDF
              </Alert>
              <Button
                variant="outlined"
                onClick={() => {
                  if (fichaTecnica?.refeicao.id) {
                    handleRefeicaoClick(fichaTecnica.refeicao.id);
                  }
                }}
                startIcon={<RefreshIcon />}
              >
                Tentar novamente
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            sx={{ borderRadius: 6 }}
          >
            Fechar
          </Button>
          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            <Button
              onClick={handlePrintPDF}
              startIcon={<PrintIcon />}
              disabled={!pdfUrl}
              variant="outlined"
              sx={{ borderRadius: 6 }}
            >
              Imprimir
            </Button>
            <Button
              onClick={handleDownloadPDF}
              variant="contained"
              startIcon={<DownloadIcon />}
              disabled={!pdfUrl}
              sx={{ borderRadius: 6 }}
            >
              Baixar PDF
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CardapioPublico;
