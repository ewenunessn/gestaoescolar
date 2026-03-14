import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import CompactPagination from '../components/CompactPagination';
import AdicionarIngredienteDialog from '../components/AdicionarIngredienteDialog';
import EditarIngredienteDialog from '../components/EditarIngredienteDialog';
import { usePageTitle } from "../contexts/PageTitleContext";
import {
  buscarRefeicao,
  editarRefeicao,
  deletarRefeicao,
  listarProdutosDaRefeicao,
  adicionarProdutoNaRefeicao,
  editarProdutoNaRefeicao,
  removerProdutoDaRefeicao,
} from "../services/refeicoes";
import { listarProdutos } from "../services/produtos";
import { listarModalidades, Modalidade } from "../services/modalidades";
import { useToast } from "../hooks/useToast";
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
  Tabs,
  Tab,
  Grid,
  Divider,
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
} from "@mui/icons-material";
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import PageContainer from '../components/PageContainer';
import StatusIndicator from '../components/StatusIndicator';
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
            <IconButton size="small" color="error" onClick={onRemove}>
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
  
  const [refeicao, setRefeicao] = useState<any>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [associacoes, setAssociacoes] = useState<RefeicaoProduto[]>([]);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<any>({});
  const [salvando, setSalvando] = useState(false);
  const [openExcluir, setOpenExcluir] = useState(false);
  const [dialogAdicionarOpen, setDialogAdicionarOpen] = useState(false);
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<RefeicaoProduto | null>(null);
  const [tabAtiva, setTabAtiva] = useState(0); // 0 = Ingredientes, 1 = Ficha Técnica
  
  // Hooks para cálculos dinâmicos
  const { data: valoresNutricionais, isLoading: loadingNutricional, error: errorNutricional } = useValoresNutricionais(
    Number(id),
    refeicao?.rendimento_porcoes || form.rendimento_porcoes,
    tabAtiva === 1 && !!refeicao, // Só buscar quando estiver na aba Ficha Técnica
    modalidadeSelecionada // Passar modalidade selecionada
  );
  
  const { data: custoData, isLoading: loadingCusto, error: errorCusto } = useCustoRefeicao(
    Number(id),
    refeicao?.rendimento_porcoes || form.rendimento_porcoes,
    tabAtiva === 1 && !!refeicao, // Só buscar quando estiver na aba Ficha Técnica
    modalidadeSelecionada // Passar modalidade selecionada
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

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const ref = await buscarRefeicao(Number(id));
        if (!ref) {
          toast.error('Erro', 'Refeição não encontrada');
          navigate('/refeicoes');
          return;
        }
        setRefeicao(ref);
        setForm(ref);
        setPageTitle(ref.nome); // Define o título da página
        const [produtosData, associacoesData, modalidadesData] = await Promise.all([
          listarProdutos(),
          listarProdutosDaRefeicao(Number(id)),
          listarModalidades(),
        ]);
        setProdutos(produtosData);
        setAssociacoes(associacoesData);
        const ativas = modalidadesData.filter(m => m.ativo);
        setModalidades(ativas);
        // Selecionar primeira modalidade por padrão
        if (ativas.length > 0) {
          setModalidadeSelecionada(ativas[0].id);
        }
      } catch (error) {
        console.error("Erro ao buscar refeição:", error);
        toast.error('Erro ao carregar', 'Não foi possível carregar a refeição. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, setPageTitle]);

  const produtosDisponiveis = produtos.filter(
    (produto) => !associacoes.some((assoc) => assoc.produto_id === produto.id)
  );

  async function salvarEdicao() {
    setSalvando(true);
    try {
      const atualizado = await editarRefeicao(Number(id), form);
      setRefeicao(atualizado);
      setEditando(false);
      toast.success('Sucesso!', 'Refeição atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['refeicoes'] });
    } catch {
      toast.error('Erro ao salvar', 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRefeicao() {
    try {
      await deletarRefeicao(Number(id));
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
      await adicionarProdutoNaRefeicao(
        Number(id),
        produtoId,
        perCapitaGeral || 0,
        tipoMedida,
        perCapitaPorModalidade
      );
      const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
      setAssociacoes(novasAssociacoes);
      // Invalidar queries de cálculos para recalcular
      queryClient.invalidateQueries({ queryKey: ['valores-nutricionais', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['custo-refeicao', Number(id)] });
      toast.success('Sucesso!', 'Produto adicionado à refeição!');
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast.error('Erro ao adicionar', 'Não foi possível adicionar o produto.');
    }
  }

  async function removerProduto(assocId: number) {
    try {
      await removerProdutoDaRefeicao(assocId);
      const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
      setAssociacoes(novasAssociacoes);
      // Invalidar queries de cálculos para recalcular
      queryClient.invalidateQueries({ queryKey: ['valores-nutricionais', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['custo-refeicao', Number(id)] });
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
      // Atualizar produto com novo per capita e tipo de medida
      await editarProdutoNaRefeicao(
        produtoEditando.id,
        perCapitaGeral || 0,
        tipoMedida,
        perCapitaPorModalidade
      );
      
      const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
      setAssociacoes(novasAssociacoes);
      
      // Invalidar queries de cálculos para recalcular
      queryClient.invalidateQueries({ queryKey: ['valores-nutricionais', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['custo-refeicao', Number(id)] });
      
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
      console.log('🔍 Iniciando geração de PDF para refeição:', id);
      
      // Importar módulos necessários
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default as any;
      (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts;

      // Buscar ingredientes detalhados com composição nutricional
      console.log('📡 Buscando ingredientes detalhados...');
      const { buscarIngredientesDetalhados } = await import('../services/refeicaoIngredientes');
      const ingredientesDetalhados = await buscarIngredientesDetalhados(Number(id), modalidadeSelecionada);
      
      console.log('✅ Ingredientes recebidos:', ingredientesDetalhados.ingredientes.length);
      if (ingredientesDetalhados.ingredientes.length === 0) {
        console.warn('⚠️ Nenhum ingrediente encontrado para a refeição');
      }

      // Adicionar informação da modalidade no título se estiver filtrado
      const modalidadeNome = modalidadeSelecionada 
        ? modalidades.find(m => m.id === modalidadeSelecionada)?.nome 
        : null;

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [30, 40, 30, 40],
        content: [
          {
            text: 'FICHA TÉCNICA DE PREPARAÇÃO',
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },
          {
            text: refeicao.nome,
            style: 'title',
            alignment: 'center',
            margin: [0, 0, 0, 10]
          },
          ...(modalidadeNome ? [{
            text: `Modalidade: ${modalidadeNome}`,
            style: 'subtitle',
            alignment: 'center',
            margin: [0, 0, 0, 10]
          }] : []),
          ...(refeicao.descricao ? [{
            text: refeicao.descricao,
            style: 'description',
            alignment: 'center',
            margin: [0, 0, 0, 20]
          }] : []),
          
          // Informações Gerais
          {
            text: 'INFORMAÇÕES GERAIS',
            style: 'sectionHeader',
            margin: [0, 10, 0, 10]
          },
          {
            columns: [
              { text: 'Categoria:', bold: true, width: 100 },
              { text: refeicao.categoria || '-', width: '*' }
            ],
            margin: [0, 0, 0, 5]
          },
          {
            columns: [
              { text: 'Tempo de Preparo:', bold: true, width: 100 },
              { text: refeicao.tempo_preparo_minutos ? `${refeicao.tempo_preparo_minutos} minutos` : '-', width: '*' }
            ],
            margin: [0, 0, 0, 5]
          },
          {
            columns: [
              { text: 'Rendimento:', bold: true, width: 100 },
              { text: refeicao.rendimento_porcoes ? `${refeicao.rendimento_porcoes} porções` : '-', width: '*' }
            ],
            margin: [0, 0, 0, 15]
          },

          // Ingredientes com Composição Nutricional Detalhada
          {
            text: 'INGREDIENTES E COMPOSIÇÃO NUTRICIONAL',
            style: 'sectionHeader',
            margin: [0, 5, 0, 5],
            fontSize: 9
          },
          {
            table: {
              headerRows: 1,
              widths: [70, 22, 22, 15, 25, 25, 25, 25, 25, 25, 25, 25],
              body: [
                [
                  { text: 'Produto', style: 'tableHeader', fontSize: 6 },
                  { text: 'Líq.', style: 'tableHeader', alignment: 'center', fontSize: 6 },
                  { text: 'Bruto', style: 'tableHeader', alignment: 'center', fontSize: 6 },
                  { text: 'Un', style: 'tableHeader', alignment: 'center', fontSize: 6 },
                  { text: 'Prot.\n(g)', style: 'tableHeader', alignment: 'center', fontSize: 6 },
                  { text: 'Lip.\n(g)', style: 'tableHeader', alignment: 'center', fontSize: 6 },
                  { text: 'Carb.\n(g)', style: 'tableHeader', alignment: 'center', fontSize: 6 },
                  { text: 'Cálcio\n(mg)', style: 'tableHeader', alignment: 'center', fontSize: 6 },
                  { text: 'Ferro\n(mg)', style: 'tableHeader', alignment: 'center', fontSize: 6 },
                  { text: 'Vit A\n(mcg)', style: 'tableHeader', alignment: 'center', fontSize: 6 },
                  { text: 'Vit C\n(mg)', style: 'tableHeader', alignment: 'center', fontSize: 6 },
                  { text: 'Sódio\n(mg)', style: 'tableHeader', alignment: 'center', fontSize: 6 }
                ],
                ...ingredientesDetalhados.ingredientes.map(ing => [
                  { text: ing.produto_nome, fontSize: 7 },
                  { text: toNum(ing.per_capita).toFixed(1), alignment: 'center', fontSize: 7, color: '#1976d2' },
                  { text: toNum(ing.per_capita_bruto ?? ing.per_capita).toFixed(1), alignment: 'center', fontSize: 7 },
                  { text: ing.tipo_medida === 'gramas' ? 'g' : 'un', alignment: 'center', fontSize: 7 },
                  { text: toNum(ing.proteinas_porcao) > 0 ? toNum(ing.proteinas_porcao).toFixed(1) : '-', alignment: 'center', fontSize: 7 },
                  { text: toNum(ing.lipidios_porcao) > 0 ? toNum(ing.lipidios_porcao).toFixed(1) : '-', alignment: 'center', fontSize: 7 },
                  { text: toNum(ing.carboidratos_porcao) > 0 ? toNum(ing.carboidratos_porcao).toFixed(1) : '-', alignment: 'center', fontSize: 7 },
                  { text: toNum(ing.calcio_porcao) > 0 ? toNum(ing.calcio_porcao).toFixed(1) : '-', alignment: 'center', fontSize: 7 },
                  { text: toNum(ing.ferro_porcao) > 0 ? toNum(ing.ferro_porcao).toFixed(1) : '-', alignment: 'center', fontSize: 7 },
                  { text: toNum(ing.vitamina_a_porcao) > 0 ? toNum(ing.vitamina_a_porcao).toFixed(1) : '-', alignment: 'center', fontSize: 7 },
                  { text: toNum(ing.vitamina_c_porcao) > 0 ? toNum(ing.vitamina_c_porcao).toFixed(1) : '-', alignment: 'center', fontSize: 7 },
                  { text: toNum(ing.sodio_porcao) > 0 ? toNum(ing.sodio_porcao).toFixed(1) : '-', alignment: 'center', fontSize: 7 }
                ])
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 8]
          },

          // Informação Nutricional Total (se houver dados calculados)
          ...(valoresNutricionais && refeicao.rendimento_porcoes ? [
            {
              text: 'VALORES NUTRICIONAIS TOTAIS (por porção)',
              style: 'sectionHeader',
              margin: [0, 5, 0, 5],
              fontSize: 9
            },
            {
              columns: [
                [
                  { text: 'Proteínas:', bold: true, fontSize: 8 },
                  { text: `${toNum(valoresNutricionais.por_porcao.proteinas).toFixed(1)}g`, margin: [0, 0, 0, 5], fontSize: 8 }
                ],
                [
                  { text: 'Lipídios:', bold: true, fontSize: 8 },
                  { text: `${toNum(valoresNutricionais.por_porcao.lipidios).toFixed(1)}g`, margin: [0, 0, 0, 5], fontSize: 8 }
                ],
                [
                  { text: 'Carboidratos:', bold: true, fontSize: 8 },
                  { text: `${toNum(valoresNutricionais.por_porcao.carboidratos).toFixed(1)}g`, margin: [0, 0, 0, 5], fontSize: 8 }
                ],
                [
                  { text: 'Cálcio:', bold: true, fontSize: 8 },
                  { text: `${toNum(valoresNutricionais.por_porcao.calcio).toFixed(1)}mg`, margin: [0, 0, 0, 5], fontSize: 8 }
                ]
              ],
              margin: [0, 0, 0, 5]
            },
            {
              columns: [
                [
                  { text: 'Ferro:', bold: true, fontSize: 8 },
                  { text: `${toNum(valoresNutricionais.por_porcao.ferro).toFixed(1)}mg`, margin: [0, 0, 0, 5], fontSize: 8 }
                ],
                [
                  { text: 'Vitamina A:', bold: true, fontSize: 8 },
                  { text: `${toNum(valoresNutricionais.por_porcao.vitamina_a).toFixed(1)}mcg`, margin: [0, 0, 0, 5], fontSize: 8 }
                ],
                [
                  { text: 'Vitamina C:', bold: true, fontSize: 8 },
                  { text: `${toNum(valoresNutricionais.por_porcao.vitamina_c).toFixed(1)}mg`, margin: [0, 0, 0, 5], fontSize: 8 }
                ],
                [
                  { text: 'Sódio:', bold: true, fontSize: 8 },
                  { text: `${toNum(valoresNutricionais.por_porcao.sodio).toFixed(1)}mg`, margin: [0, 0, 0, 5], fontSize: 8 }
                ]
              ],
              margin: [0, 0, 0, 8]
            }
          ] : []),

          // Custo (se houver)
          ...(custoData && refeicao.rendimento_porcoes ? [
            {
              text: 'CUSTO ESTIMADO',
              style: 'sectionHeader',
              margin: [0, 5, 0, 5],
              fontSize: 9
            },
            {
              columns: [
                { text: 'Custo Total:', bold: true, width: 100, fontSize: 8 },
                { text: `R$ ${toNum(custoData.custo_total).toFixed(2)}`, width: '*', fontSize: 8 }
              ],
              margin: [0, 0, 0, 3]
            },
            {
              columns: [
                { text: 'Custo por Porção:', bold: true, width: 100, fontSize: 8 },
                { text: `R$ ${toNum(custoData.custo_por_porcao).toFixed(2)}`, width: '*', fontSize: 8 }
              ],
              margin: [0, 0, 0, 8]
            }
          ] : [])
        ],
        styles: {
          header: {
            fontSize: 16,
            bold: true,
            color: '#1976d2'
          },
          title: {
            fontSize: 14,
            bold: true
          },
          subtitle: {
            fontSize: 11,
            bold: true,
            color: '#059669'
          },
          description: {
            fontSize: 10,
            italics: true,
            color: '#666'
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
            color: '#1976d2',
            decoration: 'underline'
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'white',
            fillColor: '#1976d2'
          }
        },
        defaultStyle: {
          fontSize: 10
        }
      };

      pdfMake.createPdf(docDefinition).download(`ficha-tecnica-${refeicao.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      console.log('✅ PDF gerado com sucesso!');
      toast.success('PDF gerado!', 'Ficha técnica exportada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao gerar PDF:', error);
      console.error('Stack trace:', error.stack);
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

        {/* Botões de Ação */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1.5, mt: 1.5 }}>
            {editando ? (
              <>
                <Button
                  onClick={() => setEditando(false)}
                  startIcon={<CancelIcon />}
                  size="small"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={salvarEdicao}
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={salvando}
                  size="small"
                >
                  Salvar
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={gerarPDF}
                  variant="outlined"
                  startIcon={<PdfIcon />}
                  size="small"
                  sx={{ borderColor: '#d32f2f', color: '#d32f2f', '&:hover': { borderColor: '#b71c1c', bgcolor: '#ffebee' } }}
                >
                  Exportar PDF
                </Button>
                <Button
                  onClick={() => setEditando(true)}
                  variant="outlined"
                  startIcon={<EditIcon />}
                  size="small"
                >
                  Editar
                </Button>
                <Button
                  onClick={() => setOpenExcluir(true)}
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  size="small"
                >
                  Excluir
                </Button>
              </>
            )}
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabAtiva} onChange={(e, newValue) => setTabAtiva(newValue)}>
            <Tab label="Ingredientes" icon={<RestaurantIcon />} iconPosition="start" />
            <Tab label="Ficha Técnica" icon={<DescriptionIcon />} iconPosition="start" />
          </Tabs>
        </Box>
      </Box>

      {/* Conteúdo das Tabs */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 2, py: 1.5 }}>

        {/* Tab 0: Ingredientes */}
        {tabAtiva === 0 && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                      <>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Proteínas</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {toNum(valoresNutricionais.por_porcao.proteinas).toFixed(1)}g
                          </Typography>
                        </Grid>

                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Lipídios</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {toNum(valoresNutricionais.por_porcao.lipidios).toFixed(1)}g
                          </Typography>
                        </Grid>

                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Carboidratos</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {toNum(valoresNutricionais.por_porcao.carboidratos).toFixed(1)}g
                          </Typography>
                        </Grid>

                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Cálcio</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {toNum(valoresNutricionais.por_porcao.calcio).toFixed(1)}mg
                          </Typography>
                        </Grid>

                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Ferro</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {toNum(valoresNutricionais.por_porcao.ferro).toFixed(1)}mg
                          </Typography>
                        </Grid>

                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Retinol (Vit. A)</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {toNum(valoresNutricionais.por_porcao.vitamina_a).toFixed(1)}mcg
                          </Typography>
                        </Grid>

                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Vitamina C</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {toNum(valoresNutricionais.por_porcao.vitamina_c).toFixed(1)}mg
                          </Typography>
                        </Grid>

                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Sódio</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {toNum(valoresNutricionais.por_porcao.sodio).toFixed(1)}mg
                          </Typography>
                        </Grid>

                        {valoresNutricionais.alertas && valoresNutricionais.alertas.length > 0 && (
                          <Grid item xs={12}>
                            <Box sx={{ bgcolor: '#fff3cd', p: 1.5, borderRadius: 1, border: '1px solid #ffc107' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Alertas Nutricionais:</Typography>
                              {valoresNutricionais.alertas.map((alerta, idx) => (
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
        <Button onClick={excluirRefeicao} color="error" variant="contained">
          Excluir
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
