import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Alert, Chip } from '@mui/material';
import { listarEstoqueEscola, obterResumoEstoque } from '../services/estoqueEscola';
import { obterSessaoGestor } from '../services/gestorEscola';

interface DiagnosticoInfo {
  userAgent: string;
  url: string;
  localStorage: boolean;
  sessionStorage: boolean;
  fetch: boolean;
  promises: boolean;
  asyncAwait: boolean;
  axios: boolean;
  sessao: any;
  timestamp: string;
}

const DiagnosticoMobile: React.FC = () => {
  const [diagnostico, setDiagnostico] = useState<DiagnosticoInfo | null>(null);
  const [testesAPI, setTestesAPI] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    coletarInformacoesDiagnostico();
  }, []);

  const coletarInformacoesDiagnostico = () => {
    const info: DiagnosticoInfo = {
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage: typeof Storage !== 'undefined' && !!window.localStorage,
      sessionStorage: typeof Storage !== 'undefined' && !!window.sessionStorage,
      fetch: typeof fetch !== 'undefined',
      promises: typeof Promise !== 'undefined',
      asyncAwait: true, // Se chegou até aqui, async/await funciona
      axios: true, // Se o componente carregou, axios está disponível
      sessao: obterSessaoGestor(),
      timestamp: new Date().toISOString()
    };

    setDiagnostico(info);
  };

  const testarAPIs = async () => {
    setLoading(true);
    const testes: any[] = [];

    try {
      // Teste 1: Verificar sessão
      testes.push({
        nome: 'Verificar Sessão',
        status: diagnostico?.sessao ? 'sucesso' : 'erro',
        detalhes: diagnostico?.sessao ? 
          `Escola: ${diagnostico.sessao.escola.nome} (ID: ${diagnostico.sessao.escola.id})` :
          'Nenhuma sessão encontrada'
      });

      if (diagnostico?.sessao) {
        const escolaId = diagnostico.sessao.escola.id;

        // Teste 2: Listar estoque
        try {
          console.log('🔄 Testando listarEstoqueEscola...');
          const estoque = await listarEstoqueEscola(escolaId);
          testes.push({
            nome: 'Listar Estoque',
            status: 'sucesso',
            detalhes: `${estoque.length} itens carregados`
          });
        } catch (error: any) {
          console.error('❌ Erro listarEstoqueEscola:', error);
          testes.push({
            nome: 'Listar Estoque',
            status: 'erro',
            detalhes: `Erro: ${error.message || 'Desconhecido'}`
          });
        }

        // Teste 3: Obter resumo
        try {
          console.log('🔄 Testando obterResumoEstoque...');
          const resumo = await obterResumoEstoque(escolaId);
          testes.push({
            nome: 'Obter Resumo',
            status: 'sucesso',
            detalhes: `${resumo.total_produtos} produtos, ${resumo.produtos_com_estoque} com estoque`
          });
        } catch (error: any) {
          console.error('❌ Erro obterResumoEstoque:', error);
          testes.push({
            nome: 'Obter Resumo',
            status: 'erro',
            detalhes: `Erro: ${error.message || 'Desconhecido'}`
          });
        }

        // Teste 4: Teste direto com fetch
        try {
          console.log('🔄 Testando fetch direto...');
          const response = await fetch(`/api/estoque-escola/escola/${escolaId}`);
          const data = await response.json();
          
          testes.push({
            nome: 'Fetch Direto',
            status: response.ok ? 'sucesso' : 'erro',
            detalhes: response.ok ? 
              `Status: ${response.status}, ${data.data?.length || 0} itens` :
              `Status: ${response.status}, Erro: ${data.message || 'Desconhecido'}`
          });
        } catch (error: any) {
          console.error('❌ Erro fetch direto:', error);
          testes.push({
            nome: 'Fetch Direto',
            status: 'erro',
            detalhes: `Erro: ${error.message || 'Desconhecido'}`
          });
        }
      }

    } catch (error: any) {
      console.error('❌ Erro geral nos testes:', error);
      testes.push({
        nome: 'Erro Geral',
        status: 'erro',
        detalhes: `Erro: ${error.message || 'Desconhecido'}`
      });
    }

    setTestesAPI(testes);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sucesso': return 'success';
      case 'erro': return 'error';
      default: return 'default';
    }
  };

  if (!diagnostico) {
    return (
      <Box p={2}>
        <Typography>Coletando informações de diagnóstico...</Typography>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        🔍 Diagnóstico Mobile
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informações do Dispositivo
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>User Agent:</strong><br />
            {diagnostico.userAgent}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>URL:</strong> {diagnostico.url}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Timestamp:</strong> {diagnostico.timestamp}
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Compatibilidade de APIs:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip 
                label={`localStorage: ${diagnostico.localStorage ? '✅' : '❌'}`}
                color={diagnostico.localStorage ? 'success' : 'error'}
                size="small"
              />
              <Chip 
                label={`sessionStorage: ${diagnostico.sessionStorage ? '✅' : '❌'}`}
                color={diagnostico.sessionStorage ? 'success' : 'error'}
                size="small"
              />
              <Chip 
                label={`fetch: ${diagnostico.fetch ? '✅' : '❌'}`}
                color={diagnostico.fetch ? 'success' : 'error'}
                size="small"
              />
              <Chip 
                label={`Promise: ${diagnostico.promises ? '✅' : '❌'}`}
                color={diagnostico.promises ? 'success' : 'error'}
                size="small"
              />
              <Chip 
                label={`async/await: ${diagnostico.asyncAwait ? '✅' : '❌'}`}
                color={diagnostico.asyncAwait ? 'success' : 'error'}
                size="small"
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informações da Sessão
          </Typography>
          
          {diagnostico.sessao ? (
            <Box>
              <Typography variant="body2">
                <strong>Escola:</strong> {diagnostico.sessao.escola.nome}
              </Typography>
              <Typography variant="body2">
                <strong>ID:</strong> {diagnostico.sessao.escola.id}
              </Typography>
              <Typography variant="body2">
                <strong>Token:</strong> {diagnostico.sessao.token?.substring(0, 20)}...
              </Typography>
            </Box>
          ) : (
            <Alert severity="warning">
              Nenhuma sessão encontrada. Faça login primeiro.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          onClick={testarAPIs}
          disabled={loading || !diagnostico.sessao}
          fullWidth
        >
          {loading ? 'Testando APIs...' : 'Testar APIs'}
        </Button>
      </Box>

      {testesAPI.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resultados dos Testes de API
            </Typography>
            
            {testesAPI.map((teste, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip 
                    label={teste.nome}
                    color={getStatusColor(teste.status)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {teste.detalhes}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          💡 Se todos os testes passarem mas a página principal não funcionar,
          o problema pode estar no React Router, componentes específicos ou timing.
        </Typography>
      </Box>
    </Box>
  );
};

export default DiagnosticoMobile;