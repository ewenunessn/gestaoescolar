import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import { toNum } from '../utils/formatters';

interface DetalhamentoItem {
  produto: string;
  quantidade_liquida: number;
  quantidade_crua?: number;
  quantidade_bruta: number;
  unidade: string;
  indice_coccao?: number;
  fator_correcao?: number;
  preco_unitario: number | null;
  custo: number | null;
  aviso?: string;
}

interface DetalhamentoCustoModalProps {
  open: boolean;
  onClose: () => void;
  detalhamento: DetalhamentoItem[];
  custoTotal: number;
  custoPorPorcao: number;
  rendimentoPorcoes: number;
}

export default function DetalhamentoCustoModal({
  open,
  onClose,
  detalhamento,
  custoTotal,
  custoPorPorcao,
  rendimentoPorcoes,
}: DetalhamentoCustoModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Detalhamento do Custo</Typography>
          <Chip label={`${rendimentoPorcoes} porções`} size="small" color="primary" />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Este detalhamento mostra como o custo é calculado considerando o Índice de Cocção (IC) e o Fator de Correção (FC).
          </Typography>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Produto</strong></TableCell>
                <TableCell align="right"><strong>Qtd Líquida</strong></TableCell>
                <TableCell align="right"><strong>IC</strong></TableCell>
                <TableCell align="right"><strong>Qtd Crua</strong></TableCell>
                <TableCell align="right"><strong>FC</strong></TableCell>
                <TableCell align="right"><strong>Qtd Bruta</strong></TableCell>
                <TableCell align="right"><strong>Preço Unit.</strong></TableCell>
                <TableCell align="right"><strong>Custo</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detalhamento.map((item, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    {item.produto}
                    {item.aviso && (
                      <Typography variant="caption" color="error" display="block">
                        {item.aviso}
                      </Typography>
                    )}
                  </TableCell>
                  
                  {/* Quantidade Líquida (o que o aluno come - cozido) */}
                  <TableCell align="right">
                    <Typography variant="body2">
                      {toNum(item.quantidade_liquida).toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.unidade}
                    </Typography>
                  </TableCell>
                  
                  {/* Índice de Cocção */}
                  <TableCell align="right">
                    <Chip 
                      label={item.indice_coccao ? toNum(item.indice_coccao).toFixed(2) : '1.00'} 
                      size="small" 
                      color={item.indice_coccao && item.indice_coccao !== 1 ? 'info' : 'default'}
                    />
                  </TableCell>
                  
                  {/* Quantidade Crua (antes de cozinhar) */}
                  <TableCell align="right">
                    {item.quantidade_crua !== undefined ? (
                      <>
                        <Typography variant="body2">
                          {toNum(item.quantidade_crua).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.unidade}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  
                  {/* Fator de Correção */}
                  <TableCell align="right">
                    <Chip 
                      label={item.fator_correcao ? toNum(item.fator_correcao).toFixed(2) : '1.00'} 
                      size="small" 
                      color={item.fator_correcao && item.fator_correcao !== 1 ? 'warning' : 'default'}
                    />
                  </TableCell>
                  
                  {/* Quantidade Bruta (o que precisa comprar) */}
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {toNum(item.quantidade_bruta).toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.unidade}
                    </Typography>
                  </TableCell>
                  
                  {/* Preço Unitário */}
                  <TableCell align="right">
                    {item.preco_unitario !== null ? (
                      <Typography variant="body2">
                        R$ {toNum(item.preco_unitario).toFixed(2)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="error">-</Typography>
                    )}
                  </TableCell>
                  
                  {/* Custo */}
                  <TableCell align="right">
                    {item.custo !== null ? (
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        R$ {toNum(item.custo).toFixed(2)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="error">-</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />

        {/* Resumo */}
        <Box display="flex" justifyContent="space-between" alignItems="center" p={2} bgcolor="grey.50" borderRadius={1}>
          <Box>
            <Typography variant="body2" color="text.secondary">Custo Total</Typography>
            <Typography variant="h5" fontWeight={600} color="success.main">
              R$ {toNum(custoTotal).toFixed(2)}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="text.secondary">Custo por Porção</Typography>
            <Typography variant="h5" fontWeight={600} color="success.main">
              R$ {toNum(custoPorPorcao).toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Legenda */}
        <Box mt={2} p={2} bgcolor="info.lighter" borderRadius={1}>
          <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
            📊 Como o custo é calculado:
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            1️⃣ <strong>Qtd Líquida</strong>: O que o aluno vai comer (cozido)
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            2️⃣ <strong>Qtd Crua</strong> = Qtd Líquida ÷ IC (antes de cozinhar)
          </Typography>
          <Typography variant="caption" display="block" gutterBottom>
            3️⃣ <strong>Qtd Bruta</strong> = Qtd Crua × FC (o que precisa comprar)
          </Typography>
          <Typography variant="caption" display="block">
            4️⃣ <strong>Custo</strong> = Qtd Bruta × Preço Unitário
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
