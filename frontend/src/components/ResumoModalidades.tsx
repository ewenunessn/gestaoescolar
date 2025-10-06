import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { formatarMoeda } from '../utils/dateUtils';

interface ModalidadeResumo {
  nome: string;
  codigo_financeiro?: string;
  quantidade: number;
  percentual: number;
  valor: number;
}

interface ResumoModalidadesProps {
  modalidades: ModalidadeResumo[];
  titulo?: string;
}

export default function ResumoModalidades({ modalidades, titulo = "Resumo por Modalidade" }: ResumoModalidadesProps) {
  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(2)}%`;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {titulo}
      </Typography>
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">
                  Modalidade
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  Quantidade
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  Percentual
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight="bold">
                  Valor
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modalidades.map((modalidade, index) => (
              <TableRow key={index} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {modalidade.nome}
                    </Typography>
                    {modalidade.codigo_financeiro && (
                      <Typography variant="caption" color="text.secondary">
                        {modalidade.codigo_financeiro}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    color="primary"
                  >
                    {modalidade.quantidade}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {formatarPercentual(modalidade.percentual)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    color="primary"
                  >
                    {formatarMoeda(modalidade.valor)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}