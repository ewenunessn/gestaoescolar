import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import CompactPagination from '../components/CompactPagination';
import AdicionarIngredienteDialog from '../components/AdicionarIngredienteDialog';
import EditarIngredienteDialog from '../components/EditarIngredienteDialog';
import { usePageTitle } from "../contexts/PageTitleContext";
import { Modalidade } from "../services/modalidades";
import { useToast } from "../hooks/useToast";
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
} from "../hooks/queries/useRefeicaoDetalheQueries";
import { useValoresNutricionais, useCustoRefeicao } from "../hooks/useRefeicaoCalculos";
import { toNum } from "../utils/formatters";
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
  Switch,
  FormControlLabel,
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
  Tooltip,
  Autocomplete,
  Grid,
  Divider,
  Menu,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Restaurant as RestaurantIcon,
  DragIndicator as DragIndicatorIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Description as DescriptionIcon,
  Timer as TimerIcon,
  LocalDining as LocalDiningIcon,
  PictureAsPdf as PdfIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import PageContainer from '../components/PageContainer';
import StatusIndicator from '../components/StatusIndicator';
import ViewTabs from '../components/ViewTabs';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  fator_correcao?: number;
  ativo: boolean;
}

interface RefeicaoProduto {
  id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: 'gramas' | 'unidades';
  ordem?: number;
  produto?: Produto;
  per_capita_por_modalidade?: Array<{
    modalidade_id: number;
    modalidade_nome: string;
    per_capita: number;
  }>;
  per_capita_efetivo?: number; // Per capita filtrado pela modalidade
}

interface SortableRowProps {
  assoc: RefeicaoProduto;
  onRemove: () => void;
  onEdit: () => void;
}

function SortableRow({ assoc, onRemove, onEdit }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assoc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // SEMPRE mostrar range (menor - maior), independente da modalidade selecionada
  const unidade = assoc.tipo_medida === 'gramas' ? 'g' : 'un';
  const fatorCorrecao = toNum(assoc.produto?.fator_correcao, 1.0);
  
  // Per capita cadastrado é LÍQUIDO (consumo)
  const perCapitasLiquido = assoc.per_capita_por_modalidade?.map(m => toNum(m.per_capita)) || [toNum(assoc.per_capita)];
  const minPerCapitaLiquido = Math.min(...perCapitasLiquido);
  const maxPerCapitaLiquido = Math.max(...perCapitasLiquido);
  
  const perCapitaLiquidoTexto = minPerCapitaLiquido === maxPerCapitaLiquido
    ? `${minPerCapitaLiquido}${unidade}`
    : `${minPerCapitaLiquido} - ${maxPerCapitaLiquido}${unidade}`;

  // Calcular per capita bruto (compra) = líquido * fator
  const minPerCapitaBruto = minPerCapitaLiquido * fatorCorrecao;
  const maxPerCapitaBruto = maxPerCapitaLiquido * fatorCorrecao;
  
  const perCapitaBrutoTexto = minPerCapitaLiquido === maxPerCapitaLiquido
    ? `${minPerCapitaBruto.toFixed(1)}${unidade}`
    : `${minPerCapitaBruto.toFixed(1)} - ${maxPerCapitaBruto.toFixed(1)}${unidade}`;

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
    <TableRow ref={setNodeRef} style={style} hover>
      <TableCell sx={{ width: 50, cursor: 'grab' }} {...attributes} {...listeners}>
        <DragIndicatorIcon color="action" />
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {assoc.produto?.nome}
        </Typography>
      </TableCell>
      <TableCell align="center" sx={{ width: 130 }}>
        <Tooltip title={tooltipContent} arrow placement="top">
          <Typography variant="body2" sx={{ cursor: 'help', fontWeight: 500, color: 'primary.main' }}>
            {perCapitaLiquidoTexto}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell align="center" sx={{ width: 130 }}>
        <Tooltip title={tooltipContent} arrow placement="top">
          <Typography variant="body2" sx={{ cursor: 'help', fontWeight: 500 }}>
            {perCapitaBrutoTexto}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell align="center" sx={{ width: 120 }}>
        <Chip 
          label={assoc.tipo_medida === 'gramas' ? 'Gramas' : 'Unidades'} 
          size="small" 
          variant="outlined"
        />
      </TableCell>
      <TableCell align="center" sx={{ width: 120 }}>
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remover">
            <IconButton size="small" color="delete" onClick={onRemove}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}

