import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Button,
  Alert,
  Divider,
  Grid,
  Paper,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { ConfiguracaoModuloSaldo } from '../services/configService';
import { useConfigContext } from '../context/ConfigContext';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import { useConfiguracaoModuloSaldo, useSalvarConfiguracaoModuloSaldo } from '../hooks/queries';

const ConfiguracoesSistema: React.FC = () => {
  const { success, error } = useNotification();
  
  // React Query hooks
  const configQuery = useConfiguracaoModuloSaldo();
  const salvarMutation = useSalvarConfiguracaoModuloSaldo();
  
  const [configuracao, setConfiguracao] = useState<ConfiguracaoModuloSaldo>({
    modulo_principal: 'modalidades',
    mostrar_ambos: true
  });

  useEffect(() => {
    // Sincronizar com React Query quando carregado
    if (configQuery.data) {
      setConfiguracao(configQuery.data);
    }
  }, [configQuery.data]);

  const handleSalvar = async () => {
    salvarMutation.mutate(configuracao, {
      onSuccess: () => {
        success('✅ Configurações salvas! O menu foi atualizado automaticamente. Verifique a navegação lateral para ver as mudanças.');
      },
      onError: (err: any) => {
        console.error('Erro ao salvar configurações:', err);
        error('Erro ao salvar configurações');
      }
    });
  };

  const handleReset = () => {
    setConfiguracao({
      modulo_principal: 'modalidades',
      mostrar_ambos: true
    });
  };

  if (configQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

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
          {/* Configuração do Módulo de Saldo de Contratos */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: '12px' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <AssessmentIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Módulo de Saldo de Contratos
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  Configure qual módulo de saldo de contratos deve ser o principal no sistema.
                </Alert>

                <Box sx={{ mb: 4 }}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 2 }}>
                      Módulo Principal
                    </FormLabel>
                    <RadioGroup
                      value={configuracao.modulo_principal}
                      onChange={(e) => setConfiguracao({
                        ...configuracao,
                        modulo_principal: e.target.value as 'geral' | 'modalidades'
                      })}
                    >
                      <FormControlLabel
                        value="modalidades"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CategoryIcon fontSize="small" />
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                Saldo por Modalidades
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Controle detalhado por modalidade de ensino (Creche, Pré-escola, etc.)
                              </Typography>
                            </Box>
                          </Box>
                        }
                        sx={{ mb: 2, alignItems: 'flex-start' }}
                      />
                      <FormControlLabel
                        value="geral"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AssessmentIcon fontSize="small" />
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                Saldo Geral
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Visão geral dos saldos de contratos sem divisão por modalidade
                              </Typography>
                            </Box>
                          </Box>
                        }
                        sx={{ alignItems: 'flex-start' }}
                      />
                    </RadioGroup>
                  </FormControl>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={configuracao.mostrar_ambos}
                        onChange={(e) => setConfiguracao({
                          ...configuracao,
                          mostrar_ambos: e.target.checked
                        })}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          Mostrar ambos os módulos no menu
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Se desabilitado, apenas o módulo principal será exibido no menu de navegação
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start' }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Preview da Configuração */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: '12px', bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'primary.main' }}>
                  Preview da Configuração
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Módulo Principal:
                  </Typography>
                  <Chip
                    icon={configuracao.modulo_principal === 'modalidades' ? <CategoryIcon /> : <AssessmentIcon />}
                    label={configuracao.modulo_principal === 'modalidades' ? 'Saldo por Modalidades' : 'Saldo Geral'}
                    color="primary"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Itens no Menu:
                  </Typography>
                  {configuracao.mostrar_ambos ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Chip
                        label="Saldo por Modalidades"
                        size="small"
                        variant={configuracao.modulo_principal === 'modalidades' ? 'filled' : 'outlined'}
                        color={configuracao.modulo_principal === 'modalidades' ? 'primary' : 'default'}
                      />
                      <Chip
                        label="Saldo Geral"
                        size="small"
                        variant={configuracao.modulo_principal === 'geral' ? 'filled' : 'outlined'}
                        color={configuracao.modulo_principal === 'geral' ? 'primary' : 'default'}
                      />
                    </Box>
                  ) : (
                    <Chip
                      label={configuracao.modulo_principal === 'modalidades' ? 'Saldo por Modalidades' : 'Saldo Geral'}
                      size="small"
                      color="primary"
                    />
                  )}
                </Box>

                <Alert 
                  severity={JSON.stringify(configuracao) === JSON.stringify(configModuloSaldo) ? "success" : "info"} 
                  sx={{ fontSize: '0.875rem' }}
                >
                  {JSON.stringify(configuracao) === JSON.stringify(configModuloSaldo) ? (
                    <>
                      ✅ Configuração ativa: {configuracao.mostrar_ambos 
                        ? `O módulo "${configuracao.modulo_principal === 'modalidades' ? 'Saldo por Modalidades' : 'Saldo Geral'}" é o principal, ambos estão no menu.`
                        : `Apenas o módulo "${configuracao.modulo_principal === 'modalidades' ? 'Saldo por Modalidades' : 'Saldo Geral'}" está no menu.`
                      }
                    </>
                  ) : (
                    <>
                      ⚠️ Configuração pendente: {configuracao.mostrar_ambos 
                        ? `O módulo "${configuracao.modulo_principal === 'modalidades' ? 'Saldo por Modalidades' : 'Saldo Geral'}" será o principal, ambos estarão no menu.`
                        : `Apenas o módulo "${configuracao.modulo_principal === 'modalidades' ? 'Saldo por Modalidades' : 'Saldo Geral'}" será exibido no menu.`
                      } Clique em "Salvar" para aplicar.
                    </>
                  )}
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Botões de Ação */}
        <Paper sx={{ p: 3, mt: 3, borderRadius: '12px', bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              disabled={saving}
            >
              Restaurar Padrão
            </Button>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setConfiguracao(configModuloSaldo);
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                startIcon={salvarMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSalvar}
                disabled={salvarMutation.isPending}
              >
                {salvarMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ConfiguracoesSistema;