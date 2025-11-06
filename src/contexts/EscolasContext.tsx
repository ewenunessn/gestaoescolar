import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import * as escolasService from '../services/escolas';

// Tipos baseados no modelo do backend
export interface Escola {
  id: number;
  nome: string;
  endereco?: string;
  municipio?: string;
  endereco_maps?: string;
  telefone?: string;
  nome_gestor?: string;
  administracao?: 'municipal' | 'estadual' | 'federal' | 'particular';
  ativo: boolean;
}

interface EscolasState {
  escolas: Escola[];
  loading: boolean;
  error: string | null;
}

type EscolasAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ESCOLAS'; payload: Escola[] }
  | { type: 'ADD_ESCOLA'; payload: Escola }
  | { type: 'UPDATE_ESCOLA'; payload: Escola }
  | { type: 'DELETE_ESCOLA'; payload: number };

// Estado inicial
const initialState: EscolasState = {
  escolas: [],
  loading: false,
  error: null
};

// Reducer
function escolasReducer(state: EscolasState, action: EscolasAction): EscolasState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_ESCOLAS':
      return { ...state, escolas: action.payload, loading: false, error: null };
    
    case 'ADD_ESCOLA':
      return {
        ...state,
        escolas: [...state.escolas, action.payload],
        loading: false,
        error: null
      };
    
    case 'UPDATE_ESCOLA':
      return {
        ...state,
        escolas: state.escolas.map(escola =>
          escola.id === action.payload.id ? action.payload : escola
        ),
        loading: false,
        error: null
      };
    
    case 'DELETE_ESCOLA':
      return {
        ...state,
        escolas: state.escolas.filter(escola => escola.id !== action.payload),
        loading: false,
        error: null
      };
    
    default:
      throw new Error(`Ação desconhecida: ${(action as any).type}`);
  }
}

// Contextos
const EscolasContext = createContext<EscolasState | null>(null);
const EscolasDispatchContext = createContext<React.Dispatch<EscolasAction> | null>(null);

// Provider
export function EscolasProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(escolasReducer, initialState);

  // Carregar escolas do banco de dados
  useEffect(() => {
    const carregarEscolas = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        const escolasData = await escolasService.listarEscolas();
        
        // Converter os dados do backend para o formato esperado
        const escolasFormatadas: Escola[] = escolasData.map((escola: any) => ({
          ...escola,
          ativo: Boolean(escola.ativo) // Converter 0/1 para boolean
        }));
        
        dispatch({ type: 'SET_ESCOLAS', payload: escolasFormatadas });
      } catch (error) {
        console.error('Erro ao carregar escolas:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Erro ao carregar escolas do banco de dados' });
      }
    };

    carregarEscolas();
  }, []);

  return (
    <EscolasContext.Provider value={state}>
      <EscolasDispatchContext.Provider value={dispatch}>
        {children}
      </EscolasDispatchContext.Provider>
    </EscolasContext.Provider>
  );
}

// Hooks customizados
export function useEscolas() {
  const context = useContext(EscolasContext);
  if (context === null) {
    throw new Error('useEscolas deve ser usado dentro de um EscolasProvider');
  }
  return context;
}

export function useEscolasDispatch() {
  const context = useContext(EscolasDispatchContext);
  if (context === null) {
    throw new Error('useEscolasDispatch deve ser usado dentro de um EscolasProvider');
  }
  return context;
}

// Hook combinado para operações CRUD com memoização
export function useEscolasActions() {
  const dispatch = useEscolasDispatch();

  const adicionarEscola = useCallback(async (escola: Omit<Escola, 'id'>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const novaEscola = await escolasService.criarEscola({
        ...escola,
        ativo: escola.ativo ? 1 : 0 // Converter boolean para 0/1
      });
      
      const escolaFormatada: Escola = {
        ...novaEscola,
        ativo: Boolean(novaEscola.ativo)
      };
      
      dispatch({ type: 'ADD_ESCOLA', payload: escolaFormatada });
      return escolaFormatada;
    } catch (error) {
      console.error('Erro ao adicionar escola:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao adicionar escola' });
      throw error;
    }
  }, [dispatch]);

  const atualizarEscola = useCallback(async (escola: Escola) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const escolaAtualizada = await escolasService.editarEscola(escola.id, {
        ...escola,
        ativo: escola.ativo ? 1 : 0 // Converter boolean para 0/1
      });
      
      const escolaFormatada: Escola = {
        ...escolaAtualizada,
        ativo: Boolean(escolaAtualizada.ativo)
      };
      
      dispatch({ type: 'UPDATE_ESCOLA', payload: escolaFormatada });
      return escolaFormatada;
    } catch (error) {
      console.error('Erro ao atualizar escola:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao atualizar escola' });
      throw error;
    }
  }, [dispatch]);

  const removerEscola = useCallback(async (id: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await escolasService.removerEscola(id);
      dispatch({ type: 'DELETE_ESCOLA', payload: id });
      return true;
    } catch (error) {
      console.error('Erro ao remover escola:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao remover escola' });
      throw error;
    }
  }, [dispatch]);

  const limparError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [dispatch]);

  return {
    adicionarEscola,
    atualizarEscola,
    removerEscola,
    limparError
  };
}