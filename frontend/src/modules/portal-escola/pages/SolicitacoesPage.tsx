import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Box, Button, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, IconButton, Tooltip, Autocomplete, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Alert,
  Typography
} from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../components/DataTable";
import { 
  ShoppingCart as ShoppingCartIcon, Add as AddIcon, Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon, Visibility as VisibilityIcon
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { useToast } from "../../../hooks/useToast";
import {
  listarMinhasSolicitacoes, criarSolicitacao, cancelarSolicitacao,
  Solicitacao, NovoItemData,
} from "../../../services/solicitacoesAlimentos";
import { produtoService, Produto } from "../../../services/produtoService";

export default function SolicitacoesPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [novaOpen, setNovaOpen] = useState(false);
  const [novaObs, setNovaObs] = useState('');
  const [novaItens, setNovaItens] = useState<NovoItemData[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<Solicitacao | null>(null);
  
  // Estados para o formulário de adicionar item
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [unidade, setUnidade] = useState<string>('kg');

  // Helper para formatar data
  const formatarData = (dataStr: string | null | undefined): string => {
    if (!dataStr) return '-';
    try {
      // Tenta parsear a data
      const data = new Date(dataStr);
      
      // Verifica se é uma data válida
      if (isNaN(data.getTime())) {
        console.warn('Data inválida:', dataStr);
        return '-';
      }
      
      // Formata a data
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', dataStr, error);
      return '-';
    }
  };

  useEffect(() => {
    carregarSolicitacoes();
    produtoService.listar()
      .then(prods => setProdutos(prods))
      .catch(err => {
        console.error('❌ Erro ao carregar produtos:', err);
        toast.error('Erro ao carregar lista de produtos');
      });
  }, []);

  const carregarSolicitacoes = async () => {
    setLoading(true);
    try {
      const data = await listarMinhasSolicitacoes();
      console.log('📋 Solicitações carregadas:', data);
      setSolicitacoes(data);
    } catch {
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarSolicitacao = async () => {
    if (novaItens.length === 0) {
      toast.error('Adicione ao menos um item à solicitação');
      return;
    }

    setSalvando(true);
    try {
      await criarSolicitacao({ observacao: novaObs, itens: novaItens });
      toast.success('Solicitação criada com sucesso!');
      setNovaOpen(false);
      setNovaObs('');
      setNovaItens([]);
      setProdutoSelecionado(null);
      setQuantidade(1);
      setUnidade('kg');
      carregarSolicitacoes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao criar solicitação');
    } finally {
      setSalvando(false);
    }
  };

  const handleAdicionarItem = () => {
    if (!produtoSelecionado) {
      toast.error('Selecione um produto');
      return;
    }
    if (quantidade <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    const novoItem: NovoItemData = {
      produto_id: produtoSelecionado.id,
      nome_produto: produtoSelecionado.nome,
      quantidade,
      unidade
    };

    setNovaItens([...novaItens, novoItem]);
    
    // Limpar campos
    setProdutoSelecionado(null);
    setQuantidade(1);
    setUnidade('kg');
    
    toast.success('Item adicionado à lista');
  };

  const handleRemoverItem = (index: number) => {
    setNovaItens(novaItens.filter((_, i) => i !== index));
    toast.success('Item removido da lista');
  };

  const handleCancelar = async (id: number) => {
    const solicitacao = solicitacoes.find(s => s.id === id);
    const mensagem = solicitacao 
      ? `Deseja realmente cancelar a solicitação #${id} com ${solicitacao.itens?.length || 0} item(ns)?`
      : 'Deseja realmente cancelar esta solicitação?';
    
    if (!window.confirm(mensagem)) return;
    
    try {
      await cancelarSolicitacao(id);
      toast.success('Solicitação cancelada com sucesso!');
      carregarSolicitacoes();
    } catch (error: any) {
      const mensagemErro = error.response?.data?.message || 'Erro ao cancelar solicitação';
      toast.error(mensagemErro);
    }
  };

  const handleVerDetalhes = (solicitacao: Solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setDetalhesOpen(true);
  };

  const columns: ColumnDef<Solicitacao>[] = [
    { accessorKey: 'id', header: 'ID', size: 80 },
    {
      accessorKey: 'created_at',
      header: 'Data',
      size: 120,
      cell: ({ getValue }) => formatarData(getValue() as string)
    },
    { 
      accessorKey: 'total_itens', 
      header: 'Qtd Itens', 
      size: 100,
      cell: ({ row }) => {
        const itens = row.original.itens || [];
        return `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`;
      }
    },
    {
      id: 'itens_nomes',
      header: 'Produtos',
      cell: ({ row }) => {
        const itens = row.original.itens || [];
        if (itens.length === 0) return '-';
        const nomes = itens.map(i => i.nome_produto).join(', ');
        return (
          <Box 
            sx={{ 
              maxWidth: 300, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap' 
            }}
            title={nomes}
          >
            {nomes}
          </Box>
        );
      }
    },
    { accessorKey: 'observacao', header: 'Observação' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as string;
        const colors: Record<string, string> = {
          pendente: 'warning',
          aprovada: 'success',
          rejeitada: 'error',
          cancelada: 'default'
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
      size: 120,
      cell: ({ row }) => {
        const sol = row.original;
        console.log('Status da solicitação:', sol.id, sol.status);
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Ver Detalhes">
              <IconButton 
                size="small" 
                color="primary" 
                onClick={() => handleVerDetalhes(sol)}
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'primary.lighter' 
                  } 
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {sol.status === 'pendente' && (
              <Tooltip title="Cancelar Solicitação">
                <IconButton 
                  size="small" 
                  color="error" 
                  onClick={() => handleCancelar(sol.id)}
                  sx={{ 
                    '&:hover': { 
                      bgcolor: 'error.lighter' 
                    } 
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      }
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
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: 'background.default', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader
          title="Solicitações de Alimentos"
          subtitle="Gerencie suas solicitações de alimentos"
          breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Portal Escola' }, { label: 'Solicitações' }]}
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/portal-escola')}
          >
            Voltar ao Portal
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNovaOpen(true)}
          >
            Nova Solicitação
          </Button>
        </Box>

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable title="Solicitações" columns={columns} data={solicitacoes} />
        </Box>
      </PageContainer>

      {/* Dialog Nova Solicitação */}
      <Dialog open={novaOpen} onClose={() => setNovaOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nova Solicitação</DialogTitle>
        <DialogContent>
          <TextField
            label="Observação"
            fullWidth
            multiline
            rows={2}
            value={novaObs}
            onChange={(e) => setNovaObs(e.target.value)}
            sx={{ mt: 2, mb: 3 }}
          />

          {/* Formulário para adicionar item */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Adicionar Item
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Autocomplete
                options={produtos}
                getOptionLabel={(p) => p.nome}
                value={produtoSelecionado}
                onChange={(_, prod) => {
                  setProdutoSelecionado(prod);
                  if (prod) {
                    setUnidade(prod.unidade || 'kg');
                  }
                }}
                renderInput={(params) => <TextField {...params} label="Produto" size="small" />}
                sx={{ flex: 2 }}
              />
              <TextField
                label="Quantidade"
                type="number"
                size="small"
                value={quantidade}
                onChange={(e) => setQuantidade(parseFloat(e.target.value) || 0)}
                sx={{ width: 120 }}
                inputProps={{ min: 0, step: 0.1 }}
              />
              <TextField
                label="Unidade"
                size="small"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                sx={{ width: 100 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdicionarItem}
                sx={{ minWidth: 120 }}
              >
                Adicionar
              </Button>
            </Box>
          </Paper>

          {/* Lista de itens adicionados */}
          {novaItens.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Itens da Solicitação ({novaItens.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell align="center">Quantidade</TableCell>
                      <TableCell align="center" width={80}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {novaItens.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.nome_produto}</TableCell>
                        <TableCell align="center">{item.quantidade} {item.unidade}</TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleRemoverItem(idx)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {novaItens.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Nenhum item adicionado ainda. Use o formulário acima para adicionar produtos à solicitação.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setNovaOpen(false);
            setNovaItens([]);
            setNovaObs('');
            setProdutoSelecionado(null);
            setQuantidade(1);
            setUnidade('kg');
          }}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCriarSolicitacao} 
            disabled={salvando || novaItens.length === 0}
          >
            {salvando ? 'Salvando...' : 'Criar Solicitação'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Detalhes da Solicitação */}
      <Dialog open={detalhesOpen} onClose={() => setDetalhesOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes da Solicitação #{solicitacaoSelecionada?.id}</DialogTitle>
        <DialogContent>
          {solicitacaoSelecionada && (
            <>
              <Box sx={{ mb: 3, mt: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <strong>Data:</strong> {formatarData(solicitacaoSelecionada.created_at)}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <strong>Status:</strong>{' '}
                    <Chip
                      label={solicitacaoSelecionada.status.toUpperCase()}
                      size="small"
                      color={
                        solicitacaoSelecionada.status === 'pendente' ? 'warning' :
                        solicitacaoSelecionada.status === 'concluida' ? 'success' :
                        solicitacaoSelecionada.status === 'cancelada' ? 'default' : 'info'
                      }
                    />
                  </Box>
                </Box>
                {solicitacaoSelecionada.observacao && (
                  <Box sx={{ mb: 2 }}>
                    <strong>Observação:</strong> {solicitacaoSelecionada.observacao}
                  </Box>
                )}
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell align="center">Quantidade</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {solicitacaoSelecionada.itens?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.nome_produto}</TableCell>
                        <TableCell align="center">{item.quantidade} {item.unidade}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.status.toUpperCase()}
                            size="small"
                            color={
                              item.status === 'pendente' ? 'warning' :
                              item.status === 'aceito' ? 'success' : 'error'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {solicitacaoSelecionada.respondido_por_nome && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <strong>Respondido por:</strong> {solicitacaoSelecionada.respondido_por_nome}
                  {solicitacaoSelecionada.respondido_em && (
                    <> em {formatarData(solicitacaoSelecionada.respondido_em)}</>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalhesOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
