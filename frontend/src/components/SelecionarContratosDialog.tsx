import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Card, CardContent,
  Typography, FormControl, InputLabel, Select, MenuItem, Box, Alert,
  IconButton, Divider, TextField, FormControlLabel, Checkbox, Stack,
} from '@mui/material';
import {
  Close as CloseIcon, CheckCircle as CheckIcon, CallSplit as DividirIcon, 
  Add as AddIcon, Delete as DeleteIcon,
} from '@mui/icons-material';

interface Contrato {
  contrato_produto_id: number;
  contrato_id: number;
  contrato_numero: string;
  fornecedor_id: number;
  fornecedor_nome: string;
  preco_unitario: number;
  saldo_disponivel: number;
  data_fim: string;
}

interface ProdutoMultiplosContratos {
  produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_necessaria: number;
  contratos: Contrato[];
}

interface ContratoSelecionado {
  contrato_produto_id: number;
  quantidade: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  produtos: ProdutoMultiplosContratos[];
  onConfirmar: (selecao: { produto_id: number; contrato_produto_id: number; quantidade?: number }[]) => void;
}

export default function SelecionarContratosDialog({ open, onClose, produtos, onConfirmar }: Props) {
  const [contratosSelecionados, setContratosSelecionados] = useState<Map<number, ContratoSelecionado[]>>(new Map());
  const [modoDivisao, setModoDivisao] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    if (open && produtos.length > 0) {
      const inicial = new Map<number, ContratoSelecionado[]>();
      const divisao = new Map<number, boolean>();
      
      produtos.forEach(p => {
        if (p.contratos.length > 0) {
          inicial.set(p.produto_id, [{
            contrato_produto_id: p.contratos[0].contrato_produto_id,
            quantidade: p.quantidade_necessaria
          }]);
          divisao.set(p.produto_id, false);
        }
      });
      
      setContratosSelecionados(inicial);
      setModoDivisao(divisao);
    }
  }, [open, produtos]);

  const handleToggleDivisao = (produto_id: number) => {
    const atual = modoDivisao.get(produto_id) || false;
    setModoDivisao(prev => new Map(prev).set(produto_id, !atual));
  };

  const handleAdicionarContrato = (produto_id: number) => {
    const produto = produtos.find(p => p.produto_id === produto_id);
    if (!produto) return;

    const contratosAtuais = contratosSelecionados.get(produto_id) || [];
    const idsUsados = new Set(contratosAtuais.map(c => c.contrato_produto_id));
    const contratoDisponivel = produto.contratos.find(c => !idsUsados.has(c.contrato_produto_id));

    if (contratoDisponivel) {
      const totalAlocado = contratosAtuais.reduce((sum, c) => sum + c.quantidade, 0);
      const restante = Math.max(0, produto.quantidade_necessaria - totalAlocado);

      setContratosSelecionados(prev => {
        const novo = new Map(prev);
        novo.set(produto_id, [...contratosAtuais, {
          contrato_produto_id: contratoDisponivel.contrato_produto_id,
          quantidade: restante
        }]);
        return novo;
      });
    }
  };

  const handleRemoverContrato = (produto_id: number, index: number) => {
    setContratosSelecionados(prev => {
      const novo = new Map(prev);
      const contratos = novo.get(produto_id) || [];
      if (contratos.length > 1) {
        novo.set(produto_id, contratos.filter((_, i) => i !== index));
      }
      return novo;
    });
  };

  const handleAlterarContrato = (produto_id: number, index: number, contrato_produto_id: number) => {
    setContratosSelecionados(prev => {
      const novo = new Map(prev);
      const contratos = [...(novo.get(produto_id) || [])];
      if (contratos[index]) {
        contratos[index] = { ...contratos[index], contrato_produto_id };
      }
      novo.set(produto_id, contratos);
      return novo;
    });
  };

  const handleAlterarQuantidade = (produto_id: number, index: number, quantidade: number) => {
    setContratosSelecionados(prev => {
      const novo = new Map(prev);
      const contratos = [...(novo.get(produto_id) || [])];
      if (contratos[index]) {
        contratos[index] = { ...contratos[index], quantidade: Math.max(0, quantidade) };
      }
      novo.set(produto_id, contratos);
      return novo;
    });
  };

  const handleDividirPorSaldo = () => {
    const novo = new Map<number, ContratoSelecionado[]>();
    const divisao = new Map<number, boolean>();
    
    produtos.forEach(produto => {
      let restante = produto.quantidade_necessaria;
      const contratosOrdenados = [...produto.contratos].sort((a, b) => b.saldo_disponivel - a.saldo_disponivel);
      const distribuicao: ContratoSelecionado[] = [];

      for (const contrato of contratosOrdenados) {
        if (restante <= 0) break;
        const quantidade = Math.min(restante, contrato.saldo_disponivel);
        if (quantidade > 0) {
          distribuicao.push({ contrato_produto_id: contrato.contrato_produto_id, quantidade });
          restante -= quantidade;
        }
      }

      if (distribuicao.length > 0) {
        novo.set(produto.produto_id, distribuicao);
        divisao.set(produto.produto_id, distribuicao.length > 1);
      }
    });
    
    setContratosSelecionados(novo);
    setModoDivisao(divisao);
  };

  const handleConfirmar = () => {
    const selecao: { produto_id: number; contrato_produto_id: number; quantidade?: number }[] = [];
    
    for (const [produto_id, contratos] of contratosSelecionados.entries()) {
      const emDivisao = modoDivisao.get(produto_id);
      
      for (const contrato of contratos) {
        selecao.push({
          produto_id,
          contrato_produto_id: contrato.contrato_produto_id,
          quantidade: emDivisao ? contrato.quantidade : undefined
        });
      }
    }
    
    onConfirmar(selecao);
  };

  const todosContratosSelecionados = produtos.every(p => {
    const contratos = contratosSelecionados.get(p.produto_id);
    if (!contratos || contratos.length === 0) return false;
    
    const emDivisao = modoDivisao.get(p.produto_id);
    if (emDivisao) {
      const totalAlocado = contratos.reduce((sum, c) => sum + c.quantidade, 0);
      return Math.abs(totalAlocado - p.quantidade_necessaria) < 0.01;
    }
    
    return true;
  });

  const formatarMoeda = (valor: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const getContrato = (produto: ProdutoMultiplosContratos, contrato_produto_id: number) => {
    return produto.contratos.find(c => c.contrato_produto_id === contrato_produto_id);
  };

  const getTotalAlocado = (produto_id: number) => {
    const contratos = contratosSelecionados.get(produto_id) || [];
    return contratos.reduce((sum, c) => sum + c.quantidade, 0);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '12px', maxHeight: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>Selecionar Contratos</Typography>
          <Typography variant="caption" color="text.secondary">{produtos.length} produto(s) em múltiplos contratos</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 1 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Você pode selecionar um único contrato ou dividir a quantidade entre múltiplos contratos.
        </Alert>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" startIcon={<DividirIcon />} onClick={handleDividirPorSaldo} color="secondary">
            Dividir por Saldo Disponível
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {produtos.map((produto, index) => {
          const contratosDoP = contratosSelecionados.get(produto.produto_id) || [];
          const emDivisao = modoDivisao.get(produto.produto_id) || false;
          const totalAlocado = getTotalAlocado(produto.produto_id);
          const diferenca = produto.quantidade_necessaria - totalAlocado;

          return (
            <Card key={produto.produto_id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {index + 1}. {produto.produto_nome}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Quantidade necessária: {produto.quantidade_necessaria.toFixed(2)} {produto.unidade}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={<Checkbox checked={emDivisao} onChange={() => handleToggleDivisao(produto.produto_id)} size="small" />}
                    label={<Typography variant="caption">Dividir entre contratos</Typography>}
                  />
                </Box>

                <Stack spacing={1.5}>
                  {contratosDoP.map((contratoSel, idx) => {
                    const contrato = getContrato(produto, contratoSel.contrato_produto_id);
                    if (!contrato) return null;

                    return (
                      <Box key={idx} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'start' }}>
                          <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Contrato</InputLabel>
                            <Select
                              value={contratoSel.contrato_produto_id}
                              label="Contrato"
                              onChange={(e) => handleAlterarContrato(produto.produto_id, idx, Number(e.target.value))}
                              disabled={!emDivisao && contratosDoP.length === 1}
                            >
                              {produto.contratos.map(c => (
                                <MenuItem key={c.contrato_produto_id} value={c.contrato_produto_id}>
                                  <Box>
                                    <Typography variant="body2">{c.fornecedor_nome}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {c.contrato_numero} • {formatarMoeda(c.preco_unitario)}/{produto.unidade} • Saldo: {c.saldo_disponivel.toFixed(2)}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          {emDivisao && (
                            <>
                              <TextField
                                label="Quantidade"
                                type="number"
                                size="small"
                                value={contratoSel.quantidade}
                                onChange={(e) => handleAlterarQuantidade(produto.produto_id, idx, Number(e.target.value))}
                                sx={{ width: 150 }}
                                inputProps={{ min: 0, step: 0.01 }}
                              />
                              {contratosDoP.length > 1 && (
                                <IconButton size="small" onClick={() => handleRemoverContrato(produto.produto_id, idx)} color="error">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </>
                          )}
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Valor: {formatarMoeda(contratoSel.quantidade * contrato.preco_unitario)}
                        </Typography>
                      </Box>
                    );
                  })}

                  {emDivisao && contratosDoP.length < produto.contratos.length && (
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleAdicionarContrato(produto.produto_id)}
                      variant="outlined"
                    >
                      Adicionar Contrato
                    </Button>
                  )}
                </Stack>

                {emDivisao && (
                  <Box sx={{ mt: 1.5, p: 1, bgcolor: Math.abs(diferenca) < 0.01 ? 'success.50' : 'warning.50', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Total alocado: {totalAlocado.toFixed(2)} / {produto.quantidade_necessaria.toFixed(2)} {produto.unidade}
                    </Typography>
                    {Math.abs(diferenca) >= 0.01 && (
                      <Typography variant="caption" color="warning.dark" sx={{ display: 'block' }}>
                        {diferenca > 0 ? `Faltam ${diferenca.toFixed(2)}` : `Excesso de ${Math.abs(diferenca).toFixed(2)}`} {produto.unidade}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleConfirmar} variant="contained" disabled={!todosContratosSelecionados} startIcon={<CheckIcon />}>
          Confirmar e Gerar Pedido
        </Button>
      </DialogActions>
    </Dialog>
  );
}
