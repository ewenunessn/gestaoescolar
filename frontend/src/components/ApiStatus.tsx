import React, { useState, useEffect } from 'react';
import {
    Box,
    Chip,
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import {
    CheckCircle,
    Error,
    Warning,
    Info,
    Refresh
} from '@mui/icons-material';
import { checkBackendHealth } from '../services/api';
import { apiConfig, environmentInfo } from '../config/api';

interface ApiStatusProps {
    showDetails?: boolean;
}

const ApiStatus: React.FC<ApiStatusProps> = ({ showDetails = false }) => {
    const [isOnline, setIsOnline] = useState<boolean | null>(null);
    const [lastCheck, setLastCheck] = useState<Date | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [showDialog, setShowDialog] = useState(false);

    const checkStatus = async () => {
        setIsChecking(true);
        try {
            const status = await checkBackendHealth();
            setIsOnline(status);
            setLastCheck(new Date());
        } catch (error) {
            setIsOnline(false);
            setLastCheck(new Date());
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        checkStatus();

        // Verificar status a cada 30 segundos
        const interval = setInterval(checkStatus, 30000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = () => {
        if (isOnline === null) return 'default';
        return isOnline ? 'success' : 'error';
    };

    const getStatusIcon = () => {
        if (isOnline === null) return <Warning />;
        return isOnline ? <CheckCircle /> : <Error />;
    };

    const getStatusText = () => {
        if (isOnline === null) return 'Verificando...';
        return isOnline ? 'Online' : 'Offline';
    };

    const formatLastCheck = () => {
        if (!lastCheck) return 'Nunca';
        return lastCheck.toLocaleTimeString();
    };

    const statusChip = (
        <Chip
            icon={getStatusIcon()}
            label={`API ${getStatusText()}`}
            color={getStatusColor()}
            size="small"
            variant={isOnline ? 'filled' : 'outlined'}
        />
    );

    if (!showDetails) {
        return (
            <Tooltip title={`Última verificação: ${formatLastCheck()}`}>
                <Box sx={{ display: 'inline-block' }}>
                    {statusChip}
                </Box>
            </Tooltip>
        );
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={`Última verificação: ${formatLastCheck()}`}>
                <Box sx={{ cursor: 'pointer' }} onClick={() => setShowDialog(true)}>
                    {statusChip}
                </Box>
            </Tooltip>

            <Tooltip title="Verificar agora">
                <IconButton
                    size="small"
                    onClick={checkStatus}
                    disabled={isChecking}
                >
                    <Refresh sx={{ fontSize: 16 }} />
                </IconButton>
            </Tooltip>

            <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Info />
                        Status da API
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Conexão
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            {statusChip}
                            <Typography variant="body2" color="text.secondary">
                                Última verificação: {formatLastCheck()}
                            </Typography>
                        </Box>
                    </Box>

                    <Typography variant="h6" gutterBottom>
                        Configuração
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Propriedade</strong></TableCell>
                                    <TableCell><strong>Valor</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Ambiente</TableCell>
                                    <TableCell>{environmentInfo.mode}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>URL da API</TableCell>
                                    <TableCell>{apiConfig.baseURL}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>URL de Health</TableCell>
                                    <TableCell>{apiConfig.healthURL}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Timeout</TableCell>
                                    <TableCell>{apiConfig.timeout}ms</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Tentativas</TableCell>
                                    <TableCell>{apiConfig.retries}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Debug</TableCell>
                                    <TableCell>{apiConfig.debug ? 'Ativo' : 'Inativo'}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Hostname</TableCell>
                                    <TableCell>{environmentInfo.hostname}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default ApiStatus;