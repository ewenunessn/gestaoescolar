
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, Typography, Grid, Chip, CircularProgress, Alert, Tabs, Tab,
  Paper, Button, TextField, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Autocomplete, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow
} from "@mui/material";

// ── Design tokens ──────────────────────────────────────────────
const GREEN = "#22c55e";
const NAVY = "#0f172a";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../components/DataTable";
import PageHeader from "../../../components/PageHeader";
import { 
  School as SchoolIcon, Inventory as InventoryIcon, CheckCircle as CheckCircleIcon, 
  Warning as WarningIcon, Restaurant as RestaurantIcon, Dashboard as DashboardIcon, 
  Warehouse as WarehouseIcon, Add as AddIcon, Delete as DeleteIcon, 
  ShoppingCart as ShoppingCartIcon, Description as DescriptionIcon, 
  Visibility as VisibilityIcon, Print as PrintIcon 
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import ViewTabs from "../../../components/ViewTabs";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import {
  listarMinhasSolicitacoes, criarSolicitacao, cancelarSolicitacao,
  Solicitacao, NovoItemData,
} from "../../../services/solicitacoesAlimentos";
import { getSolicitacaoItemStatusView } from "../../../services/solicitacoesAlimentosStatus";
import { produtoService, Produto } from "../../../services/produtoService";
import CardapioSemanalPortal from "../components/CardapioSemanalPortal";
import { buscarInstituicao, Instituicao } from "../../../services/instituicao";
import { initPdfMake, buildPdfDoc, buildTable, savePdfMakeDocument } from "../../../utils/pdfUtils";
import JsBarcode from "jsbarcode";
import { carregarTiposRefeicao } from "../../../services/cardapiosModalidade";

// Caso volte a usar, mantenha aqui
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function PortalEscola() {
  const navigate = useNavigate();
  const toast = useToast();

  // ==========================================
  // ESTADOS GERAIS E NAVEGAÇÃO
  // ==========================================
  const [abaAtiva, setAbaAtiva] = useState(0); // 0=Dashboard, 1=Cardápio, 2=Solicitações, 3=Comprovantes
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
  const [tiposRefeicao, setTiposRefeicao] = useState<Record<string, string>>({});

  // ==========================================
  // ESTADOS: DASHBOARD E ESCOLA
  // ==========================================
  const [escola, setEscola] = useState<any>(null);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // ==========================================
  // ESTADOS: CARDÁPIO
  // ==========================================
  const [cardapios, setCardapios] = useState<any[]>([]);
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState(0);

  // ==========================================
  // ESTADOS: SOLICITAÇÕES E PRODUTOS
  // ==========================================
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingSol, setLoadingSol] = useState(false);
  const [novaOpen, setNovaOpen] = useState(false);
  const [novaObs, setNovaObs] = useState('');
  const [novaItens, setNovaItens] = useState<NovoItemData[]>([{ nome_produto: '', quantidade: 1, unidade: 'kg', produto_id: undefined }]);
  const [salvandoSol, setSalvandoSol] = useState(false);

  // ==========================================
  // ESTADOS: COMPROVANTES
  // ==========================================
  const [comprovantes, setComprovantes] = useState<any[]>([]);
  const [loadingComp, setLoadingComp] = useState(false);
  const [comprovanteDetalhes, setComprovanteDetalhes] = useState<any>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  // ==========================================
  // EFEITOS (USEEFFECTS)
  // ==========================================
  useEffect(() => {
    carregarDados();
    produtoService.listar()
      .then(prods => setProdutos(prods))
      .catch(err => {
        console.error('❌ Erro ao carregar produtos:', err);
        toast.error('Erro ao carregar lista de produtos');
      });
    
    buscarInstituicao()
      .then(inst => setInstituicao(inst))
      .catch(err => console.error('Erro ao carregar instituição:', err));
    
    carregarTiposRefeicao()
      .then(tipos => setTiposRefeicao(tipos))
      .catch(err => console.error('Erro ao carregar tipos de refeição:', err));
  }, []);

  useEffect(() => {
    if (abaAtiva === 2) carregarSolicitacoes();
    if (abaAtiva === 3) carregarComprovantes();
  }, [abaAtiva]);

  // ==========================================
  // FUNÇÕES DE DADOS E API
  // ==========================================
  const carregarDados = async () => {
    try {
      setLoading(true);
      setErro('');
      const [dashRes, cardapiosRes] = await Promise.all([
        api.get('/escola-portal/dashboard'),
        api.get('/escola-portal/cardapios-semana')
      ]);
      
      setEscola(dashRes.data.data.escola);
      setModalidades(dashRes.data.data.modalidades || []);
      setTotalAlunos(dashRes.data.data.totalAlunos || 0);
      setStats(dashRes.data.data.estatisticas);
      setCardapios(cardapiosRes.data.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setErro(error.response?.data?.message || 'Erro ao carregar dados da escola');
    } finally {
      setLoading(false);
    }
  };

  const carregarSolicitacoes = async () => {
    setLoadingSol(true);
    try {
      const data = await listarMinhasSolicitacoes();
      setSolicitacoes(data);
    } catch {
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoadingSol(false);
    }
  };

  const handleCriarSolicitacao = async () => {
    const itensValidos = novaItens.filter(i => i.nome_produto.trim());
    if (itensValidos.length === 0) { toast.error('Adicione ao menos um item'); return; }
    
    for (const i of itensValidos) {
      if (!i.quantidade || i.quantidade <= 0) { toast.error('Quantidade inválida em um dos itens'); return; }
      if (!i.unidade.trim()) { toast.error('Unidade obrigatória em todos os itens'); return; }
    }

    setSalvandoSol(true);
    try {
      await criarSolicitacao({ observacao: novaObs, itens: itensValidos });
      toast.success('Solicitação enviada');
      setNovaOpen(false);
      resetarFormularioSolicitacao();
      carregarSolicitacoes();
    } catch {
      toast.error('Erro ao enviar solicitação');
    } finally {
      setSalvandoSol(false);
    }
  };

  const resetarFormularioSolicitacao = () => {
    setNovaObs('');
    setNovaItens([{ nome_produto: '', quantidade: 1, unidade: 'kg', produto_id: undefined }]);
  };

  const handleCancelarSolicitacao = async (id: number) => {
    try {
      await cancelarSolicitacao(id);
      toast.success('Solicitação cancelada');
      carregarSolicitacoes();
    } catch {
      toast.error('Erro ao cancelar solicitação');
    }
  };

  const carregarComprovantes = async () => {
    setLoadingComp(true);
    try {
      const response = await api.get('/escola-portal/comprovantes');
      setComprovantes(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar comprovantes:', error);
      toast.error('Erro ao carregar comprovantes');
    } finally {
      setLoadingComp(false);
    }
  };

  const abrirDetalhesComprovante = async (id: number) => {
    try {
      const response = await api.get(`/escola-portal/comprovantes/${id}`);
      setComprovanteDetalhes(response.data.data);
      setDetalhesOpen(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      toast.error('Erro ao carregar detalhes do comprovante');
    }
  };

  // ==========================================
  // LÓGICA DE PDF
  // ==========================================
  const formatarQuantidade = (valor: number): string => {
    if (Number.isInteger(valor)) return valor.toLocaleString('pt-BR');
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const gerarPdfComprovante = async () => {
    if (!comprovanteDetalhes) return;
    
    setGerandoPdf(true);
    try {
      const comprovante = comprovanteDetalhes;
      if (!instituicao?.logo_url) console.warn('⚠️ Instituição sem logo cadastrada');

      const pdfMake = await initPdfMake();

      let dataFormatada: string;
      try {
        const date = new Date(comprovante.data_entrega);
        if (isNaN(date.getTime())) {
          const dateWithTime = new Date(comprovante.data_entrega + 'T12:00:00');
          dataFormatada = dateWithTime.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } else {
          dataFormatada = date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {
        dataFormatada = 'Data não disponível';
      }

      const temLote = comprovante.itens?.some((i: any) => i.lote);

      const canvas = document.createElement('canvas');
      JsBarcode(canvas, comprovante.numero_comprovante, { format: 'CODE128', width: 2, height: 80, displayValue: true, fontSize: 14, margin: 10 });
      const barcodeDataUrl = canvas.toDataURL('image/png');

      const infoRows: any[] = [
        [{ text: 'Escola:', bold: true }, comprovante.escola_nome],
        ...(comprovante.escola_endereco ? [[{ text: 'Endereço:', bold: true }, comprovante.escola_endereco]] : []),
        [{ text: 'Data da Entrega:', bold: true }, dataFormatada],
        [{ text: 'Entregador:', bold: true }, comprovante.nome_quem_entregou],
        [{ text: 'Recebedor:', bold: true }, `${comprovante.nome_quem_recebeu}${comprovante.cargo_recebedor ? ` (${comprovante.cargo_recebedor})` : ''}`],
        ...(comprovante.observacao ? [[{ text: 'Observações:', bold: true }, comprovante.observacao]] : []),
      ];

      const headers = ['Produto', 'Quantidade', 'Unidade', ...(temLote ? ['Lote'] : [])];
      const rows = (comprovante.itens || []).map((item: any) => [
        item.produto_nome,
        formatarQuantidade(item.quantidade_entregue),
        item.unidade,
        ...(temLote ? [item.lote || '-'] : []),
      ]);
      const widths = temLote ? ['*', 70, 60, 70] : ['*', 80, 70];

      const content: any[] = [
        {
          table: { widths: [120, '*'], body: infoRows.map(([label, value]) => [{ text: label, fontSize: 9, bold: true }, { text: value, fontSize: 9 }]) },
          layout: 'noBorders',
          margin: [0, 0, 0, 10],
        },
        { text: `Itens Entregues (${comprovante.itens?.length || 0})`, style: 'sectionTitle' },
        buildTable(headers, rows, widths),
      ];

      const doc = buildPdfDoc({ instituicao, title: 'Comprovante de Entrega', subtitle: comprovante.numero_comprovante, content, showSignature: false });

      const originalFooter = doc.footer;
      doc.footer = (currentPage: number, pageCount: number) => {
        const originalFooterContent = typeof originalFooter === 'function' ? originalFooter(currentPage, pageCount) : originalFooter;
        return [
          { columns: [{ width: '*', text: '' }, { image: barcodeDataUrl, width: 200, alignment: 'right', margin: [0, 0, 40, 0] }], margin: [40, 0, 0, 5] },
          originalFooterContent
        ];
      };

      await savePdfMakeDocument(pdfMake, doc, `comprovante-${comprovante.numero_comprovante}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF do comprovante. Tente recarregar a página.');
    } finally {
      setGerandoPdf(false);
    }
  };

  // ==========================================
  // CONFIGURAÇÕES DE TABELAS
  // ==========================================
  const comprovantesColumns: ColumnDef<any>[] = [
    { accessorKey: 'numero_comprovante', header: 'Número', size: 180, cell: ({ getValue }) => <Typography variant="body2" sx={{ fontWeight: 500 }}>{getValue() as string}</Typography> },
    { accessorKey: 'data_entrega', header: 'Data Entrega', size: 150, cell: ({ getValue }) => {
        const data = new Date(getValue() as string);
        return (
          <Box>
            <Typography variant="body2">{data.toLocaleDateString('pt-BR')}</Typography>
            <Typography variant="caption" color="text.secondary">{data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Typography>
          </Box>
        );
      }
    },
    { accessorKey: 'nome_quem_entregou', header: 'Quem Entregou', size: 180, cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'nome_quem_recebeu', header: 'Quem Recebeu', size: 180, cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'total_itens', header: 'Itens', size: 100, cell: ({ getValue }) => <Chip label={`${getValue() || 0} itens`} size="small" variant="outlined" /> },
    { accessorKey: 'status', header: 'Status', size: 120, cell: ({ getValue }) => {
        const status = getValue() as string;
        return <Chip label={status === 'finalizado' ? 'Finalizado' : 'Cancelado'} color={status === 'finalizado' ? 'success' : 'error'} size="small" />;
      }
    },
    { id: 'actions', header: 'Ações', size: 80, cell: ({ row }) => (
        <Tooltip title="Ver detalhes">
          <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); abrirDetalhesComprovante(row.original.id); }}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  // ==========================================
  // RENDERIZADORES DE ABAS (Para manter o código limpo)
  // ==========================================

  const renderDashboard = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={8}>
        <Card sx={{ p: 3, borderRadius: '6px', borderColor: '#e5e7eb', borderWidth: 1, borderStyle: 'solid', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: GREEN }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: GREEN }}>
              Informações da Escola
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>Nome</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{escola?.nome}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>Código</Typography>
              <Typography variant="body1" sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace', fontSize: '0.9rem' }}>{escola?.codigo || '—'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>Endereço</Typography>
              <Typography variant="body1">{escola?.endereco || '—'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>Status</Typography>
              <Chip label={escola?.ativo ? 'Ativa' : 'Inativa'} color={escola?.ativo ? 'success' : 'default'} size="small" sx={{ borderRadius: '3px', fontWeight: 500 }} />
            </Grid>
          </Grid>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ p: 3, borderRadius: '6px', borderColor: '#e5e7eb', borderWidth: 1, borderStyle: 'solid', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: '#2563eb' }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#2563eb' }}>
              Alunos por Modalidade
            </Typography>
          </Box>
          <Box sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: '6px', border: `1px solid ${GREEN}22` }}>
            <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>Total de Alunos</Typography>
            <Typography variant="h4" sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace', fontWeight: 700, color: GREEN }}>{totalAlunos}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {modalidades.length > 0 ? (
              modalidades.map((mod) => (
                <Box key={mod.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#f8fafc', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{mod.nome}</Typography>
                  <Chip label={mod.quantidade_alunos} size="small" sx={{ fontWeight: 600, borderRadius: '3px', fontFamily: '"Fira Code", "Roboto Mono", monospace' }} />
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">Nenhuma modalidade cadastrada</Typography>
            )}
          </Box>
        </Card>
      </Grid>

      {/* Cardápio do Dia */}
      <Grid item xs={12}>
        <Card sx={{ p: 3, borderRadius: '6px', borderColor: '#e5e7eb', borderWidth: 1, borderStyle: 'solid' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: '#f59e0b' }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#f59e0b' }}>
              Cardápio de Hoje
            </Typography>
          </Box>
          
          {(() => {
            const hoje = new Date();
            const cardapioHoje = cardapios.find(c => {
              const dataCardapio = new Date(c.ano, c.mes - 1, c.dia);
              return dataCardapio.toDateString() === hoje.toDateString();
            });


            if (!cardapioHoje || !cardapioHoje.refeicoes || cardapioHoje.refeicoes.length === 0) {
              return (
                <Alert severity="info">
                  Não há cardápio cadastrado para hoje.
                </Alert>
              );
            }

            // Agrupar refeições por tipo
            const refeicoesPorTipo: Record<string, any[]> = {};
            cardapioHoje.refeicoes.forEach((ref: any) => {
              const tipo = ref.tipo_refeicao || 'refeicao'; // 'tipo_refeicao' vem do backend
              if (!refeicoesPorTipo[tipo]) {
                refeicoesPorTipo[tipo] = [];
              }
              refeicoesPorTipo[tipo].push(ref);
            });

            // Filtrar apenas tipos que têm preparações
            const tiposComPreparacoes = Object.entries(refeicoesPorTipo).filter(
              ([_, refeicoes]) => refeicoes.length > 0
            );

            if (tiposComPreparacoes.length === 0) {
              return (
                <Alert severity="info">
                  Não há preparações cadastradas para hoje.
                </Alert>
              );
            }

            return (
              <Grid container spacing={2}>
                {tiposComPreparacoes.map(([tipo, refeicoes]) => {
                  // Buscar o label do tipo no banco de dados
                  const label = tiposRefeicao[tipo] || tipo;

                  return (
                    <Grid item xs={12} sm={6} md={4} key={tipo}>
                      <Card sx={{ p: 2, bgcolor: '#fafafa', borderRadius: '6px', border: '1px solid #e5e7eb', height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <RestaurantIcon sx={{ fontSize: 18, color: '#64748b' }} />
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                            {label}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {refeicoes.map((ref: any, idx: number) => (
                            <Chip
                              key={idx}
                              label={ref.nome}
                              size="small"
                              sx={{
                                bgcolor: '#161b22',
                                fontSize: '0.75rem',
                                height: 24,
                                borderRadius: '3px',
                                fontWeight: 500,
                                justifyContent: 'flex-start',
                                border: '1px solid #30363d',
                                '& .MuiChip-label': {
                                  px: 1.5
                                }
                              }}
                            />
                          ))}
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            );
          })()}
        </Card>
      </Grid>

      {/* Botão para Estoque da Escola */}
      <Grid item xs={12}>
        <Card sx={{ p: 3, borderRadius: '6px', borderColor: '#e5e7eb', borderWidth: 1, borderStyle: 'solid' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: '6px', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WarehouseIcon sx={{ fontSize: 28, color: GREEN }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>Estoque da Escola</Typography>
                <Typography variant="body2" color="text.secondary">Gerencie o estoque de produtos da sua escola</Typography>
              </Box>
            </Box>
            <Button variant="contained" size="large" startIcon={<WarehouseIcon />} onClick={() => navigate('/estoque-escola-portal')} sx={{ borderRadius: '4px', textTransform: 'none', bgcolor: GREEN, '&:hover': { bgcolor: '#16a34a' }, fontWeight: 600 }}>
              Acessar Estoque
            </Button>
          </Box>
        </Card>
      </Grid>
    </Grid>
  );

  const renderCardapio = () => {
    const modalidadesUnicas = Array.from(new Set(cardapios.map(c => c.modalidade_id)))
      .map(id => cardapios.find(c => c.modalidade_id === id))
      .filter(Boolean);

    const cardapiosFiltrados = modalidadesUnicas.length > 0
      ? cardapios.filter(c => c.modalidade_id === modalidadesUnicas[modalidadeSelecionada]?.modalidade_id)
      : [];

    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ p: 3, borderRadius: '6px', borderColor: '#e5e7eb', borderWidth: 1, borderStyle: 'solid' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: '#f59e0b' }} />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#f59e0b' }}>
                Cardápio da Semana
              </Typography>
            </Box>
            {cardapios.length > 0 ? (
              <>
                {modalidadesUnicas.length > 1 && (
                  <Tabs value={modalidadeSelecionada} onChange={(_, v) => setModalidadeSelecionada(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                    {modalidadesUnicas.map((mod: any) => (
                      <Tab key={mod.modalidade_id} label={mod.modalidade_nome} />
                    ))}
                  </Tabs>
                )}
                <CardapioSemanalPortal cardapios={cardapiosFiltrados} />
              </>
            ) : (
              <Alert severity="info">Nenhum cardápio cadastrado para esta semana</Alert>
            )}
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderSolicitacoes = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNovaOpen(true)} sx={{ borderRadius: '4px', textTransform: 'none', bgcolor: GREEN, '&:hover': { bgcolor: '#16a34a' }, fontWeight: 600 }}>Nova Solicitação</Button>
      </Box>

      {loadingSol ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : solicitacoes.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: '6px' }}>Nenhuma solicitação enviada ainda.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '6px' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px', color: '#64748b' }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px', color: '#64748b' }}>Itens</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px', color: '#64748b' }}>Observação</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px', color: '#64748b' }}>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {solicitacoes.map(s => {
                const isPendente = s.status === 'pendente';
                const statusColor = isPendente ? 'warning' : s.status === 'concluida' ? 'success' : s.status === 'parcial' ? 'info' : 'error';
                const statusLabel = isPendente ? 'Pendente' : s.status === 'concluida' ? 'Concluída' : s.status === 'parcial' ? 'Parcial' : 'Cancelada';

                return (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace', fontSize: '0.8rem' }}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        {s.itens.map(item => {
                          const itemStatus = getSolicitacaoItemStatusView(item.status, s.status);
                          const itemStatusLabel = itemStatus.label === 'Pendente' ? 'Pend.' : itemStatus.label;

                          return (
                            <Typography key={item.id} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                label={itemStatusLabel}
                                color={itemStatus.color}
                                size="small"
                                sx={{ fontSize: '0.6rem', height: 16, borderRadius: '3px' }}
                              />
                            {item.nome_produto} — {item.quantidade} {item.unidade}
                              {item.justificativa_recusa && <Typography component="span" variant="caption" color="error.main"> ({item.justificativa_recusa})</Typography>}
                            </Typography>
                          );
                        })}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{s.observacao || '—'}</TableCell>
                    <TableCell><Chip label={statusLabel} color={statusColor} size="small" sx={{ borderRadius: '3px', fontWeight: 500 }} /></TableCell>
                    <TableCell>
                      {isPendente && (
                        <Tooltip title="Cancelar">
                          <IconButton size="small" color="error" onClick={() => handleCancelarSolicitacao(s.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderComprovantes = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Card sx={{ p: 3, borderRadius: '6px', borderColor: '#e5e7eb', borderWidth: 1, borderStyle: 'solid' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: '#2563eb' }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#2563eb' }}>
              Comprovantes de Entrega
            </Typography>
          </Box>
          {loadingComp ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : comprovantes.length === 0 ? (
            <Alert severity="info">Nenhum comprovante de entrega registrado ainda.</Alert>
          ) : (
            <DataTable
              title="Comprovantes"
              data={comprovantes}
              columns={comprovantesColumns}
              loading={loadingComp}
              onRowClick={(comp) => abrirDetalhesComprovante(comp.id)}
              searchPlaceholder="Buscar comprovantes..."
              initialPageSize={10}
            />
          )}
        </Card>
      </Grid>
    </Grid>
  );

  // ==========================================
  // RENDERIZADORES DOS MODAIS
  // ==========================================

  const renderModalDetalhesComprovante = () => (
    <Dialog open={detalhesOpen} onClose={() => setDetalhesOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6" component="div">Detalhes do Comprovante</Typography>
          {comprovanteDetalhes && <Typography variant="subtitle2" color="text.secondary">{comprovanteDetalhes.numero_comprovante}</Typography>}
        </Box>
      </DialogTitle>
      <DialogContent>
        {comprovanteDetalhes && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Data de Entrega</Typography>
                <Typography variant="body1">{new Date(comprovanteDetalhes.data_entrega).toLocaleString('pt-BR')}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box>
                  <Chip label={comprovanteDetalhes.status === 'finalizado' ? 'Finalizado' : 'Cancelado'} color={comprovanteDetalhes.status === 'finalizado' ? 'success' : 'error'} size="small" />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Quem Entregou</Typography>
                <Typography variant="body1">{comprovanteDetalhes.nome_quem_entregou || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Quem Recebeu</Typography>
                <Typography variant="body1">{comprovanteDetalhes.nome_quem_recebeu || '—'}</Typography>
              </Grid>
              {comprovanteDetalhes.observacao && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Observações</Typography>
                  <Typography variant="body2">{comprovanteDetalhes.observacao}</Typography>
                </Grid>
              )}
            </Grid>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Itens Entregues</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Produto</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Quantidade</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Unidade</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {comprovanteDetalhes.itens && comprovanteDetalhes.itens.length > 0 ? (
                      comprovanteDetalhes.itens.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{item.produto_nome}</TableCell>
                          <TableCell align="right">{item.quantidade_entregue}</TableCell>
                          <TableCell>{item.unidade}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center"><Typography variant="body2" color="text.secondary">Nenhum item registrado</Typography></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={gerarPdfComprovante} variant="contained" startIcon={<PrintIcon />} disabled={gerandoPdf}>
          {gerandoPdf ? 'Gerando PDF...' : 'Imprimir PDF'}
        </Button>
        <Button onClick={() => setDetalhesOpen(false)}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );

  const renderModalNovaSolicitacao = () => (
    <Dialog open={novaOpen} onClose={() => setNovaOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Nova Solicitação de Alimentos</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField
          label="Observação geral (opcional)" value={novaObs} onChange={e => setNovaObs(e.target.value)}
          fullWidth size="small" multiline rows={2}
        />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>Itens</Typography>
        {novaItens.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Autocomplete<Produto, false, false, true>
              options={produtos}
              getOptionLabel={p => typeof p === 'string' ? p : p.nome}
              value={produtos.find(p => p.id === item.produto_id) ?? null}
              onChange={(_, p) => setNovaItens(prev => prev.map((it, i) => i === idx ? { ...it, produto_id: typeof p === 'string' ? undefined : p?.id, nome_produto: typeof p === 'string' ? p : p?.nome ?? '', unidade: typeof p === 'string' ? it.unidade : p?.unidade || it.unidade } : it))}
              onInputChange={(_, val, reason) => { if (reason === 'input') setNovaItens(prev => prev.map((it, i) => i === idx ? { ...it, nome_produto: val, produto_id: undefined } : it)); }}
              inputValue={item.nome_produto}
              size="small"
              sx={{ flex: 2 }}
              freeSolo
              noOptionsText={produtos.length === 0 ? "Carregando produtos..." : "Nenhum produto encontrado"}
              renderInput={params => <TextField {...params} label="Produto" autoFocus={idx === 0} placeholder="Digite o nome do produto" />}
            />
            <TextField
              label="Qtd" type="number" value={item.quantidade}
              onChange={e => setNovaItens(prev => prev.map((it, i) => i === idx ? { ...it, quantidade: Number(e.target.value) } : it))}
              size="small" sx={{ flex: 1 }} inputProps={{ min: 0.001, step: 0.001 }}
            />
            <TextField
              label="Unidade" value={item.unidade}
              onChange={e => setNovaItens(prev => prev.map((it, i) => i === idx ? { ...it, unidade: e.target.value } : it))}
              size="small" sx={{ flex: 1 }} placeholder="kg, un..."
            />
            {novaItens.length > 1 && (
              <IconButton size="small" color="error" sx={{ mt: 0.5 }} onClick={() => setNovaItens(prev => prev.filter((_, i) => i !== idx))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => setNovaItens(prev => [...prev, { nome_produto: '', quantidade: 1, unidade: 'kg', produto_id: undefined }])} sx={{ alignSelf: 'flex-start' }}>
          Adicionar item
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setNovaOpen(false)}>Cancelar</Button>
        <Button variant="contained" onClick={handleCriarSolicitacao} disabled={salvandoSol}>
          {salvandoSol ? 'Enviando...' : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ==========================================
  // RENDER PRINCIPAL DA PÁGINA
  // ==========================================
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (erro) {
    return (
      <PageContainer>
        <Alert severity="error">{erro}</Alert>
      </PageContainer>
    );
  }

  return (
    <>
    <PageContainer>
      <PageHeader
        title={escola?.nome || 'Portal da Escola'}
        subtitle="Informações e gestão da sua escola"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Portal Escola' },
        ]}
      />

      <Box sx={{ mb: 3 }}>
        <ViewTabs
          value={abaAtiva}
          onChange={(v) => setAbaAtiva(Number(v))}
          tabs={[
            { value: 0, label: 'Dashboard', icon: <DashboardIcon /> },
            { value: 1, label: 'Cardápio', icon: <RestaurantIcon /> },
            { value: 2, label: 'Solicitações', icon: <ShoppingCartIcon /> },
            { value: 3, label: 'Comprovantes', icon: <DescriptionIcon /> },
          ]}
        />
      </Box>

      {/* Renderiza a aba correspondente usando as funções separadas */}
      <Box sx={{ pb: 4 }}>
        {abaAtiva === 0 && renderDashboard()}
        {abaAtiva === 1 && renderCardapio()}
        {abaAtiva === 2 && renderSolicitacoes()}
        {abaAtiva === 3 && renderComprovantes()}
      </Box>
    </PageContainer>

    {/* Renderiza os Modais fora do PageContainer */}
    {renderModalDetalhesComprovante()}
    {renderModalNovaSolicitacao()}
    </>
  );
}
