import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  MenuItem,
  Grid,
  Button,
  TablePagination,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Restaurant as RestaurantIcon,
  History as HistoryIcon,
  Add as AddIcon
} from '@mui/icons-material';
import BusinessIcon from '@mui/icons-material/Business';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useToast } from '../hooks/useToast';
import saldoContratosModalidadesService, {
  SaldoContratoModalidadeItem,
  ModalidadeOption,
  ProdutoContratoOption,
  SaldoContratosModalidadesFilters
} from '../services/saldoContratosModalidadesService';

// Estilo comum para as células da tabela
const cellStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.875rem',
  borderBottom: '1px solid #e0e0e0',
  borderRight: '1px solid #e0e0e0',
  '&:last-child': {
    borderRight: 0,
  },
};

const headerCellStyle = {
  ...cellStyle,
  fontWeight: 600,
  color: '#1a1a1a',
  backgroundColor: '#f5f5f5',
};

// Componente para gerenciar cada modalidade individualmente
interface ModalidadeRowProps {
  modalidade: any;
  produtoSelecionado: any;
  todasModalidades: any[];
  onSalvar: (modalidadeId: number, quantidade: number) => Promise<void>;
  onRegistrarConsumo?: (modalidade: any) => void;
  onVerHistorico?: (modalidade: any) => void;
  formatarNumero: (valor: number) => string;
}

