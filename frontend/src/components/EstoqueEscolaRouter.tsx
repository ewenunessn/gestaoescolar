import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';

const EstoqueEscolaRouter = () => {
    const { escolaId } = useParams<{ escolaId: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    useEffect(() => {
        // Detectar se é dispositivo móvel ou se o usuário prefere a versão mobile
        const prefereMobile = localStorage.getItem('prefere-mobile-estoque') === 'true';
        const isSmallScreen = window.innerWidth < 768;
        const isTouchDevice = 'ontouchstart' in window;
        
        // Redirecionar para versão mobile se:
        // 1. Tela pequena (< 768px)
        // 2. Dispositivo touch
        // 3. Preferência salva do usuário
        if (isSmallScreen || isTouchDevice || prefereMobile || isMobile) {
            navigate(`/estoque-escola-mobile/${escolaId}`, { replace: true });
        } else {
            navigate(`/estoque-escola/${escolaId}`, { replace: true });
        }
    }, [escolaId, navigate, isMobile]);

    return null; // Este componente apenas redireciona
};

export default EstoqueEscolaRouter;