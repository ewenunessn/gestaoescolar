import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Box, Chip, Divider, Paper,
} from '@mui/material';
import { CustoCardapio } from '../services/cardapiosModalidade';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Props {
  open: boolean;
  onClose: () => void;
  custo: CustoCardapio;
}

export default function CustoCardapioDetalheModal({ open, onClose, custo }: Props) {
  // Agrupar detalhes por dia
  const porDia = React.useMemo(() => {
    const map = new Map<number, typeof custo.detalhes_por_refeicao>();
    for (const r of custo.detalhes_por_refeicao) {
      const dia = r.dia ?? 0;
      if (!map.has(dia)) map.set(dia, []);
      map.get(dia)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [custo.detalhes_por_refeicao]);

  const custoPorAluno = custo.total_alunos > 0 ? custo.custo_total / custo.total_alunos : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Detalhamento de Custo por Refeição</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`${custo.total_alunos} alunos`} size="small" color="primary" />
            <Chip label={`${custo.total_refeicoes} refeições`} size="small" />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Resumo geral */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {[
            { label: 'Custo Total', value: fmt(custo.custo_total), color: 'success.main' },
            { label: 'Custo por Aluno', value: fmt(custoPorAluno), color: 'primary.main' },
          ].map(({ label, value, color }) => (
            <Box key={label} sx={{ flex: 1, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
            </Box>
          ))}
          {custo.detalhes_por_modalidade.map((m) => (
            <Box key={m.modalidade_id} sx={{ flex: 1, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
              <Typography variant="caption" color="text.secondary">{m.quantidade_alunos} alunos</Typography>
              <Typography variant="h5" fontWeight={700}>{fmt(m.custo_total)}</Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Tabela por dia */}
        {porDia.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            Nenhum detalhe disponível. Verifique se os produtos têm contratos ativos com preço cadastrado.
          </Typography>
        ) : (
          porDia.map(([dia, refeicoes]) => (
            <Box key={dia} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'primary.main' }}>
                Dia {dia}
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell><strong>Refeição</strong></TableCell>
                      <TableCell><strong>Tipo</strong></TableCell>
                      <TableCell align="right"><strong>Alunos</strong></TableCell>
                      <TableCell align="right"><strong>Custo/Aluno</strong></TableCell>
                      <TableCell align="right"><strong>Custo Total</strong></TableCell>
                      <TableCell><strong>Produtos</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {refeicoes.map((r, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{r.refeicao_nome}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={r.tipo_refeicao} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{(r as any).quantidade_alunos ?? custo.total_alunos}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="primary.main">
                            {fmt(r.custo_por_aluno)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            {fmt(r.custo_total)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {r.produtos?.map((p: any, pi: number) => (
                              <Chip
                                key={pi}
                                label={`${p.produto_nome}: ${fmt(p.custo_por_aluno)}/aluno`}
                                size="small"
                                variant="outlined"
                                color={p.preco_unitario > 0 ? 'default' : 'error'}
                              />
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
