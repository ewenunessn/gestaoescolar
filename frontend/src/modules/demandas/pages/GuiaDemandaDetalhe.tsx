import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Typography, IconButton, Chip, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, 
  LinearProgress, TextField, Tooltip, CircularProgress, Table, TableBody,
  TableCell, TableHead, TableRow, Checkbox,
} from "@mui/material";
import {
  Clear as ClearIcon, Edit as EditIcon,
  School as SchoolIcon, Add as AddIcon,
  Inventory as InventoryIcon, Visibility as VisibilityIcon, Tune as TuneIcon,
  ShoppingCart as ShoppingCartIcon, Delete as DeleteIcon, CheckBox as CheckBoxIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { ColumnDef } from "@tanstack/react-table";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";
import { DataTableAdvanced } from "../../../components/DataTableAdvanced";
import GerarPedidoDaGuiaDialog from "../../../components/GerarPedidoDaGuiaDialog";
import ViewTabs from "../../../components/ViewTabs";
import UnidadeMedidaSelect from "../../../components/UnidadeMedidaSelect";
import { guiaService } from "../../../services/guiaService";
import { produtoService } from "../../../services/produtoService";
import { useToast } from "../../../hooks/useToast";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import { useUnidadesMedida } from "../../../hooks/queries/useUnidadesMedidaQueries";
import api from "../../../services/api";
import { formatarQuantidade } from "../../../utils/formatters";
import { PerformanceMonitor } from "../../../utils/performanceMonitor";

interface EscolaGuia {
  id: number;
  nome: string;
  escola_rota?: string;
  total_itens: number;
  qtd_pendente: number;
  qtd_programada: number;
  qtd_parcial: number;
  qtd_entregue: number;
  qtd_cancelado: number;
}

interface ItemGuia {
  id: number;
  produto_id: number;
  produto_nome: string;
  escola_id: number;
  escola_nome: string;
  quantidade: number;
  quantidade_demanda?: number;
  unidade: string;
  status: string;
  data_entrega?: string;
}

const GuiaDemandaDetalhe: React.FC = () => {
  const navigate = useNavigate();
  const { guiaId } = useParams<{ guiaId: string }>();
  const toast = useToast();
  const { setPageTitle, setBackPath } = usePageTitle();

  const [guia, setGuia] = useState<any>(null);
  const [escolas, setEscolas] = useState<EscolaGuia[]>([]);
  const [itens, setItens] = useState<ItemGuia[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabAtiva, setTabAtiva] = useState(0);
  
  // Lazy loading states for each tab
  const [tabDataLoaded, setTabDataLoaded] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false });

  // Dialog: quantidades por escola de um produto
  const [dialogEscolasOpen, setDialogEscolasOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<{ id: number; nome: string; data_entrega: string | null } | null>(null);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
  const [excluindoItens, setExcluindoItens] = useState(false);
  
  // Dialog de edição
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState<ItemGuia | null>(null);
  const [formEditar, setFormEditar] = useState({ unidadeCodigo: '', data_entrega: '' });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  
  // Buscar unidades de medida
  const { data: unidadesMedida } = useUnidadesMedida();

  // Derivar o ID da unidade a partir do código — reage automaticamente quando unidadesMedida carrega
  const unidadeIdSelecionada = useMemo(() => {
    if (!unidadesMedida || !formEditar.unidadeCodigo) return null;
    const codigo = formEditar.unidadeCodigo.toUpperCase().trim();
    // Tenta match por código exato, depois por nome
    return (
      unidadesMedida.find(u => u.codigo.toUpperCase() === codigo)?.id ??
      unidadesMedida.find(u => u.nome.toUpperCase() === codigo)?.id ??
      null
    );
  }, [unidadesMedida, formEditar.unidadeCodigo]);

  // Dialog de edição em lote (todas as escolas de um produto)
  const [dialogEditarProdutoOpen, setDialogEditarProdutoOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<any | null>(null);
  const [formEditarProduto, setFormEditarProduto] = useState({ unidadeCodigo: '', data_entrega: '' });
  const [salvandoEdicaoProduto, setSalvandoEdicaoProduto] = useState(false);

  const unidadeIdProdutoSelecionada = useMemo(() => {
    if (!unidadesMedida || !formEditarProduto.unidadeCodigo) return null;
    const codigo = formEditarProduto.unidadeCodigo.toUpperCase().trim();
    return (
      unidadesMedida.find(u => u.codigo.toUpperCase() === codigo)?.id ??
      unidadesMedida.find(u => u.nome.toUpperCase() === codigo)?.id ??
      null
    );
  }, [unidadesMedida, formEditarProduto.unidadeCodigo]);

  // Dialog: itens de uma escola
  const [dialogItensEscolaOpen, setDialogItensEscolaOpen] = useState(false);
  const [escolaSelecionada, setEscolaSelecionada] = useState<EscolaGuia | null>(null);

  // Modal adicionar em lote
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [batchForm, setBatchForm] = useState({ produtoId: '', unidade: '', data_entrega: new Date().toISOString().split('T')[0] });
  const [batchQuantidades, setBatchQuantidades] = useState<Record<number, string>>({});
  const [batchStatus, setBatchStatus] = useState<Record<number, string>>({});
  const [batchSaving, setBatchSaving] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);

  // Dialog gerar pedido
  const [dialogGerarPedido, setDialogGerarPedido] = useState(false);

  // Colunas para aba de produtos
  const produtosColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'produto_nome',
      header: 'Produto',
      size: 300,
      enableSorting: true,
    },
    {
      accessorKey: 'data_entrega',
      header: 'Data',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => {
        const data = getValue() as string | null;
        return data 
          ? new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')
          : '—';
      },
    },
    {
      accessorKey: 'unidade',
      header: 'Unidade',
      size: 80,
      enableSorting: true,
    },
    {
      accessorKey: 'total',
      header: 'Qtd. Ajustada',
      size: 120,
      enableSorting: true,
      cell: ({ row }) => {
        const produto = row.original;
        const diff = produto.total - produto.total_demanda;
        const hasAjuste = Math.abs(diff) > 0.0005;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
            {hasAjuste && (
              <Chip
                label={`${diff > 0 ? '+' : ''}${formatarQuantidade(diff)}`}
                size="small"
                color={diff > 0 ? 'success' : 'error'}
                sx={{ height: 14, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }}
              />
            )}
            <Box sx={{ minWidth: 60, textAlign: 'right' }}>{formatarQuantidade(produto.total)}</Box>
          </Box>
        );
      },
    },
    {
      accessorKey: 'total_demanda',
      header: 'Qtd. Demanda',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Box sx={{ color: 'text.secondary', fontSize: '0.8rem', textAlign: 'right' }}>
          {formatarQuantidade(getValue() as number)}
        </Box>
      ),
    },
    {
      accessorKey: 'escolas',
      header: 'Escolas',
      size: 80,
      enableSorting: false,
      cell: ({ getValue }) => (
        <Chip label={(getValue() as any[]).length} size="small" color="primary" />
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Ver quantidades por escola">
            <IconButton 
              size="small" 
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                const produto = row.original;
                setProdutoSelecionado({ 
                  id: produto.produto_id, 
                  nome: produto.produto_nome, 
                  data_entrega: produto.data_entrega 
                });
                setDialogEscolasOpen(true);
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar unidade e data em todas as escolas">
            <IconButton 
              size="small" 
              color="default"
              onClick={(e) => {
                e.stopPropagation();
                const produto = row.original;
                handleAbrirEditarProduto(produto);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir de todas as escolas">
            <IconButton 
              size="small" 
              color="error"
              onClick={async (e) => {
                e.stopPropagation();
                const produto = row.original;
                if (window.confirm(`Deseja realmente excluir "${produto.produto_nome}" de todas as escolas?`)) {
                  try {
                    setLoading(true);
                    
                    // Debug: mostrar informações do produto
                    console.log('🔍 Produto selecionado:', produto);
                    console.log('🔍 Total de itens disponíveis:', itens.length);
                    
                    // Normalizar data do produto (pode ser null, string vazia ou string de data)
                    const dataProdutoNormalizada = produto.data_entrega && produto.data_entrega !== '' ? produto.data_entrega : null;
                    
                    // Excluir todos os itens deste produto (considerando data_entrega)
                    const itensParaExcluir = itens.filter(i => {
                      if (i.produto_id !== produto.produto_id) return false;
                      
                      // Normalizar data do item
                      const dataItemNormalizada = i.data_entrega ? String(i.data_entrega).split('T')[0] : null;
                      
                      // Se ambos são null/vazio, match
                      if (dataProdutoNormalizada === null && dataItemNormalizada === null) return true;
                      // Se um é null e outro não, não match
                      if (dataProdutoNormalizada === null || dataItemNormalizada === null) return false;
                      // Comparar as strings de data
                      return dataItemNormalizada === dataProdutoNormalizada;
                    });
                    
                    console.log('🔍 Itens para excluir:', itensParaExcluir.length, itensParaExcluir);
                    
                    if (itensParaExcluir.length === 0) {
                      toast.warning('Nenhum item encontrado para excluir');
                      return;
                    }
                    
                    await Promise.all(
                      itensParaExcluir.map(item => 
                        api.delete(`/guias/itens/${item.id}`)
                      )
                    );
                    
                    toast.success(`Produto excluído de ${itensParaExcluir.length} escola(s)`);
                    loadGuiaDetalhes();
                  } catch (error) {
                    console.error('Erro ao excluir produto:', error);
                    toast.error('Erro ao excluir produto');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], []);

  // Colunas para aba de escolas
  const escolasColumns = useMemo<ColumnDef<EscolaGuia>[]>(() => [
    {
      accessorKey: 'nome',
      header: 'Escola',
      size: 300,
      enableSorting: true,
    },
    {
      accessorKey: 'total_itens',
      header: 'Total Itens',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => <Chip label={getValue() as number} size="small" />,
    },
    {
      accessorKey: 'qtd_pendente',
      header: 'Disponível p/ Entrega',
      size: 140,
      enableSorting: true,
      cell: ({ getValue }) => <Chip label={Number(getValue()) || 0} size="small" color="warning" />,
    },
    {
      accessorKey: 'qtd_programada',
      header: 'Aguardando Estoque',
      size: 140,
      enableSorting: true,
      cell: ({ getValue }) => <Chip label={Number(getValue()) || 0} size="small" color="info" />,
    },
    {
      accessorKey: 'qtd_entregue',
      header: 'Já Entregues',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => <Chip label={Number(getValue()) || 0} size="small" color="success" />,
    },
    {
      id: 'actions',
      header: 'Ações',
      size: 120,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Ver itens desta escola">
            <IconButton 
              size="small" 
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                setEscolaSelecionada(row.original);
                setDialogItensEscolaOpen(true);
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Gerenciar itens">
            <IconButton 
              size="small" 
              color="default"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/guias-demanda/${guiaId}/escola/${row.original.id}`);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [navigate, guiaId]);

  useEffect(() => {
    if (guiaId) { 
      loadGuiaDetalhes(); 
      loadProdutos(); 
      // Mark first tab as loaded
      setTabDataLoaded(prev => ({ ...prev, 0: true }));
    }
  }, [guiaId]);

  // Lazy load tab data when switching tabs
  useEffect(() => {
    if (!tabDataLoaded[tabAtiva] && guia) {
      loadTabData(tabAtiva);
    }
  }, [tabAtiva, guia, tabDataLoaded]);

  const loadTabData = async (tabIndex: number) => {
    if (tabDataLoaded[tabIndex]) return;
    
    try {
      setLoading(true);
      // Tab data is already loaded in loadGuiaDetalhes, just mark as loaded
      setTabDataLoaded(prev => ({ ...prev, [tabIndex]: true }));
    } catch (error) {
      console.error(`Erro ao carregar dados da aba ${tabIndex}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setBackPath('/guias-demanda');
    return () => {
      setBackPath(null);
    };
  }, [setBackPath]);

  useEffect(() => {
    if (guia) {
      setPageTitle(`Guia de Demanda - ${getMesNome(guia.mes)}/${guia.ano}`);
    } else {
      setPageTitle('Guia de Demanda');
    }
  }, [guia, setPageTitle]);

  const loadProdutos = async () => {
    try {
      setProdutos(await produtoService.listar());
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadGuiaDetalhes = async () => {
    try {
      setLoading(true);
      
      const guiaData = await PerformanceMonitor.measureAsync('Buscar Guia', () =>
        guiaService.buscarGuia(Number(guiaId))
      );
      setGuia(guiaData);
      
      if (guiaData?.mes && guiaData?.ano) {
        const [escolasData, itensData] = await Promise.all([
          PerformanceMonitor.measureAsync('Listar Status Escolas', () =>
            guiaService.listarStatusEscolas(guiaData.mes, guiaData.ano, Number(guiaId))
          ),
          PerformanceMonitor.measureAsync('Listar Produtos Guia', () =>
            guiaService.listarProdutosGuia(Number(guiaId))
          ),
        ]);
        
        setEscolas(escolasData);
        const raw = itensData?.data ?? itensData ?? [];
        setItens(raw);
        
        PerformanceMonitor.logMemoryUsage('Após carregar dados');
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes da guia:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMesNome = (mes: number) => {
    const m = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return m[mes - 1];
  };

  const statusColor = (s: string): any => ({ pendente: 'warning', programada: 'info', parcial: 'warning', entregue: 'success', cancelado: 'error' }[s] || 'default');

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      'pendente': 'Disponível p/ Entrega',
      'programada': 'Aguardando Estoque',
      'parcial': 'Entrega Parcial',
      'entregue': 'Já Entregue',
      'cancelado': 'Cancelado'
    };
    return statusLabels[status] || status;
  };

  // ── Aba Produtos: agrupar itens por (produto_id, data_entrega) ──────────────
  const produtosAgrupados = useMemo(() => {
    if (!itens.length) return [];
    
    return PerformanceMonitor.measure('Processar Produtos Agrupados', () => {
      const map = new Map<string, { produto_id: number; produto_nome: string; unidade: string; data_entrega: string | null; total: number; total_demanda: number; escolas: ItemGuia[] }>();
      
      for (const item of itens) {
        const dataKey = item.data_entrega ? String(item.data_entrega).split('T')[0] : '';
        const key = `${item.produto_id}__${dataKey}`;
        
        if (!map.has(key)) {
          map.set(key, { 
            produto_id: item.produto_id, 
            produto_nome: item.produto_nome, 
            unidade: item.unidade, 
            data_entrega: dataKey || null, 
            total: 0, 
            total_demanda: 0, 
            escolas: [] 
          });
        }
        
        const g = map.get(key)!;
        g.total += Number(item.quantidade) || 0;
        g.total_demanda += Number(item.quantidade_demanda ?? item.quantidade) || 0;
        g.escolas.push(item);
      }
      
      const result = Array.from(map.values()).sort((a, b) => {
        if (a.produto_nome < b.produto_nome) return -1;
        if (a.produto_nome > b.produto_nome) return 1;
        return (a.data_entrega ?? '').localeCompare(b.data_entrega ?? '');
      });
      
      console.log(`📊 ${result.length} produtos agrupados de ${itens.length} itens`);
      return result;
    });
  }, [itens]);

  // ── Aba Escolas ──────────────────────────────────────────────────────────
  const escolasComItens = useMemo(() => {
    if (!escolas.length || !itens.length) return [];
    
    return PerformanceMonitor.measure('Processar Escolas com Itens', () => {
      const result = escolas.filter(e => {
        const total = (Number(e.qtd_pendente)||0)+(Number(e.qtd_programada)||0)+(Number(e.qtd_parcial)||0)+(Number(e.qtd_entregue)||0)+(Number(e.qtd_cancelado)||0);
        return total > 0;
      }).map(escola => {
        // Calcular total_itens baseado nos itens reais desta escola
        const itensEscola = itens.filter(item => item.escola_id === escola.id);
        return {
          ...escola,
          total_itens: itensEscola.length
        };
      });
      
      console.log(`📊 ${result.length} escolas processadas de ${escolas.length} total`);
      return result;
    });
  }, [escolas, itens]);

  // Itens da escola selecionada no dialog
  const itensEscolaSelecionada = useMemo(() => {
    if (!escolaSelecionada) return [];
    return itens.filter(i => i.escola_id === escolaSelecionada.id);
  }, [itens, escolaSelecionada]);

  // Escolas do produto selecionado no dialog — filtra por produto_id E data_entrega
  const escolasDoProduto = useMemo(() => {
    if (!produtoSelecionado) return [];
    return itens.filter(i => {
      if (i.produto_id !== produtoSelecionado.id) return false;
      if (produtoSelecionado.data_entrega === null) return !i.data_entrega;
      const dataItem = i.data_entrega ? String(i.data_entrega).split('T')[0] : null;
      return dataItem === produtoSelecionado.data_entrega;
    });
  }, [itens, produtoSelecionado]);

  const handleToggleSelecao = (itemId: number) => {
    const novoSet = new Set(itensSelecionados);
    if (novoSet.has(itemId)) {
      novoSet.delete(itemId);
    } else {
      novoSet.add(itemId);
    }
    setItensSelecionados(novoSet);
  };

  const handleSelecionarTodos = () => {
    if (itensSelecionados.size === escolasDoProduto.length) {
      setItensSelecionados(new Set());
    } else {
      setItensSelecionados(new Set(escolasDoProduto.map(i => i.id)));
    }
  };

  const handleExcluirSelecionados = async () => {
    if (itensSelecionados.size === 0) return;
    
    if (!window.confirm(`Deseja realmente excluir ${itensSelecionados.size} item(ns) selecionado(s)?`)) {
      return;
    }

    try {
      setExcluindoItens(true);
      const itensParaExcluir = escolasDoProduto.filter(i => itensSelecionados.has(i.id));
      
      await Promise.all(
        itensParaExcluir.map(item => 
          api.delete(`/guias/itens/${item.id}`)
        )
      );
      
      toast.success(`${itensSelecionados.size} item(ns) excluído(s) com sucesso`);
      setItensSelecionados(new Set());
      setModoSelecao(false);
      setDialogEscolasOpen(false);
      loadGuiaDetalhes();
    } catch (error) {
      console.error('Erro ao excluir itens:', error);
      toast.error('Erro ao excluir itens selecionados');
    } finally {
      setExcluindoItens(false);
    }
  };

  const handleExcluirIndividual = async (item: ItemGuia) => {
    if (!window.confirm(`Deseja realmente excluir "${item.produto_nome}" da escola "${item.escola_nome}"?`)) {
      return;
    }

    try {
      setExcluindoItens(true);
      await api.delete(`/guias/itens/${item.id}`);
      toast.success('Item excluído com sucesso');
      loadGuiaDetalhes();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error('Erro ao excluir item');
    } finally {
      setExcluindoItens(false);
    }
  };

  const handleAbrirEditar = (item: ItemGuia) => {
    setItemEditando(item);
    setFormEditar({
      unidadeCodigo: item.unidade,
      data_entrega: item.data_entrega ? String(item.data_entrega).split('T')[0] : ''
    });
    setDialogEditarOpen(true);
  };

  const handleSalvarEdicao = async () => {
    if (!itemEditando || !unidadeIdSelecionada) return;

    try {
      setSalvandoEdicao(true);
      const unidade = unidadesMedida?.find(u => u.id === unidadeIdSelecionada);
      await api.put(`/guias/escola/produtos/${itemEditando.id}`, {
        unidade: unidade?.codigo ?? formEditar.unidadeCodigo,
        data_entrega: formEditar.data_entrega
      });
      toast.success('Item atualizado com sucesso');
      setDialogEditarOpen(false);
      setItemEditando(null);
      loadGuiaDetalhes();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleFecharDialogEscolas = () => {
    setDialogEscolasOpen(false);
    setModoSelecao(false);
    setItensSelecionados(new Set());
  };

  const handleAbrirEditarProduto = (produto: any) => {
    setProdutoEditando(produto);
    setFormEditarProduto({
      unidadeCodigo: produto.unidade,
      data_entrega: produto.data_entrega ?? ''
    });
    setDialogEditarProdutoOpen(true);
  };

  const handleSalvarEdicaoProduto = async () => {
    if (!produtoEditando || !unidadeIdProdutoSelecionada) return;

    const unidade = unidadesMedida?.find(u => u.id === unidadeIdProdutoSelecionada);
    if (!unidade) return;

    const itensParaEditar = itens.filter(i => {
      if (i.produto_id !== produtoEditando.produto_id) return false;
      if (produtoEditando.data_entrega === null) return !i.data_entrega;
      const dataItem = i.data_entrega ? String(i.data_entrega).split('T')[0] : null;
      return dataItem === produtoEditando.data_entrega;
    });

    try {
      setSalvandoEdicaoProduto(true);
      await Promise.all(
        itensParaEditar.map(item =>
          api.put(`/guias/escola/produtos/${item.id}`, {
            unidade: unidade.codigo,
            data_entrega: formEditarProduto.data_entrega
          })
        )
      );
      toast.success(`${itensParaEditar.length} item(ns) atualizado(s) com sucesso`);
      setDialogEditarProdutoOpen(false);
      setProdutoEditando(null);
      loadGuiaDetalhes();
    } catch (error) {
      console.error('Erro ao atualizar itens:', error);
      toast.error('Erro ao atualizar itens');
    } finally {
      setSalvandoEdicaoProduto(false);
    }
  };

  // Matriz consolidada: escolas x produtos
  const matrizConsolidada = useMemo(() => {
    if (!itens.length || !escolasComItens.length) return { produtos: [], matriz: [] };
    
    return PerformanceMonitor.measure('Processar Matriz Consolidada', () => {
      // Obter lista única de produtos
      const produtosUnicos = Array.from(new Set(itens.map(i => i.produto_id)))
        .map(pid => {
          const item = itens.find(i => i.produto_id === pid);
          return { id: pid, nome: item?.produto_nome || '', unidade: item?.unidade || 'Kg' };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome));

      // Criar matriz
      const matriz = escolasComItens.map(escola => {
        const linha: any = { escola_id: escola.id, escola_nome: escola.nome };
        produtosUnicos.forEach(produto => {
          const item = itens.find(i => i.escola_id === escola.id && i.produto_id === produto.id);
          linha[`produto_${produto.id}`] = item ? Number(item.quantidade) : 0;
        });
        return linha;
      });

      console.log(`📊 Matriz ${escolasComItens.length}x${produtosUnicos.length} processada`);
      return { produtos: produtosUnicos, matriz };
    });
  }, [itens, escolasComItens]);

  // Colunas para aba consolidada
  const consolidadaColumns = useMemo<ColumnDef<any>[]>(() => {
    if (matrizConsolidada.produtos.length === 0) return [];
    
    const columns: ColumnDef<any>[] = [
      {
        accessorKey: 'escola_nome',
        header: 'Escola',
        size: 350,
        enableSorting: true,
        cell: ({ row, table }) => {
          const index = table.getSortedRowModel().rows.findIndex(r => r.id === row.id);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 300 }}>
              <Chip 
                label={index + 1} 
                size="small" 
                sx={{ 
                  minWidth: 32, 
                  height: 24, 
                  fontWeight: 600,
                  bgcolor: 'primary.main',
                  color: 'white',
                  flexShrink: 0
                }} 
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1
                }}
              >
                {row.original.escola_nome}
              </Typography>
            </Box>
          );
        },
      },
    ];

    // Adicionar colunas para cada produto
    matrizConsolidada.produtos.forEach(produto => {
      columns.push({
        accessorKey: `produto_${produto.id}`,
        header: produto.nome,
        size: 120,
        enableSorting: true,
        cell: ({ getValue }) => {
          const quantidade = getValue() as number;
          return quantidade > 0 ? (
            <Chip 
              label={formatarQuantidade(quantidade)} 
              size="small" 
              color="primary"
              variant="outlined"
            />
          ) : (
            <Typography variant="body2" color="text.disabled">—</Typography>
          );
        },
      });
    });

    return columns;
  }, [matrizConsolidada]);

  // Toolbar actions para as tabelas
  const toolbarActions = (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button 
        variant="contained" 
        startIcon={<AddIcon />} 
        size="small"
        onClick={() => setOpenBatchDialog(true)}
        sx={{ bgcolor: '#000000', '&:hover': { bgcolor: '#333333' } }}
      >
        Adicionar para Múltiplas Escolas
      </Button>
      <Button 
        variant="contained" 
        startIcon={<ShoppingCartIcon />} 
        size="small"
        onClick={() => setDialogGerarPedido(true)}
        sx={{ bgcolor: '#1d4ed8', '&:hover': { bgcolor: '#1e40af' } }}
      >
        Gerar Pedido
      </Button>
    </Box>
  );

  // Right toolbar actions (próximo ao search)
  const rightToolbarActions = (
    <Button 
      variant="outlined" 
      startIcon={<TuneIcon />} 
      size="small"
      onClick={() => navigate(`/guias-demanda/${guiaId}/ajuste`)}
    >
      Ajustar
    </Button>
  );

  const handleBatchSubmit = async () => {
    if (!batchForm.produtoId || !batchForm.data_entrega || !guia) return;
    const payloads = escolas
      .map(e => ({ escola: e, quantidade: Number(batchQuantidades[e.id] || 0), status: batchStatus[e.id] || 'pendente' }))
      .filter(p => p.quantidade > 0);
    if (!payloads.length) return;
    try {
      setBatchSaving(true);
      for (const { escola, quantidade, status } of payloads) {
        await api.post(`/guias/escola/${escola.id}/produtos`, {
          produtoId: parseInt(batchForm.produtoId), quantidade,
          unidade: batchForm.unidade || 'Kg', data_entrega: batchForm.data_entrega,
          mes_competencia: guia.mes, ano_competencia: guia.ano, status,
        });
      }
      toast.success('Quantidades adicionadas com sucesso!');
      setOpenBatchDialog(false);
      setBatchQuantidades({}); setBatchStatus({});
      loadGuiaDetalhes();
    } catch (err) {
      console.error(err);
    } finally {
      setBatchSaving(false);
    }
  };

  // ── Resumo otimizado ─────────────────────────────────────────────────────
  const estatisticas = useMemo(() => {
    return PerformanceMonitor.measure('Calcular Estatísticas', () => {
      const stats = {
        totalItens: itens.length,
        totalEscolas: escolasComItens.length,
        totalEntregues: itens.filter(i => i.status === 'entregue').length,
        totalPendentes: itens.filter(i => i.status === 'pendente').length,
      };
      
      console.log('📊 Estatísticas:', stats);
      return stats;
    });
  }, [itens, escolasComItens]);

  // Early return AFTER all hooks are defined
  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

  if (!guia) {
    return (
      <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: 'background.default', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        {/* Seta + Breadcrumbs na mesma linha */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton size="small" onClick={() => navigate('/guias-demanda')} sx={{ mr: 0.5, p: 0.5 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <PageBreadcrumbs
            items={[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Guias de Demanda', path: '/guias-demanda' },
              { label: `${getMesNome(guia.mes)}/${guia.ano}` },
            ]}
          />
        </Box>

        <PageHeader
          title={`Guia de Demanda - ${getMesNome(guia.mes)}/${guia.ano}`}
        />

        {/* Abas e Estatísticas */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <ViewTabs
            value={tabAtiva}
            onChange={(v) => setTabAtiva(v)}
            tabs={[
              { value: 0, label: 'Por Produto', icon: <InventoryIcon sx={{ fontSize: 16 }} /> },
              { value: 1, label: 'Por Escola', icon: <SchoolIcon sx={{ fontSize: 16 }} /> },
              { value: 2, label: 'Consolidada', icon: <TuneIcon sx={{ fontSize: 16 }} /> },
            ]}
          />
          
          {/* Estatísticas discretas */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {[
              { label: 'Escolas', value: estatisticas.totalEscolas, color: 'text.secondary' },
              { label: 'Itens', value: estatisticas.totalItens, color: 'text.secondary' },
              { label: 'Entregues', value: estatisticas.totalEntregues, color: 'success.main' },
              { label: 'Pendentes', value: estatisticas.totalPendentes, color: 'warning.main' },
            ].map(c => (
              <Box key={c.label} sx={{ textAlign: 'center', minWidth: 60 }}>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', display: 'block' }}>
                  {c.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: c.color, fontSize: '0.9rem' }}>
                  {c.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Aba 0: Por Produto ── */}
        {tabAtiva === 0 && (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <DataTableAdvanced
              title="Por Produto"
              data={produtosAgrupados}
              columns={produtosColumns}
              loading={loading}
              searchPlaceholder="Buscar produto..."
              emptyMessage="Nenhum produto encontrado"
              toolbarActions={toolbarActions}
              rightToolbarActions={rightToolbarActions}
            />
          </Box>
        )}

        {/* ── Aba 1: Por Escola ── */}
        {tabAtiva === 1 && (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <DataTableAdvanced
              title="Por Escola"
              data={escolasComItens}
              columns={escolasColumns}
              loading={loading}
              searchPlaceholder="Buscar escola..."
              emptyMessage="Nenhuma escola com itens"
              toolbarActions={toolbarActions}
              rightToolbarActions={rightToolbarActions}
            />
          </Box>
        )}

        {/* ── Aba 2: Consolidada ── */}
        {tabAtiva === 2 && (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            {matrizConsolidada.produtos.length === 0 ? (
              <Box textAlign="center" py={8}>
                <TuneIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Nenhum dado para consolidar</Typography>
              </Box>
            ) : (
              <DataTableAdvanced
                title="Matriz Consolidada"
                data={matrizConsolidada.matriz}
                columns={consolidadaColumns}
                loading={loading}
                searchPlaceholder="Buscar escola..."
                emptyMessage="Nenhuma escola encontrada"
                toolbarActions={toolbarActions}
                rightToolbarActions={rightToolbarActions}
              />
            )}
          </Box>
        )}
      </PageContainer>

      {/* Dialog: quantidades por escola de um produto */}
      <Dialog open={dialogEscolasOpen} onClose={handleFecharDialogEscolas} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>{produtoSelecionado?.nome}</span>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                Quantidade por escola
                {produtoSelecionado?.data_entrega && ` · ${new Date(produtoSelecionado.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}`}
              </div>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {!modoSelecao ? (
                <Tooltip title="Ativar seleção múltipla">
                  <IconButton 
                    size="small" 
                    onClick={() => setModoSelecao(true)}
                    disabled={excluindoItens}
                  >
                    <CheckBoxIcon />
                  </IconButton>
                </Tooltip>
              ) : (
                <>
                  <Tooltip title="Cancelar seleção">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setModoSelecao(false);
                        setItensSelecionados(new Set());
                      }}
                      disabled={excluindoItens}
                    >
                      <ClearIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir selecionados">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={handleExcluirSelecionados}
                      disabled={itensSelecionados.size === 0 || excluindoItens}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {excluindoItens && <LinearProgress />}
          <Table size="small">
            <TableHead>
              <TableRow>
                {modoSelecao && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={itensSelecionados.size === escolasDoProduto.length && escolasDoProduto.length > 0}
                      indeterminate={itensSelecionados.size > 0 && itensSelecionados.size < escolasDoProduto.length}
                      onChange={handleSelecionarTodos}
                      disabled={excluindoItens}
                    />
                  </TableCell>
                )}
                <TableCell>Escola</TableCell>
                <TableCell align="right">Qtd. Ajustada</TableCell>
                <TableCell align="right">Qtd. Demanda</TableCell>
                <TableCell align="center">Status</TableCell>
                {!modoSelecao && <TableCell align="center">Ações</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {escolasDoProduto.map((item, index) => {
                const dem = Number(item.quantidade_demanda ?? item.quantidade);
                const diff = Number(item.quantidade) - dem;
                const hasAjuste = Math.abs(diff) > 0.0005;
                return (
                  <TableRow key={item.id} hover selected={itensSelecionados.has(item.id)}>
                    {modoSelecao && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={itensSelecionados.has(item.id)}
                          onChange={() => handleToggleSelecao(item.id)}
                          disabled={excluindoItens}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={index + 1} 
                          size="small" 
                          sx={{ 
                            minWidth: 32, 
                            height: 24, 
                            fontWeight: 600,
                            bgcolor: 'primary.main',
                            color: 'white'
                          }} 
                        />
                        {item.escola_nome}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        {hasAjuste && (
                          <Chip label={`${diff > 0 ? '+' : ''}${formatarQuantidade(diff)}`} size="small" color={diff > 0 ? 'success' : 'error'} sx={{ height: 14, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }} />
                        )}
                        <Box sx={{ minWidth: 60, textAlign: 'right' }}>{formatarQuantidade(item.quantidade)} {item.unidade}</Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                      {formatarQuantidade(dem)} {item.unidade}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={getStatusLabel(item.status)} size="small" color={statusColor(item.status)} />
                    </TableCell>
                    {!modoSelecao && (
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Editar item">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleAbrirEditar(item)}
                              disabled={excluindoItens}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir item">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleExcluirIndividual(item)}
                              disabled={excluindoItens}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {modoSelecao && <TableCell />}
                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatarQuantidade(escolasDoProduto.reduce((s, i) => s + (Number(i.quantidade)||0), 0))} {escolasDoProduto[0]?.unidade}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {formatarQuantidade(escolasDoProduto.reduce((s, i) => s + (Number(i.quantidade_demanda ?? i.quantidade)||0), 0))} {escolasDoProduto[0]?.unidade}
                </TableCell>
                <TableCell />
                {!modoSelecao && <TableCell />}
              </TableRow>
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          {modoSelecao && itensSelecionados.size > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
              {itensSelecionados.size} item(ns) selecionado(s)
            </Typography>
          )}
          <Button onClick={handleFecharDialogEscolas} disabled={excluindoItens}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: itens de uma escola */}
      <Dialog open={dialogItensEscolaOpen} onClose={() => setDialogItensEscolaOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box>
            <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>{escolaSelecionada?.nome}</span>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>Itens desta escola na guia</div>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell align="center">Data Entrega</TableCell>
                <TableCell align="right">Quantidade</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {itensEscolaSelecionada.map(item => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.produto_nome}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {item.data_entrega
                      ? new Date(String(item.data_entrega).includes('T') ? item.data_entrega : item.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatarQuantidade(item.quantidade)} {item.unidade}</TableCell>
                  <TableCell align="center">
                    <Chip label={getStatusLabel(item.status)} size="small" color={statusColor(item.status)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogItensEscolaOpen(false); navigate(`/guias-demanda/${guiaId}/escola/${escolaSelecionada?.id}`); }}
            variant="outlined" size="small">
            Gerenciar Itens
          </Button>
          <Button onClick={() => setDialogItensEscolaOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Gerar Pedido */}
      <GerarPedidoDaGuiaDialog
        open={dialogGerarPedido}
        onClose={() => setDialogGerarPedido(false)}
        onSuccess={() => {
          toast.success('Pedido gerado com sucesso!');
          setDialogGerarPedido(false);
        }}
        guiaIdInicial={guia?.id}
      />

      {/* Dialog Editar Produto em todas as escolas */}
      <Dialog open={dialogEditarProdutoOpen} onClose={() => !salvandoEdicaoProduto && setDialogEditarProdutoOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>Editar em Todas as Escolas</span>
            <IconButton size="small" onClick={() => !salvandoEdicaoProduto && setDialogEditarProdutoOpen(false)} disabled={salvandoEdicaoProduto}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {produtoEditando && (
              <Typography variant="body2" color="text.secondary">
                <strong>Produto:</strong> {produtoEditando.produto_nome}
                {' · '}
                <strong>{produtoEditando.escolas?.length ?? 0} escola(s)</strong>
              </Typography>
            )}
            <UnidadeMedidaSelect
              value={unidadeIdProdutoSelecionada}
              onChange={(id) => {
                const unidade = unidadesMedida?.find(u => u.id === id);
                setFormEditarProduto(prev => ({ ...prev, unidadeCodigo: unidade?.codigo ?? '' }));
              }}
              label="Unidade de Medida"
              size="small"
              disabled={salvandoEdicaoProduto}
              required
            />
            <TextField
              label="Data de Entrega"
              type="date"
              value={formEditarProduto.data_entrega}
              onChange={e => setFormEditarProduto(prev => ({ ...prev, data_entrega: e.target.value }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={salvandoEdicaoProduto}
            />
            {salvandoEdicaoProduto && <LinearProgress />}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogEditarProdutoOpen(false)} disabled={salvandoEdicaoProduto}>Cancelar</Button>
          <Button onClick={handleSalvarEdicaoProduto} variant="contained" disabled={salvandoEdicaoProduto || !unidadeIdProdutoSelecionada}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Editar Item */}
      <Dialog open={dialogEditarOpen} onClose={() => !salvandoEdicao && setDialogEditarOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>Editar Item</span>
            <IconButton size="small" onClick={() => !salvandoEdicao && setDialogEditarOpen(false)} disabled={salvandoEdicao}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {itemEditando && (
              <>
                <Typography variant="body2" color="text.secondary">
                  <strong>Produto:</strong> {itemEditando.produto_nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Escola:</strong> {itemEditando.escola_nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Quantidade:</strong> {formatarQuantidade(itemEditando.quantidade)}
                </Typography>
              </>
            )}
            <UnidadeMedidaSelect
              value={unidadeIdSelecionada}
              onChange={(id) => {
                const unidade = unidadesMedida?.find(u => u.id === id);
                setFormEditar(prev => ({ ...prev, unidadeCodigo: unidade?.codigo ?? '' }));
              }}
              label="Unidade de Medida"
              size="small"
              disabled={salvandoEdicao}
              required
            />
            <TextField 
              label="Data de Entrega" 
              type="date" 
              value={formEditar.data_entrega}
              onChange={e => setFormEditar({ ...formEditar, data_entrega: e.target.value })}
              fullWidth 
              size="small" 
              InputLabelProps={{ shrink: true }} 
              disabled={salvandoEdicao}
            />
            {salvandoEdicao && <LinearProgress />}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogEditarOpen(false)} disabled={salvandoEdicao}>Cancelar</Button>
          <Button onClick={handleSalvarEdicao} variant="contained" disabled={salvandoEdicao || !unidadeIdSelecionada}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Adicionar em Lote */}
      <Dialog open={openBatchDialog} onClose={() => !batchSaving && setOpenBatchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Adicionar Produto para Múltiplas Escolas</Typography>
            <Typography variant="caption" color="text.secondary">
              Selecione um produto e defina as quantidades para cada escola
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => !batchSaving && setOpenBatchDialog(false)} disabled={batchSaving}>
            <ClearIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Produto</InputLabel>
              <Select value={batchForm.produtoId} label="Produto" disabled={batchSaving}
                onChange={e => {
                  const p = produtos.find(x => x.id === Number(e.target.value));
                  setBatchForm({ ...batchForm, produtoId: e.target.value as string, unidade: p?.unidade || 'Kg' });
                }}>
                {produtos.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Data de Entrega" type="date" value={batchForm.data_entrega}
              onChange={e => setBatchForm({ ...batchForm, data_entrega: e.target.value })}
              fullWidth size="small" InputLabelProps={{ shrink: true }} disabled={batchSaving} />
            {batchForm.produtoId && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Quantidades por escola:</Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {escolas.map(e => (
                    <Box key={e.id} sx={{ display: 'flex', gap: 1.5, mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>{e.nome}</Typography>
                      <TextField label="Qtd" type="number" size="small"
                        value={batchQuantidades[e.id] || ''}
                        onChange={ev => setBatchQuantidades({ ...batchQuantidades, [e.id]: ev.target.value })}
                        sx={{ width: 90 }} disabled={batchSaving} />
                      <FormControl size="small" sx={{ width: 120 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={batchStatus[e.id] || 'pendente'} label="Status" disabled={batchSaving}
                          onChange={ev => setBatchStatus({ ...batchStatus, [e.id]: ev.target.value as string })}>
                          <MenuItem value="pendente">Disponível p/ Entrega</MenuItem>
                          <MenuItem value="programada">Aguardando Estoque</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            {batchSaving && <LinearProgress />}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBatchDialog(false)} disabled={batchSaving}>Cancelar</Button>
          <Button onClick={handleBatchSubmit} variant="contained" disabled={batchSaving || !batchForm.produtoId}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuiaDemandaDetalhe;
