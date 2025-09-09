import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';

interface AgrupamentoDetalhes {
  id: number;
  mes: number;
  ano: number;
  status: 'aberto' | 'fechado' | 'processando';
  total_escolas: number;
  total_alunos: number;
  valor_total: number;
  data_criacao: string;
  data_fechamento?: string;
}

interface DetalhesAgrupamentoProps {
  agrupamento: AgrupamentoDetalhes;
}

export const DetalhesAgrupamento: React.FC<DetalhesAgrupamentoProps> = ({ agrupamento }) => {
  const formatarMes = (mes: number) => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1] || 'Mês inválido';
  };

  const formatarStatus = (status: string) => {
    const statusMap = {
      'aberto': { label: 'Aberto', color: 'success' as const },
      'fechado': { label: 'Fechado', color: 'default' as const },
      'processando': { label: 'Processando', color: 'warning' as const }
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, color: 'default' as const };
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const statusInfo = formatarStatus(agrupamento.status);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Agrupamento {formatarMes(agrupamento.mes)} {agrupamento.ano}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações Gerais
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={statusInfo.label} 
                  color={statusInfo.color}
                  size="small"
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Período
                </Typography>
                <Typography variant="body1">
                  {formatarMes(agrupamento.mes)} de {agrupamento.ano}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Data de Criação
                </Typography>
                <Typography variant="body1">
                  {formatarData(agrupamento.data_criacao)}
                </Typography>
              </Box>

              {agrupamento.data_fechamento && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Data de Fechamento
                  </Typography>
                  <Typography variant="body1">
                    {formatarData(agrupamento.data_fechamento)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estatísticas
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Total de Escolas</TableCell>
                      <TableCell align="right">
                        <Typography variant="h6">
                          {agrupamento.total_escolas.toLocaleString('pt-BR')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total de Alunos</TableCell>
                      <TableCell align="right">
                        <Typography variant="h6">
                          {agrupamento.total_alunos.toLocaleString('pt-BR')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Valor Total</TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" color="primary">
                          {formatarValor(agrupamento.valor_total)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};