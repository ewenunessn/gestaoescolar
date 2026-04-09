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
import { toNum, toFixed, formatarMoeda } from '../utils/formatters';

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
    const produto = produtos.find(p => p.produto_id === produto_id);
    if (!produto) return;

    setContratosSelecionados(prev => {
      const novo = new Map(prev);
      const contratos = [...(novo.get(produto_id) || [])];
      if (contratos[index]) {
        // Calcular o total alocado nos outros contratos
        const totalOutros = contratos.reduce((sum, c, i) => i === index ? sum : sum + c.quantidade, 0);
        
        // Quantidade máxima permitida para este contrato
        const maxPermitido = produto.quantidade_necessaria - totalOutros;
        
        // Limitar a quantidade entre 0 e o máximo permitido
        const qtdLimitada = Math.max(0, Math.min(quantidade, maxPermitido));
        
        contratos[index] = { ...contratos[index], quantidade: qtdLimitada };
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
      const contratosOrdenados = [...produto.contratos].sort((a, b) => toNum(b.saldo_disponivel) - toNum(a.saldo_disponivel));
      const distribuicao: ContratoSelecionado[] = [];

      for (const contrato of contratosOrdenados) {
        if (restante <= 0) break;
        const saldo = toNum(contrato.saldo_disponivel);
        const quantidade = Math.min(restante, saldo);
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
          const isValido = Math.abs(diferenca) < 0.01;

          return (
            <Card key={produto.produto_id} sx={{ mb: 2, border: isValido ? '1px solid' : '2px solid', borderColor: isValido ? 'divider' : 'warning.main' }}>
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

                    // Calcular quanto já foi alocado nos outros contratos
                    const totalOutros = contratosDoP.reduce((sum, c, i) => i === idx ? sum : sum + c.quantidade, 0);
                    const maxPermitido = produto.quantidade_necessaria - totalOutros;
                    const saldoContrato = toNum(contrato.saldo_disponivel);
                    const maxPossivelNeste = Math.min(maxPermitido, saldoContrato);

                    return (
                      <Box key={idx} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
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
                                      {c.contrato_numero} • {formatarMoeda(c.preco_unitario)}/{produto.unidade} • Saldo: {toFixed(c.saldo_disponivel, 2)}
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
                                inputProps={{ 
                                  min: 0, 
                                  max: maxPossivelNeste,
                                  step: 0.01 
                                }}
                                helperText={maxPossivelNeste < maxPermitido ? `Máx: ${toFixed(maxPossivelNeste, 2)} (saldo)` : `Máx: ${toFixed(maxPermitido, 2)}`}
                                error={contratoSel.quantidade > maxPossivelNeste}
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
                          Valor: {formatarMoeda(contratoSel.quantidade * toNum(contrato.preco_unitario))}
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
                  <>
                    <Box sx={{ mt: 1.5, p: 1, bgcolor: Math.abs(diferenca) < 0.01 ? 'success.light' : 'warning.light', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        Total alocado: {totalAlocado.toFixed(2)} / {produto.quantidade_necessaria.toFixed(2)} {produto.unidade}
                      </Typography>
                      {Math.abs(diferenca) >= 0.01 && (
                        <Typography variant="caption" color="warning.dark" sx={{ display: 'block' }}>
                          {diferenca > 0 ? `Faltam ${diferenca.toFixed(2)}` : `Excesso de ${Math.abs(diferenca).toFixed(2)}`} {produto.unidade}
                        </Typography>
                      )}
                    </Box>
                    
                    {diferenca > 0.01 && contratosDoP.length < produto.contratos.length && (
                      <Button
                        size="small"
                        variant="text"
                        color="primary"
                        onClick={() => {
                          // Distribuir o restante automaticamente
                          const restante = diferenca;
                          const contratosDisponiveis = produto.contratos.filter(c => 
                            !contratosDoP.find(cp => cp.contrato_produto_id === c.contrato_produto_id)
                          );
                          
                          if (contratosDisponiveis.length > 0) {
                            // Pegar o contrato com maior saldo
                            const melhorContrato = contratosDisponiveis.sort((a, b) => 
                              toNum(b.saldo_disponivel) - toNum(a.saldo_disponivel)
                            )[0];
                            
                            const saldoDisponivel = toNum(melhorContrato.saldo_disponivel);
                            const qtdAdicionar = Math.min(restante, saldoDisponivel);
                            
                            if (qtdAdicionar > 0) {
                              setContratosSelecionados(prev => {
                                const novo = new Map(prev);
                                const contratos = [...(novo.get(produto.produto_id) || [])];
                                contratos.push({
                                  contrato_produto_id: melhorContrato.contrato_produto_id,
                                  quantidade: qtdAdicionar
                                });
                                novo.set(produto.produto_id, contratos);
                                return novo;
                              });
                            }
                          }
                        }}
                        sx={{ mt: 1 }}
                      >
                        Adicionar contrato para completar ({diferenca.toFixed(2)} {produto.unidade})
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Resumo Final */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Resumo da Seleção</Typography>
          {produtos.map(produto => {
            const contratosDoP = contratosSelecionados.get(produto.produto_id) || [];
            const emDivisao = modoDivisao.get(produto.produto_id) || false;
            const totalAlocado = getTotalAlocado(produto.produto_id);
            const diferenca = produto.quantidade_necessaria - totalAlocado;
            const isValido = Math.abs(diferenca) < 0.01;
            
            return (
              <Box key={produto.produto_id} sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isValido ? '✓' : '⚠️'} {produto.produto_nome}: {totalAlocado.toFixed(2)} / {produto.quantidade_necessaria.toFixed(2)} {produto.unidade}
                  {emDivisao && ` (${contratosDoP.length} contrato${contratosDoP.length > 1 ? 's' : ''})`}
                </Typography>
              </Box>
            );
          })}
        </Box>
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
