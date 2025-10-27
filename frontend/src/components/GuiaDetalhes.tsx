import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Chip,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  InputAdornment,
  CircularProgress,
  IconButton,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { guiaService, Guia, AddProdutoGuiaData } from '../services/guiaService';
import { listarProdutos } from '../services/produtos';
import { escolaService } from '../services/escolaService';
import { buscarEstoqueEscolarProduto, EstoqueEscolaProduto } from '../services/estoqueEscolar';

interface GuiaDetalhesProps {
  guia: Guia | null;
  onUpdate: () => void;
  onClose: () => void;
}

// Componente otimizado e compacto para lista de produtos
const ProdutoItem = React.memo(({ produto, index, totalProdutos, onSelecionarProduto }: {
  produto: any;
  index: number;
  totalProdutos: number;
  onSelecionarProduto: (produto: any) => void;
}) => (
  <Box
    sx={{
      p: 1.5,
      cursor: 'pointer',
      borderBottom: index < totalProdutos - 1 ? '1px solid' : 'none',
      borderColor: 'divider',
      '&:hover': {
        bgcolor: 'action.hover',
        '& .produto-arrow': {
          opacity: 1
        }
      },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: '60px'
    }}
    onClick={() => onSelecionarProduto(produto)}
  >
    <Box sx={{ flex: 1 }}>
      <Typography variant="body1" fontWeight="600" sx={{ mb: 0.25, lineHeight: 1.2 }}>
        {produto.nome}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {produto.unidade && (
          <Chip
            label={produto.unidade}
            size="small"
            sx={{
              bgcolor: '#2563eb',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              height: '20px',
              '& .MuiChip-label': { px: 1 }
            }}
          />
        )}
        {produto.categoria && (
          <Chip
            label={produto.categoria}
            size="small"
            sx={{
              bgcolor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              fontWeight: 'medium',
              fontSize: '0.7rem',
              height: '20px',
              '& .MuiChip-label': { px: 1 }
            }}
          />
        )}
      </Box>
    </Box>
    <Box
      className="produto-arrow"
      sx={{
        opacity: 0.3,
        transition: 'opacity 0.2s',
        ml: 2,
        color: 'primary.main'
      }}
    >
      <Typography variant="h6">→</Typography>
    </Box>
  </Box>
));

