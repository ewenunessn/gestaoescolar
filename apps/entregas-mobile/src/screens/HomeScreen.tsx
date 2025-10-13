import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView, // Use SafeAreaView for better iOS handling
} from 'react-native';
import {
  Title,
  Card,
  Paragraph,
  Button,
  Chip,
  Surface,
  ActivityIndicator,
  Dialog,
  Portal,
  Divider, // Added Divider for better visual separation
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useRota } from '../contexts/RotaContext';
import { useNotification } from '../contexts/NotificationContext';
import { useOffline } from '../contexts/OfflineContext';
import { entregaServiceHybrid } from '../services/entregaServiceHybrid';
import { EstatisticasEntregas, RotaEntrega } from '../services/entregaService';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { rotaSelecionada, selecionarRota, limparRota } = useRota();
  const { showError, showSuccess } = useNotification();
  const { isOffline, sincronizando } = useOffline();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEntregas | null>(null);
  const [rotas, setRotas] = useState<RotaEntrega[]>([]);
  const [showRotaDialog, setShowRotaDialog] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [rotaSelecionada]); // Re-run effect when rotaSelecionada changes

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const rotaId = rotaSelecionada?.id;
      
      const [estatisticasData, rotasData] = await Promise.all([
        entregaServiceHybrid.obterEstatisticas(undefined, rotaId),
        // Fallback to listarTodasRotas if listarRotas fails, useful for initial data
        entregaServiceHybrid.listarRotas().catch(() => {
          console.warn("listarRotas failed, trying listarTodasRotas as fallback.");
          return entregaServiceHybrid.listarTodasRotas();
        }),
      ]);
      
      setEstatisticas(estatisticasData);
      setRotas(rotasData);
    } catch (error) {
      showError('Erro ao carregar dados. Verifique sua conexão.');
      console.error('Erro ao carregar dados:', error);
      setEstatisticas(null); // Clear stats on error
      setRotas([]); // Clear rotas on error
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarRota = async (rota: RotaEntrega) => {
    try {
      await selecionarRota(rota);
      showSuccess(`Rota "${rota.nome}" selecionada com sucesso!`);
      setShowRotaDialog(false);
      // Data will reload automatically due to useEffect dependency
    } catch (error) {
      showError('Erro ao selecionar rota.');
      console.error('Erro ao selecionar rota:', error);
    }
  };

  const handleTrocarRota = () => {
    setShowRotaDialog(true);
  };

  const handleIniciarEntregas = () => {
    if (rotaSelecionada) {
      navigation.navigate('MainTabs', { screen: 'Entregas' });
    } else {
      showError('Por favor, selecione uma rota antes de iniciar as entregas.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarDados();
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
        <Paragraph style={styles.loadingText}>Carregando informações...</Paragraph>
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
              <Title style={styles.greeting}>
                {getGreeting()}, {user?.nome?.split(' ')[0] || 'Motorista'}!
              </Title>
              <Paragraph style={styles.headerSubtitle}>
                {rotaSelecionada 
                  ? `Sua rota: ${rotaSelecionada.nome}`
                  : 'Nenhuma rota selecionada.'
                }
              </Paragraph>
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
                color={isOffline ? "#d32f2f" : "#1976d2"} // Red for offline, blue for syncing
              />
              <Paragraph style={[styles.statusBannerText, { color: isOffline ? "#d32f2f" : "#1976d2" }]}>
                {isOffline ? "Modo Offline - Dados podem estar desatualizados" : "Sincronizando dados..."}
              </Paragraph>
            </View>
          )}

          {/* Rota Selecionada ou Botão de Seleção */}
          <View style={styles.rotaSectionInHeader}>
            {rotaSelecionada ? (
              <View style={styles.rotaSelectedContainer}>
                <View style={styles.rotaSelectedInfo}>
                  <View
                    style={[styles.rotaColorIndicator, { backgroundColor: rotaSelecionada.cor || '#ccc' }]}
                  />
                  <View>
                    <Paragraph style={styles.rotaSelectedName}>{rotaSelecionada.nome}</Paragraph>
                    {rotaSelecionada.descricao && (
                      <Paragraph style={styles.rotaSelectedDescription}>
                        {rotaSelecionada.descricao}
                      </Paragraph>
                    )}
                  </View>
                </View>
                <View style={styles.rotaSelectedActions}>
                  <Button
                    mode="outlined"
                    compact
                    onPress={handleTrocarRota}
                    style={styles.actionButton}
                    labelStyle={styles.actionButtonLabel}
                  >
                    Trocar
                  </Button>
                  <Button
                    mode="contained"
                    compact
                    onPress={handleIniciarEntregas}
                    style={[styles.actionButton, { backgroundColor: rotaSelecionada.cor || '#1976d2' }]}
                    icon="play"
                    labelStyle={styles.actionButtonLabel}
                  >
                    Iniciar
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                mode="contained"
                icon="map-search"
                onPress={handleTrocarRota}
                style={styles.selectRotaButton}
                labelStyle={styles.selectRotaButtonLabel}
              >
                Selecionar uma Rota
              </Button>
            )}
          </View>
        </Surface>

        {/* Estatísticas */}
        {estatisticas ? (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Resumo de Entregas</Title>
            
            <View style={styles.statsGrid}>
              <Card style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
                <Card.Content style={styles.statContent}>
                  <MaterialCommunityIcons name="home-city" size={32} color="#1976d2" />
                  <Paragraph style={styles.statNumber}>{estatisticas.total_escolas}</Paragraph>
                  <Paragraph style={styles.statLabel}>Escolas</Paragraph>
                </Card.Content>
              </Card>

              <Card style={[styles.statCard, { backgroundColor: '#e8f5e8' }]}>
                <Card.Content style={styles.statContent}>
                  <MaterialCommunityIcons name="package-variant" size={32} color="#388e3c" />
                  <Paragraph style={styles.statNumber}>{estatisticas.total_itens}</Paragraph>
                  <Paragraph style={styles.statLabel}>Itens Total</Paragraph>
                </Card.Content>
              </Card>

              <Card style={[styles.statCard, { backgroundColor: '#e0f2f1' }]}>
                <Card.Content style={styles.statContent}>
                  <MaterialCommunityIcons name="check-circle" size={32} color="#26a69a" />
                  <Paragraph style={styles.statNumber}>{estatisticas.itens_entregues}</Paragraph>
                  <Paragraph style={styles.statLabel}>Entregues</Paragraph>
                </Card.Content>
              </Card>

              <Card style={[styles.statCard, { backgroundColor: '#fffde7' }]}>
                <Card.Content style={styles.statContent}>
                  <MaterialCommunityIcons name="clock-outline" size={32} color="#ffb300" />
                  <Paragraph style={styles.statNumber}>{estatisticas.itens_pendentes}</Paragraph>
                  <Paragraph style={styles.statLabel}>Pendentes</Paragraph>
                </Card.Content>
              </Card>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Resumo de Entregas</Title>
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={48} color="#ccc" />
                <Paragraph style={styles.emptyText}>
                  Nenhuma estatística disponível. {rotaSelecionada ? 'Tente novamente mais tarde.' : 'Selecione uma rota para ver as estatísticas.'}
                </Paragraph>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Todas as Rotas (apenas se não há rota selecionada e rotas existem) */}
        {!rotaSelecionada && rotas.length > 0 && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Rotas Disponíveis</Title>
            
            {rotas.map((rota) => (
              <Card key={rota.id} style={styles.rotaCard} onPress={() => handleSelecionarRota(rota)}>
                <Card.Content>
                  <View style={styles.rotaHeader}>
                    <View style={[styles.rotaColor, { backgroundColor: rota.cor || '#ccc' }]} />
                    <Title style={styles.rotaTitle}>{rota.nome}</Title>
                  </View>
                  {rota.descricao && (
                    <Paragraph style={styles.rotaDescription}>
                      {rota.descricao}
                    </Paragraph>
                  )}

                  <Divider style={styles.cardDivider} />

                  <View style={styles.rotaStats}>
                    <View style={styles.rotaStat}>
                      <MaterialCommunityIcons name="home-city" size={18} color="#666" />
                      <Paragraph style={styles.rotaStatText}>
                        {rota.total_escolas} escolas
                      </Paragraph>
                    </View>
                    <View style={styles.rotaStat}>
                      <MaterialCommunityIcons name="package-variant" size={18} color="#666" />
                      <Paragraph style={styles.rotaStatText}>
                        {rota.itens_entregues}/{rota.total_itens} itens
                      </Paragraph>
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
            ))}
          </View>
        )}

        {/* No Routes Available */}
        {!rotaSelecionada && rotas.length === 0 && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Rotas Disponíveis</Title>
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="map-marker-off" size={48} color="#ccc" />
                <Paragraph style={styles.emptyText}>
                  Nenhuma rota encontrada. Verifique sua conexão ou tente recarregar.
                </Paragraph>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Dialog para trocar rota */}
        <Portal>
          <Dialog visible={showRotaDialog} onDismiss={() => setShowRotaDialog(false)}>
            <Dialog.Title>Selecionar Rota</Dialog.Title>
            <Dialog.Content>
              <Paragraph style={styles.dialogSubtitle}>
                {rotas.length > 0 ? 'Escolha uma rota para trabalhar:' : 'Nenhuma rota disponível no momento.'}
              </Paragraph>
              
              {rotas.length === 0 ? (
                <View style={styles.dialogEmptyState}>
                  <MaterialCommunityIcons name="map-search-outline" size={32} color="#999" />
                  <Paragraph style={{ textAlign: 'center', marginTop: 8, color: '#666' }}>
                    Não foi possível carregar as rotas.
                  </Paragraph>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 300 }}> {/* Limit height for scrollability */}
                  {rotas.map((rota) => (
                    <Card 
                      key={rota.id} 
                      style={[
                        styles.dialogRotaCard,
                        rotaSelecionada?.id === rota.id && styles.dialogRotaCardSelected
                      ]}
                      onPress={() => handleSelecionarRota(rota)}
                    >
                      <Card.Content style={styles.dialogRotaContent}>
                        <View style={styles.dialogRotaInfo}>
                          <View
                            style={[styles.dialogRotaColor, { backgroundColor: rota.cor || '#ccc' }]}
                          />
                          <View style={styles.dialogRotaTexts}>
                            <Paragraph style={styles.dialogRotaName}>
                              {rota.nome}
                            </Paragraph>
                            {rota.descricao && (
                              <Paragraph style={styles.dialogRotaDescription}>
                                {rota.descricao}
                              </Paragraph>
                            )}
                          </View>
                          {rotaSelecionada?.id === rota.id && (
                            <MaterialCommunityIcons name="check-circle" size={24} color="#4caf50" />
                          )}
                        </View>
                        <View style={styles.dialogRotaStats}>
                          <Paragraph style={styles.dialogRotaStat}>
                            <MaterialCommunityIcons name="home-city" size={14} color="#666" /> {rota.total_escolas}
                          </Paragraph>
                          <Paragraph style={styles.dialogRotaStat}>
                            <MaterialCommunityIcons name="package-variant" size={14} color="#666" /> {rota.itens_entregues}/{rota.total_itens}
                          </Paragraph>
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                </ScrollView>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowRotaDialog(false)}>
                Fechar
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Match background for a seamless look
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5', // Consistent background
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  header: {
    margin: 16,
    marginBottom: 0, // Removed bottom margin to connect with the next section
    borderRadius: 16, // Slightly larger border radius for a softer look
    elevation: 4, // More pronounced shadow
    backgroundColor: '#ffffff',
    overflow: 'hidden', // Ensure children respect border radius
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16, // Slightly reduced padding bottom
  },
  headerInfo: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 26, // Slightly larger
    fontWeight: 'bold',
    color: '#1976d2',
    lineHeight: 32, // Ensure good line spacing
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
    backgroundColor: 'rgba(255, 235, 59, 0.1)', // Light yellow for general status
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statusBannerText: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '600',
  },
  rotaSectionInHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  rotaSelectedContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  rotaSelectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rotaColorIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
    borderWidth: 1, // Add a slight border for visibility if color is too light
    borderColor: '#eee',
  },
  rotaSelectedName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  rotaSelectedDescription: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  rotaSelectedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    gap: 12, // Using gap for spacing
  },
  actionButton: {
    flex: 1,
    borderRadius: 10, // Softer corners
  },
  actionButtonLabel: {
    fontSize: 13, // Slightly smaller for compact buttons
  },
  selectRotaButton: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#007bff', // Primary action color
    paddingVertical: 4, // Make it a bit taller
  },
  selectRotaButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    margin: 16,
    marginTop: 16, // Consistent top margin for sections
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16, // More space below title
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 16, // More space between cards
    borderRadius: 12,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 18, // More vertical padding
  },
  statNumber: {
    fontSize: 28, // Larger numbers
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    textAlign: 'center', // Center align labels
  },
  emptyCard: {
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40, // More padding
  },
  emptyText: {
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  // Rota Card for selection list
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
    marginLeft: 28, // Align with title text
    marginBottom: 12,
  },
  cardDivider: {
    marginVertical: 10,
    marginHorizontal: -16, // Extend divider to card edges
    backgroundColor: '#f0f0f0',
  },
  rotaStats: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribute evenly
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

  // Dialog styles
  dialogSubtitle: {
    marginBottom: 16,
    color: '#666',
    fontSize: 15,
  },
  dialogEmptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  dialogRotaCard: {
    marginBottom: 10,
    borderRadius: 10,
    elevation: 1,
    backgroundColor: '#fefefe',
  },
  dialogRotaCardSelected: {
    borderWidth: 2,
    borderColor: '#1976d2',
    backgroundColor: '#e3f2fd', // Light blue background for selected
    elevation: 3,
  },
  dialogRotaContent: {
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  dialogRotaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dialogRotaColor: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dialogRotaTexts: {
    flex: 1,
  },
  dialogRotaName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  dialogRotaDescription: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  dialogRotaStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  dialogRotaStat: {
    fontSize: 13,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default HomeScreen;