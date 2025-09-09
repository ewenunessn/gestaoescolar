import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper
} from '@mui/material';
import {
  Error,
  Warning,
  Info,
  Schedule,
  Inventory,
  TrendingDown
} from '@mui/icons-material';
import { AlertaEstoque } from '../services/estoqueModernoService';

interface AlertasEstoqueDropdownProps {
  alertas: AlertaEstoque[];
  alertasCriticos: number;
  alertasAvisos: number;
  alertasInfo: number;
  alertasVencidos: number;
  alertasVencimentoProximo: number;
  alertasEstoqueBaixo: number;
  alertasEstoqueZerado: number;
}

const AlertasEstoqueDropdown: React.FC<AlertasEstoqueDropdownProps> = ({
  alertas,
  alertasCriticos,
  alertasAvisos,
  alertasInfo,
  alertasVencidos,
  alertasVencimentoProximo,
  alertasEstoqueBaixo,
  alertasEstoqueZerado
}) => {
  if (alertas.length === 0) {
    return (
      <Paper sx={{ p: 2, minWidth: 250 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Inventory color="success" />
          <Typography variant="body2" color="success.main" fontWeight="bold">
            Estoque sem alertas
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Todos os produtos estão dentro dos parâmetros normais
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ minWidth: 300, maxWidth: 400 }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" fontWeight="bold">
          Alertas de Estoque
        </Typography>
        <Box display="flex" gap={1} mt={1}>
          {alertasCriticos > 0 && (
            <Chip
              label={`${alertasCriticos} críticos`}
              size="small"
              color="error"
              icon={<Error />}
            />
          )}
          {alertasAvisos > 0 && (
            <Chip
              label={`${alertasAvisos} avisos`}
              size="small"
              color="warning"
              icon={<Warning />}
            />
          )}
          {alertasInfo > 0 && (
            <Chip
              label={`${alertasInfo} info`}
              size="small"
              color="info"
              icon={<Info />}
            />
          )}
        </Box>
      </Box>

      <Divider />

      {/* Resumo por tipo */}
      <List dense sx={{ py: 1 }}>
        {alertasVencidos > 0 && (
          <ListItem>
            <ListItemIcon>
              <Error color="error" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={`${alertasVencidos} produtos vencidos`}
              secondary="Requer ação imediata"
            />
          </ListItem>
        )}

        {alertasVencimentoProximo > 0 && (
          <ListItem>
            <ListItemIcon>
              <Schedule color="warning" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={`${alertasVencimentoProximo} próximos ao vencimento`}
              secondary="Vencimento em até 7 dias"
            />
          </ListItem>
        )}

        {alertasEstoqueZerado > 0 && (
          <ListItem>
            <ListItemIcon>
              <TrendingDown color="error" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={`${alertasEstoqueZerado} produtos sem estoque`}
              secondary="Necessário reposição"
            />
          </ListItem>
        )}

        {alertasEstoqueBaixo > 0 && (
          <ListItem>
            <ListItemIcon>
              <Warning color="warning" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={`${alertasEstoqueBaixo} produtos com estoque baixo`}
              secondary="Próximo ao limite mínimo"
            />
          </ListItem>
        )}
      </List>

      {/* Produtos mais críticos */}
      {alertasCriticos > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              PRODUTOS MAIS CRÍTICOS
            </Typography>
            <List dense sx={{ mt: 1 }}>
              {alertas
                .filter(a => a.nivel === 'critical')
                .slice(0, 3)
                .map((alerta, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={alerta.produto_nome}
                      secondary={alerta.titulo}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              {alertasCriticos > 3 && (
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={`+${alertasCriticos - 3} outros produtos`}
                    primaryTypographyProps={{ 
                      variant: 'caption', 
                      color: 'text.secondary',
                      fontStyle: 'italic'
                    }}
                  />
                </ListItem>
              )}
            </List>
          </Box>
        </>
      )}

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 1.5, bgcolor: 'grey.50', textAlign: 'center' }}>
        <Typography variant="caption" color="primary">
          Clique para ver todos os alertas
        </Typography>
      </Box>
    </Paper>
  );
};

export default AlertasEstoqueDropdown;