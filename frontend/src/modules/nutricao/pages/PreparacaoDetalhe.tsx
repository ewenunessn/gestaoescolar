import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTableAdvanced } from "../../../components/DataTableAdvanced";
import PageHeader from "../../../components/PageHeader";
import AdicionarIngredienteDialog from "../../../components/AdicionarIngredienteDialog";
import AdicionarGrupoIngredientesDialog from "../../../components/AdicionarGrupoIngredientesDialog";
import EditarIngredienteDialog from "../../../components/EditarIngredienteDialog";
import DetalhamentoCustoModal from "../../../components/DetalhamentoCustoModal";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import { useToast } from "../../../hooks/useToast";
import {
  useRefeicao,
  useProdutosDaRefeicao,
  useProdutos,
  useModalidades,
  useEditarRefeicao,
  useDeletarRefeicao,
  useAdicionarProdutoNaRefeicao,
  useEditarProdutoNaRefeicao,
  useRemoverProdutoDaRefeicao,
} from "../../../hooks/queries/useRefeicaoDetalheQueries";
import { useValoresNutricionais, useCustoRefeicao } from "../../../hooks/useRefeicaoCalculos";
import { toNum } from "../../../utils/formatters";
import {
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Box,
  Card,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Grid,
  Divider,
  Menu,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Restaurant as RestaurantIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Description as DescriptionIcon,
  Timer as TimerIcon,
  LocalDining as LocalDiningIcon,
  PictureAsPdf as PdfIcon,
  MoreVert as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";
import ViewTabs from "../../../components/ViewTabs";

interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  fator_correcao?: number;
  ativo: boolean;
}

type TipoMedida = 'gramas' | 'mililitros' | 'unidades';

interface preparacaoProduto {
  id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: TipoMedida;
  ordem?: number;
  produto?: Produto;
  per_capita_por_modalidade?: Array<{
    modalidade_id: number;
    modalidade_nome: string;
    per_capita: number;
  }>;
  per_capita_efetivo?: number;
}

// Definição das colunas do DataTable
const columnHelper = createColumnHelper<preparacaoProduto>();

