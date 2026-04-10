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
    Shield,
    DonutLarge,
    Notifications as BellIcon,
} from '@mui/icons-material';
import NotificacoesMenu from './NotificacoesMenu';
import { consistenciaService } from '../services/consistenciaService';
import { toNum } from '../utils/formatters';

// ── Design tokens ──────────────────────────────────────────────
const NAVY = "#0f172a";
const GREEN = "#22c55e";
const GREEN_DARK = "#16a34a";

// ── Types ─────────────────────────────────────────────────────
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

// ── Animations ─────────────────────────────────────────────────
const AnimStyles = () => (
    <style>{`
        @keyframes cons-qb-fade {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cons-qb-skel {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        .cons-qb-card {
            animation: cons-qb-fade 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .cons-qb-card:nth-child(1) { animation-delay: 0.06s; }
        .cons-qb-card:nth-child(2) { animation-delay: 0.12s; }
        .cons-qb-card:nth-child(3) { animation-delay: 0.18s; }
        .cons-qb-card:nth-child(4) { animation-delay: 0.24s; }
        .cons-qb-sec {
            animation: cons-qb-fade 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .cons-qb-sec:nth-child(1) { animation-delay: 0.28s; }
        .cons-qb-sec:nth-child(2) { animation-delay: 0.34s; }
        .cons-qb-skel {
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: cons-qb-skel 1.5s infinite;
            border-radius: 4px;
        }
    `}</style>
);

// ── Stat Card ──────────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    accent: string;
    bg: string;
    progressValue?: number;
    progressColor?: string;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent, bg, progressValue, progressColor, className }) => (
    <Card
        className={className}
        sx={{
            height: '100%',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            bgcolor: '#fff',
            transition: 'all 0.2s',
            overflow: 'visible',
            '&:hover': { boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderColor: '#d1d5db' },
        }}
    >
        <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography
                    sx={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: accent,
                    }}
                >
                    {label}
                </Typography>
                <Box sx={{ width: 36, height: 36, borderRadius: '4px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
                    {icon}
                </Box>
            </Box>

            <Typography
                sx={{
                    fontFamily: '"Fira Code", "Roboto Mono", monospace',
                    fontSize: '1.65rem',
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: accent,
                }}
            >
                {value}
            </Typography>

            {progressValue !== undefined && (
                <Box sx={{ mt: 2 }}>
                    <LinearProgress
                        variant="determinate"
                        value={progressValue}
                        sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: '#f1f5f9',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: progressColor || accent,
                                borderRadius: 2,
                            },
                        }}
                    />
                </Box>
            )}
        </CardContent>
    </Card>
);

// ── Helpers ────────────────────────────────────────────────────
const getStatusAccent = (percentual: number): { accent: string; bg: string } => {
    if (percentual >= 95) return { accent: GREEN_DARK, bg: '#f0fdf4' };
    if (percentual >= 80) return { accent: '#d97706', bg: '#fffbeb' };
    return { accent: '#dc2626', bg: '#fef2f2' };
};

const getStatusIcon = (percentual: number) => {
    if (percentual >= 95) return <CheckCircle sx={{ fontSize: 16, color: GREEN_DARK }} />;
    if (percentual >= 80) return <Warning sx={{ fontSize: 16, color: '#d97706' }} />;
    return <Error sx={{ fontSize: 16, color: '#dc2626' }} />;
};

const Skeletal = () => <div className="cons-qb-skel" style={{ height: 120 }} />;

