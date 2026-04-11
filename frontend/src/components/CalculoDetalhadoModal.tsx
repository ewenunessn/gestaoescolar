import React from 'react';
import {
  Typography,
  Box,
  Divider,
  Chip
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import { toNum } from '../utils/formatters';
import { DetailsDialog } from './BaseDialog';

interface CalculoDetalhado {
  alunos: number;
  per_capita_liquido: number;
  fator_correcao: number;
  per_capita_bruto: number;
  vezes_no_periodo: number;
  dias: number[];
  formula: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  produto: {
    produto_nome: string;
    quantidade_kg: number;
    calculo_detalhado?: CalculoDetalhado;
  };
  escola: {
    escola_nome: string;
    modalidade_nome: string;
  };
}

export default function CalculoDetalhadoModal({ open, onClose, produto, escola }: Props) {
  const calc = produto.calculo_detalhado;

  if (!calc) {
    return null;
  }

  return (
    <DetailsDialog
      open={open}
      onClose={onClose}
      title="Detalhamento do Cálculo"
      icon={<CalculateIcon color="primary" />}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Produto
        </Typography>
        <Typography variant="h6" gutterBottom>
          {produto.produto_nome}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Escola / Modalidade
        </Typography>
        <Typography variant="body1">
          {escola.escola_nome} • {escola.modalidade_nome}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Componentes do Cálculo
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Número de alunos:
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {calc.alunos}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Per capita líquido (consumo):
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {calc.per_capita_liquido}g
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Fator de correção:
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {toNum(calc.fator_correcao, 1).toFixed(2)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Per capita bruto (compra):
          </Typography>
          <Typography variant="body1" fontWeight="medium" color="primary.main">
            {toNum(calc.per_capita_bruto).toFixed(2)}g
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Vezes no período:
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {calc.vezes_no_periodo}
          </Typography>
        </Box>

        {calc.dias && calc.dias.length > 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Dias do mês:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {calc.dias.map((dia) => (
                <Chip key={dia} label={dia} size="small" />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ bgcolor: 'primary.50', p: 2, borderRadius: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Fórmula
        </Typography>
        <Typography variant="body1" fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
          {calc.formula}
        </Typography>
      </Box>

      <Box sx={{ mt: 2, bgcolor: 'success.50', p: 2, borderRadius: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Quantidade Total para Compra
        </Typography>
        <Typography variant="h5" fontWeight="bold" color="success.dark">
          {toNum(produto.quantidade_kg).toFixed(2)} kg
        </Typography>
      </Box>
    </DetailsDialog>
  );
}
