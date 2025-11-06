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



// Componente para gerenciar cada modalidade individualmente
interface ModalidadeRowProps {
  modalidade: any;
  produtoSelecionado: any;
  todasModalidades: any[];
  onEditarQuantidadeInicial: (modalidade: any) => void;
  onRegistrarConsumo?: (modalidade: any) => void;
  onVerHistorico?: (modalidade: any) => void;
  formatarNumero: (valor: number) => string;
}

const ModalidadeRow: React.FC<ModalidadeRowProps> = ({
  modalidade,
  produtoSelecionado,
  todasModalidades,
  onEditarQuantidadeInicial,
  onRegistrarConsumo,
  onVerHistorico,
  formatarNumero
}) => {
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
        <Typography variant="body2" fontWeight={modalidade.cadastrada ? 'bold' : 'normal'}>
          {formatarNumero(modalidade.quantidade_inicial)}
        </Typography>
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
        <Box display="flex" justifyContent="center" gap={0.5}>
          <Tooltip title="Editar Quantidade Inicial">
            <IconButton
              size="small"
              onClick={() => onEditarQuantidadeInicial(modalidade)}
              sx={{ color: '#059669' }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {modalidade.cadastrada && modalidade.quantidade_disponivel > 0 && onRegistrarConsumo && (
            <Tooltip title="Registrar Consumo">
              <IconButton
                size="small"
                onClick={() => onRegistrarConsumo(modalidade)}
                color="primary"
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
  const [dialogQuantidadeInicial, setDialogQuantidadeInicial] = useState(false);
  const [dialogConsumoAberto, setDialogConsumoAberto] = useState(false);
  const [dialogHistoricoOpen, setDialogHistoricoOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [itemSelecionado, setItemSelecionado] = useState<SaldoContratoModalidadeItem | null>(null);
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState<any>(null);

  // Estados para gerenciar modalidades
  const [modalidadesProduto, setModalidadesProduto] = useState<any[]>([]);
  const [carregandoModalidades, setCarregandoModalidades] = useState(false);

  // Estados para quantidade inicial
  const [quantidadeInicial, setQuantidadeInicial] = useState('');
  const [salvandoQuantidade, setSalvandoQuantidade] = useState(false);

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

  // Estados para navegação por teclado
  const [linhaSelecionada, setLinhaSelecionada] = useState<number>(-1);
  const [modalidadeEditandoIndex, setModalidadeEditandoIndex] = useState<number>(-1);
  const quantidadeInputRefs = React.useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Estados para seleção de contrato
  const [dialogSelecionarContrato, setDialogSelecionarContrato] = useState(false);
  const [contratosDisponiveis, setContratosDisponiveis] = useState<any[]>([]);
  const [contratoSelecionadoIndex, setContratoSelecionadoIndex] = useState<number>(0);

  // Scroll para linha selecionada
  useEffect(() => {
    if (linhaSelecionada >= 0) {
      const row = document.querySelector(`[data-row-index="${linhaSelecionada}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [linhaSelecionada]);

  // Scroll para contrato selecionado no dialog
  useEffect(() => {
    if (dialogSelecionarContrato && contratoSelecionadoIndex >= 0) {
      const card = document.querySelector(`[data-contrato-index="${contratoSelecionadoIndex}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [contratoSelecionadoIndex, dialogSelecionarContrato]);

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
      // Se estiver em um input de texto, permitir navegação normal
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Ctrl+F - Focar no campo de pesquisa
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const produtoInput = document.querySelector('input[placeholder*="Digite o nome do produto"]') as HTMLInputElement;
        if (produtoInput) {
          produtoInput.focus();
          produtoInput.select();
        }
        return;
      }

      // Ctrl+K - Limpar filtros
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setFiltrosTemp({});
        setFiltros({ page: 1, limit: rowsPerPage });
        setPage(0);
        setLinhaSelecionada(-1);
        return;
      }

      // Ctrl+R - Atualizar dados (apenas se não estiver no modal de gerenciar)
      if (e.ctrlKey && e.key === 'r' && !dialogGerenciarModalidades) {
        e.preventDefault();
        carregarDados();
        return;
      }

      // Ctrl+E - Editar primeira modalidade (no modal de gerenciar)
      if (e.ctrlKey && e.key === 'e' && dialogGerenciarModalidades && !dialogQuantidadeInicial) {
        e.preventDefault();
        if (modalidadesProduto.length > 0) {
          abrirDialogQuantidadeInicial(modalidadesProduto[0]);
          setModalidadeEditandoIndex(0);
        }
        return;
      }

      // Ctrl+R - Registrar consumo na primeira modalidade (no modal de gerenciar)
      if (e.ctrlKey && e.key === 'r' && dialogGerenciarModalidades && !dialogConsumoAberto) {
        e.preventDefault();
        const primeiraModalidadeComSaldo = modalidadesProduto.find(m => m.cadastrada && m.quantidade_disponivel > 0);
        if (primeiraModalidadeComSaldo) {
          abrirConsumoModalidade(primeiraModalidadeComSaldo);
        }
        return;
      }

      // Navegação na tabela principal (quando não há modal aberto)
      if (!dialogGerenciarModalidades && !dialogQuantidadeInicial && !dialogConsumoAberto && !dialogHistoricoOpen && !dialogSelecionarContrato) {
        const produtosAgrupados = agruparPorProduto(dados);

        // Seta para baixo - permitir mesmo em input de pesquisa
        if (e.key === 'ArrowDown' && !e.ctrlKey && !e.altKey) {
          // Se estiver no input de pesquisa, permitir navegação
          if (isInputField && target.getAttribute('placeholder')?.includes('Digite o nome do produto')) {
            e.preventDefault();
            if (linhaSelecionada < 0) {
              setLinhaSelecionada(0);
            } else {
              setLinhaSelecionada(prev => Math.min(prev + 1, produtosAgrupados.length - 1));
            }
          } else if (!isInputField) {
            e.preventDefault();
            if (linhaSelecionada < 0) {
              setLinhaSelecionada(0);
            } else {
              setLinhaSelecionada(prev => Math.min(prev + 1, produtosAgrupados.length - 1));
            }
          }
          return;
        }

        // Seta para cima - permitir mesmo em input de pesquisa
        if (e.key === 'ArrowUp' && !e.ctrlKey && !e.altKey) {
          // Se estiver no input de pesquisa, permitir navegação
          if (isInputField && target.getAttribute('placeholder')?.includes('Digite o nome do produto')) {
            e.preventDefault();
            setLinhaSelecionada(prev => Math.max(prev - 1, 0));
          } else if (!isInputField) {
            e.preventDefault();
            setLinhaSelecionada(prev => Math.max(prev - 1, 0));
          }
          return;
        }

        // Enter - Abrir modal de gerenciar modalidades ou seleção de contrato
        if (e.key === 'Enter' && linhaSelecionada >= 0 && !isInputField) {
          e.preventDefault();
          const produtoSelecionadoItem = produtosAgrupados[linhaSelecionada];
          if (produtoSelecionadoItem) {
            if (produtoSelecionadoItem.contratos.length > 1) {
              abrirDialogSelecionarContrato(produtoSelecionadoItem);
            } else {
              abrirDialogGerenciarModalidades(produtoSelecionadoItem.contratos[0]);
            }
          }
          return;
        }
      }

      // Tab no modal de edição de quantidade - ir para próxima modalidade
      if (e.key === 'Tab' && dialogQuantidadeInicial && !e.shiftKey) {
        e.preventDefault();
        console.log('Tab pressionado - salvando e indo para próxima modalidade');
        salvarEProximaModalidade();
        return;
      }

      // Enter no modal de edição - salvar e fechar
      if (e.key === 'Enter' && dialogQuantidadeInicial) {
        e.preventDefault();
        console.log('Enter pressionado - salvando e fechando');
        salvarQuantidadeInicial();
        return;
      }

      // Escape - Fechar modais
      if (e.key === 'Escape') {
        if (dialogQuantidadeInicial) {
          fecharDialogQuantidadeInicial();
        } else if (dialogConsumoAberto) {
          fecharDialogConsumo();
        } else if (dialogGerenciarModalidades) {
          fecharDialogGerenciarModalidades();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtrosTemp, dados, linhaSelecionada, dialogGerenciarModalidades, dialogQuantidadeInicial, dialogConsumoAberto, dialogHistoricoOpen, modalidadesProduto, modalidadeEditandoIndex]);

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
  const abrirDialogSelecionarContrato = (produto: any) => {
    setContratosDisponiveis(produto.contratos);
    setContratoSelecionadoIndex(0);
    setDialogSelecionarContrato(true);
  };

  const selecionarContrato = (contrato: any) => {
    setDialogSelecionarContrato(false);
    abrirDialogGerenciarModalidades(contrato);
  };

  const abrirDialogGerenciarModalidades = async (produto: any) => {
    console.log('Produto recebido:', produto);
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

      console.log('Modalidades atualizadas:', modalidadesAtualizadas);

      // Se encontrou modalidades, pegar o nome do produto da primeira
      if (modalidadesAtualizadas.length > 0) {
        const produtoAtualizado = {
          ...produto,
          produto_nome: modalidadesAtualizadas[0].produto_nome,
          unidade: modalidadesAtualizadas[0].unidade
        };
        console.log('Produto atualizado:', produtoAtualizado);
        setProdutoSelecionado(produtoAtualizado);
      }

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

    // Garantir que estamos usando o valor correto da quantidade contratada
    const quantidadeContrato = parseFloat(produtoSelecionado.quantidade_contrato as any) || 0;

    // Se modalidadesProduto ainda não foi carregado, usar os dados originais
    if (!modalidadesProduto || modalidadesProduto.length === 0) {
      const totalDistribuido = produtoSelecionado.total_inicial || 0;
      const totalConsumido = produtoSelecionado.total_consumido || 0;
      const disponivelDistribuir = quantidadeContrato - totalDistribuido;
      const totalDisponivel = totalDistribuido - totalConsumido;
      return { totalDistribuido, disponivelDistribuir, totalDisponivel };
    }

    // Calcular com base nas modalidades atuais
    const totalDistribuido = modalidadesProduto.reduce((sum, m) => {
      const valor = parseFloat(m.quantidade_inicial as any) || 0;
      return sum + valor;
    }, 0);

    const totalConsumido = modalidadesProduto.reduce((sum, m) => {
      const valor = parseFloat(m.quantidade_consumida as any) || 0;
      return sum + valor;
    }, 0);

    const disponivelDistribuir = quantidadeContrato - totalDistribuido;
    const totalDisponivel = totalDistribuido - totalConsumido;

    return { totalDistribuido, disponivelDistribuir, totalDisponivel };
  };

  const abrirDialogQuantidadeInicial = (modalidade: any) => {
    setModalidadeSelecionada(modalidade);
    setQuantidadeInicial(modalidade.quantidade_inicial.toString());
    setError(null);
    setDialogQuantidadeInicial(true);

    // Focar no input após um pequeno delay
    setTimeout(() => {
      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  };

  const fecharDialogQuantidadeInicial = () => {
    setDialogQuantidadeInicial(false);
    setModalidadeSelecionada(null);
    setQuantidadeInicial('');
  };

  const salvarQuantidadeInicial = async () => {
    if (!produtoSelecionado || !modalidadeSelecionada) return;

    const novaQuantidade = parseFloat(quantidadeInicial);

    if (isNaN(novaQuantidade) || novaQuantidade < 0) {
      setError('Quantidade deve ser um número válido e não negativo');
      return;
    }

    // Validar se a quantidade inicial não é menor que o consumo já registrado
    const quantidadeConsumida = parseFloat(modalidadeSelecionada.quantidade_consumida as any) || 0;
    if (novaQuantidade < quantidadeConsumida) {
      setError(
        `A quantidade inicial (${formatarNumero(novaQuantidade)}) não pode ser menor que o consumo já registrado (${formatarNumero(quantidadeConsumida)}).\n\n` +
        `Mínimo permitido: ${formatarNumero(quantidadeConsumida)}`
      );
      return;
    }

    // Validar se a soma total não excede a quantidade contratada
    const outrasModalidades = modalidadesProduto.filter((m: any) => m.id !== modalidadeSelecionada.id);
    const somaOutras = outrasModalidades.reduce((sum: number, m: any) => {
      const valor = parseFloat(m.quantidade_inicial) || 0;
      return sum + valor;
    }, 0);
    const somaTotal = somaOutras + novaQuantidade;
    const quantidadeContratada = parseFloat(produtoSelecionado.quantidade_contrato) || 0;
    const disponivelParaDistribuir = quantidadeContratada - somaOutras;

    if (somaTotal > quantidadeContratada) {
      setError(
        `A soma das modalidades (${formatarNumero(somaTotal)}) não pode exceder a quantidade contratada (${formatarNumero(quantidadeContratada)}).\n\n` +
        `Disponível para distribuir: ${formatarNumero(disponivelParaDistribuir)}\n` +
        `Máximo permitido: ${formatarNumero(disponivelParaDistribuir)}`
      );
      return;
    }

    setSalvandoQuantidade(true);

    try {
      await saldoContratosModalidadesService.cadastrarSaldoModalidade({
        contrato_produto_id: produtoSelecionado.contrato_produto_id,
        modalidade_id: modalidadeSelecionada.id,
        quantidade_inicial: novaQuantidade
      });

      success('Quantidade inicial atualizada com sucesso!');

      // Atualizar o estado local das modalidades imediatamente
      setModalidadesProduto(prev =>
        prev.map(m =>
          m.id === modalidadeSelecionada.id
            ? { ...m, quantidade_inicial: novaQuantidade, quantidade_disponivel: novaQuantidade - (m.quantidade_consumida || 0) }
            : m
        )
      );

      fecharDialogQuantidadeInicial();

      // Recarregar dados da tabela principal em background
      carregarDados();
    } catch (error: any) {
      console.error('Erro ao salvar quantidade inicial:', error);
      setError(error.response?.data?.message || 'Erro ao salvar quantidade inicial');
    } finally {
      setSalvandoQuantidade(false);
    }
  };

  const salvarEProximaModalidade = async () => {
    console.log('salvarEProximaModalidade chamada');
    if (!produtoSelecionado || !modalidadeSelecionada) {
      console.log('Produto ou modalidade não selecionados');
      return;
    }

    const novaQuantidade = parseFloat(quantidadeInicial);
    console.log('Nova quantidade:', novaQuantidade);

    if (isNaN(novaQuantidade) || novaQuantidade < 0) {
      setError('Quantidade deve ser um número válido e não negativo');
      return;
    }

    // Validar se a quantidade inicial não é menor que o consumo já registrado
    const quantidadeConsumida = parseFloat(modalidadeSelecionada.quantidade_consumida as any) || 0;
    if (novaQuantidade < quantidadeConsumida) {
      setError(
        `A quantidade inicial (${formatarNumero(novaQuantidade)}) não pode ser menor que o consumo já registrado (${formatarNumero(quantidadeConsumida)}).\n\n` +
        `Mínimo permitido: ${formatarNumero(quantidadeConsumida)}`
      );
      return;
    }

    // Validar se a soma total não excede a quantidade contratada
    const outrasModalidades = modalidadesProduto.filter((m: any) => m.id !== modalidadeSelecionada.id);
    const somaOutras = outrasModalidades.reduce((sum: number, m: any) => {
      const valor = parseFloat(m.quantidade_inicial) || 0;
      return sum + valor;
    }, 0);
    const somaTotal = somaOutras + novaQuantidade;
    const quantidadeContratada = parseFloat(produtoSelecionado.quantidade_contrato) || 0;

    if (somaTotal > quantidadeContratada) {
      setError(`A soma das modalidades não pode exceder a quantidade contratada`);
      return;
    }

    setSalvandoQuantidade(true);
    console.log('Iniciando salvamento...');

    try {
      await saldoContratosModalidadesService.cadastrarSaldoModalidade({
        contrato_produto_id: produtoSelecionado.contrato_produto_id,
        modalidade_id: modalidadeSelecionada.id,
        quantidade_inicial: novaQuantidade
      });

      // Atualizar o estado local das modalidades imediatamente
      setModalidadesProduto(prev =>
        prev.map(m =>
          m.id === modalidadeSelecionada.id
            ? { ...m, quantidade_inicial: novaQuantidade, quantidade_disponivel: novaQuantidade - (m.quantidade_consumida || 0), cadastrada: true }
            : m
        )
      );

      // Ir para próxima modalidade
      const proximoIndex = modalidadeEditandoIndex + 1;
      if (proximoIndex < modalidadesProduto.length) {
        const proximaModalidade = modalidadesProduto[proximoIndex];
        setModalidadeSelecionada(proximaModalidade);
        setQuantidadeInicial(proximaModalidade.quantidade_inicial.toString());
        setModalidadeEditandoIndex(proximoIndex);
        setError(null);

        // Focar no input após um pequeno delay
        setTimeout(() => {
          const input = document.querySelector('input[type="number"]') as HTMLInputElement;
          if (input) {
            input.focus();
            input.select();
          }
        }, 100);
      } else {
        // Última modalidade, fechar
        fecharDialogQuantidadeInicial();
        success('Todas as quantidades foram atualizadas!');
      }

      // Recarregar dados da tabela principal em background
      carregarDados();
    } catch (error: any) {
      console.error('Erro ao salvar quantidade inicial:', error);
      setError(error.response?.data?.message || 'Erro ao salvar quantidade inicial');
    } finally {
      setSalvandoQuantidade(false);
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

    // Focar no input de quantidade após um pequeno delay
    setTimeout(() => {
      const input = document.querySelector('input[name="quantidade-consumo"]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
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

  // Agrupar dados por produto (somando todos os contratos)
  const agruparPorProduto = (itens: SaldoContratoModalidadeItem[]) => {
    const grupos: { [key: string]: any } = {};

    itens.forEach(item => {
      const chave = item.produto_nome; // Agrupar por nome do produto

      if (!grupos[chave]) {
        grupos[chave] = {
          produto_nome: item.produto_nome,
          unidade: item.unidade,
          contratos: [],
          total_inicial: 0,
          total_consumido: 0,
          total_disponivel: 0,
          quantidade_contrato_total: 0
        };
      }

      // Verificar se já existe este contrato_produto_id
      const contratoExistente = grupos[chave].contratos.find((c: any) => c.contrato_produto_id === item.contrato_produto_id);

      if (!contratoExistente) {
        // Calcular totais para este contrato_produto_id
        const modalidadesDoContrato = itens.filter(i => i.contrato_produto_id === item.contrato_produto_id);
        const totalInicial = modalidadesDoContrato.reduce((sum, m) => sum + (parseFloat(m.quantidade_inicial as any) || 0), 0);
        const totalConsumido = modalidadesDoContrato.reduce((sum, m) => sum + (parseFloat(m.quantidade_consumida as any) || 0), 0);
        const totalDisponivel = modalidadesDoContrato.reduce((sum, m) => sum + (parseFloat(m.quantidade_disponivel as any) || 0), 0);

        grupos[chave].contratos.push({
          contrato_produto_id: item.contrato_produto_id,
          contrato_numero: item.contrato_numero,
          fornecedor_nome: item.fornecedor_nome,
          preco_unitario: item.preco_unitario,
          quantidade_contrato: item.quantidade_contrato,
          total_inicial: totalInicial,
          total_consumido: totalConsumido,
          total_disponivel: totalDisponivel,
          modalidades: modalidadesDoContrato
        });

        grupos[chave].total_inicial += totalInicial;
        grupos[chave].total_consumido += totalConsumido;
        grupos[chave].total_disponivel += totalDisponivel;
        grupos[chave].quantidade_contrato_total += parseFloat(item.quantidade_contrato as any) || 0;
      }
    });

    return Object.values(grupos).map((grupo: any) => ({
      ...grupo,
      status: grupo.total_disponivel <= 0 ? 'ESGOTADO' :
        grupo.total_disponivel <= (grupo.total_inicial * 0.1) ? 'BAIXO_ESTOQUE' : 'DISPONIVEL'
    }));
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>
          Saldo de Contratos por Modalidade
        </Typography>

        <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              placeholder="Pesquisar produto..."
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
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>),
                endAdornment: filtrosTemp.produto_nome && (<InputAdornment position="end"><IconButton size="small" onClick={() => { setFiltrosTemp({}); setFiltros({ page: 1, limit: rowsPerPage }); setPage(0); }}><CancelIcon fontSize="small" /></IconButton></InputAdornment>)
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" startIcon={<FilterIcon />}>
                Filtros
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontSize: '0.8rem' }}>
            {`Mostrando ${Math.min(page * rowsPerPage + 1, total)}-${Math.min((page + 1) * rowsPerPage, total)} de ${total} produtos`}
          </Typography>
        </Card>

        {/* Ações */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">
            Resultados ({agruparPorProduto(dados).length} produtos)
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Box display="flex" gap={1}>
            <Tooltip title="Atualizar">
              <IconButton size="small" onClick={carregarDados} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportarCSV} disabled={loading}>
              Exportar CSV
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>Carregando...</Typography>
            </CardContent>
          </Card>
        ) : total === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                Nenhum produto encontrado
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table sx={{ minWidth: 1200 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Produto</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Unidade</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Total Inicial</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Total Consumido</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Total Disponível</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && dados.length > 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : dados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Nenhum resultado encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    agruparPorProduto(dados).map((produto, index) => (
                      <TableRow
                        key={produto.produto_nome}
                        data-row-index={index}
                        hover
                        sx={{
                          backgroundColor: linhaSelecionada === index ? '#e3f2fd' : 'inherit',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: linhaSelecionada === index ? '#bbdefb' : undefined
                          }
                        }}
                        onClick={() => setLinhaSelecionada(index)}
                        onDoubleClick={() => produto.contratos.length > 1 ? abrirDialogSelecionarContrato(produto) : abrirDialogGerenciarModalidades(produto.contratos[0])}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {produto.produto_nome}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {produto.contratos.length} contrato(s)
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{produto.unidade}</TableCell>
                        <TableCell align="right">{formatarNumero(produto.total_inicial)}</TableCell>
                        <TableCell align="right">{formatarNumero(produto.total_consumido)}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {formatarNumero(produto.total_disponivel)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={produto.status}
                            color={getStatusColor(produto.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => produto.contratos.length > 1 ? abrirDialogSelecionarContrato(produto) : abrirDialogGerenciarModalidades(produto.contratos[0])}
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

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => {
                setPage(newPage);
                setFiltros({ ...filtros, page: newPage + 1 });
              }}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                const newRowsPerPage = parseInt(event.target.value, 10);
                setRowsPerPage(newRowsPerPage);
                setPage(0);
                setFiltros({ ...filtros, page: 1, limit: newRowsPerPage });
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Itens por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          </Paper>
        )}



        {/* Modal de Seleção de Contrato */}
        <Dialog
          open={dialogSelecionarContrato}
          onClose={() => setDialogSelecionarContrato(false)}
          maxWidth="sm"
          fullWidth
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setContratoSelecionadoIndex(prev => Math.min(prev + 1, contratosDisponiveis.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setContratoSelecionadoIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (contratosDisponiveis[contratoSelecionadoIndex]) {
                selecionarContrato(contratosDisponiveis[contratoSelecionadoIndex]);
              }
            } else if (e.key === 'Escape') {
              setDialogSelecionarContrato(false);
            }
          }}
        >
          <DialogTitle>Selecione o Contrato</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Este produto está em múltiplos contratos. Selecione qual deseja gerenciar:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip label="↑↓ Navegar" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                <Chip label="Enter Selecionar" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                <Chip label="Esc Cancelar" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {contratosDisponiveis.map((contrato, index) => (
                <Card
                  key={contrato.contrato_produto_id}
                  data-contrato-index={index}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: contratoSelecionadoIndex === index ? '#e3f2fd' : 'inherit',
                    '&:hover': { bgcolor: contratoSelecionadoIndex === index ? '#bbdefb' : 'action.hover' },
                    border: '2px solid',
                    borderColor: contratoSelecionadoIndex === index ? 'primary.main' : 'divider',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    setContratoSelecionadoIndex(index);
                    selecionarContrato(contrato);
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Contrato {contrato.contrato_numero}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Fornecedor:</strong> {contrato.fornecedor_nome}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Quantidade:</strong> {formatarNumero(contrato.quantidade_contrato)} {contratosDisponiveis[0]?.modalidades[0]?.unidade || ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Preço Unitário:</strong> {formatarMoeda(contrato.preco_unitario)}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                      <Chip label={`Inicial: ${formatarNumero(contrato.total_inicial)}`} size="small" color="primary" variant="outlined" />
                      <Chip label={`Consumido: ${formatarNumero(contrato.total_consumido)}`} size="small" color="warning" variant="outlined" />
                      <Chip label={`Disponível: ${formatarNumero(contrato.total_disponivel)}`} size="small" color="success" variant="outlined" />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button size="small" onClick={() => setDialogSelecionarContrato(false)}>Cancelar</Button>
          </DialogActions>
        </Dialog>

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
                <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
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
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 'bold',
                      mt: 1
                    }}
                  >
                    <strong>Total Disponível para Consumo:</strong> {formatarNumero(calcularTotaisAtuais().totalDisponivel)} {produtoSelecionado.unidade}
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
                            onEditarQuantidadeInicial={abrirDialogQuantidadeInicial}
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
            <Button size="small" onClick={fecharDialogGerenciarModalidades}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Quantidade Inicial */}
        <Dialog
          open={dialogQuantidadeInicial}
          onClose={fecharDialogQuantidadeInicial}
          maxWidth="sm"
          fullWidth
          onKeyDown={(e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              console.log('Tab capturado no Dialog');
              salvarEProximaModalidade();
            } else if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              console.log('Enter capturado no Dialog');
              salvarQuantidadeInicial();
            }
          }}
        >
          <DialogTitle sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <EditIcon />
              Editar Quantidade Inicial
            </Box>
            {modalidadeSelecionada && (
              <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                Modalidade: {modalidadeSelecionada.nome}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            {modalidadeSelecionada && produtoSelecionado && (
              <Box sx={{ pt: 2 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Define a quantidade inicial disponível para esta modalidade. Esta é a quantidade que será distribuída do contrato.
                </Alert>

                <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1, border: 2, borderColor: 'primary.main' }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Produto:</strong> {produtoSelecionado.produto_nome || produtoSelecionado.nome || 'N/A'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Contrato:</strong> {produtoSelecionado.contrato_numero || 'N/A'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Quantidade Contratada:</strong> {formatarNumero(produtoSelecionado.quantidade_contrato)} {produtoSelecionado.unidade}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Já Distribuído (outras modalidades):</strong> {formatarNumero(calcularTotaisAtuais().totalDistribuido - (modalidadeSelecionada.quantidade_inicial || 0))} {produtoSelecionado.unidade}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Quantidade Atual desta Modalidade:</strong> {formatarNumero(modalidadeSelecionada.quantidade_inicial || 0)} {produtoSelecionado.unidade}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: calcularTotaisAtuais().disponivelDistribuir < 0 ? 'error.main' : 'success.main',
                      fontWeight: 'bold'
                    }}
                  >
                    <strong>Disponível para Redistribuir:</strong> {(() => {
                      const totais = calcularTotaisAtuais();
                      const quantidadeAtual = parseFloat(modalidadeSelecionada.quantidade_inicial as any) || 0;
                      const disponivel = totais.disponivelDistribuir + quantidadeAtual;
                      return formatarNumero(disponivel);
                    })()} {produtoSelecionado.unidade}
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  label="Quantidade Inicial"
                  type="number"
                  value={quantidadeInicial}
                  onChange={(e) => setQuantidadeInicial(e.target.value)}
                  inputProps={{
                    min: 0,
                    step: 0.01
                  }}
                  helperText={`Defina a quantidade inicial para ${modalidadeSelecionada.nome}`}
                  autoFocus
                />

                {error && (
                  <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
                    {error}
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button size="small" onClick={fecharDialogQuantidadeInicial} disabled={salvandoQuantidade}>
              Cancelar
            </Button>
            <Button
              onClick={salvarQuantidadeInicial}
              variant="contained"
              disabled={salvandoQuantidade || !quantidadeInicial || parseFloat(quantidadeInicial) < 0}
              color="success"
              startIcon={salvandoQuantidade ? <CircularProgress size={16} /> : <SaveIcon />}
            >
              {salvandoQuantidade ? 'Salvando...' : 'Salvar Quantidade'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Registro de Consumo */}
        <Dialog open={dialogConsumoAberto} onClose={fecharDialogConsumo} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', gap: 1 }}>
            <RestaurantIcon />
            Registrar Consumo
          </DialogTitle>
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
                      name="quantidade-consumo"
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
            <Button size="small" onClick={fecharDialogConsumo} disabled={registrandoConsumo}>
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
            <Button size="small" onClick={fecharDialogHistorico}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>


      </Box>
    </Box>
  );
};

export default SaldoContratosModalidades;