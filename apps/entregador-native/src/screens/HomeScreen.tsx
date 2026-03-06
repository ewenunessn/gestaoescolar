import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, FAB, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRScanner from '../components/QRScanner';

export default function HomeScreen({ navigation }: any) {
  const [showScanner, setShowScanner] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState<any>(null);
  const [nomeUsuario, setNomeUsuario] = useState('');

  useEffect(() => {
    carregarDados();
    
    // Recarregar dados quando a tela ganhar foco
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('HomeScreen ganhou foco, recarregando dados...');
      carregarDados();
    });

    return unsubscribe;
  }, [navigation]);

  const carregarDados = async () => {
    try {
      // Carregar filtro
      const filtro = await AsyncStorage.getItem('filtro_qrcode');
      console.log('Filtro carregado do AsyncStorage:', filtro);
      
      if (filtro) {
        const parsedFiltro = JSON.parse(filtro);
        console.log('Filtro parseado:', parsedFiltro);
        setFiltroAtivo(parsedFiltro);
      } else {
        // Se não há filtro, garantir que o estado seja null
        console.log('Nenhum filtro encontrado, setando null');
        setFiltroAtivo(null);
      }

      // Carregar nome do usuário
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const parsed = JSON.parse(token);
        setNomeUsuario(parsed.nome || 'Usuário');
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const handleQRScan = async (data: any) => {
    setFiltroAtivo(data);
    setShowScanner(false);
    
    // Navegar para a tela de opções com o filtro aplicado
    navigation.navigate('OpcoesFiltro', { filtro: data });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Saudação */}
        <View style={styles.welcomeSection}>
          <Text variant="headlineMedium" style={styles.welcomeTitle}>
            Olá, {nomeUsuario}! 👋
          </Text>
          <Text variant="bodyLarge" style={styles.welcomeSubtitle}>
            Bem-vindo ao App Entregador
          </Text>
        </View>

        {/* Card de instrução */}
        <Card style={styles.instructionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.instructionTitle}>
              📱 Como começar
            </Text>
            <Text variant="bodyMedium" style={styles.instructionText}>
              1. Clique no botão abaixo para escanear o QR Code{'\n'}
              2. Aponte a câmera para o código fornecido{'\n'}
              3. O filtro será aplicado automaticamente{'\n'}
              4. Você verá apenas as entregas do período
            </Text>
          </Card.Content>
        </Card>

        {/* Card de filtro ativo */}
        {filtroAtivo ? (
          <Card style={styles.filtroCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.filtroTitle}>
                ✓ Filtro Ativo
              </Text>
              <Text variant="bodyMedium" style={styles.filtroRota}>
                {filtroAtivo.rotaNomes && filtroAtivo.rotaNomes.length > 1 
                  ? `Rotas: ${filtroAtivo.rotaNomes.join(', ')}`
                  : `Rota: ${filtroAtivo.rotaNome || filtroAtivo.rotaNomes?.[0] || 'N/A'}`
                }
              </Text>
              <Text variant="bodySmall" style={styles.filtroPeriodo}>
                Período: {new Date(filtroAtivo.dataInicio).toLocaleDateString('pt-BR')} até{' '}
                {new Date(filtroAtivo.dataFim).toLocaleDateString('pt-BR')}
              </Text>
              <View style={styles.filtroActions}>
                <FAB
                  icon="eye"
                  label="Ver Opções"
                  onPress={() => navigation.navigate('OpcoesFiltro', { filtro: filtroAtivo })}
                  style={styles.deliveryFab}
                />
              </View>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.noFiltroCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.noFiltroTitle}>
                Nenhum filtro ativo
              </Text>
              <Text variant="bodyMedium" style={styles.noFiltroText}>
                Escaneie um QR Code para começar
              </Text>
              <View style={styles.noFiltroActions}>
                <FAB
                  icon="qrcode-scan"
                  label="Escanear QR Code"
                  onPress={() => setShowScanner(true)}
                  style={styles.scanButtonLarge}
                  color="#fff"
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Card de Estoque Central */}
        <Card style={styles.estoqueCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.estoqueTitle}>
              📦 Estoque Central
            </Text>
            <Text variant="bodyMedium" style={styles.estoqueText}>
              Gerencie entradas, saídas e ajustes do estoque
            </Text>
            <View style={styles.estoqueActions}>
              <FAB
                icon="warehouse"
                label="Acessar Estoque"
                onPress={() => navigation.navigate('EstoqueCentral')}
                style={styles.estoqueFab}
                color="#fff"
              />
            </View>
          </Card.Content>
        </Card>

        {/* Card de Recebimentos */}
        <Card style={styles.recebimentosCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.recebimentosTitle}>
              📥 Recebimentos
            </Text>
            <Text variant="bodyMedium" style={styles.recebimentosText}>
              Registre o recebimento de mercadorias dos pedidos
            </Text>
            <View style={styles.recebimentosActions}>
              <FAB
                icon="package-variant"
                label="Acessar Recebimentos"
                onPress={() => navigation.navigate('Recebimentos')}
                style={styles.recebimentosFab}
                color="#fff"
              />
            </View>
          </Card.Content>
        </Card>

        {/* Card de Nutrição */}
        <Card style={styles.nutricaoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.nutricaoTitle}>
              🥗 Nutrição
            </Text>
            <Text variant="bodyMedium" style={styles.nutricaoText}>
              Gerencie refeições e cardápios escolares
            </Text>
            <View style={styles.nutricaoActions}>
              <FAB
                icon="food-apple"
                label="Acessar Nutrição"
                onPress={() => navigation.navigate('Nutricao')}
                style={styles.nutricaoFab}
                color="#fff"
              />
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Scanner QR */}
      <QRScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    color: '#666',
  },
  instructionCard: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  instructionTitle: {
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 12,
  },
  instructionText: {
    color: '#1976d2',
    lineHeight: 24,
  },
  filtroCard: {
    marginBottom: 16,
    backgroundColor: '#10b981',
    borderWidth: 0,
    elevation: 4,
  },
  filtroTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  filtroRota: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  filtroPeriodo: {
    color: '#f0fdf4',
    marginBottom: 12,
  },
  filtroActions: {
    marginTop: 12,
    alignItems: 'center',
  },
  deliveryFab: {
    backgroundColor: '#047857',
  },
  noFiltroCard: {
    marginBottom: 16,
    backgroundColor: '#f59e0b',
    borderWidth: 0,
    elevation: 4,
  },
  noFiltroTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  noFiltroText: {
    color: '#fff',
    marginBottom: 12,
  },
  noFiltroActions: {
    marginTop: 12,
    alignItems: 'center',
  },
  scanButtonLarge: {
    backgroundColor: '#d97706',
  },
  estoqueCard: {
    marginBottom: 16,
    backgroundColor: '#8b5cf6',
    borderWidth: 0,
    elevation: 4,
  },
  estoqueTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  estoqueText: {
    color: '#fff',
    marginBottom: 12,
  },
  estoqueActions: {
    marginTop: 12,
    alignItems: 'center',
  },
  estoqueFab: {
    backgroundColor: '#6d28d9',
  },
  recebimentosCard: {
    marginBottom: 16,
    backgroundColor: '#059669',
    borderWidth: 0,
    elevation: 4,
  },
  recebimentosTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  recebimentosText: {
    color: '#fff',
    marginBottom: 12,
  },
  recebimentosActions: {
    marginTop: 12,
    alignItems: 'center',
  },
  recebimentosFab: {
    backgroundColor: '#047857',
  },
  nutricaoCard: {
    marginBottom: 16,
    backgroundColor: '#4caf50',
    borderWidth: 0,
    elevation: 4,
  },
  nutricaoTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  nutricaoText: {
    color: '#fff',
    marginBottom: 12,
  },
  nutricaoActions: {
    marginTop: 12,
    alignItems: 'center',
  },
  nutricaoFab: {
    backgroundColor: '#388e3c',
  },
});
