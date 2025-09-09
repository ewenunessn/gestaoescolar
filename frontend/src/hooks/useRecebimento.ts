import { useState, useCallback } from 'react';
import { validateItemConferido, validateRecebimento, formatarDadosItem } from '../utils/recebimentoValidation';

interface UseRecebimentoProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export const useRecebimento = ({ onSuccess, onError }: UseRecebimentoProps = {}) => {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const registrarItem = useCallback(async (recebimento: any, item: any, itemConferido: any) => {
    setLoading(true);
    try {
      // Validações
      validateItemConferido(item, itemConferido);
      validateRecebimento(recebimento);

      const dadosItem = formatarDadosItem(recebimento, item, itemConferido);

      console.log("📦 Registrando item:", dadosItem);

      const response = await fetch("/api/recebimentos/item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(dadosItem),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const resultado = await response.json();
      onSuccess?.(resultado.message || 'Item registrado com sucesso');
      return resultado;

    } catch (error: any) {
      console.error("❌ Erro ao registrar item:", error);
      onError?.(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  const registrarLote = useCallback(async (
    recebimento: any, 
    itens: any[], 
    itensSelecionados: Record<number, boolean>,
    itensConferidos: Record<number, any>
  ) => {
    const itensSelecionadosArray = itens.filter(item => itensSelecionados[item.produto_id]);
    
    if (itensSelecionadosArray.length === 0) {
      throw new Error("Nenhum item selecionado para registro.");
    }

    setLoading(true);
    setProgresso(0);

    try {
      const total = itensSelecionadosArray.length;
      let processados = 0;

      for (const item of itensSelecionadosArray) {
        const itemConferido = itensConferidos[item.produto_id];
        
        await registrarItem(recebimento, item, itemConferido);
        
        processados++;
        setProgresso((processados / total) * 100);
      }

      onSuccess?.(`${processados} itens registrados com sucesso`);
      return { processados, total };

    } catch (error: any) {
      onError?.(error.message);
      throw error;
    } finally {
      setLoading(false);
      setProgresso(0);
    }
  }, [registrarItem, onSuccess, onError]);

  return {
    loading,
    progresso,
    registrarItem,
    registrarLote
  };
};