import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
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
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useRota } from '../contexts/RotaContext';
import { useNotification } from '../contexts/NotificationContext';
import { entregaService, EstatisticasEntregas, RotaEntrega } from '../services/entregaService';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { rotaSelecionada, selecionarRota, limparRota } = useRota();
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEntregas | null>(null);
  const [rotas, setRotas] = useState<RotaEntrega[]>([]);
  const [showRotaDialog, setShowRotaDialog] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Se há uma rota selecionada, carrega estatísticas específicas da rota
      const rotaId = rotaSelecionada?.id;
      
      const [estatisticasData, rotasData] = await Promise.all([
        entregaService.obterEstatisticas(undefined, rotaId),
        entregaService.listarRotas().catch(() => entregaService.listarTodasRotas()),
      ]);
      
      setEstatisticas(estatisticasData);
      setRotas(rotasData);
    } catch (error) {
      showError('Erro ao carregar dados');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarRota = async (rota: RotaEntrega) => {
    try {
      await selecionarRota(rota);
      showSuccess(`Rota "${rota.nome}" selecionada!`);
      setShowRotaDialog(false);
      // Recarregar dados com a nova rota
      await carregarDados();
    } catch (error) {
      showError('Erro ao selecionar rota');
    }
  };

  const handleTrocarRota = () => {
    setShowRotaDialog(true);
  };

  const handleIniciarEntregas = () => {
    if (rotaSelecionada) {
      // Navegar para a tela de entregas com filtro da rota
      navigation.navigate('MainTabs', { screen: 'Entregas' });
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
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>Carregando...</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Title style={styles.greeting}>
              {getGreeting()}, {user?.nome?.split(' ')[0]}!
            </Title>
            <Paragraph style={styles.headerSubtitle}>
              {rotaSelecionada 
                ? `Trabalhando na ${rotaSelecionada.nome}`
                : 'Selecione sua rota para começar'
              }
            </Paragraph>
          </View>
          <MaterialCommunityIcons
            name="truck-delivery"
            size={48}
            color="#1976d2"
          />
        </View>

        {/* Rota Selecionada */}
        {rotaSelecionada && (
          <View style={styles.rotaSelecionadaContainer}>
            <View style={styles.rotaSelecionadaInfo}>
              <View style={styles.rotaSelecionadaHeader}>
                <View
                  style={[styles.rotaColorIndicator, { backgroundColor: rotaSelecionada.cor }]}
                />
                <Paragraph style={styles.rotaSelecionadaNome}>
                  {rotaSelecionada.nome}
                </Paragraph>
                <Chip
                  mode="outlined"
                  compact
                  style={styles.rotaSelecionadaChip}
                >
                  Ativa
                </Chip>
              </View>
              {rotaSelecionada.descricao && (
                <Paragraph style={styles.rotaSelecionadaDescricao}>
                  {rotaSelecionada.descricao}
                </Paragraph>
              )}
            </View>
            <View style={styles.rotaSelecionadaActions}>
              <Button
                mode="outlined"
                compact
                onPress={handleTrocarRota}
                style={styles.trocarRotaButton}
              >
                Trocar
              </Button>
              <Button
                mode="contained"
                compact
                onPress={handleIniciarEntregas}
                style={[styles.iniciarEntregasButton, { backgroundColor: rotaSelecionada.cor }]}
              >
                Iniciar
              </Button>
            </View>
          </View>
        )}
      </Surface>

      {/* Estatísticas */}
      {estatisticas && (
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Resumo Geral</Title>
          
          <View style={styles.statsGrid}>
            <Card style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="school" size={32} color="#1976d2" />
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

            <Card style={[styles.statCard, { backgroundColor: '#e8f5e8' }]}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="check-circle" size={32} color="#4caf50" />
                <Paragraph style={styles.statNumber}>{estatisticas.itens_entregues}</Paragraph>
                <Paragraph style={styles.statLabel}>Entregues</Paragraph>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="clock-outline" size={32} color="#f57c00" />
                <Paragraph style={styles.statNumber}>{estatisticas.itens_pendentes}</Paragraph>
                <Paragraph style={styles.statLabel}>Pendentes</Paragraph>
              </Card.Content>
            </Card>
          </View>

          {/* Progresso */}
          <Card style={styles.progressCard}>
            <Card.Content>
              <View style={styles.progressHeader}>
                <Paragraph style={styles.progressTitle}>Progresso Geral</Paragraph>
                <Chip mode="outlined">
                  {(estatisticas.percentual_entregue || 0).toFixed(1)}%
                </Chip>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${estatisticas.percentual_entregue || 0}%` }
                  ]}
                />
              </View>
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Seleção de Rota (apenas se não há rota selecionada) */}
      {!rotaSelecionada && (
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Selecione sua Rota</Title>
          
          {rotas.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="map-marker-off" size={48} color="#ccc" />
                <Paragraph style={styles.emptyText}>
                  Nenhuma rota disponível no momento
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            rotas.map((rota) => (
              <Card key={rota.id} style={styles.rotaCard}>
                <Card.Content>
                  <View style={styles.rotaHeader}>
                    <View style={styles.rotaInfo}>
                      <View style={styles.rotaTitleRow}>
                        <View
                          style={[styles.rotaColor, { backgroundColor: rota.cor }]}
                        />
                        <Title style={styles.rotaTitle}>{rota.nome}</Title>
                      </View>
                      {rota.descricao && (
                        <Paragraph style={styles.rotaDescription}>
                          {rota.descricao}
                        </Paragraph>
                      )}
                    </View>
                  </View>

                  <View style={styles.rotaStats}>
                    <View style={styles.rotaStat}>
                      <MaterialCommunityIcons name="school" size={20} color="#666" />
                      <Paragraph style={styles.rotaStatText}>
                        {rota.total_escolas} escolas
                      </Paragraph>
                    </View>
                    <View style={styles.rotaStat}>
                      <MaterialCommunityIcons name="package-variant" size={20} color="#666" />
                      <Paragraph style={styles.rotaStatText}>
                        {rota.itens_entregues}/{rota.total_itens} itens
                      </Paragraph>
                    </View>
                  </View>

                  <Button
                    mode="contained"
                    style={[styles.rotaButton, { backgroundColor: rota.cor }]}
                    onPress={() => handleSelecionarRota(rota)}
                    icon="check"
                  >
                    Selecionar Rota
                  </Button>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      )}

      {/* Ações Rápidas */}
      {rotaSelecionada && (
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Ações Rápidas</Title>
          
          <View style={styles.quickActions}>
            <Button
              mode="outlined"
              icon="qrcode-scan"
              style={styles.quickActionButton}
              onPress={() => {
                // Implementar scanner QR
              }}
            >
              Escanear QR
            </Button>
            
            <Button
              mode="contained"
              icon="truck-delivery"
              style={[styles.quickActionButton, { backgroundColor: rotaSelecionada.cor }]}
              onPress={handleIniciarEntregas}
            >
              Iniciar Entregas
            </Button>
          </View>
        </View>
      )}

      {/* Dialog para trocar rota */}
      <Portal>
        <Dialog visible={showRotaDialog} onDismiss={() => setShowRotaDialog(false)}>
          <Dialog.Title>Selecionar Nova Rota</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogSubtitle}>
              Escolha uma nova rota para trabalhar:
            </Paragraph>
            
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
                      style={[styles.dialogRotaColor, { backgroundColor: rota.cor }]}
                    />
                    <View style={styles.dialogRotaTexts}>
                      <Paragraph style={styles.dialogRotaNome}>
                        {rota.nome}
                      </Paragraph>
                      {rota.descricao && (
                        <Paragraph style={styles.dialogRotaDescricao}>
                          {rota.descricao}
                        </Paragraph>
                      )}
                    </View>
                  </View>
                  <View style={styles.dialogRotaStats}>
                    <Paragraph style={styles.dialogRotaStat}>
                      {rota.total_escolas} escolas
                    </Paragraph>
                    <Paragraph style={styles.dialogRotaStat}>
                      {rota.itens_entregues}/{rota.total_itens} itens
                    </Paragraph>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowRotaDialog(false)}>
              Cancelar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  header: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  offlineIndicator: {
    alignItems: 'center',
    marginTop: 12,
  },
  section: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  progressCard: {
    marginTop: 8,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  rotaCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  rotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rotaInfo: {
    flex: 1,
  },
  rotaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rotaColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  rotaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  rotaDescription: {
    color: '#666',
    fontSize: 14,
  },
  rotaStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rotaStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rotaStatText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
  rotaButton: {
    borderRadius: 8,
  },
  emptyCard: {
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
  },
  // Estilos para rota selecionada
  rotaSelecionadaContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
  },
  rotaSelecionadaInfo: {
    marginBottom: 12,
  },
  rotaSelecionadaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rotaColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  rotaSelecionadaNome: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    color: '#333',
  },
  rotaSelecionadaChip: {
    height: 24,
  },
  rotaSelecionadaDescricao: {
    fontSize: 12,
    color: '#666',
    marginLeft: 20,
  },
  rotaSelecionadaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  trocarRotaButton: {
    flex: 1,
  },
  iniciarEntregasButton: {
    flex: 2,
  },
  // Estilos para dialog
  dialogSubtitle: {
    marginBottom: 16,
    color: '#666',
  },
  dialogRotaCard: {
    marginBottom: 8,
    borderRadius: 8,
  },
  dialogRotaCardSelected: {
    borderWidth: 2,
    borderColor: '#1976d2',
  },
  dialogRotaContent: {
    paddingVertical: 12,
  },
  dialogRotaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dialogRotaColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  dialogRotaTexts: {
    flex: 1,
  },
  dialogRotaNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dialogRotaDescricao: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dialogRotaStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dialogRotaStat: {
    fontSize: 12,
    color: '#666',
  },
});

export default HomeScreen;