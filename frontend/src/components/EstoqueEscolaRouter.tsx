import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const EstoqueEscolaRouter = () => {
    const { escolaId } = useParams<{ escolaId: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        // Após descontinuar a versão desktop, redirecionar sempre para a versão mobile
        navigate(`/estoque-escola-mobile/${escolaId}`, { replace: true });
    }, [escolaId, navigate]);

    return null; // Este componente apenas redireciona
};

export default EstoqueEscolaRouter;