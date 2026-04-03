import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, Typography, Grid, Chip, CircularProgress, Alert, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete } from "@mui/material";
import { School as SchoolIcon, Inventory as InventoryIcon, CheckCircle as CheckCircleIcon, Warning as WarningIcon, Restaurant as RestaurantIcon, Dashboard as DashboardIcon, Assignment as AssignmentIcon, Warehouse as WarehouseIcon, Add as AddIcon, Delete as DeleteIcon, ShoppingCart as ShoppingCartIcon } from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import ViewTabs from "../../../components/ViewTabs";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import {
  listarMinhasSolicitacoes, criarSolicitacao, cancelarSolicitacao,
  Solicitacao, NovoItemData,
} from "../../../services/solicitacoesAlimentos";
import { listarProdutos, Produto } from "../../../services/produtoService";

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function PortalEscola() {
  const navigate = useNavigate();
  const [escola, setEscola] = useState<any>(null);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [cardapios, setCardapios] = useState<any[]>([]);
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState(0); // 0=Dashboard, 1=Guia de Demanda, 2=Cardápio, 3=Solicitações

  // Estado das solicitações
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loadingSol, setLoadingSol] = useState(false);
  const [novaOpen, setNovaOpen] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  // itens do formulário de nova solicitação
  const [novaObs, setNovaObs] = useState('');
  const [novaItens, setNovaItens] = useState<NovoItemData[]>([{ nome_produto: '', quantidade: 1, unidade: 'kg', produto_id: undefined }]);
  const [salvandoSol, setSalvandoSol] = useState(false);
  const toast = useToast();

  useEffect(() => {
    carregarDados();
    listarProdutos()
      .then(prods => {
        console.log('📦 Produtos carregados:', prods.length);
        setProdutos(prods);
      })
      .catch(err => {
        console.error('❌ Erro ao carregar produtos:', err);
        toast.error('Erro ao carregar lista de produtos');
      });
  }, []);

  useEffect(() => {
    if (abaAtiva === 3) carregarSolicitacoes();
  }, [abaAtiva]);

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
      setNovaObs('');
      setNovaItens([{ nome_produto: '', quantidade: 1, unidade: 'kg', produto_id: undefined }]);
      carregarSolicitacoes();
    } catch {
      toast.error('Erro ao enviar solicitação');
    } finally {
      setSalvandoSol(false);
    }
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
      setErro(error.response?.data?.message || 'Erro ao carregar dados da escola");
    } finally {
      setLoading(false);
    }
  };

  const modalidadesUnicas = Array.from(new Set(cardapios.map(c => c.modalidade_id)))
    .map(id => cardapios.find(c => c.modalidade_id === id))
    .filter(Boolean);

  const cardapiosFiltrados = modalidadesUnicas.length > 0
    ? cardapios.filter(c => c.modalidade_id === modalidadesUnicas[modalidadeSelecionada]?.modalidade_id)
    : [];

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
      />

      {/* ViewTabs para navegação */}
      <Box sx={{ mb: 3 }}>
        <ViewTabs
          value={abaAtiva}
          onChange={setAbaAtiva}
          tabs={[
            { value: 0, label: 'Dashboard', icon: <DashboardIcon /> },
            { value: 1, label: 'Guia de Demanda', icon: <AssignmentIcon /> },
            { value: 2, label: 'Cardápio', icon: <RestaurantIcon /> },
            { value: 3, label: 'Solicitações', icon: <ShoppingCartIcon /> },
          ]}
        />
      </Box>

      {/* Conteúdo da aba Dashboard */}
      {abaAtiva === 0 && (
        <Grid container spacing={2}>
          {/* Cards de Estatísticas */}
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <InventoryIcon sx={{ color: 'primary.main' }} />
                <Typography variant="caption" color="text.secondary">Total de Guias</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats?.total_guias || 0}
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <InventoryIcon sx={{ color: 'info.main' }} />
                <Typography variant="caption" color="text.secondary">Produtos</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                {stats?.total_produtos || 0}
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WarningIcon sx={{ color: 'warning.main' }} />
                <Typography variant="caption" color="text.secondary">Pendentes</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                {stats?.pendentes || 0}
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon sx={{ color: 'success.main' }} />
                <Typography variant="caption" color="text.secondary">Entregues</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                {stats?.entregues || 0}
              </Typography>
            </Card>
          </Grid>

          {/* Informações da Escola */}
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3, borderRadius: '12px' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon />
                Informações da Escola
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Nome</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {escola?.nome}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Código</Typography>
                  <Typography variant="body1">{escola?.codigo || '—'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Endereço</Typography>
                  <Typography variant="body1">{escola?.endereco || '—'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={escola?.ativo ? 'Ativa' : 'Inativa'} 
                    color={escola?.ativo ? 'success' : 'default'} 
                    size="small" 
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Alunos por Modalidade */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, borderRadius: '12px', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Alunos por Modalidade
              </Typography>
              
              {/* Total de Alunos */}
              <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.lighter', borderRadius: '8px' }}>
                <Typography variant="body2" color="text.secondary">Total de Alunos</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {totalAlunos}
                </Typography>
              </Box>

              {/* Lista de Modalidades */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {modalidades.length > 0 ? (
                  modalidades.map((mod) => (
                    <Box 
                      key={mod.id} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: '8px'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {mod.nome}
                      </Typography>
                      <Chip 
                        label={mod.quantidade_alunos} 
                        size="small" 
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma modalidade cadastrada
                  </Typography>
                )}
              </Box>
            </Card>
          </Grid>

          {/* Informações Adicionais */}
          <Grid item xs={12}>
            <Card sx={{ p: 3, borderRadius: '12px', bgcolor: 'info.lighter' }}>
              <Typography variant="body2" color="info.dark">
                <strong>Bem-vindo ao Portal da Escola!</strong> Aqui você pode acompanhar as guias de demanda, 
                entregas e outras informações relacionadas à sua escola.
              </Typography>
            </Card>
          </Grid>

          {/* Botão para Estoque da Escola */}
          <Grid item xs={12}>
            <Card sx={{ p: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <WarehouseIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Estoque da Escola
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gerencie o estoque de produtos da sua escola
                    </Typography>
                  </Box>
                </Box>
                <Button 
                  variant="contained" 
                  size="large"
                  startIcon={<WarehouseIcon />}
                  onClick={() => navigate('/estoque-escola-portal')}
                >
                  Acessar Estoque
                </Button>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Conteúdo da aba Guia de Demanda */}
      {abaAtiva === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ p: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AssignmentIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">
                  Guias de Demanda
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Cards de resumo das guias */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: '8px' }}>
                      <Typography variant="body2" color="text.secondary">Total de Guias</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {stats?.total_guias || 0}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: '8px' }}>
                      <Typography variant="body2" color="text.secondary">Pendentes</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {stats?.pendentes || 0}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: '8px' }}>
                      <Typography variant="body2" color="text.secondary">Entregues</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {stats?.entregues || 0}
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                {/* Informação sobre as guias */}
                <Alert severity="info">
                  As guias de demanda contêm informações sobre os produtos que sua escola vai receber. 
                  Acompanhe o status de cada guia e os produtos solicitados.
                </Alert>

                {/* Placeholder para lista de guias */}
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Lista de guias será exibida aqui
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Conteúdo da aba Cardápio */}
      {abaAtiva === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ p: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <RestaurantIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">
                  Cardápio da Semana
                </Typography>
              </Box>

              {cardapios.length > 0 ? (
                <>
                  {/* Tabs de Modalidades */}
                  {modalidadesUnicas.length > 1 && (
                    <Tabs 
                      value={modalidadeSelecionada} 
                      onChange={(_, v) => setModalidadeSelecionada(v)}
                      sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                    >
                      {modalidadesUnicas.map((mod) => (
                        <Tab key={mod.modalidade_id} label={mod.modalidade_nome} />
                      ))}
                    </Tabs>
                  )}

                  {/* Tabela de Cardápios */}
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Dia</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Refeições</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cardapiosFiltrados.length > 0 ? (
                          cardapiosFiltrados.map((cardapio) => {
                            const data = new Date(cardapio.ano, cardapio.mes - 1, cardapio.dia);
                            const diaSemana = DIAS_SEMANA[data.getDay()];
                            const dataFormatada = data.toLocaleDateString('pt-BR');
                            
                            return (
                              <TableRow key={`${cardapio.id}-${cardapio.dia}`} hover>
                                <TableCell sx={{ fontWeight: 500 }}>{diaSemana}</TableCell>
                                <TableCell>{dataFormatada}</TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {cardapio.refeicoes && cardapio.refeicoes.length > 0 ? (
                                      cardapio.refeicoes.map((ref: any) => (
                                        <Chip 
                                          key={ref.id}
                                          label={ref.nome}
                                          size="small"
                                          sx={{ fontSize: '0.75rem' }}
                                        />
                                      ))
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">
                                        Sem refeições cadastradas
                                      </Typography>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                Nenhum cardápio cadastrado para esta semana
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Alert severity="info">
                  Nenhum cardápio cadastrado para esta semana
                </Alert>
              )}
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Conteúdo da aba Solicitações */}
      {abaAtiva === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNovaOpen(true)}>
              Nova Solicitação
            </Button>
          </Box>

          {loadingSol ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : solicitacoes.length === 0 ? (
            <Alert severity="info">Nenhuma solicitação enviada ainda.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Itens</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Observação</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {solicitacoes.map(s => {
                    const statusColor = s.status === 'pendente' ? 'warning' : s.status === 'concluida' ? 'success' : s.status === 'parcial' ? 'info' : 'error';
                    const statusLabel = s.status === 'pendente' ? 'Pendente' : s.status === 'concluida' ? 'Concluída' : s.status === 'parcial' ? 'Parcial' : 'Cancelada';
                    return (
                      <TableRow key={s.id} hover>
                        <TableCell>{new Date(s.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            {s.itens.map(item => (
                              <Typography key={item.id} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={item.status === 'pendente' ? 'Pend.' : item.status === 'aceito' ? 'Aceito' : 'Recusado'}
                                  color={item.status === 'pendente' ? 'warning' : item.status === 'aceito' ? 'success' : 'error'}
                                  size="small"
                                  sx={{ fontSize: '0.6rem', height: 16 }}
                                />
                                {item.nome_produto} — {item.quantidade} {item.unidade}
                                {item.justificativa_recusa && (
                                  <Typography component="span" variant="caption" color="error.main"> ({item.justificativa_recusa})</Typography>
                                )}
                              </Typography>
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{s.observacao || '—'}</TableCell>
                        <TableCell>
                          <Chip label={statusLabel} color={statusColor} size="small" />
                        </TableCell>
                        <TableCell>
                          {s.status === 'pendente' && (
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
      )}
    </PageContainer>

    {/* Dialog nova solicitação */}
    <Dialog open={novaOpen} onClose={() => setNovaOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Nova Solicitação de Alimentos</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField
          label="Observação geral (opcional)"
          value={novaObs}
          onChange={e => setNovaObs(e.target.value)}
          fullWidth size="small" multiline rows={2}
        />

        <Typography variant="subtitle2" sx={{ mt: 1 }}>Itens</Typography>

        {novaItens.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Autocomplete<Produto>
              options={produtos}
              getOptionLabel={p => p.nome}
              value={produtos.find(p => p.id === item.produto_id) ?? null}
              onChange={(_, p) => setNovaItens(prev => prev.map((it, i) =>
                i === idx ? { ...it, produto_id: p?.id, nome_produto: p?.nome ?? '', unidade: p?.unidade || it.unidade } : it
              ))}
              onInputChange={(_, val, reason) => {
                if (reason === 'input')
                  setNovaItens(prev => prev.map((it, i) => i === idx ? { ...it, nome_produto: val, produto_id: undefined } : it));
              }}
              inputValue={item.nome_produto}
              size="small"
              sx={{ flex: 2 }}
              freeSolo
              noOptionsText={produtos.length === 0 ? "Carregando produtos..." : "Nenhum produto encontrado"}
              renderInput={params => (
                <TextField {...params} label="Produto" autoFocus={idx === 0} placeholder="Digite o nome do produto" />
              )}
            />
            <TextField
              label="Qtd"
              type="number"
              value={item.quantidade}
              onChange={e => setNovaItens(prev => prev.map((it, i) => i === idx ? { ...it, quantidade: Number(e.target.value) } : it))}
              size="small"
              sx={{ flex: 1 }}
              inputProps={{ min: 0.001, step: 0.001 }}
            />
            <TextField
              label="Unidade"
              value={item.unidade}
              onChange={e => setNovaItens(prev => prev.map((it, i) => i === idx ? { ...it, unidade: e.target.value } : it))}
              size="small"
              sx={{ flex: 1 }}
              placeholder="kg, un..."
            />
            {novaItens.length > 1 && (
              <IconButton size="small" color="error" sx={{ mt: 0.5 }}
                onClick={() => setNovaItens(prev => prev.filter((_, i) => i !== idx))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}

        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setNovaItens(prev => [...prev, { nome_produto: '', quantidade: 1, unidade: 'kg', produto_id: undefined }])}
          sx={{ alignSelf: 'flex-start' }}
        >
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
    </>
  );
}
