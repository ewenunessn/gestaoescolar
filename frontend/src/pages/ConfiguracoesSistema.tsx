import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Grid,
  Paper
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import PageBreadcrumbs from '../components/PageBreadcrumbs';

const ConfiguracoesSistema: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <PageBreadcrumbs 
          items={[
            { label: 'Configurações do Sistema', icon: <SettingsIcon fontSize="small" /> }
          ]}
        />
        
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>
          Configurações do Sistema
        </Typography>

        <Grid container spacing={3}>
          {/* Informação sobre o Módulo de Saldo */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: '12px' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <CategoryIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Módulo de Saldo de Contratos
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  O sistema utiliza o módulo de <strong>Saldo por Modalidades</strong> para controle detalhado por modalidade de ensino (Creche, Pré-escola, etc.).
                </Alert>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3, bgcolor: 'primary.50', borderRadius: 2 }}>
                  <CategoryIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      Saldo por Modalidades
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Controle detalhado de saldos por modalidade de ensino, permitindo gestão precisa dos recursos por categoria educacional.
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Informação adicional */}
        <Paper sx={{ p: 3, mt: 3, borderRadius: '12px', bgcolor: 'background.paper' }}>
          <Typography variant="body2" color="text.secondary">
            ℹ️ Esta página está disponível para futuras configurações do sistema. Atualmente, o módulo de Saldo por Modalidades é o único disponível e está sempre ativo.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default ConfiguracoesSistema;