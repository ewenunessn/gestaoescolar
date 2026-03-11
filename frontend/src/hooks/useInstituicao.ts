import { useState, useEffect } from 'react';
import { buscarInstituicao, Instituicao } from '../services/instituicao';

interface UseInstituicaoReturn {
  instituicao: Instituicao | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useInstituicao = (): UseInstituicaoReturn => {
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstituicao = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await buscarInstituicao();
      setInstituicao(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar informações da instituição');
      console.error('Erro ao buscar instituição:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstituicao();
  }, []);

  return {
    instituicao,
    loading,
    error,
    refetch: fetchInstituicao
  };
};

// Hook para usar apenas em PDFs (com fallback para não bloquear)
export const useInstituicaoForPDF = () => {
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);

  const fetchInstituicaoForPDF = async (): Promise<Instituicao | null> => {
    try {
      const response = await fetch('http://localhost:3000/api/instituicao', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInstituicao(data);
        return data;
      }
    } catch (err) {
      console.log('Não foi possível carregar informações da instituição para PDF');
    }
    
    return null;
  };

  return {
    instituicao,
    fetchInstituicaoForPDF
  };
};