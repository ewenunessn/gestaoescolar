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

interface preparacaoProduto {
  id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: 'gramas' | 'mililitros' | 'unidades';
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
    produtoId: number,    perCapitaGeral: number | null,
    tipoMedida: 'gramas' | 'unidades',
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
          tipoMedida: item.tipo_medida as 'gramas' | 'unidades',
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
    tipoMedida: 'gramas' | 'mililitros' | 'unidades',
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
    try {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default as any;
      (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts;

      const { buscarIngredientesDetalhados } = await import('../../../services/refeicaoIngredientes');
      const ingredientesDetalhados = await buscarIngredientesDetalhados(Number(id), modalidadeSelecionada);

      const modalidadeNome = modalidadeSelecionada
        ? modalidades.find(m => m.id === modalidadeSelecionada)?.nome
        : null;

      const ings = ingredientesDetalhados.ingredientes;

      // Totais
      const totalLiq    = ings.reduce((s, i) => s + toNum(i.per_capita), 0);
      const totalBruto  = ings.reduce((s, i) => s + toNum(i.per_capita_bruto ?? i.per_capita), 0);
      const totalProt   = ings.reduce((s, i) => s + toNum(i.proteinas_porcao), 0);
      const totalLip    = ings.reduce((s, i) => s + toNum(i.lipidios_porcao), 0);
      const totalCarb   = ings.reduce((s, i) => s + toNum(i.carboidratos_porcao), 0);
      const totalCalcio = ings.reduce((s, i) => s + toNum(i.calcio_porcao), 0);
      const totalFerro  = ings.reduce((s, i) => s + toNum(i.ferro_porcao), 0);
      const totalVitA   = ings.reduce((s, i) => s + toNum(i.vitamina_a_porcao), 0);
      const totalVitC   = ings.reduce((s, i) => s + toNum(i.vitamina_c_porcao), 0);
      const totalSodio  = ings.reduce((s, i) => s + toNum(i.sodio_porcao), 0);
      const totalKcal   = totalProt * 4 + totalCarb * 4 + totalLip * 9;
      const totalKj     = totalKcal * 4.184;

      // Por 100g
      const f100    = totalLiq > 0 ? 100 / totalLiq : 0;
      const kcal100 = totalKcal * f100;
      const kj100   = kcal100 * 4.184;

      // Paleta neutra
      const C_HEADER = '#4a5568';
      const C_TOTAL  = '#2d3748';
      const C_100G   = '#4a5568';
      const C_STRIPE = '#f7f8fa';
      const C_BORDER = '#e2e8f0';

      // Helper: célula de dado
      const dc = (v: number, dec = 1, bg = '#ffffff') => ({
        text: v > 0 ? v.toFixed(dec) : '—',
        alignment: 'center' as const,
        fontSize: 7,
        fillColor: bg,
        color: v > 0 ? '#2d3748' : '#cbd5e0',
      });

      // Linha de totais helper
      const mkRow = (label: string, fill: string, liq: string, bruto: string,
        kcal: number, kj: number, prot: number, lip: number, carb: number,
        calcio: number, ferro: number, vita: number, vitc: number, sodio: number
      ): any[] => {
        const t = (v: string | number, dec?: number) => ({
          text: typeof v === 'number' ? (dec !== undefined ? v.toFixed(dec) : String(v)) : v,
          alignment: 'center' as const, bold: true, fontSize: 7, fillColor: fill, color: '#ffffff',
        });
        return [
          { text: label, bold: true, fontSize: 7, fillColor: fill, color: '#ffffff' },
          t(liq), t(bruto), t('g'),
          t(kcal, 0), t(kj, 0),
          t(prot, 1), t(lip, 1), t(carb, 1),
          t(calcio, 1), t(ferro, 2), t(vita, 1), t(vitc, 1), t(sodio, 1),
        ];
      };

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [28, 36, 28, 36],
        content: [
          // -- Cabeçalho ----------------------------------------------
          {
            columns: [
              {
                stack: [
                  { text: 'Ficha Técnica DE PREPARAÇÃO', fontSize: 7.5, bold: true, color: '#718096', characterSpacing: 1 },
                  { text: preparacao.nome, fontSize: 18, bold: true, color: '#1a202c', margin: [0, 2, 0, 0] },
                  ...(modalidadeNome ? [{ text: `Modalidade: ${modalidadeNome}`, fontSize: 8.5, bold: true, color: '#38a169', margin: [0, 3, 0, 0] }] : []),
                  ...(preparacao.descricao ? [{ text: preparacao.descricao, fontSize: 8, italics: true, color: '#718096', margin: [0, 2, 0, 0] }] : []),
                ],
                width: '*',
              },
              {
                stack: [
                  ...(preparacao.categoria ? [{ text: preparacao.categoria, fontSize: 8, bold: true, color: '#4a5568', alignment: 'right' }] : []),
                  ...(preparacao.tempo_preparo_minutos ? [{ text: `Preparo: ${preparacao.tempo_preparo_minutos} min`, fontSize: 7.5, color: '#718096', alignment: 'right', margin: [0, 4, 0, 0] }] : []),
                  ...(preparacao.rendimento_porcoes ? [{ text: `Rendimento: ${preparacao.rendimento_porcoes} porções`, fontSize: 7.5, color: '#718096', alignment: 'right', margin: [0, 2, 0, 0] }] : []),
                ],
                width: 130,
              },
            ],
            margin: [0, 0, 0, 10],
          },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 539, y2: 0, lineWidth: 1.5, lineColor: '#e2e8f0' }], margin: [0, 0, 0, 12] },

