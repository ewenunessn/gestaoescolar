import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import pedidosService from '../services/pedidos';
import { listarFaturamentosPedido, deletarFaturamento, criarFaturamento } from '../services/faturamentos';
import { PedidoDetalhado } from '../types/pedido';
import { formatarMoeda, formatarData } from '../utils/dateUtils';

interface FaturamentoResumo {
  faturamento_id: number;
  data_faturamento: string;
  usuario_nome: string;
  total_itens: number;
  total_modalidades: number;
  valor_total: number;
}

export default function FaturamentosPedido() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
  const [faturamentos, setFaturamentos] = useState<FaturamentoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const pedidoData = await pedidosService.buscarPorId(Number(id));
      setPedido(pedidoData);

      // Carregar faturamentos e agrupar por faturamento_id
      const faturamentosData = await listarFaturamentosPedido(Number(id));
      
      // Agrupar por faturamento_id
      const faturamentosMap = new Map<number, FaturamentoResumo>();
      
      faturamentosData.forEach(fat => {
        if (!faturamentosMap.has(fat.faturamento_id)) {
          faturamentosMap.set(fat.faturamento_id, {
            faturamento_id: fat.faturamento_id,
            data_faturamento: fat.data_faturamento,
            usuario_nome: fat.usuario_nome || 'Sistema',
            total_itens: 0,
            total_modalidades: new Set<number>().size,
            valor_total: 0
          });
        }
        
        const resumo = faturamentosMap.get(fat.faturamento_id)!;
        resumo.total_itens++;
        resumo.valor_total += Number(fat.valor_total);
      });

      // Contar modalidades únicas por faturamento
      faturamentosData.forEach(fat => {
        const resumo = faturamentosMap.get(fat.faturamento_id)!;
        if (!resumo.total_modalidades) {
          resumo.total_modalidades = 0;
        }
      });

      // Contar modalidades corretamente
      const modalidadesPorFaturamento = new Map<number, Set<number>>();
      faturamentosData.forEach(fat => {
        if (!modalidadesPorFaturamento.has(fat.faturamento_id)) {
          modalidadesPorFaturamento.set(fat.faturamento_id, new Set());
        }
        modalidadesPorFaturamento.get(fat.faturamento_id)!.add(fat.modalidade_id);
      });

      modalidadesPorFaturamento.forEach((modalidades, fatId) => {
        const resumo = faturamentosMap.get(fatId)!;
        resumo.total_modalidades = modalidades.size;
      });

      setFaturamentos(Array.from(faturamentosMap.values()));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setErro('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const criarNovoFaturamento = async () => {
    try {
      setLoading(true);
      
      // Criar faturamento vazio
      const resultado = await criarFaturamento({
        pedido_id: Number(id),
        itens: [] // Será preenchido na próxima tela
      }) as any;

      setSucesso('Faturamento criado! Redirecionando...');
      
      // Redirecionar para a tela de edição
      setTimeout(() => {
        navigate(`/pedidos/${id}/faturamento/${resultado.data.faturamento.id}`);
      }, 1000);
    } catch (error) {
      console.error('Erro ao criar faturamento:', error);
      setErro('Erro ao criar faturamento');
      setLoading(false);
    }
  };

  const editarFaturamento = (faturamentoId: number) => {
    navigate(`/pedidos/${id}/faturamento/${faturamentoId}`);
  };

  const excluirFaturamento = async (faturamentoId: number) => {
    if (!confirm('Tem certeza que deseja excluir este faturamento?')) {
      return;
    }

    try {
      await deletarFaturamento(faturamentoId);
      setSucesso('Faturamento excluído com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir faturamento:', error);
      setErro('Erro ao excluir faturamento');
    }
  };

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Carregando...</Typography></Box>;
  }

  if (!pedido) {
    return <Box sx={{ p: 3 }}><Alert severity="error">Pedido não encontrado</Alert></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs 
        items={[
          { label: 'Pedidos', path: '/pedidos', icon: <ShoppingCartIcon fontSize="small" /> },
          { label: `Pedido ${pedido.numero}`, path: `/pedidos/${id}` },
          { label: 'Faturamentos' }
        ]}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Faturamentos do Pedido {pedido.numero}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={criarNovoFaturamento}
            disabled={loading}
          >
            Criar Faturamento
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/pedidos/${id}`)}
          >
            Voltar
          </Button>
        </Box>
      </Box>

      {erro && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>{erro}</Alert>}
      {sucesso && <Alert severity="success" sx={{ mb: 3 }}>{sucesso}</Alert>}

      <Card>
        <CardContent>
          {faturamentos.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Nenhum faturamento criado ainda
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clique em "Criar Faturamento" para começar
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Usuário</TableCell>
                    <TableCell align="center">Itens</TableCell>
                    <TableCell align="center">Modalidades</TableCell>
                    <TableCell align="right">Valor Total</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {faturamentos.map((fat) => (
                    <TableRow key={fat.faturamento_id} hover>
                      <TableCell>#{fat.faturamento_id}</TableCell>
                      <TableCell>{formatarData(fat.data_faturamento)}</TableCell>
                      <TableCell>{fat.usuario_nome}</TableCell>
                      <TableCell align="center">{fat.total_itens}</TableCell>
                      <TableCell align="center">{fat.total_modalidades}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold" color="success.main">
                          {formatarMoeda(fat.valor_total)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={fat.total_itens > 0 ? "Completo" : "Vazio"} 
                          color={fat.total_itens > 0 ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => editarFaturamento(fat.faturamento_id)}
                          title="Editar"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => excluirFaturamento(fat.faturamento_id)}
                          title="Excluir"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
