import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Autocomplete,
  Alert,
  Box,
  Typography,
  Chip
} from '@mui/material';
import {
  School as SchoolIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { guiaService, Guia, AddProdutoGuiaData } from '../services/guiaService';
import { listarProdutos } from '../services/produtos';
import { escolaService } from '../services/escolaService';
import { listarEstoqueEscola, EstoqueEscolarItem } from '../services/estoqueEscolarService';
import { InputAdornment } from '@mui/material';

interface AdicionarProdutoIndividualProps {
  open: boolean;
  onClose: () => void;
  guia: Guia | null;
  onUpdate: () => void;
  escolaPreSelecionada?: {
    id: number;
    nome: string;
  };
}

const AdicionarProdutoIndividual: React.FC<AdicionarProdutoIndividualProps> = ({
  open,
  onClose,
  guia,
  onUpdate,
  escolaPreSelecionada
}) => {
  const [escolas, setEscolas] = useState<any[]>([]);
  const [produtosList, setProdutosList] = useState<any[]>([]);
  const [selectedEscola, setSelectedEscola] = useState('');
  const [selectedProduto, setSelectedProduto] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('');
  const [lote, setLote] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para gerenciamento de lotes
  const [lotesExistentes, setLotesExistentes] = useState<string[]>([]);
  const [itemExistente, setItemExistente] = useState<any>(null);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  

  const { success, error } = useNotification();

  const [estoqueItem, setEstoqueItem] = useState<EstoqueEscolarItem | null>(null);
  const [estoqueLoading, setEstoqueLoading] = useState(false);

  useEffect(() => {
    if (open) {
      carregarDados();
      // Se há escola pré-selecionada, definir no formulário
      if (escolaPreSelecionada) {
        setSelectedEscola(escolaPreSelecionada.id.toString());
      }
    } else {
      // Limpar formulário quando fechar
      limparFormulario();
    }
  }, [open, escolaPreSelecionada]);

  useEffect(() => {
    const carregarEstoque = async () => {
      if (!selectedEscola || !selectedProduto) {
        setEstoqueItem(null);
        return;
        }
      try {
        setEstoqueLoading(true);
        const estoque = await listarEstoqueEscola(parseInt(selectedEscola));
        const item = estoque.find(i => i.produto_id === parseInt(selectedProduto)) || null;
        setEstoqueItem(item);
      } catch (e) {
        setEstoqueItem(null);
      } finally {
        setEstoqueLoading(false);
      }
    };
    carregarEstoque();
  }, [selectedEscola, selectedProduto]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [escolasData, produtosData] = await Promise.all([
        escolaService.listarEscolas(),
        listarProdutos()
      ]);

      setEscolas(Array.isArray(escolasData) ? escolasData : []);
      setProdutosList(Array.isArray(produtosData) ? produtosData : []);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleProdutoChange = async (produtoId: string) => {
    setSelectedProduto(produtoId);
    
    // Buscar o produto na lista para pegar a unidade do contrato
    const produtoSelecionado = produtosList.find(p => p.id === parseInt(produtoId));
    
    if (produtoSelecionado && produtoSelecionado.unidade_contrato) {
      setUnidade(produtoSelecionado.unidade_contrato);
    } else {
      // Fallback para kg se não encontrar unidade no contrato
      setUnidade('Kg');
    }

    // Carregar lotes existentes para este produto
    if (produtoId && guia) {
      await carregarLotesExistentes(parseInt(produtoId));
    }

  };

  const handleEscolaChange = async (escolaId: string) => {
    setSelectedEscola(escolaId);
    
  };

  const carregarLotesExistentes = async (produtoId: number) => {
    try {
      // Buscar itens da guia para encontrar lotes existentes deste produto
      const response = await guiaService.listarProdutosGuia(guia!.id);
      const itensGuia = response.data || response;
      const lotesUnicos = [...new Set(
        itensGuia
          .filter((item: any) => item.produto_id === produtoId && item.lote)
          .map((item: any) => item.lote)
          .filter((lote: any): lote is string => typeof lote === 'string')
      )] as string[];
      setLotesExistentes(lotesUnicos);
    } catch (err) {
      console.error('Erro ao carregar lotes:', err);
      setLotesExistentes([]);
    }
  };

  const verificarItemExistente = async (produtoId: number, escolaId: number, loteValue: string) => {
    if (!guia || !loteValue) return true;

    try {
      const response = await guiaService.listarProdutosGuia(guia.id);
      const itensGuia = response.data || response;
      const itemExistente = itensGuia.find((item: any) =>
        item.produto_id === produtoId &&
        item.escola_id === escolaId &&
        item.lote === loteValue
      );

      if (itemExistente) {
        // Verificar se já foi entregue
        if (itemExistente.entrega_confirmada) {
          error('Este lote já foi entregue para esta escola. Não é possível adicionar mais itens.');
          return false;
        }

        setItemExistente(itemExistente);
        setShowConfirmacao(true);
        return false; // Não prosseguir com adição direta
      }

      return true;
    } catch (err) {
      console.error('Erro ao verificar item existente:', err);
      return true;
    }
  };

  const handleLoteChange = async (value: string) => {
    setLote(value);

    if (selectedProduto && selectedEscola && value) {
      await verificarItemExistente(parseInt(selectedProduto), parseInt(selectedEscola), value);
    }
  };

  // Função para gerar lote automático
  const gerarLoteAutomatico = async () => {
    const hoje = new Date();
    const ano = hoje.getFullYear().toString().slice(-2); // Últimos 2 dígitos do ano
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const dia = hoje.getDate().toString().padStart(2, '0');
    
    // Buscar lotes existentes para gerar um número sequencial
    try {
      const response = await guiaService.listarProdutosGuia(guia!.id);
      const itensGuia = response.data || response;
      
      // Filtrar lotes que começam com a data de hoje
      const prefixoData = `${ano}${mes}${dia}`;
      const lotesHoje = itensGuia
        .filter((item: any) => item.lote && item.lote.startsWith(prefixoData))
        .map((item: any) => item.lote)
        .filter((lote: any): lote is string => typeof lote === 'string');
      
      // Encontrar o próximo número sequencial
      let proximoNumero = 1;
      if (lotesHoje.length > 0) {
        const numeros = lotesHoje
          .map(lote => {
            const numero = lote.slice(6); // Remove os 6 primeiros caracteres (AAMMDD)
            return parseInt(numero) || 0;
          })
          .filter(num => !isNaN(num));
        
        if (numeros.length > 0) {
          proximoNumero = Math.max(...numeros) + 1;
        }
      }
      
      // Gerar lote no formato AAMMDD + número sequencial (3 dígitos)
      return `${prefixoData}${proximoNumero.toString().padStart(3, '0')}`;
    } catch (err) {
      console.error('Erro ao gerar lote automático:', err);
      // Fallback: usar apenas data + 001
      return `${ano}${mes}${dia}001`;
    }
  };

  const handleSalvar = async (atualizarExistente = false) => {
    if (!guia || !selectedProduto || !selectedEscola || !quantidade || !unidade) {
      error('Preencha todos os campos obrigatórios');
      return;
    }

    // Gerar lote automático se não foi informado
    let loteParaUsar = lote;
    if (!loteParaUsar || loteParaUsar.trim() === '') {
      loteParaUsar = await gerarLoteAutomatico();
      setLote(loteParaUsar); // Atualizar o campo para mostrar o lote gerado
    }

    const quantidadeSolicitada = parseFloat(quantidade);

    // Se há item existente e não foi confirmada a atualização, verificar primeiro
    if (!atualizarExistente && loteParaUsar && selectedProduto && selectedEscola) {
      const podeAdicionar = await verificarItemExistente(
        parseInt(selectedProduto),
        parseInt(selectedEscola),
        loteParaUsar
      );
      if (!podeAdicionar) return;
    }

    try {
      setLoading(true);

      if (atualizarExistente && itemExistente) {
        // Remover item existente e adicionar novo com quantidade atualizada
        if (itemExistente.id) {
          await guiaService.removerItemGuia(itemExistente.id);
        } else {
          await guiaService.removerProdutoGuia(
            guia.id,
            itemExistente.produto_id,
            itemExistente.escola_id
          );
        }

        // Adicionar novo item com quantidade atualizada
        const data: AddProdutoGuiaData = {
          produtoId: itemExistente.produto_id,
          escolaId: itemExistente.escola_id,
          quantidade: parseFloat(quantidade),
          unidade,
          lote: loteParaUsar || undefined,
          observacao: observacao || itemExistente.observacao,
          para_entrega: true // Marcar automaticamente para entrega
        };

        await guiaService.adicionarProdutoGuia(guia.id, data);
        success(`Quantidade atualizada para ${parseFloat(quantidade).toLocaleString('pt-BR')} ${unidade}`);
      } else {
        // Adicionar novo item
        const data: AddProdutoGuiaData = {
          produtoId: parseInt(selectedProduto),
          escolaId: parseInt(selectedEscola),
          quantidade: parseFloat(quantidade),
          unidade,
          lote: loteParaUsar || undefined,
          observacao,
          para_entrega: true // Marcar automaticamente para entrega
        };

        await guiaService.adicionarProdutoGuia(guia.id, data);
        success('Produto adicionado com sucesso!');
      }

      // Limpar formulário
      limparFormulario();
      onUpdate();
      onClose();
    } catch (errorCatch: any) {
      error(errorCatch.response?.data?.error || 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setSelectedEscola('');
    setSelectedProduto('');
    setQuantidade('');
    setUnidade('');
    setLote('');
    setObservacao('');
    setItemExistente(null);
    setShowConfirmacao(false);
    setLotesExistentes([]);
  };

  const handleConfirmarAtualizacao = () => {
    setShowConfirmacao(false);
    handleSalvar(true);
  };

  const handleCancelarAtualizacao = () => {
    setShowConfirmacao(false);
    setItemExistente(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adicionar Produto Individual</DialogTitle>
      <DialogContent>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <CircularProgress />
          </div>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={escolas}
                getOptionLabel={(option) => option.nome}
                value={escolas.find(e => e.id.toString() === selectedEscola) || null}
                onChange={(event, newValue) => {
                  handleEscolaChange(newValue ? newValue.id.toString() : '');
                }}
                disabled={!!escolaPreSelecionada}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Escola"
                    placeholder="Digite para buscar uma escola..."
                    required
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                      <SchoolIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                      {option.nome}
                    </Box>
                  );
                }}
                noOptionsText="Nenhuma escola encontrada"
              />
              {escolaPreSelecionada && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Escola pré-selecionada: {escolaPreSelecionada.nome}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                options={produtosList}
                getOptionLabel={(option) => option.nome}
                value={produtosList.find(p => p.id.toString() === selectedProduto) || null}
                onChange={(event, newValue) => {
                  handleProdutoChange(newValue ? newValue.id.toString() : '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Produto"
                    placeholder="Digite para buscar um produto..."
                    required
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <InventoryIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                    <Box>
                      <Typography variant="body2">{option.nome}</Typography>
                      {option.codigo && (
                        <Typography variant="caption" color="text.secondary">
                          Código: {option.codigo}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
                noOptionsText="Nenhum produto encontrado"
              />
            </Grid>


            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: estoqueItem ? 'max-content 160px' : '160px',
                  alignItems: 'center',
                  columnGap: 1
                }}
              >
                {estoqueItem && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                    <Chip
                      size="small"
                      label={`${(estoqueItem.quantidade_atual ?? 0).toLocaleString('pt-BR')} ${estoqueItem.unidade}`}
                      sx={{ height: 22 }}
                    />
                    {estoqueItem.data_ultima_atualizacao && (
                      <Typography variant="caption" color="text.secondary">
                        {new Date(estoqueItem.data_ultima_atualizacao).toLocaleDateString('pt-BR')}
                      </Typography>
                    )}
                  </Box>
                )}
                <TextField
                  label="Quantidade"
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  sx={{ width: 160 }}
                  inputProps={{ step: 0.001, min: 0 }}
                  required
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Unidade"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                sx={{ width: 120 }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={lotesExistentes}
                value={lote}
                onInputChange={(event, newValue) => handleLoteChange(newValue || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Lote (Opcional)"
                    placeholder="Digite um lote ou deixe vazio para gerar automaticamente"
                    helperText={
                      lotesExistentes.length > 0 
                        ? "Lotes existentes disponíveis ou deixe vazio para gerar automaticamente" 
                        : "Deixe vazio para gerar lote automático (formato: AAMMDDXXX)"
                    }
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Chip label={option} size="small" sx={{ mr: 1 }} />
                    {option}
                  </Box>
                )}
              />
              {!lote && (
                <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                  💡 Um lote será gerado automaticamente no formato: {(() => {
                    const hoje = new Date();
                    const ano = hoje.getFullYear().toString().slice(-2);
                    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
                    const dia = hoje.getDate().toString().padStart(2, '0');
                    return `${ano}${mes}${dia}001`;
                  })()}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Observação"
                multiline
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                fullWidth
              />
            </Grid>

            {/* Alerta de confirmação para item existente */}
            {showConfirmacao && itemExistente && (
              <Grid item xs={12}>
                <Alert
                  severity="warning"
                  action={
                    <Box>
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleConfirmarAtualizacao}
                        sx={{ mr: 1 }}
                      >
                        Atualizar
                      </Button>
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleCancelarAtualizacao}
                      >
                        Cancelar
                      </Button>
                    </Box>
                  }
                >
                  <Typography variant="body2" fontWeight="bold">
                    Item já existe neste lote!
                  </Typography>
                  <Typography variant="body2">
                    Quantidade atual: {(Number(itemExistente.quantidade) || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3
                    })} {itemExistente.unidade}
                  </Typography>
                  <Typography variant="body2">
                    Deseja atualizar para {(Number(quantidade) || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3
                    })} {unidade}?
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={() => handleSalvar(false)}
          variant="contained"
          disabled={loading || !selectedProduto || !selectedEscola || !quantidade || !unidade || showConfirmacao}
        >
          {loading ? <CircularProgress size={24} /> : (itemExistente && showConfirmacao ? 'Confirmar' : 'Adicionar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdicionarProdutoIndividual;
