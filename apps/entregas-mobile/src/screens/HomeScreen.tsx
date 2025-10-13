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
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { entregaService, EstatisticasEntregas, RotaEntrega } from '../services/entregaService';

const HomeScreen = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEntregas | null>(null);
  const [rotas, setRotas] = useState<RotaEntrega[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [estatisticasData, rotasData] = await Promise.all([
        entregaService.obterEstatisticas(),
        entregaService.listarRotas(),
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
          <View>
            <Title style={styles.greeting}>
              {getGreeting()}, {user?.nome?.split(' ')[0]}!
            </Title>
            <Paragraph style={styles.headerSubtitle}>
              Pronto para as entregas de hoje?
            </Paragraph>
          </View>
          <MaterialCommunityIcons
            name="truck-delivery"
            size={48}
            color="#1976d2"
          />
        </View>
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
                  {estatisticas.percentual_entregue.toFixed(1)}%
                </Chip>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${estatisticas.percentual_entregue}%` }
                  ]}
                />
              </View>
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Rotas Disponíveis */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Rotas Disponíveis</Title>
        
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
                  onPress={() => {
                    // Navegar para detalhes da rota
                  }}
                >
                  Ver Entregas
                </Button>
              </Card.Content>
            </Card>
          ))
        )}
      </View>

      {/* Ações Rápidas */}
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
            mode="outlined"
            icon="map-marker"
            style={styles.quickActionButton}
            onPress={() => {
              // Navegar para mapa
            }}
          >
            Ver Mapa
          </Button>
        </View>
      </View>
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
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default HomeScreen;