export default function RefeicaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { setPageTitle } = usePageTitle();
  
  // React Query hooks
  const { data: refeicao, isLoading: loading } = useRefeicao(Number(id));
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
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<RefeicaoProduto | null>(null);
  const [tabAtiva, setTabAtiva] = useState(0); // 0 = Ingredientes, 1 = Ficha Técnica
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  
  // Hooks para cálculos dinâmicos
  const { data: valoresNutricionais, isLoading: loadingNutricional, error: errorNutricional } = useValoresNutricionais(
    Number(id),
    refeicao?.rendimento_porcoes || form.rendimento_porcoes,
    !!refeicao, // Buscar sempre que a refeição estiver carregada
    modalidadeSelecionada
  );
  
  const { data: custoData, isLoading: loadingCusto, error: errorCusto } = useCustoRefeicao(
    Number(id),
    refeicao?.rendimento_porcoes || form.rendimento_porcoes,
    tabAtiva === 1 && !!refeicao, // Só buscar custo na aba Ficha Técnica
    modalidadeSelecionada
  );
  
  // Autocomplete
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  
  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Atualizar form e título quando refeição carregar
  useEffect(() => {
    if (refeicao) {
      setForm(refeicao);
      setPageTitle(refeicao.nome);
      
      // Selecionar primeira modalidade ativa por padrão
      const ativas = modalidades.filter(m => m.ativo);
      if (ativas.length > 0 && !modalidadeSelecionada) {
        setModalidadeSelecionada(ativas[0].id);
      }
    }
  }, [refeicao, modalidades, setPageTitle]);
  
  // Verificar se refeição não foi encontrada
  useEffect(() => {
    if (!loading && !refeicao && id) {
      toast.error('Erro', 'Refeição não encontrada');
      navigate('/refeicoes');
    }
  }, [loading, refeicao, id, navigate, toast]);

  const produtosDisponiveis = produtos.filter(
    (produto) => !associacoes.some((assoc) => assoc.produto_id === produto.id)
  );

  async function salvarEdicao() {
    try {
      await editarRefeicaoMutation.mutateAsync({ id: Number(id), data: form });
      setEditando(false);
      toast.success('Sucesso!', 'Refeição atualizada com sucesso!');
    } catch {
      toast.error('Erro ao salvar', 'Não foi possível salvar as alterações.');
    }
  }

  async function excluirRefeicao() {
    try {
      await deletarRefeicaoMutation.mutateAsync(Number(id));
      toast.success('Sucesso!', 'Refeição excluída com sucesso!');
      navigate("/refeicoes");
    } catch {
      toast.error('Erro ao excluir', 'Não foi possível excluir a refeição.');
    }
  }

  async function adicionarProduto(
    produtoId: number,
    perCapitaGeral: number | null,
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
      toast.success('Sucesso!', 'Produto adicionado à refeição!');
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast.error('Erro ao adicionar', 'Não foi possível adicionar o produto.');
    }
  }

  async function removerProduto(assocId: number) {
    try {
      await removerProdutoMutation.mutateAsync({ id: assocId, refeicaoId: Number(id) });
      toast.success('Sucesso!', 'Produto removido da refeição!');
    } catch {
      toast.error('Erro ao remover', 'Não foi possível remover o produto.');
    }
  }

  function handleEditarProduto(assoc: RefeicaoProduto) {
    setProdutoEditando(assoc);
    setDialogEditarOpen(true);
  }

  async function confirmarEdicaoProduto(
    perCapitaGeral: number | null,
    tipoMedida: 'gramas' | 'unidades',
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
      
      toast.success('Sucesso!', 'Produto atualizado!');
    } catch (error) {
      console.error('Erro ao editar produto:', error);
      toast.error('Erro ao editar', 'Não foi possível editar o produto.');
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setAssociacoes((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  // Filtrar associações pela modalidade selecionada
  const associacoesFiltradas = associacoes;

  const paginatedAssociacoes = associacoesFiltradas.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  async function gerarPDF() {
    try {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default as any;
      (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts;

      const { buscarIngredientesDetalhados } = await import('../services/refeicaoIngredientes');
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
          // ── Cabeçalho ──────────────────────────────────────────────
          {
            columns: [
              {
                stack: [
                  { text: 'FICHA TÉCNICA DE PREPARAÇÃO', fontSize: 7.5, bold: true, color: '#718096', characterSpacing: 1 },
                  { text: refeicao.nome, fontSize: 18, bold: true, color: '#1a202c', margin: [0, 2, 0, 0] },
                  ...(modalidadeNome ? [{ text: `Modalidade: ${modalidadeNome}`, fontSize: 8.5, bold: true, color: '#38a169', margin: [0, 3, 0, 0] }] : []),
                  ...(refeicao.descricao ? [{ text: refeicao.descricao, fontSize: 8, italics: true, color: '#718096', margin: [0, 2, 0, 0] }] : []),
                ],
                width: '*',
              },
              {
                stack: [
                  ...(refeicao.categoria ? [{ text: refeicao.categoria, fontSize: 8, bold: true, color: '#4a5568', alignment: 'right' }] : []),
                  ...(refeicao.tempo_preparo_minutos ? [{ text: `Preparo: ${refeicao.tempo_preparo_minutos} min`, fontSize: 7.5, color: '#718096', alignment: 'right', margin: [0, 4, 0, 0] }] : []),
                  ...(refeicao.rendimento_porcoes ? [{ text: `Rendimento: ${refeicao.rendimento_porcoes} porções`, fontSize: 7.5, color: '#718096', alignment: 'right', margin: [0, 2, 0, 0] }] : []),
                ],
                width: 130,
              },
            ],
            margin: [0, 0, 0, 10],
          },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 539, y2: 0, lineWidth: 1.5, lineColor: '#e2e8f0' }], margin: [0, 0, 0, 12] },

          // ── Tabela principal ────────────────────────────────────────
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
                    { text: ing.tipo_medida === 'gramas' ? 'g' : 'un', alignment: 'center', fontSize: 7, fillColor: bg, color: '#718096' },
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
                mkRow('TOTAL REFEIÇÃO', C_TOTAL,
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

          // ── Seção inferior: 2 colunas ───────────────────────────────
          {
            columns: [
              ...(refeicao.modo_preparo ? [{
                stack: [
                  { text: 'MODO DE PREPARO', fontSize: 7.5, bold: true, color: '#718096', characterSpacing: 0.5, margin: [0, 0, 0, 4] },
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 250, y2: 0, lineWidth: 0.8, lineColor: '#e2e8f0' }], margin: [0, 0, 0, 5] },
                  { text: refeicao.modo_preparo, fontSize: 8, color: '#4a5568', lineHeight: 1.5 },
                ],
                width: '*',
              }] : [{ text: '', width: '*' }]),
              { width: 16, text: '' },
              {
                stack: [
                  { text: 'INFORMAÇÕES', fontSize: 7.5, bold: true, color: '#718096', characterSpacing: 0.5, margin: [0, 0, 0, 4] },
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: '#e2e8f0' }], margin: [0, 0, 0, 5] },
                  ...(refeicao.categoria ? [{ columns: [{ text: 'Categoria', fontSize: 7.5, color: '#718096', width: 80 }, { text: refeicao.categoria, fontSize: 7.5, bold: true, color: '#2d3748', width: '*' }], margin: [0, 0, 0, 3] }] : []),
                  ...(refeicao.tempo_preparo_minutos ? [{ columns: [{ text: 'Tempo de preparo', fontSize: 7.5, color: '#718096', width: 80 }, { text: `${refeicao.tempo_preparo_minutos} minutos`, fontSize: 7.5, bold: true, color: '#2d3748', width: '*' }], margin: [0, 0, 0, 3] }] : []),
                  ...(refeicao.rendimento_porcoes ? [{ columns: [{ text: 'Rendimento', fontSize: 7.5, color: '#718096', width: 80 }, { text: `${refeicao.rendimento_porcoes} porções`, fontSize: 7.5, bold: true, color: '#2d3748', width: '*' }], margin: [0, 0, 0, 3] }] : []),
                  ...(modalidadeNome ? [{ columns: [{ text: 'Modalidade', fontSize: 7.5, color: '#718096', width: 80 }, { text: modalidadeNome, fontSize: 7.5, bold: true, color: '#38a169', width: '*' }], margin: [0, 0, 0, 3] }] : []),
                  ...(refeicao.utensílios ? [{ text: 'Utensílios', fontSize: 7.5, color: '#718096', margin: [0, 4, 0, 2] }, { text: refeicao.utensílios, fontSize: 7.5, color: '#4a5568' }] : []),
                  ...(refeicao.observacoes_tecnicas ? [{ text: 'Observações', fontSize: 7.5, color: '#718096', margin: [0, 4, 0, 2] }, { text: refeicao.observacoes_tecnicas, fontSize: 7.5, color: '#4a5568', lineHeight: 1.4 }] : []),
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

      pdfMake.createPdf(docDefinition).download(`ficha-tecnica-${refeicao.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success('PDF gerado!', 'Ficha técnica exportada com sucesso!');
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || error.message || 'Erro desconhecido';
      toast.error('Erro ao gerar PDF', `Não foi possível gerar o PDF: ${mensagemErro}`);
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!refeicao) return null;

  return (
    <>
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 0, px: 2, pt: 1.5 }}>
        <PageBreadcrumbs 
          items={[
            { label: 'Refeições', path: '/refeicoes', icon: <RestaurantIcon fontSize="small" /> },
            { label: refeicao?.nome || 'Detalhes da Refeição' }
          ]}
        />

        {/* Tabs + Ações na mesma linha */}
        <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', pb: 0.5 }}>
          <ViewTabs
            value={tabAtiva}
            onChange={setTabAtiva}
            tabs={[
              { value: 0, label: 'Ingredientes', icon: <RestaurantIcon sx={{ fontSize: 16 }} /> },
              { value: 1, label: 'Ficha Técnica', icon: <DescriptionIcon sx={{ fontSize: 16 }} /> },
            ]}
          />
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 2, py: 1.5 }}>

        {/* Tab 0: Ingredientes */}
        {tabAtiva === 0 && (
          <Box sx={{ height: '100%', display: 'flex', gap: 1.5 }}>
            {/* Coluna esquerda: Adicionar + Tabela */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Adicionar Produto */}
              <Card sx={{ borderRadius: '8px', p: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Adicione ingredientes à refeição e defina o per capita por modalidade
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setDialogAdicionarOpen(true)}
                    size="small"
                    sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, whiteSpace: 'nowrap' }}
                  >
                    Adicionar Ingrediente
                  </Button>
                </Box>
              </Card>

              {/* Tabela de Produtos */}
              {associacoes.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <RestaurantIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Nenhum produto adicionado
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Use o campo acima para adicionar produtos à refeição
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500, mb: 1 }}>
                    Exibindo {associacoes.length} {associacoes.length === 1 ? 'produto' : 'produtos'}
                  </Typography>
                  
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <TableContainer sx={{ flex: 1, minHeight: 0, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 50 }}></TableCell>
                            <TableCell>Produto</TableCell>
                            <TableCell align="center" sx={{ width: 130 }}>
                              <Tooltip title="Per capita líquido (consumo efetivo)" arrow>
                                <Box component="span">Per Capita Líquido</Box>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 130 }}>
                              <Tooltip title="Per capita bruto (quantidade de compra)" arrow>
                                <Box component="span">Per Capita Bruto</Box>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 120 }}>Unidade</TableCell>
                            <TableCell align="center" sx={{ width: 120 }}>Ações</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <SortableContext
                            items={paginatedAssociacoes.map(a => a.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {paginatedAssociacoes.map((assoc) => (
                              <SortableRow
                                key={assoc.id}
                                assoc={assoc}
                                onRemove={() => removerProduto(assoc.id)}
                                onEdit={() => handleEditarProduto(assoc)}
                              />
                            ))}
                          </SortableContext>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </DndContext>
                  
                  <Box sx={{ mt: 1 }}>
                    <CompactPagination
                      count={associacoes.length}
                      page={page}
                      onPageChange={(e, newPage) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                      }}
                      rowsPerPageOptions={[10, 25, 50]}
                    />
                  </Box>
                </Box>
              )}
            </Box>

            {/* Coluna direita: Painel Nutricional */}
            <Box sx={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Card sx={{ borderRadius: '8px', p: 1.5, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                    Nutrição / porção
                  </Typography>
                  {loadingNutricional && <CircularProgress size={12} />}
                </Box>

                {!refeicao?.rendimento_porcoes ? (
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
                    <Box sx={{ bgcolor: '#f0f4ff', px: 1.5, py: 0.75, borderRadius: 1, mb: 0.5 }}>
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
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.25, borderBottom: '1px solid #f0f0f0' }}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}{unit}</Typography>
                      </Box>
                    ))}
                    {valoresNutricionais.alertas && valoresNutricionais.alertas.length > 0 && (
                      <Box sx={{ mt: 1, bgcolor: '#fff3cd', px: 1, py: 0.75, borderRadius: 1, border: '1px solid #ffc107' }}>
                        {valoresNutricionais.alertas.map((alerta, idx) => (
                          <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.68rem' }}>⚠ {alerta.mensagem}</Typography>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Visualizar valores para:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
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
                <Typography variant="caption" color="text.secondary">
                  Os cálculos nutricionais e de custo serão ajustados para esta modalidade
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Button
                  onClick={gerarPDF}
                  variant="outlined"
                  startIcon={<PdfIcon />}
                  size="small"
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
                      Informações Gerais
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
                    value={form.utensílios || ''}
                    onChange={(e) => setForm({ ...form, utensílios: e.target.value })}
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

                {refeicao.categoria && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Categoria</Typography>
                    <Chip label={refeicao.categoria} size="small" color="primary" sx={{ mt: 0.5 }} />
                  </Grid>
                )}

                {refeicao.tempo_preparo_minutos && (
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Tempo de Preparo</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <TimerIcon fontSize="small" color="action" />
                      <Typography variant="body1">{refeicao.tempo_preparo_minutos} minutos</Typography>
                    </Box>
                  </Grid>
                )}

                {refeicao.rendimento_porcoes && (
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Rendimento</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <LocalDiningIcon fontSize="small" color="action" />
                      <Typography variant="body1">{refeicao.rendimento_porcoes} porções</Typography>
                    </Box>
                  </Grid>
                )}

                {refeicao.modo_preparo && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Modo de Preparo</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                      {refeicao.modo_preparo}
                    </Typography>
                  </Grid>
                )}

                {refeicao.utensílios && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Utensílios Necessários</Typography>
                    <Typography variant="body1">{refeicao.utensílios}</Typography>
                  </Grid>
                )}

                {/* Composição Nutricional Calculada Dinamicamente */}
                {refeicao.rendimento_porcoes && associacoes.length > 0 && (
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
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, bgcolor: '#f0f4ff', px: 1.5, py: 0.5, borderRadius: 1, border: '1px solid #c7d7f5' }}>
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
                            <Box key={label} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, bgcolor: '#f8f9fa', px: 1.5, py: 0.5, borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary">{label}</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}{unit}</Typography>
                            </Box>
                          ))}
                          {valoresNutricionais.alertas && valoresNutricionais.alertas.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#fff3cd', px: 1.5, py: 0.5, borderRadius: 1, border: '1px solid #ffc107' }}>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>Alertas:</Typography>
                              {valoresNutricionais.alertas.map((alerta, idx) => (
                                <Typography key={idx} variant="caption">• {alerta.mensagem}</Typography>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Grid>
                    )}
                  </>
                )}

                {/* Custo Estimado Calculado Dinamicamente */}
                {refeicao.rendimento_porcoes && associacoes.length > 0 && (
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
                            <Box sx={{ bgcolor: '#ffebee', p: 1.5, borderRadius: 1, border: '1px solid #f44336' }}>
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

                {refeicao.observacoes_tecnicas && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="h6" sx={{ mb: 1.5, mt: 1.5, fontWeight: 600, fontSize: '1.1rem' }}>
                        Observações
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Observações Técnicas</Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                        {refeicao.observacoes_tecnicas}
                      </Typography>
                    </Grid>
                  </>
                )}

                {!refeicao.categoria && !refeicao.modo_preparo && associacoes.length === 0 && (
                  <Grid item xs={12}>
                    <Box textAlign="center" py={6}>
                      <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        Ficha técnica não preenchida
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Clique em "Editar" para adicionar informações da ficha técnica
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {!refeicao.rendimento_porcoes && associacoes.length > 0 && (
                  <Grid item xs={12}>
                    <Box textAlign="center" py={4} sx={{ bgcolor: '#fff3cd', borderRadius: 1 }}>
                      <Typography variant="body1" color="warning.dark">
                        ⚠️ Informe o rendimento (número de porções) para calcular valores nutricionais e custo
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {refeicao.rendimento_porcoes && associacoes.length === 0 && (
                  <Grid item xs={12}>
                    <Box textAlign="center" py={4} sx={{ bgcolor: '#fff3cd', borderRadius: 1 }}>
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

    {/* Diálogo de Adicionar Ingrediente */}
    <AdicionarIngredienteDialog
      open={dialogAdicionarOpen}
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

    {/* Modal de confirmação de exclusão */}
    <Dialog open={openExcluir} onClose={() => setOpenExcluir(false)}>
      <DialogTitle>Excluir Refeição</DialogTitle>
      <DialogContent>
        <Typography>
          Tem certeza que deseja excluir esta refeição? Esta ação não pode ser desfeita.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenExcluir(false)}>Cancelar</Button>
        <Button onClick={excluirRefeicao} color="delete" variant="contained">
          Excluir
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
