import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Alert,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import {
    Warning,
    CheckCircle,
    Error,
    Sync,
    Assessment,
    Visibility,
} from '@mui/icons-material';
import { consistenciaService } from '../services/consistenciaService';

interface DashboardData {
    resumo_geral: {
        total_pedidos: number;
        pedidos_consistentes: number;
        pedidos_com_divergencia: number;
        percentual_consistencia: number;
    };
    alertas_criticos: Array<{
        tipo: string;
        pedido_id: number;
        numero_pedido: string;
        descricao: string;
        data_deteccao: string;
    }>;
    metricas_por_status: Array<{
        status: string;
        quantidade: number;
        percentual_consistencia: number;
    }>;
}

const DashboardConsistencia: React.FC = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sincronizando, setSincronizando] = useState(false);
    const [detalhePedido, setDetalhePedido] = useState<any | null>(null);
    const [dialogAberto, setDialogAberto] = useState(false);

    const carregarDashboard = async () => {
        try {
            setLoading(true);
            const data = await consistenciaService.dashboardConsistencia();
            setDashboardData(data);
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const sincronizarTodos = async () => {
        try {
            setSincronizando(true);
            await consistenciaService.sincronizarDados();
            await carregarDashboard();
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
        } finally {
            setSincronizando(false);
        }
    };

    const verDetalhePedido = async (pedidoId: number) => {
        try {
            const detalhe = await consistenciaService.verificarConsistenciaPedido(pedidoId);
            setDetalhePedido(detalhe);
            setDialogAberto(true);
        } catch (error) {
            console.error('Erro ao carregar detalhe:', error);
        }
    };

    const getStatusColor = (percentual: number) => {
        if (percentual >= 95) return 'success';
        if (percentual >= 80) return 'warning';
        return 'error';
    };

    const getStatusIcon = (percentual: number) => {
        if (percentual >= 95) return <CheckCircle color="success" />;
        if (percentual >= 80) return <Warning color="warning" />;
        return <Error color="error" />;
    };

    useEffect(() => {
        carregarDashboard();
        // Atualizar a cada 5 minutos
        const interval = setInterval(carregarDashboard, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!dashboardData) {
        return (
            <Alert severity="error">
                Erro ao carregar dados do dashboard de consistência
            </Alert>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Dashboard de Consistência
                </Typography>
                <Button
                    variant="contained"
                    startIcon={sincronizando ? <CircularProgress size={20} /> : <Sync />}
                    onClick={sincronizarTodos}
                    disabled={sincronizando}
                >
                    {sincronizando ? 'Sincronizando...' : 'Sincronizar Dados'}
                </Button>
            </Box>

            {/* Resumo Geral */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Assessment sx={{ mr: 1 }} />
                                <Typography variant="h6">Total de Pedidos</Typography>
                            </Box>
                            <Typography variant="h3" color="primary">
                                {dashboardData.resumo_geral.total_pedidos}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                                <Typography variant="h6">Consistentes</Typography>
                            </Box>
                            <Typography variant="h3" color="success.main">
                                {dashboardData.resumo_geral.pedidos_consistentes}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Warning sx={{ mr: 1, color: 'warning.main' }} />
                                <Typography variant="h6">Com Divergência</Typography>
                            </Box>
                            <Typography variant="h3" color="warning.main">
                                {dashboardData.resumo_geral.pedidos_com_divergencia}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                {getStatusIcon(dashboardData.resumo_geral.percentual_consistencia)}
                                <Typography variant="h6" sx={{ ml: 1 }}>Consistência</Typography>
                            </Box>
                            <Typography variant="h3" color={`${getStatusColor(dashboardData.resumo_geral.percentual_consistencia)}.main`}>
                                {dashboardData.resumo_geral.percentual_consistencia.toFixed(1)}%
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={dashboardData.resumo_geral.percentual_consistencia}
                                color={getStatusColor(dashboardData.resumo_geral.percentual_consistencia)}
                                sx={{ mt: 1 }}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Alertas Críticos */}
            {dashboardData.alertas_criticos.length > 0 && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" mb={2} color="error">
                            <Error sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Alertas Críticos
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tipo</TableCell>
                                        <TableCell>Pedido</TableCell>
                                        <TableCell>Descrição</TableCell>
                                        <TableCell>Data Detecção</TableCell>
                                        <TableCell>Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dashboardData.alertas_criticos.map((alerta, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Chip label={alerta.tipo} color="error" size="small" />
                                            </TableCell>
                                            <TableCell>{alerta.numero_pedido}</TableCell>
                                            <TableCell>{alerta.descricao}</TableCell>
                                            <TableCell>
                                                {new Date(alerta.data_deteccao).toLocaleString('pt-BR')}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="small"
                                                    startIcon={<Visibility />}
                                                    onClick={() => verDetalhePedido(alerta.pedido_id)}
                                                >
                                                    Ver Detalhes
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Métricas por Status */}
            <Card>
                <CardContent>
                    <Typography variant="h6" mb={2}>
                        Consistência por Status do Pedido
                    </Typography>
                    <Grid container spacing={2}>
                        {dashboardData.metricas_por_status.map((metrica, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle1" gutterBottom>
                                            {metrica.status}
                                        </Typography>
                                        <Typography variant="h4" color="primary" gutterBottom>
                                            {metrica.quantidade}
                                        </Typography>
                                        <Box display="flex" alignItems="center">
                                            {getStatusIcon(metrica.percentual_consistencia)}
                                            <Typography variant="body2" sx={{ ml: 1 }}>
                                                {metrica.percentual_consistencia.toFixed(1)}% consistente
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={metrica.percentual_consistencia}
                                            color={getStatusColor(metrica.percentual_consistencia)}
                                            sx={{ mt: 1 }}
                                        />
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>

            {/* Dialog de Detalhes do Pedido */}
            <Dialog
                open={dialogAberto}
                onClose={() => setDialogAberto(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    Detalhes de Consistência - Pedido {detalhePedido?.numero_pedido}
                </DialogTitle>
                <DialogContent>
                    {detalhePedido && (
                        <Box>
                            <Alert
                                severity={detalhePedido.resumo.itens_com_divergencia > 0 ? 'warning' : 'success'}
                                sx={{ mb: 2 }}
                            >
                                {detalhePedido.resumo.itens_consistentes} de {detalhePedido.resumo.total_itens} itens consistentes
                                ({detalhePedido.resumo.percentual_consistencia.toFixed(1)}%)
                            </Alert>

                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Produto</TableCell>
                                            <TableCell align="right">Pedido</TableCell>
                                            <TableCell align="right">Recebido</TableCell>
                                            <TableCell align="right">Faturado</TableCell>
                                            <TableCell align="right">Estoque</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {detalhePedido.itens.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.nome_produto}</TableCell>
                                                <TableCell align="right">{item.quantidade_pedida}</TableCell>
                                                <TableCell align="right">{item.quantidade_recebida}</TableCell>
                                                <TableCell align="right">{item.quantidade_faturada}</TableCell>
                                                <TableCell align="right">{item.quantidade_estoque}</TableCell>
                                                <TableCell>
                                                    {item.divergencias.length > 0 ? (
                                                        <Chip
                                                            label={`${item.divergencias.length} divergência(s)`}
                                                            color="warning"
                                                            size="small"
                                                        />
                                                    ) : (
                                                        <Chip label="OK" color="success" size="small" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogAberto(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DashboardConsistencia;