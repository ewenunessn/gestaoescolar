import { useState, useEffect, useCallback } from 'react';
import { ItemEstoqueEscola, ResumoEstoque, HistoricoEstoque } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { obterSessaoGestor } from '../services/gestorEscola';

export interface UseEstoqueReturn {
  // Estados
  itens: ItemEstoqueEscola[];
  resumo: ResumoEstoque | null;
  historico: HistoricoEstoque[];
  loading: boolean;
  error: string | null;
  escolaId: number | null;
  historicoLoading: boolean;
  hasMoreHistorico: boolean;
  
  // Ações
  carregarItens: () => Promise<void>;
  carregarResumo: () => Promise<void>;
  carregarHistorico: (reset?: boolean) => Promise<void>;
  carregarMaisHistorico: () => Promise<void>;
  adicionarItem: (item: Partial<ItemEstoqueEscola>) => Promise<void>;
  atualizarItem: (itemId: number, item: Partial<ItemEstoqueEscola>) => Promise<void>;
  excluirItem: (itemId: number) => Promise<void>;
  movimentarEstoque: (itemId: number, quantidade: number, tipo: 'entrada' | 'saida' | 'ajuste', observacao?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useEstoque = (escolaIdProp?: number): UseEstoqueReturn => {
  const { usuario } = useAuth();
  const [itens, setItens] = useState<ItemEstoqueEscola[]>([]);
  const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
  const [historico, setHistorico] = useState<HistoricoEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escolaId, setEscolaId] = useState<number | null>(escolaIdProp || null);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [hasMoreHistorico, setHasMoreHistorico] = useState(true);
  const [historicoOffset, setHistoricoOffset] = useState(0);
  
  const HISTORICO_LIMIT = 10;

  const handleError = useCallback((error: any, action: string) => {
    console.error(`Erro ao ${action}:`, error);
    setError(`Erro ao ${action}: ${error.message || 'Erro desconhecido'}`);
  }, []);

  // Obter escolaId da sessão do gestor se não foi fornecido
  useEffect(() => {
    const obterEscolaId = async () => {
      if (!escolaId) {
        try {
          const sessao = await obterSessaoGestor();
          if (sessao?.escola?.id) {
            setEscolaId(sessao.escola.id);
          }
        } catch (error) {
          console.error('Erro ao obter sessão do gestor:', error);
        }
      }
    };
    
    obterEscolaId();
  }, [escolaId]);

  const carregarItens = useCallback(async () => {
    if (!usuario || !escolaId) {
      console.log('useEstoque - carregarItens: usuario ou escolaId não disponível', { usuario: !!usuario, escolaId });
      return;
    }
    
    try {
      console.log('useEstoque - carregarItens: iniciando carregamento para escola', escolaId);
      setLoading(true);
      setError(null);
      const dados = await apiService.listarEstoqueEscola(escolaId);
      console.log('useEstoque - carregarItens: dados recebidos', dados?.length || 0);
      setItens(dados);
    } catch (error) {
      console.log('useEstoque - carregarItens: erro', error);
      handleError(error, 'carregar itens do estoque');
    } finally {
      setLoading(false);
    }
  }, [escolaId, usuario, handleError]);

  const carregarResumo = useCallback(async () => {
    if (!usuario || !escolaId) return;
    
    try {
      setError(null);
      const dados = await apiService.obterResumoEstoque(escolaId);
      setResumo(dados);
    } catch (error) {
      handleError(error, 'carregar resumo do estoque');
    }
  }, [escolaId, usuario, handleError]);

  const carregarHistorico = useCallback(async (reset = false) => {
    if (!usuario || !escolaId) return;
    
    try {
      setHistoricoLoading(true);
      setError(null);
      
      const offset = reset ? 0 : historicoOffset;
       const dados = await apiService.listarHistoricoMovimentos(escolaId, HISTORICO_LIMIT, offset);
      
      if (reset) {
        setHistorico(dados);
        setHistoricoOffset(HISTORICO_LIMIT);
      } else {
        setHistorico(prev => [...prev, ...dados]);
        setHistoricoOffset(prev => prev + HISTORICO_LIMIT);
      }
      
      setHasMoreHistorico(dados.length === HISTORICO_LIMIT);
    } catch (error) {
      handleError(error, 'carregar histórico');
    } finally {
      setHistoricoLoading(false);
    }
  }, [escolaId, usuario, handleError, historicoOffset, HISTORICO_LIMIT]);

  const carregarMaisHistorico = useCallback(async () => {
    if (!hasMoreHistorico || historicoLoading) return;
    await carregarHistorico(false);
  }, [hasMoreHistorico, historicoLoading, carregarHistorico]);

  const adicionarItem = useCallback(async (item: Partial<ItemEstoqueEscola>) => {
    if (!usuario || !escolaId) return;
    
    try {
      setLoading(true);
      setError(null);
      const novoItem = await apiService.adicionarItemEstoque(escolaId, item);
      setItens(prev => [...prev, novoItem]);
      // Atualizar resumo após adicionar item
      await carregarResumo();
    } catch (error) {
      handleError(error, 'adicionar item');
      throw error; // Re-throw para que o componente possa tratar
    } finally {
      setLoading(false);
    }
  }, [escolaId, usuario, handleError, carregarResumo]);

  const atualizarItem = useCallback(async (itemId: number, item: Partial<ItemEstoqueEscola>) => {
    if (!usuario || !escolaId) return;
    
    try {
      setLoading(true);
      setError(null);
      const itemAtualizado = await apiService.atualizarItemEstoque(itemId, item);
      setItens(prev => prev.map(i => i.id === itemId ? itemAtualizado : i));
      // Atualizar resumo após atualizar item
      await carregarResumo();
    } catch (error) {
      handleError(error, 'atualizar item');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [usuario, escolaId, handleError, carregarResumo]);

  const excluirItem = useCallback(async (itemId: number) => {
    if (!usuario || !escolaId) return;
    
    try {
      setLoading(true);
      setError(null);
      await apiService.excluirItemEstoque(itemId);
      setItens(prev => prev.filter(i => i.id !== itemId));
      // Atualizar resumo após excluir item
      await carregarResumo();
    } catch (error) {
      handleError(error, 'excluir item');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [usuario, handleError, carregarResumo]);

  const movimentarEstoque = useCallback(async (
    itemId: number, 
    quantidade: number, 
    tipo: 'entrada' | 'saida' | 'ajuste', 
    observacao?: string
  ) => {
    if (!usuario || !escolaId) return;
    
    try {
      setLoading(true);
      setError(null);
      // Encontrar o item para obter informações necessárias
      const item = itens.find(i => i.id === itemId);
      if (!item) throw new Error('Item não encontrado');
      
      await apiService.movimentarEstoque({
        estoque_escola_id: item.id,
        escola_id: item.escola_id,
        produto_id: item.produto_id,
        tipo_movimentacao: tipo,
        quantidade_anterior: item.quantidade_atual,
        quantidade_movimentada: quantidade,
        quantidade_posterior: tipo === 'entrada' 
          ? item.quantidade_atual + quantidade 
          : item.quantidade_atual - quantidade,
        observacoes: observacao || '',
        usuario_id: usuario.id,
        produto_nome: item.produto_nome,
        unidade_medida: item.unidade_medida,
        item_estoque_id: itemId,
      });
      
      // Recarregar dados após movimentação
      await Promise.all([carregarItens(), carregarResumo(), carregarHistorico(true)]);
    } catch (error) {
      handleError(error, 'registrar movimento');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [usuario, escolaId, handleError, carregarResumo, carregarHistorico]);

  const refresh = useCallback(async () => {
    await Promise.all([
      carregarItens(),
      carregarResumo(),
      carregarHistorico(true),
    ]);
  }, [carregarItens, carregarResumo, carregarHistorico]);

  // Carregar dados iniciais
  useEffect(() => {
    if (usuario && escolaId) {
      carregarItens();
      carregarResumo();
    }
  }, [usuario, escolaId, carregarItens, carregarResumo]);

  return {
    itens,
    resumo,
    historico,
    loading,
    error,
    escolaId,
    historicoLoading,
    hasMoreHistorico,
    carregarItens,
    carregarResumo,
    carregarHistorico,
    carregarMaisHistorico,
    adicionarItem,
    atualizarItem,
    excluirItem,
    movimentarEstoque,
    refresh,
  };
};

export default useEstoque;