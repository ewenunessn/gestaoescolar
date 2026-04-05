import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Box, Button, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, IconButton, Tooltip, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper
} from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../components/DataTable";
import { 
  Description as DescriptionIcon, Visibility as VisibilityIcon, 
  Print as PrintIcon, ArrowBack as ArrowBackIcon
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import { buscarInstituicao, Instituicao } from "../../../services/instituicao";
import { initPdfMake, buildPdfDoc, buildTable } from "../../../utils/pdfUtils";
import JsBarcode from "jsbarcode";

export default function ComprovantesPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [comprovantes, setComprovantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [comprovanteDetalhes, setComprovanteDetalhes] = useState<any>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);

  useEffect(() => {
    carregarComprovantes();
    buscarInstituicao()
      .then(inst => setInstituicao(inst))
      .catch(err => console.error('Erro ao carregar instituição:', err));
  }, []);

  const carregarComprovantes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/escola-portal/comprovantes');
      setComprovantes(response.data.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar comprovantes:', error);
      toast.error('Erro ao carregar comprovantes');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = async (id: number) => {
    try {
      const response = await api.get(`/escola-portal/comprovantes/${id}`);
      setComprovanteDetalhes(response.data.data);
      setDetalhesOpen(true);
    } catch (error: any) {
      console.error('Erro ao carregar detalhes:', error);
      toast.error('Erro ao carregar detalhes do comprovante');
    }
  };

  const gerarPdfComprovante = async () => {
    if (!comprovanteDetalhes) return;

    setGerandoPdf(true);
    try {
      const pdfMake = await initPdfMake();

      // Parse date properly
      let dataFormatada: string;
      try {
        const date = new Date(comprovanteDetalhes.data_entrega);
        if (isNaN(date.getTime())) {
          const dateWithTime = new Date(comprovanteDetalhes.data_entrega + 'T12:00:00');
          dataFormatada = dateWithTime.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } else {
          dataFormatada = date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (e) {
        dataFormatada = 'Data não disponível';
      }

      const temLote = comprovanteDetalhes.itens.some((i: any) => i.lote);

      // Gerar código de barras
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, comprovanteDetalhes.numero_comprovante, {
        format: 'CODE128',
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 10
      });
      const barcodeDataUrl = canvas.toDataURL('image/png');

      const infoRows: any[] = [
        [{ text: 'Escola:', bold: true }, comprovanteDetalhes.escola_nome],
        ...(comprovanteDetalhes.escola_endereco ? [[{ text: 'Endereço:', bold: true }, comprovanteDetalhes.escola_endereco]] : []),
        [{ text: 'Data da Entrega:', bold: true }, dataFormatada],
        [{ text: 'Entregador:', bold: true }, comprovanteDetalhes.nome_quem_entregou],
        [{ text: 'Recebedor:', bold: true }, comprovanteDetalhes.nome_quem_recebeu],
        ...(comprovanteDetalhes.observacao ? [[{ text: 'Observações:', bold: true }, comprovanteDetalhes.observacao]] : []),
      ];

      const headers = ['Produto', 'Quantidade', 'Unidade', ...(temLote ? ['Lote'] : [])];
      const rows = comprovanteDetalhes.itens.map((item: any) => [
        item.produto_nome,
        item.quantidade_entregue?.toString() || '0',
        item.unidade || '-',
        ...(temLote ? [item.lote || '-'] : []),
      ]);
      const widths = temLote ? ['*', 70, 60, 70] : ['*', 80, 70];

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
        { text: `Itens Entregues (${comprovanteDetalhes.itens.length})`, style: 'sectionTitle' },
        buildTable(headers, rows, widths),
      ];

      const docDefinition = buildPdfDoc({
        instituicao,
        title: 'Comprovante de Entrega',
        subtitle: comprovanteDetalhes.numero_comprovante,
        content,
        showSignature: false,
      });

      // Salvar o footer original
      const originalFooter = docDefinition.footer;

      // Adicionar código de barras acima do rodapé
      docDefinition.footer = (currentPage: number, pageCount: number) => {
        const originalFooterContent = typeof originalFooter === 'function' 
          ? originalFooter(currentPage, pageCount) 
          : originalFooter;

        return [
          {
            columns: [
              { width: '*', text: '' },
              {
                image: barcodeDataUrl,
                width: 200,
                alignment: 'right',
                margin: [0, 0, 40, 0]
              }
            ],
            margin: [40, 0, 0, 5]
          },
          originalFooterContent
        ];
      };

      pdfMake.createPdf(docDefinition).download(`comprovante-${comprovanteDetalhes.numero_comprovante}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGerandoPdf(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'numero_comprovante', header: 'Número', size: 150 },
    {
      accessorKey: 'data_entrega',
      header: 'Data Entrega',
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleString('pt-BR')
    },
    { accessorKey: 'nome_quem_entregou', header: 'Quem Entregou' },
    { accessorKey: 'nome_quem_recebeu', header: 'Quem Recebeu' },
    {
      accessorKey: 'total_itens',
      header: 'Itens',
      size: 80,
      cell: ({ getValue }) => `${getValue()} itens`
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as string;
        const colors: Record<string, string> = {
          finalizado: 'success',
          cancelado: 'error'
        };
        return (
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: `${colors[status] || 'default'}.lighter`,
              color: `${colors[status] || 'default'}.main`,
              display: 'inline-block',
              fontSize: '0.875rem',
              fontWeight: 600
            }}
          >
            {status.toUpperCase()}
          </Box>
        );
      }
    },
    {
      id: 'acoes',
      header: 'Ações',
      size: 100,
      cell: ({ row }) => (
        <Tooltip title="Ver Detalhes">
          <IconButton size="small" color="primary" onClick={() => handleVerDetalhes(row.original.id)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  if (loading) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Comprovantes de Entrega"
        subtitle="Visualize os comprovantes de entrega da sua escola"
      />

      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/portal-escola')}
        sx={{ mb: 3 }}
      >
        Voltar ao Portal
      </Button>

      <DataTable columns={columns} data={comprovantes} />

      {/* Dialog Detalhes */}
      <Dialog open={detalhesOpen} onClose={() => setDetalhesOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes do Comprovante</DialogTitle>
        <DialogContent>
          {comprovanteDetalhes && (
            <>
              <Box sx={{ mb: 3 }}>
                <strong>Número:</strong> {comprovanteDetalhes.numero_comprovante}<br />
                <strong>Data:</strong> {new Date(comprovanteDetalhes.data_entrega).toLocaleString('pt-BR')}<br />
                <strong>Quem Entregou:</strong> {comprovanteDetalhes.nome_quem_entregou}<br />
                <strong>Quem Recebeu:</strong> {comprovanteDetalhes.nome_quem_recebeu}<br />
                <strong>Status:</strong> {comprovanteDetalhes.status?.toUpperCase()}
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell align="center">Quantidade</TableCell>
                      <TableCell align="center">Unidade</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {comprovanteDetalhes.itens?.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{item.produto_nome}</TableCell>
                        <TableCell align="center">{item.quantidade_entregue}</TableCell>
                        <TableCell align="center">{item.unidade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalhesOpen(false)}>Fechar</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={gerarPdfComprovante}
            disabled={gerandoPdf}
          >
            {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