          // -- Tabela principal ----------------------------------------
          { text: 'COMPOSIÇÃO NUTRICIONAL DOS INGREDIENTES', fontSize: 7.5, bold: true, color: '#718096', characterSpacing: 0.5, margin: [0, 0, 0, 5] },
          {
            table: {
              headerRows: 1,
              widths: ['*', 24, 26, 12, 24, 28, 24, 24, 24, 26, 22, 26, 24, 26],
              body: [
                [
                  { text: 'Ingrediente', style: 'th' },
                  { text: 'PC Líq.\n(g)', style: 'th' },
                  { text: 'PC Bruto\n(g)', style: 'th' },
                  { text: 'Un', style: 'th' },
                  { text: 'kcal', style: 'th' },
                  { text: 'kJ', style: 'th' },
                  { text: 'Prot.\n(g)', style: 'th' },
                  { text: 'Lip.\n(g)', style: 'th' },
                  { text: 'Carb.\n(g)', style: 'th' },
                  { text: 'Cálcio\n(mg)', style: 'th' },
                  { text: 'Ferro\n(mg)', style: 'th' },
                  { text: 'Vit. A\n(mcg)', style: 'th' },
                  { text: 'Vit. C\n(mg)', style: 'th' },
                  { text: 'Sódio\n(mg)', style: 'th' },
                ],
                ...ings.map((ing, idx) => {
                  const bg = idx % 2 === 0 ? C_STRIPE : '#ffffff';
                  const kcalIng = toNum(ing.proteinas_porcao) * 4 + toNum(ing.carboidratos_porcao) * 4 + toNum(ing.lipidios_porcao) * 9;
                  const kjIng   = kcalIng * 4.184;
                  return [
                    { text: ing.produto_nome, fontSize: 7, fillColor: bg, color: '#2d3748' },
                    { text: toNum(ing.per_capita).toFixed(1), alignment: 'center', fontSize: 7, fillColor: bg, bold: true, color: '#2b6cb0' },
                    { text: toNum(ing.per_capita_bruto ?? ing.per_capita).toFixed(1), alignment: 'center', fontSize: 7, fillColor: bg, color: '#4a5568' },
                    { text: ing.tipo_medida === 'gramas' ? 'g' : ing.tipo_medida === 'mililitros' ? 'ml' : 'un', alignment: 'center', fontSize: 7, fillColor: bg, color: '#718096' },
                    dc(kcalIng, 0, bg),
                    dc(kjIng, 0, bg),
                    dc(toNum(ing.proteinas_porcao), 1, bg),
                    dc(toNum(ing.lipidios_porcao), 1, bg),
                    dc(toNum(ing.carboidratos_porcao), 1, bg),
                    dc(toNum(ing.calcio_porcao), 1, bg),
                    dc(toNum(ing.ferro_porcao), 2, bg),
                    dc(toNum(ing.vitamina_a_porcao), 1, bg),
                    dc(toNum(ing.vitamina_c_porcao), 1, bg),
                    dc(toNum(ing.sodio_porcao), 1, bg),
                  ];
                }),
                mkRow('TOTAL Preparação', C_TOTAL,
                  totalLiq.toFixed(1), totalBruto.toFixed(1),
                  totalKcal, totalKj,
                  totalProt, totalLip, totalCarb, totalCalcio, totalFerro, totalVitA, totalVitC, totalSodio
                ),
                mkRow('POR 100g', C_100G,
                  '100', '—',
                  kcal100, kj100,
                  totalProt * f100, totalLip * f100, totalCarb * f100,
                  totalCalcio * f100, totalFerro * f100, totalVitA * f100, totalVitC * f100, totalSodio * f100
                ),
              ],
            },
            layout: {
              hLineWidth: (i: number, node: any) => {
                const n = node.table.body.length;
                return (i === 0 || i === 1 || i === n - 2 || i === n) ? 1 : 0.3;
              },
              vLineWidth: () => 0.3,
              hLineColor: (i: number, node: any) => {
                const n = node.table.body.length;
                return (i === 0 || i === 1 || i === n - 2 || i === n) ? '#a0aec0' : C_BORDER;
              },
              vLineColor: () => C_BORDER,
              paddingTop: () => 3,
              paddingBottom: () => 3,
              paddingLeft: (i: number) => i === 0 ? 5 : 2,
              paddingRight: (i: number) => i === 0 ? 5 : 2,
            },
            margin: [0, 0, 0, 16],
          },

