import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { appTheme } from '../theme/appTheme';
import { entregaServiceHybrid } from '../services/entregaServiceHybrid';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InitialLoadingScreenProps {
  onComplete: () => void;
}

const InitialLoadingScreen: React.FC<InitialLoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Iniciando...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      // Verificar se já foi feito o carregamento inicial
      const jaCarregou = await AsyncStorage.getItem('@entregas:initial_load_done');
      
      if (jaCarregou === 'true') {
        // Já carregou antes, pular para a tela principal
        onComplete();
        return;
      }

      // Passo 1: Carregar rotas (33%)
      setCurrentStep('Carregando rotas...');
      setProgress(0.1);
      
      await entregaServiceHybrid.listarTodasRotas();
      setProgress(0.33);

      // Passo 2: Pré-carregar dados (66%)
      setCurrentStep('Baixando dados para uso offline...');
      setProgress(0.4);
      
      await entregaServiceHybrid.preCarregarDados();
      setProgress(0.9);

      // Passo 3: Finalizar (100%)
      setCurrentStep('Finalizando...');
      setProgress(1.0);

      // Marcar como carregado
      await AsyncStorage.setItem('@entregas:initial_load_done', 'true');

      // Aguardar um pouco para mostrar 100%
      setTimeout(() => {
        onComplete();
      }, 500);

    } catch (error: any) {
      console.error('Erro ao carregar dados iniciais:', error);
      setError(error?.message || 'Erro ao carregar dados');
      
      // Mesmo com erro, permitir continuar após 3 segundos
      setTimeout(() => {
        onComplete();
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={appTheme.colors.navbar} />
      
      <View style={styles.content}>
        <MaterialCommunityIcons 
          name="truck-delivery" 
          size={80} 
          color={appTheme.colors.primary} 
        />
        <Text style={styles.title}>Entregas</Text>
        <Text style={styles.subtitle}>Alimentação Escolar</Text>
        
        <View style={styles.loadingContainer}>
          <Text style={styles.stepText}>{currentStep}</Text>
          <ProgressBar 
            progress={progress} 
            color={appTheme.colors.primary}
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={24} color={appTheme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>Continuando mesmo assim...</Text>
          </View>
        )}

        <Text style={styles.hint}>
          Este processo acontece apenas no primeiro acesso
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: appTheme.spacing.xl,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: appTheme.colors.primary,
    marginTop: appTheme.spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    color: appTheme.colors.text.secondary,
    marginTop: appTheme.spacing.sm,
    marginBottom: appTheme.spacing.xxl,
  },
  loadingContainer: {
    width: '100%',
    marginTop: appTheme.spacing.xl,
  },
  stepText: {
    fontSize: 16,
    color: appTheme.colors.text.primary,
    marginBottom: appTheme.spacing.md,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: appTheme.colors.border,
  },
  progressText: {
    fontSize: 14,
    color: appTheme.colors.text.secondary,
    marginTop: appTheme.spacing.sm,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: appTheme.colors.text.disabled,
    marginTop: appTheme.spacing.xxl,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContainer: {
    marginTop: appTheme.spacing.xl,
    padding: appTheme.spacing.md,
    backgroundColor: '#ffebee',
    borderRadius: appTheme.borderRadius.medium,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: appTheme.colors.error,
    marginTop: appTheme.spacing.sm,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 12,
    color: appTheme.colors.text.secondary,
    marginTop: appTheme.spacing.xs,
    textAlign: 'center',
  },
});

export default InitialLoadingScreen;