export default function PreparacaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { setPageTitle } = usePageTitle();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // React Query hooks
  const { data: preparacao, isLoading: loading } = useRefeicao(Number(id));
  const { data: associacoes = [] } = useProdutosDaRefeicao(Number(id));
  const { data: produtos = [] } = useProdutos();
  const { data: modalidades = [] } = useModalidades();
  
  const editarRefeicaoMutation = useEditarRefeicao();
  const deletarRefeicaoMutation = useDeletarRefeicao();
  const adicionarProdutoMutation = useAdicionarProdutoNaRefeicao();
  const editarProdutoMutation = useEditarProdutoNaRefeicao();
  const removerProdutoMutation = useRemoverProdutoDaRefeicao();
  
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState<number | null>(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<any>({});
  const [openExcluir, setOpenExcluir] = useState(false);
  const [openDialogDetalhes, setOpenDialogDetalhes] = useState(false);
  const [formDetalhes, setFormDetalhes] = useState<any>({});
  const [dialogAdicionarOpen, setDialogAdicionarOpen] = useState(false);
  const [dialogGrupoOpen, setDialogGrupoOpen] = useState(false);
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);
  const [detalhamentoCustoOpen, setDetalhamentoCustoOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<preparacaoProduto | null>(null);
  const [tabAtiva, setTabAtiva] = useState(0); // 0 = Ingredientes, 1 = Ficha Técnica
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Hooks para cálculos dinâmicos
  const { data: valoresNutricionais, isLoading: loadingNutricional, error: errorNutricional } = useValoresNutricionais(
    Number(id),
    preparacao?.rendimento_porcoes || form.rendimento_porcoes,
    !!preparacao, // Buscar sempre que a refeição estiver carregada
    modalidadeSelecionada
  );
  
  const { data: custoData, isLoading: loadingCusto, error: errorCusto } = useCustoRefeicao(
    Number(id),
    preparacao?.rendimento_porcoes || form.rendimento_porcoes,
    tabAtiva === 1 && !!preparacao, // Só buscar custo na aba Ficha Técnica
    modalidadeSelecionada
  );

  // Definição das colunas do DataTable
  const columns = useMemo(() => [
    columnHelper.accessor('produto.nome', {
      id: 'produto',
      header: 'Produto',
      cell: (info) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {info.getValue()}
        </Typography>
      ),
    }),
    columnHelper.display({
      id: 'per_capita_liquido',
      header: () => (
        <Tooltip title="Per Capita Líquido (consumo efetivo)" arrow>
          <Box component="span">Per Capita Líquido</Box>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const assoc = row.original;
        const unidade = assoc.tipo_medida === 'gramas' ? 'g' : assoc.tipo_medida === 'mililitros' ? 'ml' : 'un';
        const fatorCorrecao = toNum(assoc.produto?.fator_correcao, 1.0);
        const perCapitasLiquido = assoc.per_capita_por_modalidade?.map(m => toNum(m.per_capita)) || [toNum(assoc.per_capita)];
        const minPerCapitaLiquido = Math.min(...perCapitasLiquido);
        const maxPerCapitaLiquido = Math.max(...perCapitasLiquido);
        const perCapitaLiquidoTexto = minPerCapitaLiquido === maxPerCapitaLiquido
          ? `${minPerCapitaLiquido}${unidade}`
          : `${minPerCapitaLiquido} - ${maxPerCapitaLiquido}${unidade}`;

        const tooltipContent = assoc.per_capita_por_modalidade && assoc.per_capita_por_modalidade.length > 0 ? (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              Per Capita por Modalidade:
            </Typography>
            {assoc.per_capita_por_modalidade.map((mod) => (
              <Typography key={mod.modalidade_id} variant="caption" sx={{ display: 'block' }}>
                {mod.modalidade_nome}: {mod.per_capita}{unidade} (líquido) → {(toNum(mod.per_capita) * fatorCorrecao).toFixed(1)}{unidade} (bruto)
              </Typography>
            ))}
            {fatorCorrecao > 1.0 && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: 'warning.main' }}>
                Fator de correção: {fatorCorrecao.toFixed(3)}
              </Typography>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="caption" sx={{ display: 'block' }}>
              Per capita único: {assoc.per_capita}{unidade} (líquido)
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              Per capita bruto: {(toNum(assoc.per_capita) * fatorCorrecao).toFixed(1)}{unidade}
            </Typography>
            {fatorCorrecao > 1.0 && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: 'warning.main' }}>
                Fator de correção: {fatorCorrecao.toFixed(3)}
              </Typography>
            )}
          </Box>
        );

        return (
          <Tooltip title={tooltipContent} arrow placement="top">
            <Typography variant="body2" sx={{ cursor: 'help', fontWeight: 500, color: 'primary.main', textAlign: 'center' }}>
              {perCapitaLiquidoTexto}
            </Typography>
          </Tooltip>
        );
      },
    }),
    columnHelper.display({
      id: 'per_capita_bruto',
      header: () => (
        <Tooltip title="Per capita bruto (quantidade de compra)" arrow>
          <Box component="span">Per Capita Bruto</Box>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const assoc = row.original;
        const unidade = assoc.tipo_medida === 'gramas' ? 'g' : assoc.tipo_medida === 'mililitros' ? 'ml' : 'un';
        const fatorCorrecao = toNum(assoc.produto?.fator_correcao, 1.0);
        const perCapitasLiquido = assoc.per_capita_por_modalidade?.map(m => toNum(m.per_capita)) || [toNum(assoc.per_capita)];
        const minPerCapitaLiquido = Math.min(...perCapitasLiquido);
        const maxPerCapitaLiquido = Math.max(...perCapitasLiquido);
        const minPerCapitaBruto = minPerCapitaLiquido * fatorCorrecao;
        const maxPerCapitaBruto = maxPerCapitaLiquido * fatorCorrecao;
        const perCapitaBrutoTexto = minPerCapitaLiquido === maxPerCapitaLiquido
          ? `${minPerCapitaBruto.toFixed(1)}${unidade}`
          : `${minPerCapitaBruto.toFixed(1)} - ${maxPerCapitaBruto.toFixed(1)}${unidade}`;

        return (
          <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center' }}>
            {perCapitaBrutoTexto}
          </Typography>
        );
      },
    }),
    columnHelper.accessor('tipo_medida', {
      id: 'unidade',
      header: 'Unidade',
      cell: (info) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Chip 
            label={info.getValue() === 'gramas' ? 'Gramas' : info.getValue() === 'mililitros' ? 'Mililitros' : 'Unidades'} 
            size="small" 
            variant="outlined"
          />
        </Box>
      ),
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => {
        const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
        
        return isMobile ? (
          // Mobile: Menu com 3 pontos
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  setAnchorEl(e.currentTarget);
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={(e: any) => {
                e?.stopPropagation?.();
                setAnchorEl(null);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setAnchorEl(null);
                  handleEditarProduto(row.original);
                }}
              >
                <EditIcon fontSize="small" sx={{ mr: 1 }} />
                Editar
              </MenuItem>
              <MenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setAnchorEl(null);
                  removerProduto(row.original.id);
                }}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                Remover
              </MenuItem>
            </Menu>
          </>
        ) : (
          // Desktop: Botões separados
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <Tooltip title="Editar">
              <IconButton size="small" color="primary" onClick={() => handleEditarProduto(row.original)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remover">
              <IconButton size="small" color="error" onClick={() => removerProduto(row.original.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    }),
  ], [isMobile]);

  // Atualizar form e título quando refeição carregar
  useEffect(() => {
    if (preparacao) {
      setForm(preparacao);
      setFormDetalhes(preparacao);
      setPageTitle(preparacao.nome);

      // Selecionar primeira modalidade ativa por padrão
      const ativas = modalidades.filter(m => m.ativo);
      if (ativas.length > 0 && !modalidadeSelecionada) {
        setModalidadeSelecionada(ativas[0].id);
      }
    }
  }, [preparacao, modalidades, setPageTitle]);
  
  // Verificar se refeição não foi encontrada
  useEffect(() => {
    if (!loading && !preparacao && id) {
      toast.error('Refeição não encontrada');
      navigate('/preparacoes');
    }
  }, [loading, preparacao, id, navigate, toast]);

  const produtosDisponiveis = produtos.filter(
    (produto) => !associacoes.some((assoc) => assoc.produto_id === produto.id)
  );

  async function salvarEdicao() {
    try {
      await editarRefeicaoMutation.mutateAsync({ id: Number(id), data: form });
      setEditando(false);
      toast.success('Refeição atualizada com sucesso!');
    } catch {
      toast.error('Não foi possível salvar as alterações.');
    }
  }

  async function excluirpreparacao() {
    try {
      await deletarRefeicaoMutation.mutateAsync(Number(id));
      toast.success('Refeição excluída com sucesso!');
      navigate("/preparacoes");
    } catch {
      toast.error('Não foi possível excluir a refeição.');
    }
  }

  async function adicionarProduto(
    produtoId: number,
    perCapitaGeral: number | null,
    tipoMedida: TipoMedida,
    perCapitaPorModalidade: Array<{modalidade_id: number, per_capita: number}>
  ) {
    try {
      await adicionarProdutoMutation.mutateAsync({
        refeicaoId: Number(id),
        produtoId,
        perCapita: perCapitaGeral || 0,
        tipoMedida,
        perCapitaPorModalidade,
      });
      toast.success('Produto adicionado à refeição!');
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast.error('Não foi possível adicionar o produto.');
    }
  }

  async function adicionarGrupo(itens: Array<{ produto_id: number; per_capita: number; tipo_medida: string }>) {
    let adicionados = 0;
    for (const item of itens) {
      try {
        await adicionarProdutoMutation.mutateAsync({
          refeicaoId: Number(id),
          produtoId: item.produto_id,
          perCapita: item.per_capita,
          tipoMedida: item.tipo_medida as TipoMedida,
          perCapitaPorModalidade: [],
        });
        adicionados++;
      } catch {
        // ignora duplicados
      }
    }
    toast.success(`${adicionados} ingrediente(s) adicionado(s) do grupo`);
  }

  async function removerProduto(assocId: number) {    try {
      await removerProdutoMutation.mutateAsync({ id: assocId, refeicaoId: Number(id) });
      toast.success('Produto removido da refeição!');
    } catch {
      toast.error('Não foi possível remover o produto.');
    }
  }

  function handleEditarProduto(assoc: preparacaoProduto) {
    setProdutoEditando(assoc);
    setDialogEditarOpen(true);
  }

  async function confirmarEdicaoProduto(
    perCapitaGeral: number | null,
    tipoMedida: TipoMedida,
    perCapitaPorModalidade: Array<{modalidade_id: number, per_capita: number}>
  ) {
    if (!produtoEditando) return;

    try {
      await editarProdutoMutation.mutateAsync({
        id: produtoEditando.id,
        refeicaoId: Number(id),
        perCapita: perCapitaGeral || 0,
        tipoMedida,
        perCapitaPorModalidade,
      });
      
      toast.success('Produto atualizado!');
    } catch (error) {
      console.error('Erro ao editar produto:', error);
      toast.error('Não foi possível editar o produto.');
    }
  }

  async function gerarPDF() {
    const refeicaoParaPdf = preparacao;
    if (!refeicaoParaPdf) return;

    try {
      const { buscarIngredientesDetalhados } = await import('../../../services/refeicaoIngredientes');
      const { gerarPDFFichaTecnica } = await import('../../../utils/fichaTecnicaPdf');
      const { buscarInstituicao } = await import('../../../services/instituicao');

      const ingredientesDetalhados = await buscarIngredientesDetalhados(Number(id), modalidadeSelecionada);

      const modalidadeNome = modalidadeSelecionada
        ? modalidades.find(m => m.id === modalidadeSelecionada)?.nome
        : undefined;

      let instituicao = null;
      try { instituicao = await buscarInstituicao(); } catch {}

      await gerarPDFFichaTecnica({
        refeicao: {
          nome: refeicaoParaPdf.nome,
          descricao: refeicaoParaPdf.descricao,
          categoria: refeicaoParaPdf.categoria,
          tempo_preparo_minutos: refeicaoParaPdf.tempo_preparo_minutos,
          rendimento_porcoes: refeicaoParaPdf.rendimento_porcoes,
          modo_preparo: refeicaoParaPdf.modo_preparo,
          utensilios: refeicaoParaPdf.utensilios,
          observacoes_tecnicas: refeicaoParaPdf.observacoes_tecnicas,
        },
        produtos: ingredientesDetalhados.ingredientes.map((ingrediente) => ({
          ...ingrediente,
          per_capita_bruto: ingrediente.per_capita_bruto ?? undefined,
        })),
        modalidadeNome,
        instituicao,
      });

      toast.success('Ficha Técnica exportada com sucesso!');
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || error.message || 'Erro desconhecido';
      toast.error(`Não foi possível gerar o PDF: ${mensagemErro}`);
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!preparacao) return null;

  return (
    <>
    <Box sx={{ 
      height: '100vh',
      bgcolor: 'background.default', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden' 
    }}>
      <Box sx={{ px: isMobile ? 1 : 2, pt: 1.5 }}>
        {/* Seta + Breadcrumbs na mesma linha */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton size="small" onClick={() => navigate('/preparacoes')} sx={{ mr: 0.5, p: 0.5 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <PageBreadcrumbs
            items={[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Preparações', path: '/preparacoes' },
              { label: preparacao?.nome || '' },
            ]}
          />
        </Box>

        <PageHeader
          title={preparacao?.nome || 'Detalhes da Preparação'}
          action={
            <Tooltip title="Editar informações da preparação">
              <IconButton size="small" onClick={() => setOpenDialogDetalhes(true)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        />

        {/* Tabs + Ações na mesma linha */}
        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          borderBottom: 1,
          borderColor: 'divider',
          pb: 0.5,
          gap: isMobile ? 1 : 0,
        }}>
          <ViewTabs
            value={tabAtiva}
            onChange={(newValue) => {
              // Impedir troca de aba enquanto edita
              if (!editando) {
                setTabAtiva(Number(newValue));
              }
            }}
            tabs={[
              { value: 0, label: isMobile ? 'Ingred.' : 'Ingredientes', icon: <RestaurantIcon sx={{ fontSize: 16 }} /> },
              { value: 1, label: isMobile ? 'Ficha' : 'Ficha Técnica', icon: <DescriptionIcon sx={{ fontSize: 16 }} /> },
            ]}
            sx={{
              opacity: editando ? 0.5 : 1,
              pointerEvents: editando ? 'none' : 'auto'
            }}
          />
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
            {editando ? (
              <>
                <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600, mr: 1 }}>
                  Editando Ficha Técnica
                </Typography>
                <Button onClick={() => setEditando(false)} startIcon={<CancelIcon />} size="small" disabled={editarRefeicaoMutation.isPending}>
                  Cancelar
                </Button>
                <Button onClick={salvarEdicao} variant="contained" startIcon={<SaveIcon />} size="small" disabled={editarRefeicaoMutation.isPending}>
                  {editarRefeicaoMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            ) : (
              <>
                <IconButton size="small" onClick={(e) => setMenuAnchorEl(e.currentTarget)}>
                  <MoreVertIcon />
                </IconButton>
                <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={() => setMenuAnchorEl(null)}>
                  <MenuItem onClick={() => { setMenuAnchorEl(null); setOpenExcluir(true); }} sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Excluir
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Conteúdo das Tabs */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: isMobile ? 1 : 2, py: 1.5 }}>

        {/* Tab 0: Ingredientes */}
        {tabAtiva === 0 && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5 }}>
            {/* Coluna esquerda: Adicionar + Tabela */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ flex: 1, minHeight: isMobile ? 400 : 0 }}>
                <DataTableAdvanced<preparacaoProduto>
                  title="Ingredientes"
                  data={associacoes as preparacaoProduto[]}
                  columns={columns}
                  enableColumnVisibility={false}
                  searchPlaceholder="Buscar ingrediente..."
                  toolbarActions={
                    <Box sx={{ display: 'flex', gap: 1, width: '100%', flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setDialogGrupoOpen(true)}
                        size="small"
                        sx={{ whiteSpace: 'nowrap', flex: isSmallMobile ? 1 : 'none' }}
                      >
                        {isSmallMobile ? 'Grupo' : 'Adicionar Grupo'}
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setDialogAdicionarOpen(true)}
                        size="small"
                        sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, whiteSpace: 'nowrap', flex: isSmallMobile ? 1 : 'none' }}
                      >
                        {isSmallMobile ? 'Ingrediente' : 'Adicionar Ingrediente'}
                      </Button>
                    </Box>
                  }
                />
              </Box>
            </Box>

            {/* Coluna direita: Painel Nutricional */}
            <Box sx={{ width: isMobile ? '100%' : 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Card sx={{ borderRadius: '8px', p: 1.5, height: isMobile ? 'auto' : '100%', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                    Nutrição / porção
                  </Typography>
                  {loadingNutricional && <CircularProgress size={12} />}
                </Box>

                {!preparacao?.rendimento_porcoes ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Informe o rendimento (porções) na Ficha Técnica para ver os cálculos.
                  </Typography>
                ) : associacoes.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Adicione ingredientes para ver os valores nutricionais.
                  </Typography>
                ) : !loadingNutricional && valoresNutricionais ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {/* Energia em destaque */}
                    <Box sx={{ bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Energia</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {toNum(valoresNutricionais.por_porcao.calorias).toFixed(0)} kcal
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(toNum(valoresNutricionais.por_porcao.calorias) * 4.184).toFixed(0)} kJ
                      </Typography>
                    </Box>
                    {[
                      { label: 'Proteínas', value: toNum(valoresNutricionais.por_porcao.proteinas).toFixed(1), unit: 'g' },
                      { label: 'Lipídios', value: toNum(valoresNutricionais.por_porcao.lipidios).toFixed(1), unit: 'g' },
                      { label: 'Carboidratos', value: toNum(valoresNutricionais.por_porcao.carboidratos).toFixed(1), unit: 'g' },
                      { label: 'Cálcio', value: toNum(valoresNutricionais.por_porcao.calcio).toFixed(1), unit: 'mg' },
                      { label: 'Ferro', value: toNum(valoresNutricionais.por_porcao.ferro).toFixed(1), unit: 'mg' },
                      { label: 'Vit. A', value: toNum(valoresNutricionais.por_porcao.vitamina_a).toFixed(1), unit: 'mcg' },
                      { label: 'Vit. C', value: toNum(valoresNutricionais.por_porcao.vitamina_c).toFixed(1), unit: 'mg' },
                      { label: 'Sódio', value: toNum(valoresNutricionais.por_porcao.sodio).toFixed(1), unit: 'mg' },
                    ].map(({ label, value, unit }) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}{unit}</Typography>
                      </Box>
                    ))}
                    {valoresNutricionais.alertas && valoresNutricionais.alertas.length > 0 && (
                      <Box sx={{ 
                        mt: 1.5, 
                        bgcolor: 'rgba(255, 152, 0, 0.15)', 
                        px: 1.5, 
                        py: 1, 
                        borderRadius: 1, 
                        border: '1px solid', 
                        borderColor: 'rgba(255, 152, 0, 0.5)'
                      }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.light', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          ⚠️ Alertas Nutricionais
                        </Typography>
                        {valoresNutricionais.alertas.map((alerta, idx) => (
                          <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.primary', ml: 2, lineHeight: 1.5 }}>
                            • {alerta.mensagem}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : !loadingNutricional && errorNutricional ? (
                  <Typography variant="caption" color="error">Erro ao calcular valores.</Typography>
                ) : null}
              </Card>
            </Box>
          </Box>
        )}

        {/* Tab 1: Ficha Técnica */}
        {tabAtiva === 1 && (
          <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, alignItems: 'flex-start' }}>
            {/* Coluna principal: Conteúdo da Ficha Técnica */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Card sx={{ borderRadius: '8px', p: 2, maxWidth: '100%', overflow: 'auto' }}>
            {/* Seletor de Modalidade - apenas na Ficha Técnica */}
            {!editando && modalidades.length > 0 && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isSmallMobile ? 'column' : 'row',
                alignItems: isSmallMobile ? 'stretch' : 'center',
                gap: 2, 
                mb: 2, 
                pb: 2, 
                borderBottom: '1px solid #e0e0e0' 
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, flexShrink: 0 }}>
                  Visualizar valores para:
                </Typography>
                <FormControl size="small" sx={{ minWidth: isSmallMobile ? '100%' : 200 }}>
                  <Select
                    value={modalidadeSelecionada || ''}
                    onChange={(e) => setModalidadeSelecionada(Number(e.target.value))}
                    displayEmpty
                  >
                    {modalidades.map((mod) => (
                      <MenuItem key={mod.id} value={mod.id}>
                        {mod.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {!isSmallMobile && (
                  <Typography variant="caption" color="text.secondary">
                    Os cálculos nutricionais e de custo serão ajustados para esta modalidade
                  </Typography>
                )}
                <Box sx={{ flex: 1 }} />
                <Button
                  onClick={() => setEditando(true)}
                  variant="outlined"
                  startIcon={<EditIcon />}
                  size="small"
                  sx={{ whiteSpace: 'nowrap', mr: 1 }}
                >
                  Editar Ficha
                </Button>
                <Button
                  onClick={gerarPDF}
                  variant="outlined"
                  startIcon={<PdfIcon />}
                  size="small"
                  fullWidth={isSmallMobile}
                  sx={{ borderColor: '#d32f2f', color: '#d32f2f', '&:hover': { borderColor: '#b71c1c', bgcolor: '#ffebee' }, whiteSpace: 'nowrap' }}
                >
                  Exportar PDF
                </Button>
              </Box>
            )}
            
            {editando ? (
              <Box sx={{ maxWidth: 1200 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem', mb: 1.5 }}>
                      informações Gerais
                    </Typography>
                  </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Categoria</InputLabel>
                    <Select
                      value={form.categoria || ''}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      label="Categoria"
                    >
                      <MenuItem value="Prato Principal">Prato Principal</MenuItem>
                      <MenuItem value="Acompanhamento">Acompanhamento</MenuItem>
                      <MenuItem value="Sobremesa">Sobremesa</MenuItem>
                      <MenuItem value="Lanche">Lanche</MenuItem>
                      <MenuItem value="Bebida">Bebida</MenuItem>
                      <MenuItem value="Salada">Salada</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    label="Tempo de Preparo (min)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.tempo_preparo_minutos || ''}
                    onChange={(e) => setForm({ ...form, tempo_preparo_minutos: e.target.value })}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    label="Rendimento (porções)"
                    type="number"
                    fullWidth
                    size="small"
                    value={form.rendimento_porcoes || ''}
                    onChange={(e) => setForm({ ...form, rendimento_porcoes: e.target.value })}
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Modo de Preparo"
                    fullWidth
                    multiline
                    rows={4}
                    size="small"
                    value={form.modo_preparo || ''}
                    onChange={(e) => setForm({ ...form, modo_preparo: e.target.value })}
                    placeholder="Descreva o passo a passo do preparo..."
                    sx={{
                      '& .MuiInputBase-root': {
                        alignItems: 'flex-start',
                        textAlign: 'left'
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Utensílios Necessários"
                    fullWidth
                    multiline
                    rows={1}
                    size="small"
                    value={form.utensilios || ''}
                    onChange={(e) => setForm({ ...form, utensilios: e.target.value })}
                    placeholder="Ex: Panela grande, colher de pau, escorredor..."
                    sx={{
                      '& .MuiInputBase-root': {
                        alignItems: 'flex-start',
                        textAlign: 'left'
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Observações Técnicas"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={form.observacoes_tecnicas || ''}
                    onChange={(e) => setForm({ ...form, observacoes_tecnicas: e.target.value })}
                    placeholder="Observações do nutricionista sobre a preparação..."
                    sx={{
                      '& .MuiInputBase-root': {
                        alignItems: 'flex-start',
                        textAlign: 'left'
                      }
                    }}
                  />
                </Grid>
              </Grid>
              </Box>
            ) : (
              <Box sx={{ maxWidth: 1200 }}>
                <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, fontSize: '1.1rem' }}>
                    Informações Gerais
                  </Typography>
                </Grid>

                {preparacao.categoria && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Categoria</Typography>
                    <Chip label={preparacao.categoria} size="small" color="primary" sx={{ mt: 0.5 }} />
                  </Grid>
                )}

                {preparacao.tempo_preparo_minutos && (
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Tempo de Preparo</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <TimerIcon fontSize="small" color="action" />
                      <Typography variant="body1">{preparacao.tempo_preparo_minutos} minutos</Typography>
                    </Box>
                  </Grid>
                )}

                {preparacao.rendimento_porcoes && (
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Rendimento</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <LocalDiningIcon fontSize="small" color="action" />
                      <Typography variant="body1">{preparacao.rendimento_porcoes} porções</Typography>
                    </Box>
                  </Grid>
                )}

                {preparacao.modo_preparo && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Modo de Preparo</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line', bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                      {preparacao.modo_preparo}
                    </Typography>
                  </Grid>
                )}

                {preparacao.utensilios && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Utensílios Necessários</Typography>
                    <Typography variant="body1">{preparacao.utensilios}</Typography>
                  </Grid>
                )}

                {/* Custo Estimado */}
                {preparacao.rendimento_porcoes && associacoes.length > 0 && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                          Custo Estimado
                        </Typography>
                        {loadingCusto && <CircularProgress size={16} />}
                      </Box>
                      {!loadingCusto && errorCusto && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                          ⚠️ Erro ao calcular custo
                        </Typography>
                      )}
                      {!loadingCusto && custoData?.aviso && (
                        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1 }}>
                          ⚠️ {custoData.aviso}
                        </Typography>
                      )}
                    </Grid>

                    {!loadingCusto && custoData && (
                      <>
                        <Grid item xs={12}>
                          <Box sx={{ 
                            display: 'grid', 
                            gridTemplateColumns: { 
                              xs: '1fr', 
                              sm: 'repeat(2, 1fr)', 
                              md: custoData.detalhamento ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' 
                            }, 
                            gap: 2
                          }}>
                            {/* Custo Total */}
                            <Box sx={{ 
                              bgcolor: 'action.hover', 
                              p: 2.5, 
                              borderRadius: 1, 
                              border: '1px solid', 
                              borderColor: 'divider',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              height: 110
                            }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Custo Total</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                                R$ {toNum(custoData.custo_total).toFixed(2)}
                              </Typography>
                            </Box>

                            {/* Custo por Porção */}
                            <Box sx={{ 
                              bgcolor: 'action.hover', 
                              p: 2.5, 
                              borderRadius: 1, 
                              border: '1px solid', 
                              borderColor: 'divider',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              height: 110
                            }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Custo por Porção</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                                R$ {toNum(custoData.custo_por_porcao).toFixed(2)}
                              </Typography>
                            </Box>

                            {/* Botão Ver Detalhamento */}
                            {custoData.detalhamento && (
                              <Box sx={{ 
                                bgcolor: 'action.hover', 
                                p: 2.5, 
                                borderRadius: 1, 
                                border: '1px solid', 
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 110
                              }}>
                                <Button
                                  variant="outlined"
                                  onClick={() => setDetalhamentoCustoOpen(true)}
                                  fullWidth
                                >
                                  Ver Detalhamento
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </Grid>

                        {custoData.alertas && custoData.alertas.length > 0 && (
                          <Grid item xs={12}>
                            <Box sx={{ 
                              bgcolor: 'rgba(244, 67, 54, 0.15)', 
                              px: 2, 
                              py: 1.5, 
                              borderRadius: 1, 
                              border: '1px solid', 
                              borderColor: 'rgba(244, 67, 54, 0.5)'
                            }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.light', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                ⚠️ Alertas de Custo
                              </Typography>
                              {custoData.alertas.map((alerta, idx) => (
                                <Typography key={idx} variant="body2" sx={{ color: 'text.primary', ml: 2.5, lineHeight: 1.6 }}>
                                  • {alerta.mensagem}
                                </Typography>
                              ))}
                            </Box>
                          </Grid>
                        )}
                      </>
                    )}
                  </>
                )}

                {preparacao.observacoes_tecnicas && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="h6" sx={{ mb: 1.5, mt: 1.5, fontWeight: 600, fontSize: '1.1rem' }}>
                        Observações
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Observações Técnicas</Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line', bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                        {preparacao.observacoes_tecnicas}
                      </Typography>
                    </Grid>
                  </>
                )}

                {!preparacao.categoria && !preparacao.modo_preparo && associacoes.length === 0 && (
                  <Grid item xs={12}>
                    <Box textAlign="center" py={6}>
                      <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        Ficha Técnica não preenchida
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Clique em "Editar" para adicionar informações da Ficha Técnica
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {!preparacao.rendimento_porcoes && associacoes.length > 0 && (
                  <Grid item xs={12}>
                    <Box textAlign="center" py={4} sx={{ bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="body1" color="warning.dark">
                        ⚠️ Informe o rendimento (número de porções) para calcular valores nutricionais e custo
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {preparacao.rendimento_porcoes && associacoes.length === 0 && (
                  <Grid item xs={12}>
                    <Box textAlign="center" py={4} sx={{ bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="body1" color="warning.dark">
                        ⚠️ Adicione ingredientes na aba "Ingredientes" para calcular valores
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
            )}
          </Card>
            </Box>

            {/* Coluna direita: Painel Nutricional e Custo */}
            {!editando && (
              <Box sx={{ width: isMobile ? '100%' : 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Card Nutricional */}
                <Card sx={{ borderRadius: '8px', p: 1.5, bgcolor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                      Nutrição / porção
                    </Typography>
                    {loadingNutricional && <CircularProgress size={12} />}
                  </Box>

                  {!preparacao?.rendimento_porcoes ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Informe o rendimento (porções) para ver os cálculos.
                    </Typography>
                  ) : associacoes.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Adicione ingredientes para ver os valores nutricionais.
                    </Typography>
                  ) : !loadingNutricional && valoresNutricionais ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {/* Aviso sobre dados faltantes */}
                      {valoresNutricionais.aviso && (
                        <Box sx={{ 
                          bgcolor: 'rgba(255, 152, 0, 0.15)', 
                          px: 1.5, 
                          py: 1, 
                          borderRadius: 1, 
                          border: '1px solid', 
                          borderColor: 'rgba(255, 152, 0, 0.5)',
                          mb: 1
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.light', display: 'block', mb: 0.5 }}>
                            ⚠️ Atenção
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.primary', lineHeight: 1.5 }}>
                            {valoresNutricionais.aviso}
                          </Typography>
                        </Box>
                      )}
                      
                      {/* Energia em destaque */}
                      <Box sx={{ bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Energia</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {toNum(valoresNutricionais.por_porcao.calorias).toFixed(0)} kcal
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(toNum(valoresNutricionais.por_porcao.calorias) * 4.184).toFixed(0)} kJ
                        </Typography>
                      </Box>
                      {[
                        { label: 'Proteínas', value: toNum(valoresNutricionais.por_porcao.proteinas).toFixed(1), unit: 'g' },
                        { label: 'Lipídios', value: toNum(valoresNutricionais.por_porcao.lipidios).toFixed(1), unit: 'g' },
                        { label: 'Carboidratos', value: toNum(valoresNutricionais.por_porcao.carboidratos).toFixed(1), unit: 'g' },
                        { label: 'Cálcio', value: toNum(valoresNutricionais.por_porcao.calcio).toFixed(1), unit: 'mg' },
                        { label: 'Ferro', value: toNum(valoresNutricionais.por_porcao.ferro).toFixed(1), unit: 'mg' },
                        { label: 'Vit. A', value: toNum(valoresNutricionais.por_porcao.vitamina_a).toFixed(1), unit: 'mcg' },
                        { label: 'Vit. C', value: toNum(valoresNutricionais.por_porcao.vitamina_c).toFixed(1), unit: 'mg' },
                        { label: 'Sódio', value: toNum(valoresNutricionais.por_porcao.sodio).toFixed(1), unit: 'mg' },
                      ].map(({ label, value, unit }) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}{unit}</Typography>
                        </Box>
                      ))}
                      {valoresNutricionais.alertas && valoresNutricionais.alertas.length > 0 && (
                        <Box sx={{ 
                          mt: 1.5, 
                          bgcolor: 'rgba(255, 152, 0, 0.15)', 
                          px: 1.5, 
                          py: 1, 
                          borderRadius: 1, 
                          border: '1px solid', 
                          borderColor: 'rgba(255, 152, 0, 0.5)'
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.light', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            ⚠️ Alertas
                          </Typography>
                          {valoresNutricionais.alertas.map((alerta, idx) => (
                            <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.primary', ml: 2, lineHeight: 1.5 }}>
                              • {alerta.mensagem}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ) : !loadingNutricional && errorNutricional ? (
                    <Typography variant="caption" color="error">Erro ao calcular valores.</Typography>
                  ) : null}
                </Card>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>

    {/* Diálogo de Adicionar Grupo */}
    <AdicionarGrupoIngredientesDialog
      open={dialogGrupoOpen}
      onClose={() => setDialogGrupoOpen(false)}
      onSelect={adicionarGrupo}
      produtos={produtos}
    />

    {/* Diálogo de Adicionar Ingrediente */}
    <AdicionarIngredienteDialog      open={dialogAdicionarOpen}
      onClose={() => setDialogAdicionarOpen(false)}
      onConfirm={adicionarProduto}
      produtos={produtosDisponiveis}
    />

    {/* Diálogo de Editar Ingrediente */}
    {produtoEditando && (
      <EditarIngredienteDialog
        open={dialogEditarOpen}
        onClose={() => {
          setDialogEditarOpen(false);
          setProdutoEditando(null);
        }}
        onConfirm={confirmarEdicaoProduto}
        produtoNome={produtoEditando.produto?.nome || ''}
        produtoFatorCorrecao={produtoEditando.produto?.fator_correcao}
        perCapitaAtual={produtoEditando.per_capita}
        tipoMedidaAtual={produtoEditando.tipo_medida}
        perCapitaPorModalidadeAtual={produtoEditando.per_capita_por_modalidade}
      />
    )}

    {/* Modal de Detalhamento do Custo */}
    {custoData && custoData.detalhamento && (
      <DetalhamentoCustoModal
        open={detalhamentoCustoOpen}
        onClose={() => setDetalhamentoCustoOpen(false)}
        detalhamento={custoData.detalhamento.map((item) => ({
          ...item,
          quantidade_liquida: item.quantidade,
          quantidade_bruta: item.quantidade,
        }))}
        custoTotal={custoData.custo_total}
        custoPorPorcao={custoData.custo_por_porcao}
        rendimentoPorcoes={custoData.rendimento_porcoes || preparacao?.rendimento_porcoes || 1}
      />
    )}

    {/* Modal de confirmação de exclusão */}
    <Dialog open={openExcluir} onClose={() => setOpenExcluir(false)}>
      <DialogTitle>Excluir Preparação</DialogTitle>
      <DialogContent>
        <Typography>
          Tem certeza que deseja excluir esta Preparação? Esta ação não pode ser desfeita.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenExcluir(false)}>Cancelar</Button>
        <Button onClick={excluirpreparacao} color="error" variant="contained">
          Excluir
        </Button>
      </DialogActions>
    </Dialog>

    {/* Diálogo de Editar Informações da Preparação */}
    <Dialog 
      open={openDialogDetalhes} 
      onClose={() => setOpenDialogDetalhes(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditIcon sx={{ color: 'primary.main' }} />
        Editar Informações da Preparação
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* Nome */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 3, height: 16, borderRadius: 1.5, bgcolor: 'primary.main' }} />
              Nome da Preparação
            </Typography>
            <TextField
              fullWidth
              value={formDetalhes.nome || ''}
              onChange={(e) => setFormDetalhes({ ...formDetalhes, nome: e.target.value })}
              placeholder="Ex: Arroz Integral, Feijão Carioca..."
              sx={{
                '& .MuiInputBase-input': {
                  fontWeight: 600,
                  fontSize: '1rem'
                }
              }}
            />
          </Box>

          <Divider />

          {/* Categoria */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 3, height: 16, borderRadius: 1.5, bgcolor: 'success.main' }} />
              Categoria
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Categoria da preparação</InputLabel>
              <Select
                value={formDetalhes.categoria || ''}
                onChange={(e) => setFormDetalhes({ ...formDetalhes, categoria: e.target.value })}
                label="Categoria da preparação"
              >
                <MenuItem value="Prato Principal">🍽️ Prato Principal</MenuItem>
                <MenuItem value="Acompanhamento">🥗 Acompanhamento</MenuItem>
                <MenuItem value="Sobremesa">🍰 Sobremesa</MenuItem>
                <MenuItem value="Lanche">🥪 Lanche</MenuItem>
                <MenuItem value="Bebida">🥤 Bebida</MenuItem>
                <MenuItem value="Salada">🥬 Salada</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider />

          {/* Tempo e Rendimento */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 3, height: 16, borderRadius: 1.5, bgcolor: 'info.main' }} />
                  Tempo de Preparo
                </Typography>
                <TextField
                  label="Minutos"
                  type="number"
                  fullWidth
                  value={formDetalhes.tempo_preparo_minutos || ''}
                  onChange={(e) => setFormDetalhes({ ...formDetalhes, tempo_preparo_minutos: e.target.value })}
                  InputProps={{ 
                    inputProps: { min: 0 },
                    endAdornment: <Typography variant="body2" sx={{ color: 'text.secondary', mr: 1 }}>min</Typography>
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 3, height: 16, borderRadius: 1.5, bgcolor: 'warning.main' }} />
                  Rendimento
                </Typography>
                <TextField
                  label="Porções"
                  type="number"
                  fullWidth
                  value={formDetalhes.rendimento_porcoes || ''}
                  onChange={(e) => setFormDetalhes({ ...formDetalhes, rendimento_porcoes: e.target.value })}
                  InputProps={{ 
                    inputProps: { min: 1 },
                    endAdornment: <Typography variant="body2" sx={{ color: 'text.secondary', mr: 1 }}>porções</Typography>
                  }}
                  helperText="Número de porções que a receita rende"
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1.5 }}>
        <Button onClick={() => setOpenDialogDetalhes(false)} startIcon={<CancelIcon />}>
          Cancelar
        </Button>
        <Button 
          onClick={async () => {
            try {
              await editarRefeicaoMutation.mutateAsync({ 
                id: Number(id), 
                data: formDetalhes 
              });
              setOpenDialogDetalhes(false);
              toast.success('Informações atualizadas com sucesso!');
            } catch {
              toast.error('Não foi possível salvar as alterações.');
            }
          }} 
          variant="contained" 
          startIcon={<SaveIcon />}
          disabled={editarRefeicaoMutation.isPending}
        >
          {editarRefeicaoMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </DialogActions>
    </Dialog>
  </>
  );
}