// ── Main Component ─────────────────────────────────────────────
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

    useEffect(() => {
        carregarDashboard();
        const interval = setInterval(carregarDashboard, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <>
                <AnimStyles />
                <Box sx={{ p: 3 }}>
                    {/* Skeleton header */}
                    <div className="cons-qb-skel" style={{ height: 80, marginBottom: 24 }} />
                    <Grid container spacing={2} mb={3}>
                        {[0, 1, 2, 3].map(i => <Grid item xs={12} md={3} key={i}><Skeletal /></Grid>)}
                    </Grid>
                    <div className="cons-qb-skel" style={{ height: 200, marginBottom: 24 }} />
                    <div className="cons-qb-skel" style={{ height: 300 }} />
                </Box>
            </>
        );
    }

    if (!dashboardData) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ borderRadius: '6px' }}>
                    Erro ao carregar dados do dashboard de consistência
                </Alert>
            </Box>
        );
    }

    const pctMain = getStatusAccent(dashboardData.resumo_geral.percentual_consistencia);

    return (
        <>
            <AnimStyles />
            <Box sx={{ p: 3 }}>
                {/* Navy header bar */}
                <Box
                    sx={{
                        mx: '-20px',
                        mt: '-12px',
                        mb: 3,
                        px: '28px',
                        py: 2.5,
                        background: `linear-gradient(135deg, ${NAVY}, #1e293b)`,
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GREEN}44, transparent)` }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box>
                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '1.55rem',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.2,
                                    letterSpacing: '-0.5px',
                                }}
                            >
                                <Shield sx={{ color: GREEN, fontSize: 26 }} />
                                Dashboard de Consistência
                            </Typography>
                            <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8', mt: 0.2 }}>
                                Monitoramento e verificação de integridade dos pedidos
                            </Typography>
                        </Box>
                        <NotificacoesMenu sx={{ mr: 1 }} />
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={sincronizando ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Sync />}
                        onClick={sincronizarTodos}
                        disabled={sincronizando}
                        sx={{
                            borderRadius: '4px',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 2.5,
                            py: 1.2,
                            bgcolor: sincronizando ? '#64748b' : '#6366f1',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: sincronizando ? '#475569' : '#4f46e5' },
                            fontSize: '0.82rem',
                            zIndex: 1,
                        }}
                    >
                        {sincronizando ? 'Sincronizando...' : 'Sincronizar Dados'}
                    </Button>
                </Box>

                {/* Section bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: GREEN }} />
                    <Typography
                        sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: GREEN,
                        }}
                    >
                        Resumo Geral
                    </Typography>
                </Box>

                {/* 4 Stat Cards */}
                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} md={3}>
                        <StatCard
                            label="Total de Pedidos"
                            value={dashboardData.resumo_geral.total_pedidos}
                            icon={<Assessment sx={{ fontSize: 16 }} />}
                            accent="#2563eb" bg="#eff6ff"
                            className="cons-qb-card"
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <StatCard
                            label="Consistentes"
                            value={dashboardData.resumo_geral.pedidos_consistentes}
                            icon={<CheckCircle sx={{ fontSize: 16, color: GREEN_DARK }} />}
                            accent={GREEN_DARK} bg="#f0fdf4"
                            className="cons-qb-card"
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <StatCard
                            label="Com Divergência"
                            value={dashboardData.resumo_geral.pedidos_com_divergencia}
                            icon={<Warning sx={{ fontSize: 16, color: '#d97706' }} />}
                            accent="#d97706" bg="#fffbeb"
                            className="cons-qb-card"
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <StatCard
                            label="Consistência"
                            value={
                                <Box display="flex" alignItems="baseline" gap={0.3}>
                                    <span>{toNum(dashboardData.resumo_geral.percentual_consistencia).toFixed(1)}</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 500, opacity: 0.7 }}>%</span>
                                </Box>
                            }
                            icon={<DonutLarge sx={{ fontSize: 16, color: pctMain.accent }} />}
                            accent={pctMain.accent} bg={pctMain.bg}
                            progressValue={dashboardData.resumo_geral.percentual_consistencia}
                            progressColor={pctMain.accent}
                            className="cons-qb-card"
                        />
                    </Grid>
                </Grid>

                {/* Alertas Críticos */}
                {dashboardData.alertas_criticos.length > 0 && (
                    <Card className="cons-qb-sec" sx={{ mb: 3, borderRadius: '6px', border: '1px solid #fecaca', overflow: 'hidden' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: '#dc2626' }} />
                                <Typography
                                    sx={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        color: '#dc2626',
                                    }}
                                >
                                    Alertas Críticos
                                </Typography>
                            </Box>
                            <TableContainer sx={{ borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#fef2f2' }}>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#991b1b', borderBottom: '1px solid #fecaca', py: 1 }}>Tipo</TableCell>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#991b1b', borderBottom: '1px solid #fecaca', py: 1 }}>Pedido</TableCell>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#991b1b', borderBottom: '1px solid #fecaca', py: 1 }}>Descrição</TableCell>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#991b1b', borderBottom: '1px solid #fecaca', py: 1 }}>Data</TableCell>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#991b1b', borderBottom: '1px solid #fecaca', py: 1 }}></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dashboardData.alertas_criticos.map((alerta, index) => (
                                            <TableRow key={index} sx={{ '&:hover': { bgcolor: '#fef8f8' }, transition: 'background 0.15s' }}>
                                                <TableCell sx={{ py: 0.8 }}>
                                                    <Chip label={alerta.tipo} color="error" size="small" sx={{ height: 20, fontSize: '0.65rem', borderRadius: '3px', fontWeight: 500 }} />
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        fontFamily: '"Fira Code", "Roboto Mono", monospace',
                                                        fontWeight: 600,
                                                        fontSize: '0.8rem',
                                                        py: 0.8,
                                                    }}
                                                >
                                                    {alerta.numero_pedido}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.8 }}>
                                                    {alerta.descricao}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.72rem', color: '#94a3b8', py: 0.8 }}>
                                                    {new Date(alerta.data_deteccao).toLocaleString('pt-BR')}
                                                </TableCell>
                                                <TableCell sx={{ py: 0.8 }}>
                                                    <Button
                                                        size="small"
                                                        startIcon={<Visibility sx={{ fontSize: 14 }} />}
                                                        onClick={() => verDetalhePedido(alerta.pedido_id)}
                                                        sx={{
                                                            borderRadius: '3px',
                                                            textTransform: 'none',
                                                            fontWeight: 500,
                                                            fontSize: '0.72rem',
                                                            color: '#6366f1',
                                                            px: 1,
                                                            py: 0.3,
                                                        }}
                                                    >
                                                        Ver
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
                <Card className="cons-qb-sec" sx={{ borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                            <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: '#6366f1' }} />
                            <Typography
                                sx={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    color: '#6366f1',
                                }}
                            >
                                Consistência por Status do Pedido
                            </Typography>
                        </Box>
                        <Grid container spacing={2}>
                            {dashboardData.metricas_por_status.map((metrica, index) => {
                                const m = getStatusAccent(metrica.percentual_consistencia);
                                return (
                                    <Grid item xs={12} sm={6} md={4} key={index}>
                                        <Card
                                            className="cons-qb-card"
                                            variant="outlined"
                                            sx={{
                                                borderRadius: '4px',
                                                borderColor: '#e5e7eb',
                                                transition: 'all 0.2s',
                                                '&:hover': { borderColor: m.accent, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
                                            }}
                                        >
                                            <CardContent sx={{ p: 2.5 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.8px',
                                                        color: m.accent,
                                                        mb: 0.8,
                                                    }}
                                                >
                                                    {metrica.status}
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        fontFamily: '"Fira Code", "Roboto Mono", monospace',
                                                        fontSize: '1.5rem',
                                                        fontWeight: 700,
                                                        color: m.accent,
                                                        lineHeight: 1.15,
                                                        mb: 1,
                                                    }}
                                                >
                                                    {metrica.quantidade}
                                                </Typography>
                                                <Box display="flex" alignItems="center" mb={1}>
                                                    {getStatusIcon(metrica.percentual_consistencia)}
                                                    <Typography
                                                        sx={{
                                                            ml: 0.6,
                                                            fontSize: '0.78rem',
                                                            fontWeight: 500,
                                                            color: m.accent,
                                                        }}
                                                    >
                                                        {toNum(metrica.percentual_consistencia).toFixed(1)}% consistente
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={metrica.percentual_consistencia}
                                                    sx={{
                                                        height: 4,
                                                        borderRadius: 2,
                                                        bgcolor: '#f1f5f9',
                                                        '& .MuiLinearProgress-bar': {
                                                            bgcolor: m.accent,
                                                            borderRadius: 2,
                                                        },
                                                    }}
                                                />
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </CardContent>
                </Card>

                {/* Dialog de Detalhes */}
                <Dialog
                    open={dialogAberto}
                    onClose={() => setDialogAberto(false)}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{
                        sx: { borderRadius: '6px', overflow: 'hidden' },
                    }}
                >
                    <DialogTitle
                        sx={{
                            fontWeight: 700,
                            pb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.8,
                            fontSize: '1rem',
                        }}
                    >
                        <Shield sx={{ color: '#6366f1', fontSize: 20 }} />
                        Detalhes de Consistência — Pedido {detalhePedido?.numero_pedido}
                    </DialogTitle>
                    <DialogContent>
                        {detalhePedido && (
                            <Box>
                                <Alert
                                    severity={detalhePedido.resumo.itens_com_divergencia > 0 ? 'warning' : 'success'}
                                    sx={{ mb: 2, borderRadius: '4px' }}
                                >
                                    {detalhePedido.resumo.itens_consistentes} de {detalhePedido.resumo.total_itens} itens consistentes
                                    ({toNum(detalhePedido.resumo.percentual_consistencia).toFixed(1)}%)
                                </Alert>

                                <TableContainer component={Paper} sx={{ borderRadius: '4px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.6px', py: 1 }}>Produto</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.6px', py: 1 }}>Pedido</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.6px', py: 1 }}>Recebido</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.6px', py: 1 }}>Faturado</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.6px', py: 1 }}>Estoque</TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.6px', py: 1 }}>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {detalhePedido.itens.map((item: any, index: number) => (
                                                <TableRow key={index} sx={{ '&:hover': { bgcolor: '#f8fafc' }, transition: 'background 0.15s' }}>
                                                    <TableCell sx={{ fontWeight: 500, py: 0.8 }}>{item.nome_produto}</TableCell>
                                                    <TableCell align="right" sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace', py: 0.8 }}>{item.quantidade_pedida}</TableCell>
                                                    <TableCell align="right" sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace', py: 0.8 }}>{item.quantidade_recebida}</TableCell>
                                                    <TableCell align="right" sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace', py: 0.8 }}>{item.quantidade_faturada}</TableCell>
                                                    <TableCell align="right" sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace', py: 0.8 }}>{item.quantidade_estoque}</TableCell>
                                                    <TableCell sx={{ py: 0.8 }}>
                                                        {item.divergencias.length > 0 ? (
                                                            <Chip
                                                                label={`${item.divergencias.length} divergência(s)`}
                                                                color="warning"
                                                                size="small"
                                                                sx={{ height: 20, fontSize: '0.65rem', borderRadius: '3px', fontWeight: 500 }}
                                                            />
                                                        ) : (
                                                            <Chip label="OK" color="success" size="small" sx={{ height: 20, fontSize: '0.65rem', borderRadius: '3px', fontWeight: 500 }} />
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
                        <Button
                            onClick={() => setDialogAberto(false)}
                            sx={{ borderRadius: '4px', textTransform: 'none', fontWeight: 600, px: 3, mr: 2 }}
                        >
                            Fechar
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </>
    );
};

export default DashboardConsistencia;
