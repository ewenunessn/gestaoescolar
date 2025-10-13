import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RotaEntrega } from '../services/entregaService';

interface RotaContextData {
  rotaSelecionada: RotaEntrega | null;
  selecionarRota: (rota: RotaEntrega) => Promise<void>;
  limparRota: () => Promise<void>;
  loading: boolean;
}

const RotaContext = createContext<RotaContextData>({} as RotaContextData);

interface RotaProviderProps {
  children: ReactNode;
}

export const RotaProvider: React.FC<RotaProviderProps> = ({ children }) => {
  const [rotaSelecionada, setRotaSelecionada] = useState<RotaEntrega | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredRota();
  }, []);

  const loadStoredRota = async () => {
    try {
      const storedRota = await AsyncStorage.getItem('@entregas:rota_selecionada');
      if (storedRota) {
        setRotaSelecionada(JSON.parse(storedRota));
      }
    } catch (error) {
      console.error('Erro ao carregar rota selecionada:', error);
    } finally {
      setLoading(false);
    }
  };

  const selecionarRota = async (rota: RotaEntrega) => {
    try {
      await AsyncStorage.setItem('@entregas:rota_selecionada', JSON.stringify(rota));
      setRotaSelecionada(rota);
    } catch (error) {
      console.error('Erro ao salvar rota selecionada:', error);
      throw new Error('Erro ao selecionar rota');
    }
  };

  const limparRota = async () => {
    try {
      await AsyncStorage.removeItem('@entregas:rota_selecionada');
      setRotaSelecionada(null);
    } catch (error) {
      console.error('Erro ao limpar rota selecionada:', error);
    }
  };

  return (
    <RotaContext.Provider
      value={{
        rotaSelecionada,
        selecionarRota,
        limparRota,
        loading,
      }}
    >
      {children}
    </RotaContext.Provider>
  );
};

export const useRota = () => {
  const context = useContext(RotaContext);
  if (!context) {
    throw new Error('useRota deve ser usado dentro de RotaProvider');
  }
  return context;
};