          // -- Seção inferior: 2 colunas -------------------------------
          {
            columns: [
              ...(preparacao.modo_preparo ? [{
                stack: [
                  { text: 'MODO DE PREPARO', fontSize: 7.5, bold: true, color: '#718096', characterSpacing: 0.5, margin: [0, 0, 0, 4] },
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 250, y2: 0, lineWidth: 0.8, lineColor: '#e2e8f0' }], margin: [0, 0, 0, 5] },
                  { text: preparacao.modo_preparo, fontSize: 8, color: '#4a5568', lineHeight: 1.5 },
                ],
                width: '*',
              }] : [{ text: '', width: '*' }]),
              { width: 16, text: '' },
              {
                stack: [
                  { text: 'informações', fontSize: 7.5, bold: true, color: '#718096', characterSpacing: 0.5, margin: [0, 0, 0, 4] },
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: '#e2e8f0' }], margin: [0, 0, 0, 5] },
                  ...(preparacao.categoria ? [{ columns: [{ text: 'Categoria', fontSize: 7.5, color: '#718096', width: 80 }, { text: preparacao.categoria, fontSize: 7.5, bold: true, color: '#2d3748', width: '*' }], margin: [0, 0, 0, 3] }] : []),
                  ...(preparacao.tempo_preparo_minutos ? [{ columns: [{ text: 'Tempo de preparo', fontSize: 7.5, color: '#718096', width: 80 }, { text: `${preparacao.tempo_preparo_minutos} minutos`, fontSize: 7.5, bold: true, color: '#2d3748', width: '*' }], margin: [0, 0, 0, 3] }] : []),
                  ...(preparacao.rendimento_porcoes ? [{ columns: [{ text: 'Rendimento', fontSize: 7.5, color: '#718096', width: 80 }, { text: `${preparacao.rendimento_porcoes} porções`, fontSize: 7.5, bold: true, color: '#2d3748', width: '*' }], margin: [0, 0, 0, 3] }] : []),
                  ...(modalidadeNome ? [{ columns: [{ text: 'Modalidade', fontSize: 7.5, color: '#718096', width: 80 }, { text: modalidadeNome, fontSize: 7.5, bold: true, color: '#38a169', width: '*' }], margin: [0, 0, 0, 3] }] : []),
                  ...(preparacao.utensilios ? [{ text: 'Utensílios', fontSize: 7.5, color: '#718096', margin: [0, 4, 0, 2] }, { text: preparacao.utensilios, fontSize: 7.5, color: '#4a5568' }] : []),
                  ...(preparacao.observacoes_tecnicas ? [{ text: 'Observações', fontSize: 7.5, color: '#718096', margin: [0, 4, 0, 2] }, { text: preparacao.observacoes_tecnicas, fontSize: 7.5, color: '#4a5568', lineHeight: 1.4 }] : []),
                  ...(valoresNutricionais?.alertas?.length ? [
                    { text: 'ALERTAS NUTRICIONAIS', fontSize: 7.5, bold: true, color: '#b7791f', characterSpacing: 0.5, margin: [0, 8, 0, 3] },
                    ...valoresNutricionais.alertas.map((a: any) => ({ text: `• ${a.mensagem}`, fontSize: 7.5, color: '#92400e', margin: [0, 1, 0, 1] })),
                  ] : []),
                ],
                width: 220,
              },
            ],
          },

          { text: `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, fontSize: 6.5, color: '#cbd5e0', alignment: 'right', margin: [0, 16, 0, 0] },
        ],
        styles: {
          th: { bold: true, fontSize: 6.5, color: '#ffffff', fillColor: C_HEADER, alignment: 'center' },
        },
        defaultStyle: { fontSize: 8, color: '#2d3748' },
      };

      pdfMake.createPdf(docDefinition).download(`ficha-tecnica-${preparacao.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
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
            <IconButton size="small" onClick={() => setShowEdicaoRapida(true)}>
              <EditIcon fontSize="small" />
            </IconButton>
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
            onChange={setTabAtiva}
            tabs={[
              { value: 0, label: isMobile ? 'Ingred.' : 'Ingredientes', icon: <RestaurantIcon sx={{ fontSize: 16 }} /> },
              { value: 1, label: isMobile ? 'Ficha' : 'Ficha Técnica', icon: <DescriptionIcon sx={{ fontSize: 16 }} /> },
            ]}
          />
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
            {editando ? (
              <>
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
                  <MenuItem onClick={() => { setMenuAnchorEl(null); setEditando(true); }}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} /> Editar
                  </MenuItem>
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
                      <Box sx={{ mt: 1, bgcolor: 'warning.light', px: 1, py: 0.75, borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
                        {valoresNutricionais.alertas.map((alerta, idx) => (
                          <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.68rem', color: 'text.primary' }}>• {alerta.mensagem}</Typography>
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

                {/* Composição Nutricional Calculada Dinamicamente */}
                {preparacao.rendimento_porcoes && associacoes.length > 0 && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                          Composição Nutricional Calculada (por porção)
                        </Typography>
                        {loadingNutricional && <CircularProgress size={16} />}
                      </Box>
                      {!loadingNutricional && errorNutricional && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                          ⚠️ Erro ao calcular valores nutricionais
                        </Typography>
                      )}
                      {!loadingNutricional && valoresNutricionais?.aviso && (
                        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1 }}>
                          ⚠️ {valoresNutricionais.aviso}
                        </Typography>
                      )}
                    </Grid>

                    {!loadingNutricional && valoresNutricionais && (
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                          {/* Energia em destaque */}
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, bgcolor: 'action.hover', px: 1.5, py: 0.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary">Energia</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                              {toNum(valoresNutricionais.por_porcao.calorias).toFixed(0)} kcal
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              / {(toNum(valoresNutricionais.por_porcao.calorias) * 4.184).toFixed(0)} kJ
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
                            <Box key={label} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, bgcolor: 'action.selected', px: 1.5, py: 0.5, borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary">{label}</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}{unit}</Typography>
                            </Box>
                          ))}
                          {valoresNutricionais.alertas && valoresNutricionais.alertas.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'warning.light', px: 1.5, py: 0.5, borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>Alertas:</Typography>
                              {valoresNutricionais.alertas.map((alerta, idx) => (
                                <Typography key={idx} variant="caption" sx={{ color: 'text.primary' }}>• {alerta.mensagem}</Typography>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Grid>
                    )}
                  </>
                )}

                {/* Custo Estimado Calculado Dinamicamente */}
                {preparacao.rendimento_porcoes && associacoes.length > 0 && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                          Custo Estimado
                        </Typography>
                        {loadingCusto && <CircularProgress size={16} />}
                        {!loadingCusto && custoData && custoData.detalhamento && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setDetalhamentoCustoOpen(true)}
                            sx={{ ml: 'auto' }}
                          >
                            Ver Detalhamento
                          </Button>
                        )}
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
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" color="text.secondary">Custo Total</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                            R$ {toNum(custoData.custo_total).toFixed(2)}
                          </Typography>
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" color="text.secondary">Custo por Porção</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                            R$ {toNum(custoData.custo_por_porcao).toFixed(2)}
                          </Typography>
                        </Grid>

                        {custoData.alertas && custoData.alertas.length > 0 && (
                          <Grid item xs={12}>
                            <Box sx={{ bgcolor: 'error.light', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'error.main' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Alertas de Custo:</Typography>
                              {custoData.alertas.map((alerta, idx) => (
                                <Typography key={idx} variant="caption" sx={{ display: 'block' }}>
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
        detalhamento={custoData.detalhamento}
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
        <Button onClick={excluirpreparacao} color="delete" variant="contained">
          Excluir
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}