const ProdutosList = React.memo(({ produtos, filtro, onSelecionarProduto }: {
  produtos: any[];
  filtro: string;
  onSelecionarProduto: (produto: any) => void;
}) => {
  const [itensVisiveis, setItensVisiveis] = useState(50); // Mostrar 50 itens inicialmente
  
  const produtosFiltrados = useMemo(() =>
    produtos?.filter(produto =>
      !filtro || produto.nome.toLowerCase().includes(filtro.toLowerCase())
    ) || [],
    [produtos, filtro]
  );

  const produtosVisiveis = useMemo(() => 
    produtosFiltrados.slice(0, itensVisiveis),
    [produtosFiltrados, itensVisiveis]
  );

  const carregarMais = useCallback(() => {
    if (itensVisiveis < produtosFiltrados.length) {
      setItensVisiveis(prev => Math.min(prev + 50, produtosFiltrados.length));
    }
  }, [itensVisiveis, produtosFiltrados.length]);

  // Reset quando filtro muda
  useEffect(() => {
    setItensVisiveis(50);
  }, [filtro]);

  if (produtosFiltrados.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary" variant="body2">
          {filtro ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {produtosVisiveis.map((produto, index) => (
        <ProdutoItem
          key={produto.id}
          produto={produto}
          index={index}
          totalProdutos={produtosVisiveis.length}
          onSelecionarProduto={onSelecionarProduto}
        />
      ))}
      {itensVisiveis < produtosFiltrados.length && (
        <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={carregarMais}
            sx={{ fontSize: '0.8rem' }}
          >
            Carregar mais ({produtosFiltrados.length - itensVisiveis} restantes)
          </Button>
        </Box>
      )}
    </>
  );
});

// Componente otimizado para item de escola
const EscolaItem = React.memo(({ escola, quantidadesEscolas, unidadeGlobal, onAtualizarQuantidade, index, estoqueEscola }: {
  escola: any;
  quantidadesEscolas: any;
  unidadeGlobal: string;
  onAtualizarQuantidade: (escolaId: number, campo: 'quantidade' | 'observacao' | 'para_entrega', valor: string) => void;
  index: number;
  estoqueEscola?: EstoqueEscolaProduto;
}) => {
  const quantidadeRef = useRef<HTMLInputElement>(null);
  const observacaoRef = useRef<HTMLInputElement>(null);

  const handleQuantidadeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const allQuantidadeInputs = Array.from(document.querySelectorAll('input[data-escola-quantidade]')) as HTMLInputElement[];
      const currentIndex = allQuantidadeInputs.findIndex(input => input === quantidadeRef.current);
      const nextInput = allQuantidadeInputs[currentIndex + 1];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      observacaoRef.current?.focus();
    }
  };

  return (
    <Grid item xs={12}>
      <Card variant="outlined">
        <CardContent sx={{ py: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" fontWeight="bold">
                {escola.nome}
              </Typography>
              {escola.modalidades && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {escola.modalidades}
                </Typography>
              )}
              {/* Informações de Estoque */}
              {estoqueEscola ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Estoque: {estoqueEscola.quantidade_atual} {estoqueEscola.unidade}
                  </Typography>
                  <Chip 
                    label={
                      estoqueEscola.status_estoque === 'sem_estoque' ? 'Sem Estoque' :
                      estoqueEscola.status_estoque === 'baixo' ? 'Baixo' :
                      estoqueEscola.status_estoque === 'normal' ? 'Normal' :
                      'Alto'
                    }
                    size="small"
                    color={
                      estoqueEscola.status_estoque === 'sem_estoque' ? 'error' :
                      estoqueEscola.status_estoque === 'baixo' ? 'warning' :
                      'success'
                    }
                    sx={{ fontSize: '0.65rem', height: '18px' }}
                  />
                </Box>
              ) : (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                  Sem info de estoque
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                inputRef={quantidadeRef}
                fullWidth
                label="Quantidade"
                type="number"
                size="small"
                value={quantidadesEscolas[escola.id]?.quantidade || ''}
                onChange={(e) => onAtualizarQuantidade(escola.id, 'quantidade', e.target.value)}
                onKeyDown={handleQuantidadeKeyDown}
                inputProps={{
                  step: 0.001,
                  min: 0,
                  'data-escola-quantidade': escola.id,
                  tabIndex: index * 2 + 1
                }}
                placeholder="0.000"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '40px', justifyContent: 'center' }}>
                {unidadeGlobal ? (
                  <Box sx={{
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? '#10b981' : '#2563eb',
                    color: (theme) => theme.palette.mode === 'dark' ? '#000000' : '#ffffff',
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    minWidth: '60px',
                    textAlign: 'center',
                    border: (theme) => theme.palette.mode === 'dark' ? '1px solid #34d399' : 'none'
                  }}>
                    {unidadeGlobal}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Definir unidade
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={quantidadesEscolas[escola.id]?.para_entrega !== false}
                    onChange={(e) => onAtualizarQuantidade(escola.id, 'para_entrega', e.target.checked.toString())}
                    color="primary"
                  />
                }
                label=""
                sx={{ 
                  m: 0, 
                  display: 'flex', 
                  justifyContent: 'center',
                  height: '40px',
                  alignItems: 'center'
                }}
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <TextField
                inputRef={observacaoRef}
                fullWidth
                label="Observação"
                size="small"
                value={quantidadesEscolas[escola.id]?.observacao || ''}
                onChange={(e) => onAtualizarQuantidade(escola.id, 'observacao', e.target.value)}
                inputProps={{
                  'data-escola-observacao': escola.id,
                  tabIndex: index * 2 + 2
                }}
                placeholder="Opcional"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
});

// Componente otimizado para lista de escolas
const EscolasList = React.memo(({ escolas, quantidadesEscolas, unidadeGlobal, onAtualizarQuantidade, estoqueEscolas }: {
  escolas: any[];
  quantidadesEscolas: any;
  unidadeGlobal: string;
  onAtualizarQuantidade: (escolaId: number, campo: 'quantidade' | 'observacao' | 'para_entrega', valor: string) => void;
  estoqueEscolas: { [key: number]: EstoqueEscolaProduto };
}) => {
  const [itensCarregados, setItensCarregados] = useState(15);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const escolasVisiveis = useMemo(() => {
    return escolas.slice(0, itensCarregados);
  }, [escolas, itensCarregados]);

  const carregarMaisItens = useCallback(() => {
    if (carregandoMais || itensCarregados >= escolas.length) return;

    setCarregandoMais(true);
    setTimeout(() => {
      setItensCarregados(prev => Math.min(prev + 10, escolas.length));
      setCarregandoMais(false);
    }, 200);
  }, [carregandoMais, itensCarregados, escolas.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        carregarMaisItens();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [carregarMaisItens]);

  useEffect(() => {
    setItensCarregados(15);
    setTimeout(() => {
      const firstQuantidadeInput = document.querySelector('input[data-escola-quantidade]') as HTMLInputElement;
      if (firstQuantidadeInput) {
        firstQuantidadeInput.focus();
      }
    }, 300);
  }, [escolas]);

  return (
    <Box
      ref={containerRef}
      sx={{
        maxHeight: 500,
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(0,0,0,0.1)',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '4px',
        },
      }}
    >
      <Grid container spacing={2}>
        {escolasVisiveis.map((escola, index) => (
          <EscolaItem
            key={escola.id}
            escola={escola}
            quantidadesEscolas={quantidadesEscolas}
            unidadeGlobal={unidadeGlobal}
            onAtualizarQuantidade={onAtualizarQuantidade}
            estoqueEscola={estoqueEscolas[escola.id]}
            index={index}
          />
        ))}
      </Grid>

      {carregandoMais && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
            Carregando mais escolas...
          </Typography>
        </Box>
      )}

      {itensCarregados >= escolas.length && escolas.length > 15 && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Todas as {escolas.length} escolas foram carregadas
          </Typography>
        </Box>
      )}
    </Box>
  );
});

