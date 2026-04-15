import { useState, useEffect } from 'react';
import { getAlertas, type AlertaEstoque } from '../services/estoqueCentralService';

export function useEstoqueAlertas() {
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarAlertas = async () => {
    try {
      setLoading(true);
      setError(null);
      const alertasData = await getAlertas(true); // Apenas não resolvidos
      setAlertas(alertasData);
        total: alertasData.length,
        criticos: alertasData.filter(a => a.nivel === 'critical').length,
        avisos: alertasData.filter(a => a.nivel === 'warning').length,
        informativos: alertasData.filter(a => a.nivel === 'info').length
      });
    } catch (err: any) {
      console.error('❌ Erro ao carregar alertas:', err);
      // Se for erro 404 ou similar, pode ser que o módulo ainda não esteja configurado
      if (err.response?.status === 404 || err.response?.status === 500) {
        setError(null); // Não mostrar erro, apenas não mostrar alertas
        setAlertas([]);
      } else {
        setError('Erro ao carregar alertas');
        setAlertas([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAlertas();
    
    // Atualizar alertas a cada 5 minutos
    const interval = setInterval(carregarAlertas, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const alertasCriticos = alertas.filter(a => a.nivel === 'critical').length;
  const alertasAvisos = alertas.filter(a => a.nivel === 'warning').length;
  const alertasInfo = alertas.filter(a => a.nivel === 'info').length;
  const totalAlertas = alertas.length;

  // Tipos de alertas
  const alertasVencidos = alertas.filter(a => a.tipo === 'vencido').length;
  const alertasVencimentoProximo = alertas.filter(a => a.tipo === 'vencimento_proximo').length;
  const alertasEstoqueBaixo = alertas.filter(a => a.tipo === 'estoque_baixo').length;
  const alertasEstoqueZerado = alertas.filter(a => a.tipo === 'estoque_zerado').length;

  return {
    alertas,
    loading,
    error,
    alertasCriticos,
    alertasAvisos,
    alertasInfo,
    totalAlertas,
    // Detalhes por tipo
    alertasVencidos,
    alertasVencimentoProximo,
    alertasEstoqueBaixo,
    alertasEstoqueZerado,
    // Funções
    recarregar: carregarAlertas,
    // Status
    temAlertas: totalAlertas > 0,
    temCriticos: alertasCriticos > 0,
    temAvisos: alertasAvisos > 0
  };
}