const ModalidadeRow: React.FC<ModalidadeRowProps> = ({ 
  modalidade, 
  produtoSelecionado, 
  todasModalidades,
  onSalvar,
  onRegistrarConsumo,
  onVerHistorico,
  formatarNumero 
}) => {
  const [editando, setEditando] = useState(false);
  const [quantidade, setQuantidade] = useState(modalidade.quantidade_inicial.toString());
  const [salvando, setSalvando] = useState(false);

  // Atualizar quantidade quando modalidade mudar
  React.useEffect(() => {
    setQuantidade(modalidade.quantidade_inicial.toString());
  }, [modalidade.quantidade_inicial]);

  const handleSalvar = async () => {
    const novaQuantidade = parseFloat(quantidade);
    
    if (isNaN(novaQuantidade) || novaQuantidade < 0) {
      alert('Quantidade deve ser um número válido e não negativo');
      return;
    }

    // Validar se a soma total não excede a quantidade contratada
    const outrasModalidades = todasModalidades.filter((m: any) => m.id !== modalidade.id);
    const somaOutras = outrasModalidades.reduce((sum: number, m: any) => {
      const valor = parseFloat(m.quantidade_inicial) || 0;
      return sum + valor;
    }, 0);
    const somaTotal = somaOutras + novaQuantidade;
    const quantidadeContratada = parseFloat(produtoSelecionado.quantidade_contrato) || 0;
    const disponivelParaDistribuir = quantidadeContratada - somaOutras;
    
    if (somaTotal > quantidadeContratada) {
      alert(
        `❌ VALIDAÇÃO BLOQUEADA\n\n` +
        `A soma das modalidades (${formatarNumero(somaTotal)}) não pode exceder a quantidade contratada (${formatarNumero(quantidadeContratada)}).\n\n` +
        `📊 Detalhes:\n` +
        `• Quantidade contratada: ${formatarNumero(quantidadeContratada)}\n` +
        `• Outras modalidades: ${formatarNumero(somaOutras)}\n` +
        `• Disponível para distribuir: ${formatarNumero(disponivelParaDistribuir)}\n` +
        `• Você tentou adicionar: ${formatarNumero(novaQuantidade)}\n\n` +
        `💡 Máximo permitido para esta modalidade: ${formatarNumero(disponivelParaDistribuir)}`
      );
      return;
    }

    setSalvando(true);
    try {
      await onSalvar(modalidade.id, novaQuantidade);
      setEditando(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelar = () => {
    setQuantidade(modalidade.quantidade_inicial.toString());
    setEditando(false);
  };

  return (
    <TableRow hover>
      <TableCell>
        <Box>
          <Typography variant="body2" fontWeight="bold">
            {modalidade.nome}
          </Typography>
          {modalidade.codigo_financeiro && (
            <Typography variant="caption" color="text.secondary">
              Código: {modalidade.codigo_financeiro}
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell align="right">
        {editando ? (
          <TextField
            size="small"
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ width: 100 }}
          />
        ) : (
          <Typography variant="body2" fontWeight={modalidade.cadastrada ? 'bold' : 'normal'}>
            {formatarNumero(modalidade.quantidade_inicial)}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2">
          {formatarNumero(modalidade.quantidade_consumida)}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography 
          variant="body2" 
          fontWeight="bold"
          color={modalidade.quantidade_disponivel > 0 ? 'primary' : 'text.secondary'}
        >
          {formatarNumero(modalidade.quantidade_disponivel)}
        </Typography>
      </TableCell>
      <TableCell align="center">
        {editando ? (
          <Box display="flex" justifyContent="center" gap={1}>
            <IconButton
              size="small"
              onClick={handleSalvar}
              disabled={salvando}
              color="primary"
            >
              {salvando ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              onClick={handleCancelar}
              disabled={salvando}
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Box display="flex" justifyContent="center" gap={0.5}>
            <Tooltip title="Editar Quantidade">
              <IconButton
                size="small"
                onClick={() => setEditando(true)}
                color="primary"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {modalidade.cadastrada && modalidade.quantidade_disponivel > 0 && onRegistrarConsumo && (
              <Tooltip title="Registrar Consumo">
                <IconButton
                  size="small"
                  onClick={() => onRegistrarConsumo(modalidade)}
                  color="success"
                >
                  <RestaurantIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {modalidade.cadastrada && onVerHistorico && (
              <Tooltip title="Ver Histórico">
                <IconButton
                  size="small"
                  onClick={() => onVerHistorico(modalidade)}
                  color="info"
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </TableCell>
    </TableRow>
  );
};

const SaldoContratosModalidades: React.FC = () => {
  const [dados, setDados] = useState<SaldoContratoModalidadeItem[]>([]);
  const [modalidades, setModalidades] = useState<ModalidadeOption[]>([]);
  const [produtosContratos, setProdutosContratos] = useState<ProdutoContratoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error: toastError } = useToast();
  const timeoutRef = React.useRef<number | null>(null);
  
  // Estados para diálogos
  const [dialogGerenciarModalidades, setDialogGerenciarModalidades] = useState(false);
  const [dialogConsumoAberto, setDialogConsumoAberto] = useState(false);
  const [dialogHistoricoOpen, setDialogHistoricoOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [itemSelecionado, setItemSelecionado] = useState<SaldoContratoModalidadeItem | null>(null);
  
  // Estados para gerenciar modalidades
  const [modalidadesProduto, setModalidadesProduto] = useState<any[]>([]);
  const [carregandoModalidades, setCarregandoModalidades] = useState(false);
  
  // Estados para consumo
  const [quantidadeConsumo, setQuantidadeConsumo] = useState('');
  const [dataConsumo, setDataConsumo] = useState('');
  const [observacaoConsumo, setObservacaoConsumo] = useState('');
  
  // Estados para histórico
  const [historicoConsumo, setHistoricoConsumo] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  
  const [registrandoConsumo, setRegistrandoConsumo] = useState(false);
  const [cadastrandoSaldo, setCadastrandoSaldo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [estatisticas, setEstatisticas] = useState<any>(null);
  
  // Filtros
  const [filtros, setFiltros] = useState<SaldoContratosModalidadesFilters>({
    page: 1,
    limit: 25
  });
  const [filtrosTemp, setFiltrosTemp] = useState<SaldoContratosModalidadesFilters>({});

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
    carregarModalidades();
    carregarProdutosContratos();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    carregarDados();
  }, [filtros]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F - Focar no campo de pesquisa
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const produtoInput = document.querySelector('input[placeholder*="Digite o nome do produto"]') as HTMLInputElement;
        if (produtoInput) {
          produtoInput.focus();
          produtoInput.select();
        }
      }
      
      // Ctrl+K - Limpar filtros
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setFiltrosTemp({});
        setFiltros({ page: 1, limit: rowsPerPage });
        setPage(0);
      }

      // Ctrl+R - Atualizar dados
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        carregarDados();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtrosTemp]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await saldoContratosModalidadesService.listarSaldosModalidades({
        ...filtros,
        page: page + 1,
        limit: rowsPerPage
      });
      
      setDados(response.data);
      setTotal(response.pagination.total);
      setEstatisticas(response.estatisticas);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const carregarModalidades = async () => {
    try {
      const modalidadesList = await saldoContratosModalidadesService.listarModalidades();
      setModalidades(modalidadesList);
    } catch (err) {
      console.error('Erro ao carregar modalidades:', err);
    }
  };

  const carregarProdutosContratos = async () => {
    try {
      const produtosList = await saldoContratosModalidadesService.listarProdutosContratos();
      setProdutosContratos(produtosList);
    } catch (err) {
      console.error('Erro ao carregar produtos de contratos:', err);
    }
  };

  // Funções para gerenciar modalidades
  const abrirDialogGerenciarModalidades = async (produto: any) => {
    setProdutoSelecionado(produto);
    setError(null);
    setDialogGerenciarModalidades(true);
    setCarregandoModalidades(true);
    
    try {
      // Buscar dados atualizados do servidor para este produto
      const response = await saldoContratosModalidadesService.listarSaldosModalidades({
        page: 1,
        limit: 100
      });
      
      // Filtrar apenas as modalidades deste produto específico
      const modalidadesAtualizadas = response.data.filter(
        (item: any) => item.contrato_produto_id === produto.contrato_produto_id
      );
      
      // Carregar todas as modalidades disponíveis
      const todasModalidades = await saldoContratosModalidadesService.listarModalidades();
      
      // Criar array com todas as modalidades com dados atualizados do servidor
      const modalidadesComStatus = todasModalidades.map(modalidade => {
        const modalidadeExistente = modalidadesAtualizadas.find(
          (m: any) => m.modalidade_id === modalidade.id
        );
        return {
          ...modalidade,
          quantidade_inicial: modalidadeExistente ? modalidadeExistente.quantidade_inicial : 0,
          quantidade_consumida: modalidadeExistente ? modalidadeExistente.quantidade_consumida : 0,
          quantidade_disponivel: modalidadeExistente ? modalidadeExistente.quantidade_disponivel : 0,
          cadastrada: modalidadeExistente && modalidadeExistente.id > 0,
          id_saldo: modalidadeExistente ? modalidadeExistente.id : null
        };
      });
      
      setModalidadesProduto(modalidadesComStatus);
    } catch (error) {
      console.error('Erro ao carregar modalidades:', error);
      setModalidadesProduto([]);
    } finally {
      setCarregandoModalidades(false);
    }
  };

  const fecharDialogGerenciarModalidades = () => {
    setDialogGerenciarModalidades(false);
    setProdutoSelecionado(null);
    setModalidadesProduto([]);
  };

  // Função para calcular totais em tempo real
  const calcularTotaisAtuais = () => {
    if (!produtoSelecionado) {
      return { totalDistribuido: 0, disponivelDistribuir: 0 };
    }
    
    // Se modalidadesProduto ainda não foi carregado, usar os dados originais
    if (!modalidadesProduto || modalidadesProduto.length === 0) {
      const totalDistribuido = produtoSelecionado.total_inicial || 0;
      const disponivelDistribuir = (produtoSelecionado.quantidade_contrato || 0) - totalDistribuido;
      return { totalDistribuido, disponivelDistribuir };
    }
    
    // Calcular com base nas modalidades atuais
    const totalDistribuido = modalidadesProduto.reduce((sum, m) => {
      const valor = parseFloat(m.quantidade_inicial as any) || 0;
      return sum + valor;
    }, 0);
    
    const disponivelDistribuir = (produtoSelecionado.quantidade_contrato || 0) - totalDistribuido;
    
    return { totalDistribuido, disponivelDistribuir };
  };

  const salvarModalidade = async (modalidadeId: number, quantidade: number) => {
    if (!produtoSelecionado) return;
    
    try {
      await saldoContratosModalidadesService.cadastrarSaldoModalidade({
        contrato_produto_id: produtoSelecionado.contrato_produto_id,
        modalidade_id: modalidadeId,
        quantidade_inicial: quantidade
      });
      
      success('Modalidade atualizada com sucesso!');
      
      // Atualizar o estado local das modalidades imediatamente
      setModalidadesProduto(prev => 
        prev.map(m => 
          m.id === modalidadeId 
            ? { ...m, quantidade_inicial: quantidade, quantidade_disponivel: quantidade - (m.quantidade_consumida || 0) }
            : m
        )
      );
      
      // Recarregar dados da tabela principal em background
      carregarDados();
    } catch (error: any) {
      console.error('Erro ao salvar modalidade:', error);
      toastError(error.response?.data?.message || 'Erro ao salvar modalidade');
      // Em caso de erro, recarregar os dados para garantir consistência
      await abrirDialogGerenciarModalidades(produtoSelecionado);
    }
  };

  const abrirConsumoModalidade = (modalidade: any) => {
    // Converter modalidade para o formato esperado pelo diálogo de consumo
    const itemParaConsumo = {
      id: modalidade.id_saldo,
      modalidade_id: modalidade.id,
      modalidade_nome: modalidade.nome,
      produto_nome: produtoSelecionado.produto_nome,
      contrato_numero: produtoSelecionado.contrato_numero,
      quantidade_inicial: modalidade.quantidade_inicial,
      quantidade_consumida: modalidade.quantidade_consumida,
      quantidade_disponivel: modalidade.quantidade_disponivel,
      unidade: produtoSelecionado.unidade
    };
    abrirDialogConsumo(itemParaConsumo as any);
  };

  const abrirHistoricoModalidade = async (modalidade: any) => {
    // Converter modalidade para o formato esperado pelo diálogo de histórico
    const itemParaHistorico = {
      id: modalidade.id_saldo,
      modalidade_id: modalidade.id,
      modalidade_nome: modalidade.nome,
      produto_nome: produtoSelecionado.produto_nome,
      contrato_numero: produtoSelecionado.contrato_numero,
      unidade: produtoSelecionado.unidade
    };
    await abrirDialogHistorico(itemParaHistorico as any);
  };

  const excluirConsumo = async (consumoId: number) => {
    if (!itemSelecionado) return;
    
    if (!window.confirm('Tem certeza que deseja excluir este registro de consumo?')) {
      return;
    }

    try {
      await saldoContratosModalidadesService.excluirConsumoModalidade(itemSelecionado.id, consumoId);
      success('Consumo excluído com sucesso!');
      
      // Recarregar histórico
      await abrirDialogHistorico(itemSelecionado);
      
      // Recarregar dados da tabela principal
      await carregarDados();
      
      // Se o modal de gerenciar modalidades estiver aberto, recarregar também
      if (dialogGerenciarModalidades && produtoSelecionado) {
        await abrirDialogGerenciarModalidades(produtoSelecionado);
      }
    } catch (error: any) {
      console.error('Erro ao excluir consumo:', error);
      toastError(error.response?.data?.message || 'Erro ao excluir consumo');
    }
  };

  // Funções para registro de consumo
  const abrirDialogConsumo = (item: SaldoContratoModalidadeItem) => {
    setItemSelecionado(item);
    setQuantidadeConsumo('');
    // Definir data padrão como hoje
    const hoje = new Date().toISOString().split('T')[0];
    setDataConsumo(hoje);
    setObservacaoConsumo('');
    setError(null);
    setDialogConsumoAberto(true);
  };

  const fecharDialogConsumo = () => {
    setDialogConsumoAberto(false);
    setItemSelecionado(null);
    setQuantidadeConsumo('');
    setDataConsumo('');
    setObservacaoConsumo('');
  };

  const registrarConsumo = async () => {
    if (!itemSelecionado || !quantidadeConsumo || parseFloat(quantidadeConsumo) <= 0) {
      return;
    }

    const quantidade = parseFloat(quantidadeConsumo);
    if (quantidade > itemSelecionado.quantidade_disponivel) {
      setError(`Quantidade indisponível. Saldo atual: ${itemSelecionado.quantidade_disponivel}`);
      return;
    }

    setRegistrandoConsumo(true);
    
    try {
      await saldoContratosModalidadesService.registrarConsumoModalidade(
        itemSelecionado.id,
        quantidade,
        observacaoConsumo || undefined,
        dataConsumo || undefined
      );
      
      success('Consumo registrado com sucesso!');
      fecharDialogConsumo();
      
      // Recarregar dados da tabela principal
      await carregarDados();
      
      // Se o modal de gerenciar modalidades estiver aberto, recarregar também
      if (dialogGerenciarModalidades && produtoSelecionado) {
        await abrirDialogGerenciarModalidades(produtoSelecionado);
      }
    } catch (error: any) {
      console.error('Erro ao registrar consumo:', error);
      setError(error.response?.data?.message || 'Erro ao registrar consumo');
    } finally {
      setRegistrandoConsumo(false);
    }
  };

  // Funções para histórico
  const abrirDialogHistorico = async (item: SaldoContratoModalidadeItem) => {
    setItemSelecionado(item);
    setError(null);
    setDialogHistoricoOpen(true);
    setCarregandoHistorico(true);
    
    try {
      const result = await saldoContratosModalidadesService.buscarHistoricoConsumoModalidade(item.id);
      setHistoricoConsumo(result.data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de consumo:', error);
      setHistoricoConsumo([]);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const fecharDialogHistorico = () => {
    setDialogHistoricoOpen(false);
    setItemSelecionado(null);
    setHistoricoConsumo([]);
  };

  // Agrupar dados por produto do contrato
  const agruparPorProdutoContrato = (itens: SaldoContratoModalidadeItem[]) => {
    const grupos: { [key: string]: SaldoContratoModalidadeItem[] } = {};
    
    itens.forEach(item => {
      const chave = `${item.contrato_produto_id}`;
      if (!grupos[chave]) {
        grupos[chave] = [];
      }
      grupos[chave].push(item);
    });

    return Object.entries(grupos).map(([chave, modalidades]) => {
      const primeiro = modalidades[0];
      const totalInicial = modalidades.reduce((sum, m) => sum + (parseFloat(m.quantidade_inicial as any) || 0), 0);
      const totalConsumido = modalidades.reduce((sum, m) => sum + (parseFloat(m.quantidade_consumida as any) || 0), 0);
      const totalDisponivel = modalidades.reduce((sum, m) => sum + (parseFloat(m.quantidade_disponivel as any) || 0), 0);
      
      return {
        contrato_produto_id: primeiro.contrato_produto_id,
        contrato_numero: primeiro.contrato_numero,
        produto_nome: primeiro.produto_nome,
        unidade: primeiro.unidade,
        fornecedor_nome: primeiro.fornecedor_nome,
        preco_unitario: primeiro.preco_unitario,
        quantidade_contrato: primeiro.quantidade_contrato,
        total_inicial: totalInicial,
        total_consumido: totalConsumido,
        total_disponivel: totalDisponivel,
        modalidades: modalidades,
        status: totalDisponivel <= 0 ? 'ESGOTADO' : 
                totalDisponivel <= (totalInicial * 0.1) ? 'BAIXO_ESTOQUE' : 'DISPONIVEL'
      };
    });
  };

  const aplicarFiltros = () => {
    setFiltros({ ...filtrosTemp, page: 1, limit: rowsPerPage });
    setPage(0);
  };

  const limparFiltros = () => {
    setFiltrosTemp({});
    setFiltros({ page: 1, limit: rowsPerPage });
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    setFiltros({ ...filtros, page: newPage + 1 });
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    setFiltros({ ...filtros, page: 1, limit: newRowsPerPage });
  };

  const exportarCSV = async () => {
    try {
      const blob = await saldoContratosModalidadesService.exportarCSV(filtros);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `saldos_contratos_modalidades_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPONIVEL':
        return 'success';
      case 'BAIXO_ESTOQUE':
        return 'warning';
      case 'ESGOTADO':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatarNumero = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  if (loading && dados.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Título */}
        <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
          Saldo de Contratos por Modalidade
        </Typography>

        {/* Filtros */}
        <Card sx={{ mb: 3, borderRadius: 2, backgroundColor: '#ffffff', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#1a1a1a' }}>
                <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Filtros
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                  ⌨️ Atalhos:
                </Typography>
                <Chip label="Ctrl+F Pesquisar" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                <Chip label="Ctrl+K Limpar" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                <Chip label="Ctrl+R Atualizar" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
              </Box>
            </Box>
            
            <TextField
              fullWidth
              label="Pesquisar Produto"
              placeholder="Digite o nome do produto..."
              value={filtrosTemp.produto_nome || ''}
              onChange={(e) => {
                const valor = e.target.value;
                setFiltrosTemp({ ...filtrosTemp, produto_nome: valor });
                // Aplicar filtro automaticamente após 500ms
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => {
                  setFiltros({ ...filtrosTemp, produto_nome: valor, page: 1, limit: rowsPerPage });
                  setPage(0);
                }, 500);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: filtrosTemp.produto_nome && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFiltrosTemp({});
                        setFiltros({ page: 1, limit: rowsPerPage });
                        setPage(0);
                      }}
                    >
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        {/* Ações */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">
            Resultados ({agruparPorProdutoContrato(dados).length} produtos)
          </Typography>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Box display="flex" gap={1}>
            <Tooltip title="Atualizar">
              <IconButton onClick={carregarDados} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportarCSV} disabled={loading}>
              Exportar CSV
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Tabela */}
        <TableContainer component={Card} sx={{ mt: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0', overflow: 'auto', backgroundColor: '#ffffff' }}>
          <Table sx={{ minWidth: 1200, borderCollapse: 'separate' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellStyle}>Produto</TableCell>
                <TableCell sx={headerCellStyle}>Contrato</TableCell>
                <TableCell sx={headerCellStyle}>Unidade</TableCell>
                <TableCell align="right" sx={headerCellStyle}>Qtd Contratada</TableCell>
                <TableCell align="right" sx={headerCellStyle}>Total Inicial</TableCell>
                <TableCell align="right" sx={headerCellStyle}>Total Consumido</TableCell>
                <TableCell align="right" sx={headerCellStyle}>Total Disponível</TableCell>
                <TableCell align="right" sx={headerCellStyle}>Valor Unit.</TableCell>
                <TableCell align="center" sx={headerCellStyle}>Status</TableCell>
                <TableCell align="center" sx={headerCellStyle}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && dados.length > 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={cellStyle}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : dados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={cellStyle}>
                    Nenhum resultado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                agruparPorProdutoContrato(dados).map((produto) => (
                  <TableRow key={produto.contrato_produto_id} hover>
                    <TableCell sx={cellStyle}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {produto.produto_nome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {produto.fornecedor_nome}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={cellStyle}>{produto.contrato_numero}</TableCell>
                    <TableCell sx={cellStyle}>{produto.unidade}</TableCell>
                    <TableCell align="right" sx={cellStyle}>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {formatarNumero(produto.quantidade_contrato)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={cellStyle}>{formatarNumero(produto.total_inicial)}</TableCell>
                    <TableCell align="right" sx={cellStyle}>{formatarNumero(produto.total_consumido)}</TableCell>
                    <TableCell align="right" sx={cellStyle}>{formatarNumero(produto.total_disponivel)}</TableCell>
                    <TableCell align="right" sx={cellStyle}>{formatarMoeda(produto.preco_unitario)}</TableCell>
                    <TableCell align="center" sx={cellStyle}>
                      <Chip
                        label={produto.status}
                        color={getStatusColor(produto.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center" sx={cellStyle}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => abrirDialogGerenciarModalidades(produto)}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Gerenciar Modalidades
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginação */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Itens por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />

        {/* Modal de Gerenciar Modalidades */}
        <Dialog open={dialogGerenciarModalidades} onClose={fecharDialogGerenciarModalidades} maxWidth="md" fullWidth>
          <DialogTitle>
            Gerenciar Modalidades
            {produtoSelecionado && (
              <Typography variant="subtitle1" color="text.secondary">
                {produtoSelecionado.contrato_numero} - {produtoSelecionado.produto_nome}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            {produtoSelecionado && (
              <Box sx={{ pt: 2 }}>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">Informações do Produto</Typography>
                  <Typography variant="body1">
                    <strong>Quantidade Contratada:</strong> {formatarNumero(produtoSelecionado.quantidade_contrato)} {produtoSelecionado.unidade}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Total Distribuído:</strong> {formatarNumero(calcularTotaisAtuais().totalDistribuido)} {produtoSelecionado.unidade}
                  </Typography>
                  <Typography 
                    variant="body1"
                    sx={{ 
                      color: calcularTotaisAtuais().disponivelDistribuir < 0 ? 'error.main' : 'text.primary',
                      fontWeight: calcularTotaisAtuais().disponivelDistribuir < 0 ? 'bold' : 'normal'
                    }}
                  >
                    <strong>Disponível para Distribuir:</strong> {formatarNumero(calcularTotaisAtuais().disponivelDistribuir)} {produtoSelecionado.unidade}
                  </Typography>
                </Box>

                {carregandoModalidades ? (
                  <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>Modalidade</TableCell>
                          <TableCell align="right">Quantidade Inicial</TableCell>
                          <TableCell align="right">Consumido</TableCell>
                          <TableCell align="right">Disponível</TableCell>
                          <TableCell align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {modalidadesProduto.map((modalidade) => (
                          <ModalidadeRow
                            key={modalidade.id}
                            modalidade={modalidade}
                            produtoSelecionado={produtoSelecionado}
                            todasModalidades={modalidadesProduto}
                            onSalvar={salvarModalidade}
                            onRegistrarConsumo={abrirConsumoModalidade}
                            onVerHistorico={abrirHistoricoModalidade}
                            formatarNumero={formatarNumero}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialogGerenciarModalidades}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Registro de Consumo */}
        <Dialog open={dialogConsumoAberto} onClose={fecharDialogConsumo} maxWidth="sm" fullWidth>
          <DialogTitle>Registrar Consumo</DialogTitle>
          <DialogContent>
            {itemSelecionado && (
              <Box sx={{ pt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Contrato:</strong> {itemSelecionado.contrato_numero}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Produto:</strong> {itemSelecionado.produto_nome}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Modalidade:</strong> {itemSelecionado.modalidade_nome}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Fornecedor:</strong> {itemSelecionado.fornecedor_nome}
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
                  <strong>Saldo Disponível:</strong> {formatarNumero(itemSelecionado.quantidade_disponivel)} {itemSelecionado.unidade}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Quantidade a Consumir"
                      type="number"
                      value={quantidadeConsumo}
                      onChange={(e) => setQuantidadeConsumo(e.target.value)}
                      inputProps={{ 
                        min: 0, 
                        max: itemSelecionado.quantidade_disponivel,
                        step: 0.01
                      }}
                      helperText={`Máximo: ${formatarNumero(itemSelecionado.quantidade_disponivel)} ${itemSelecionado.unidade}`}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Data do Consumo"
                      type="date"
                      value={dataConsumo}
                      onChange={(e) => setDataConsumo(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      helperText="Para registros retroativos"
                    />
                  </Grid>
                </Grid>
                
                <TextField
                  fullWidth
                  label="Observação (opcional)"
                  multiline
                  rows={2}
                  value={observacaoConsumo}
                  onChange={(e) => setObservacaoConsumo(e.target.value)}
                  placeholder="Descreva o motivo do consumo..."
                  sx={{ mt: 2 }}
                />
                
                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialogConsumo} disabled={registrandoConsumo}>
              Cancelar
            </Button>
            <Button 
              onClick={registrarConsumo} 
              variant="contained"
              disabled={registrandoConsumo || !quantidadeConsumo || parseFloat(quantidadeConsumo) <= 0}
              startIcon={registrandoConsumo ? <CircularProgress size={16} /> : <RestaurantIcon />}
            >
              {registrandoConsumo ? 'Registrando...' : 'Registrar Consumo'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Histórico de Consumos */}
        <Dialog open={dialogHistoricoOpen} onClose={fecharDialogHistorico} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <HistoryIcon color="primary" />
              Histórico de Consumos - {itemSelecionado?.produto_nome} ({itemSelecionado?.modalidade_nome})
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {carregandoHistorico ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : historicoConsumo.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center">
                  Nenhum consumo registrado para este item.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>Data</TableCell>
                        <TableCell align="right">Quantidade</TableCell>
                        <TableCell>Responsável</TableCell>
                        <TableCell>Observação</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historicoConsumo.map((consumo, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatarData(consumo.data_consumo)}</TableCell>
                          <TableCell align="right">{formatarNumero(consumo.quantidade)} {itemSelecionado?.unidade}</TableCell>
                          <TableCell>{consumo.responsavel_nome || 'Não informado'}</TableCell>
                          <TableCell>{consumo.observacao || '-'}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Excluir Consumo">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => excluirConsumo(consumo.id)}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialogHistorico}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>


      </Box>
    </Box>
  );
};

export default SaldoContratosModalidades;