const GuiaDetalhes: React.FC<GuiaDetalhesProps> = ({ guia, onUpdate, onClose }) => {
  const [escolas, setEscolas] = useState<any[]>([]);
  const [produtosList, setProdutosList] = useState<any[]>([]);
  const [selectedProdutoMassa, setSelectedProdutoMassa] = useState<any>(null);

  // Estados para adição em massa
  const [escolasFiltradas, setEscolasFiltradas] = useState<any[]>([]);
  const [filtrosEscolaNomes, setFiltrosEscolaNomes] = useState<string[]>([]);
  const [filtrosModalidades, setFiltrosModalidades] = useState<string[]>([]);
  const [inputEscolaNome, setInputEscolaNome] = useState('');
  const [quantidadesEscolas, setQuantidadesEscolas] = useState<{ [key: number]: { quantidade: string, observacao: string, para_entrega: boolean } }>({});
  const [unidadeGlobal, setUnidadeGlobal] = useState('');
  const [loteGlobal, setLoteGlobal] = useState('');
  const [modalidades, setModalidades] = useState<string[]>([]);
  const [salvandoMassa, setSalvandoMassa] = useState(false);
  const [carregandoEscolas, setCarregandoEscolas] = useState(false);
  
  // Estados para validação de estoque
  const [estoqueEscolas, setEstoqueEscolas] = useState<{ [key: number]: EstoqueEscolaProduto }>({});
  const [loadingEstoque, setLoadingEstoque] = useState(false);

  const { success, error } = useNotification();

  useEffect(() => {
    if (guia) {
      carregarEscolas();
      carregarProdutosDisponiveis();
    }
  }, [guia]);

  const carregarEscolas = async () => {
    try {
      const response = await escolaService.listarEscolas();
      const escolasData = Array.isArray(response) ? response : [];
      setEscolas(escolasData);
      setEscolasFiltradas(escolasData);

      const modalidadesUnicas = [...new Set(
        escolasData
          .filter(escola => escola.modalidades)
          .flatMap(escola => escola.modalidades.split(',').map((m: string) => m.trim()))
      )].sort();
      setModalidades(modalidadesUnicas);
    } catch (errorCatch: any) {
      console.error('Erro ao carregar escolas:', errorCatch);
      error('Erro ao carregar escolas');
      setEscolas([]);
      setEscolasFiltradas([]);
    }
  };

  const carregarProdutosDisponiveis = async () => {
    try {
      const response = await listarProdutos();
      setProdutosList(Array.isArray(response) ? response : []);
    } catch (errorCatch: any) {
      console.error('Erro ao carregar produtos:', errorCatch);
      error('Erro ao carregar produtos');
      setProdutosList([]);
    }
  };

  // Filtrar escolas por nomes e modalidades
  useEffect(() => {
    let filtered = escolas;

    if (filtrosEscolaNomes.length > 0) {
      filtered = filtered.filter(escola =>
        filtrosEscolaNomes.some(nome =>
          escola.nome.toLowerCase().includes(nome.toLowerCase())
        )
      );
    }

    if (filtrosModalidades.length > 0) {
      filtered = filtered.filter(escola =>
        escola.modalidades && filtrosModalidades.some(modalidade =>
          escola.modalidades.includes(modalidade)
        )
      );
    }

    setEscolasFiltradas(filtered);
  }, [escolas, filtrosEscolaNomes, filtrosModalidades]);

  const adicionarFiltroNome = () => {
    if (inputEscolaNome.trim() && !filtrosEscolaNomes.includes(inputEscolaNome.trim())) {
      setFiltrosEscolaNomes([...filtrosEscolaNomes, inputEscolaNome.trim()]);
      setInputEscolaNome('');
    }
  };

  const removerFiltroNome = (nome: string) => {
    setFiltrosEscolaNomes(filtrosEscolaNomes.filter(n => n !== nome));
  };

  const adicionarFiltroModalidade = (modalidade: string) => {
    if (!filtrosModalidades.includes(modalidade)) {
      setFiltrosModalidades([...filtrosModalidades, modalidade]);
    }
  };

  const removerFiltroModalidade = (modalidade: string) => {
    setFiltrosModalidades(filtrosModalidades.filter(m => m !== modalidade));
  };

  const limparTodosFiltros = () => {
    setFiltrosEscolaNomes([]);
    setFiltrosModalidades([]);
    setInputEscolaNome('');
  };

  const selecionarProdutoMassa = useCallback(async (produto: any) => {
    setCarregandoEscolas(true);
    setSelectedProdutoMassa(produto);
    setUnidadeGlobal(produto.unidade || 'kg');

    // Gerar lote automático baseado na data e produto
    const agora = new Date();
    const dataFormatada = agora.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaFormatada = agora.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
    const loteAuto = `${produto.nome.substring(0, 3).toUpperCase()}-${dataFormatada}-${horaFormatada}`;
    setLoteGlobal(loteAuto);

    // Carregar estoque de todas as escolas para este produto
    await carregarEstoqueProduto(produto.id);

    requestAnimationFrame(() => {
      setTimeout(() => {
        setQuantidadesEscolas({});
        setCarregandoEscolas(false);
      }, 100);
    });
  }, []);

  const carregarEstoqueProduto = async (produtoId: number) => {
    try {
      setLoadingEstoque(true);
      const estoqueData = await buscarEstoqueEscolarProduto(produtoId);
      
      // Criar um mapa de estoque por escola
      const estoqueMap: { [key: number]: EstoqueEscolaProduto } = {};
      estoqueData.escolas.forEach(escola => {
        estoqueMap[escola.escola_id] = escola;
      });
      
      setEstoqueEscolas(estoqueMap);
    } catch (err) {
      console.error('Erro ao carregar estoque:', err);
      setEstoqueEscolas({});
    } finally {
      setLoadingEstoque(false);
    }
  };

  const atualizarQuantidadeEscola = useCallback((escolaId: number, campo: 'quantidade' | 'observacao' | 'para_entrega', valor: string) => {
    setQuantidadesEscolas(prev => {
      const currentData = prev[escolaId] || { quantidade: '', observacao: '', para_entrega: true };
      
      return {
        ...prev,
        [escolaId]: {
          ...currentData,
          [campo]: campo === 'para_entrega' ? valor === 'true' : valor
        }
      };
    });
  }, []);

  const salvarProdutoMassa = async () => {
    if (!guia || !selectedProdutoMassa || !unidadeGlobal.trim()) {
      error('Produto e unidade são obrigatórios');
      return;
    }

    const escolasComQuantidade = Object.entries(quantidadesEscolas)
      .filter(([_, dados]) => dados.quantidade && parseFloat(dados.quantidade) > 0)
      .map(([escolaId, dados]) => ({
        escolaId: parseInt(escolaId),
        quantidade: parseFloat(dados.quantidade),
        unidade: unidadeGlobal,
        observacao: dados.observacao,
        para_entrega: dados.para_entrega
      }));

    if (escolasComQuantidade.length === 0) {
      error('Adicione pelo menos uma quantidade para uma escola');
      return;
    }

    // Validação de estoque
    const alertasEstoque: string[] = [];
    escolasComQuantidade.forEach(item => {
      const estoqueEscola = estoqueEscolas[item.escolaId];
      if (estoqueEscola && estoqueEscola.quantidade_atual < item.quantidade) {
        const escola = escolasFiltradas.find(e => e.id === item.escolaId);
        alertasEstoque.push(
          `${escola?.nome}: solicitado ${item.quantidade} ${item.unidade}, disponível ${estoqueEscola.quantidade_atual} ${estoqueEscola.unidade}`
        );
      }
    });

    if (alertasEstoque.length > 0) {
      const confirmar = window.confirm(
        `ATENÇÃO: Algumas escolas têm quantidade solicitada maior que o estoque disponível:\n\n${alertasEstoque.join('\n')}\n\nDeseja continuar mesmo assim?`
      );
      if (!confirmar) return;
    }

    try {
      setSalvandoMassa(true);

      for (const item of escolasComQuantidade) {
        await guiaService.adicionarProdutoGuia(guia.id, {
          produtoId: selectedProdutoMassa.id,
          escolaId: item.escolaId,
          quantidade: item.quantidade,
          unidade: item.unidade,
          lote: loteGlobal || undefined,
          observacao: item.observacao,
          para_entrega: item.para_entrega
        });
      }

      success(`Produto adicionado para ${escolasComQuantidade.length} escola(s) com sucesso!`);
      onClose();

      // Pequeno delay para garantir que o backend processou
      setTimeout(() => {
        onUpdate();
      }, 500);

    } catch (errorCatch: any) {
      error(errorCatch.response?.data?.error || 'Erro ao adicionar produto em massa');
    } finally {
      setSalvandoMassa(false);
    }
  };

  if (!guia) return null;

  return (
    <>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            Adicionar Produto em Massa
          </Typography>
          <Chip 
            label={`${guia.mes}/${guia.ano}`} 
            size="small" 
            color="primary" 
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {!selectedProdutoMassa ? (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Selecione um produto:
            </Typography>

            <TextField
              fullWidth
              placeholder="Buscar produto..."
              value={inputEscolaNome}
              onChange={(e) => setInputEscolaNome(e.target.value)}
              size="small"
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: inputEscolaNome && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setInputEscolaNome('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Box sx={{ 
              maxHeight: 500, 
              overflow: 'auto', 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 2,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#c1c1c1',
                borderRadius: '4px',
                '&:hover': {
                  background: '#a8a8a8',
                },
              },
            }}>
              <ProdutosList
                produtos={produtosList}
                filtro={inputEscolaNome}
                onSelecionarProduto={selecionarProdutoMassa}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {produtosList?.filter(produto =>
                  !inputEscolaNome || produto.nome.toLowerCase().includes(inputEscolaNome.toLowerCase())
                ).length || 0} produto(s) encontrado(s)
              </Typography>
              {inputEscolaNome && (
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
                  Filtrado por: "{inputEscolaNome}"
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography variant="h6">
                Produto: {selectedProdutoMassa.nome}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedProdutoMassa(null)}
              >
                Trocar Produto
              </Button>
            </Box>

            {/* Unidade e Lote Global */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                Configurações Globais:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  label="Unidade"
                  value={unidadeGlobal}
                  onChange={(e) => setUnidadeGlobal(e.target.value)}
                  sx={{ width: 150 }}
                  required
                />
                <TextField
                  size="small"
                  label="Lote (Opcional)"
                  value={loteGlobal}
                  onChange={(e) => setLoteGlobal(e.target.value)}
                  sx={{ width: 200 }}
                  placeholder="Ex: Lote-001, 2024-12-10"
                />
                <Typography variant="caption" color="text.secondary">
                  Unidade e lote serão aplicados a todas as escolas
                </Typography>
              </Box>
            </Box>

            {/* Filtros */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Filtros de Escolas
                </Typography>
                {(filtrosEscolaNomes.length > 0 || filtrosModalidades.length > 0) && (
                  <Button size="small" onClick={limparTodosFiltros} color="error">
                    Limpar Todos
                  </Button>
                )}
              </Box>

              {/* Filtro por nomes */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Adicionar filtro por nome"
                    value={inputEscolaNome}
                    onChange={(e) => setInputEscolaNome(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && adicionarFiltroNome()}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      )
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={adicionarFiltroNome}
                    disabled={!inputEscolaNome.trim()}
                  >
                    Adicionar
                  </Button>
                </Box>
                {filtrosEscolaNomes.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ mr: 1, alignSelf: 'center' }}>
                      Nomes:
                    </Typography>
                    {filtrosEscolaNomes.map((nome) => (
                      <Chip
                        key={nome}
                        label={nome}
                        size="small"
                        onDelete={() => removerFiltroNome(nome)}
                        color="primary"
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {/* Filtro por modalidades */}
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Modalidades disponíveis:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {modalidades.map((modalidade) => (
                    <Chip
                      key={modalidade}
                      label={modalidade}
                      size="small"
                      onClick={() =>
                        filtrosModalidades.includes(modalidade)
                          ? removerFiltroModalidade(modalidade)
                          : adicionarFiltroModalidade(modalidade)
                      }
                      onDelete={filtrosModalidades.includes(modalidade) ? () => removerFiltroModalidade(modalidade) : undefined}
                      sx={{
                        bgcolor: filtrosModalidades.includes(modalidade)
                          ? (theme) => theme.palette.mode === 'dark' ? '#10b981' : '#2563eb'
                          : (theme) => theme.palette.mode === 'dark' ? '#374151' : '#f3f4f6',
                        color: filtrosModalidades.includes(modalidade)
                          ? (theme) => theme.palette.mode === 'dark' ? '#000000' : '#ffffff'
                          : (theme) => theme.palette.mode === 'dark' ? '#e5e7eb' : '#374151',
                        border: filtrosModalidades.includes(modalidade)
                          ? (theme) => theme.palette.mode === 'dark' ? '1px solid #34d399' : 'none'
                          : (theme) => theme.palette.mode === 'dark' ? '1px solid #4b5563' : '1px solid #d1d5db',
                        fontWeight: filtrosModalidades.includes(modalidade) ? 'bold' : 'medium',
                        '&:hover': {
                          bgcolor: filtrosModalidades.includes(modalidade)
                            ? (theme) => theme.palette.mode === 'dark' ? '#059669' : '#1d4ed8'
                            : (theme) => theme.palette.mode === 'dark' ? '#4b5563' : '#e5e7eb'
                        }
                      }}
                    />
                  ))}
                </Box>
                {filtrosModalidades.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {filtrosModalidades.length} modalidade(s) selecionada(s)
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Lista de escolas */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Escolas ({escolasFiltradas.length}):
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="Tab: Próxima escola"
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
                <Chip
                  label="Enter: Observação"
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
                <Chip
                  label="Ctrl+Home/End: Primeiro/Último"
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            </Box>

            {/* Cabeçalho das colunas */}
            <Box sx={{ mb: 1, px: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">
                    Escola
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">
                    Quantidade
                  </Typography>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary" textAlign="center">
                    Unidade
                  </Typography>
                </Grid>
                <Grid item xs={12} md={1}>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary" textAlign="center">
                    Para Entrega
                  </Typography>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">
                    Observação
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {carregandoEscolas ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Carregando escolas...
                </Typography>
              </Box>
            ) : (
              <EscolasList
                escolas={escolasFiltradas}
                quantidadesEscolas={quantidadesEscolas}
                unidadeGlobal={unidadeGlobal}
                onAtualizarQuantidade={atualizarQuantidadeEscola}
                estoqueEscolas={estoqueEscolas}
              />
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        {selectedProdutoMassa && (
          <Button
            onClick={salvarProdutoMassa}
            variant="contained"
            disabled={salvandoMassa || !unidadeGlobal.trim()}
          >
            {salvandoMassa ? <CircularProgress size={24} /> : 'Salvar Produtos'}
          </Button>
        )}
      </DialogActions>
    </>
  );
};

export default GuiaDetalhes;