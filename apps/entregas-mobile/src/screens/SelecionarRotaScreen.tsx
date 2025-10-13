import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useRota } from '../contexts/RotaContext';
import { useNotification } from '../contexts/NotificationContext';
import { useOffline } from '../contexts/OfflineContext';
import { entregaServiceHybrid } from '../services/entregaServiceHybrid';
import { RotaEntrega } from '../services/entregaService';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const SelecionarRotaScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { selecionarRota } = useRota();
  const { showError, showSuccess } = useNotification();
  const { isOffline, sincronizando } = useOffline();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rotas, setRotas] = useState<RotaEntrega[]>([]);

  useEffect(() => {
    carregarRotas();
  }, []);

  const carregarRotas = async () => {
    try {
      setLoading(true);
      const rotasData = await entregaServiceHybrid.listarTodasRotas();
      setRotas(rotasData);
    } catch (error) {
      showError('Erro ao carregar rotas. Verifique sua conexão.');
      console.error('Erro ao carregar rotas:', error);
      setRotas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarRota = async (rota: RotaEntrega) => {
    try {
      await selecionarRota(rota);
      showSuccess(`Rota "${rota.nome}" selecionada com sucesso!`);
      navigation.navigate('MainTabs');
    } catch (error) {
      showError('Erro ao selecionar rota.');
      console.error('Erro ao selecionar rota:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarRotas();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Carregando rotas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1976d2']} />
        }
      >
        {/* Header */}
        <Surface style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerInfo}>
              <Text style={styles.greeting}>
                {getGreeting()}, {user?.nome?.split(' ')[0] || 'Entregador'}!
              </Text>
              <Text style={styles.headerSubtitle}>
                Selecione uma rota para começar as entregas
              </Text>
            </View>
            <MaterialCommunityIcons
              name="truck-delivery"
              size={48}
              color="#1976d2"
            />
          </View>

          {/* Status Offline/Sincronização */}
          {(isOffline || sincronizando) && (
            <View style={styles.statusBanner}>
              <MaterialCommunityIcons
                name={isOffline ? "wifi-off" : "sync"}
                size={18}
                color={isOffline ? "#d32f2f" : "#1976d2"}
              />
              <Text style={[styles.statusBannerText, { color: isOffline ? "#d32f2f" : "#1976d2" }]}>
                {isOffline ? "Modo Offline - Dados podem estar desatualizados" : "Sincronizando dados..."}
              </Text>
            </View>
          )}
        </Surface>

        {/* Lista de Rotas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rotas Disponíveis</Text>

          {rotas.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="map-marker-off" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  Nenhuma rota encontrada. Verifique sua conexão ou tente recarregar.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            rotas.map((rota) => (
              <Card key={rota.id} style={styles.rotaCard}>
                <Card.Content>
                  <View style={styles.rotaHeader}>
                    <View style={[styles.rotaColor, { backgroundColor: rota.cor || '#ccc' }]} />
                    <Text style={styles.rotaTitle}>{rota.nome}</Text>
                  </View>
                  
                  {rota.descricao && (
                    <Text style={styles.rotaDescription}>
                      {rota.descricao}
                    </Text>
                  )}

                  <View style={styles.rotaStats}>
                    <View style={styles.rotaStat}>
                      <MaterialCommunityIcons name="home-city" size={18} color="#666" />
                      <Text style={styles.rotaStatText}>
                        {rota.total_escolas} escolas
                      </Text>
                    </View>
                    <View style={styles.rotaStat}>
                      <MaterialCommunityIcons name="package-variant" size={18} color="#666" />
                      <Text style={styles.rotaStatText}>
                        {rota.itens_entregues}/{rota.total_itens} itens
                      </Text>
                    </View>
                  </View>

                  <Button
                    mode="contained"
                    style={[styles.rotaButton, { backgroundColor: rota.cor || '#1976d2' }]}
                    onPress={() => handleSelecionarRota(rota)}
                    icon="check-circle-outline"
                  >
                    Selecionar Rota
                  </Button>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  header: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  headerInfo: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1976d2',
    lineHeight: 32,
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 6,
    fontSize: 15,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 235, 59, 0.1)',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statusBannerText: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '600',
  },
  section: {
    margin: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  emptyCard: {
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  rotaCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  rotaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rotaColor: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  rotaTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
  },
  rotaDescription: {
    color: '#777',
    fontSize: 14,
    marginLeft: 28,
    marginBottom: 12,
  },
  rotaStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  rotaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rotaStatText: {
    marginLeft: 6,
    color: '#666',
    fontSize: 14,
  },
  rotaButton: {
    borderRadius: 10,
    paddingVertical: 4,
  },
});

export default SelecionarRotaScreen;