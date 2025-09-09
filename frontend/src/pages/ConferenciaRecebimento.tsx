import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Container,
  Breadcrumbs,
  Link,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocalShipping as LocalShippingIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import RecebimentoParcialManager from '../components/RecebimentoParcialManager';

/**
 * Página de Conferência de Recebimento
 * 
 * Integra o novo sistema de recebimentos parciais com a interface existente.
 * Resolve o problema de "Recebimento Já Finalizado" permitindo recebimentos
 * parciais sucessivos.
 */

const ConferenciaRecebimento: React.FC = () => {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  
  const [pedido, setPedido] = useState<any>(null);
  const [recebimento, setRecebimento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pedidoId) {
      carregarDados();
    }
  }, [pedidoId]);

  const carregarDados = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // 1. Buscar dados do pedido
      const pedidoResponse = await fetch(`/api/pedidos/${pedidoId}`, {
        headers: authHeaders
      });
      if (!pedidoResponse.ok) {
        throw new Error('Pedido não encontrado');
      }
      const pedidoData = await pedidoResponse.json();
      setPedido(pedidoData);

      // 2. Buscar ou criar recebimento
      let recebimentoData;
      try {
        // Tentar buscar recebimento existente
        console.log(`🔍 Buscando recebimento para pedido ${pedidoId}...`);
        const recebimentoResponse = await fetch(`/api/recebimentos/por-pedido/${pedidoId}`, {
          headers: authHeaders
        });
        
        console.log(`📡 Resposta da busca de recebimento:`, {
          status: recebimentoResponse.status,
          ok: recebimentoResponse.ok,
          url: recebimentoResponse.url
        });
        
        if (recebimentoResponse.ok) {
          recebimentoData = await recebimentoResponse.json();
          console.log(`✅ Recebimento encontrado:`, recebimentoData);
        } else {
          const errorText = await recebimentoResponse.text();
          console.log(`❌ Erro ao buscar recebimento:`, errorText);
          
          // Se não existe, criar novo recebimento usando a nova API
          console.log(`🆕 Tentando criar novo recebimento...`);
          const novoRecebimentoResponse = await fetch('/api/v2/recebimentos', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              pedido_id: parseInt(pedidoId),
              tipo_recebimento: 'NORMAL'
            })
          });
          
          if (!novoRecebimentoResponse.ok) {
            const createErrorText = await novoRecebimentoResponse.text();
            console.log(`❌ Erro ao criar recebimento:`, createErrorText);
            throw new Error('Erro ao criar recebimento');
          }
          
          recebimentoData = await novoRecebimentoResponse.json();
          console.log(`✅ Novo recebimento criado:`, recebimentoData);
        }
      } catch (recebimentoError) {
        // Se falhar com a nova API, tentar a antiga
        const iniciarResponse = await fetch('/api/recebimentos/iniciar', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            pedido_id: parseInt(pedidoId)
          })
        });
        
        if (!iniciarResponse.ok) {
          const errorData = await iniciarResponse.json();
          throw new Error(errorData.message || 'Erro ao iniciar recebimento');
        }
        
        recebimentoData = await iniciarResponse.json();
      }
      
      setRecebimento(recebimentoData);
      
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados do recebimento');
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    navigate('/recebimentos');
  };

  const handleRecebimentoAtualizado = () => {
    // Recarregar dados quando houver atualizações
    carregarDados();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Carregando recebimento...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={carregarDados}>
              Tentar Novamente
            </Button>
          }
        >
          <Typography variant="h6" gutterBottom>
            Erro ao Carregar Recebimento
          </Typography>
          {error}
        </Alert>
        
        <Box mt={3} textAlign="center">
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />}
            onClick={handleVoltar}
          >
            Voltar para Recebimentos
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleVoltar}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <LocalShippingIcon sx={{ mr: 2, color: 'info.main' }} />
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              Conferência de Recebimento
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pedido #{pedidoId} - Sistema de Recebimentos Parciais
            </Typography>
          </Box>
          
          {recebimento && (
            <Chip
              icon={<AssignmentIcon />}
              label={`Recebimento #${recebimento.id}`}
              color="primary"
              variant="outlined"
            />
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            component="button"
            variant="body2"
            onClick={handleVoltar}
            sx={{ textDecoration: 'none' }}
          >
            Recebimentos
          </Link>
          <Typography variant="body2" color="text.primary">
            Pedido #{pedidoId}
          </Typography>
          <Typography variant="body2" color="text.primary">
            Conferência
          </Typography>
        </Breadcrumbs>

        {/* Informações do Pedido */}
        {pedido && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações do Pedido
              </Typography>
              <Box display="flex" gap={4} flexWrap="wrap">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fornecedor
                  </Typography>
                  <Typography variant="body1">
                    {pedido.fornecedor?.nome || `Fornecedor ${pedido.fornecedor_id}`}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Data do Pedido
                  </Typography>
                  <Typography variant="body1">
                    {new Date(pedido.data || pedido.created_at).toLocaleDateString('pt-BR')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Valor Total
                  </Typography>
                  <Typography variant="body1" color="primary.main" fontWeight="bold">
                    R$ {(Number(pedido.valor_total) || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box mt={0.5}>
                    <Chip 
                      label={pedido.status || 'Pendente'} 
                      size="small"
                      color={pedido.status === 'Finalizado' ? 'success' : 'primary'}
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Alerta Informativo */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Sistema de Recebimentos Parciais Ativo
          </Typography>
          <Typography variant="body2">
            Este sistema permite receber itens parcialmente e registrar novos recebimentos 
            posteriormente. Você pode receber parte dos produtos agora e o restante em 
            entregas futuras, mantendo controle total do saldo pendente.
          </Typography>
        </Alert>

        {/* Componente Principal de Recebimentos Parciais */}
        {recebimento && (
          <RecebimentoParcialManager
            recebimentoId={recebimento.id}
            onRecebimentoAtualizado={handleRecebimentoAtualizado}
          />
        )}

        {/* Ações Finais */}
        <Box mt={4} display="flex" justifyContent="space-between" alignItems="center">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleVoltar}
          >
            Voltar para Lista
          </Button>
          
          <Typography variant="body2" color="text.secondary">
            💡 Dica: Você pode registrar recebimentos parciais e finalizar posteriormente
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default ConferenciaRecebimento;