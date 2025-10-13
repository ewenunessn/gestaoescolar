import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  ActivityIndicator,
  Searchbar,
  SegmentedButtons,
  Surface,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNotification } from '../contexts/NotificationContext';
import { useRota } from '../contexts/RotaContext';
import { useOffline } from '../contexts/OfflineContext';
import { entregaServiceHybrid } from '../services/entregaServiceHybrid';
import { EscolaEntrega, EstatisticasEntregas } from '../services/entregaService';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const EntregasScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { showError } = useNotification();
  const { rotaSelecionada, limparRota } = useRota();
  const { isOffline, sincronizando } = useOffline();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [escolas, setEscolas] = useState<EscolaEntrega[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEntregas | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todas');

  // Recarregar dados sempre que a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [rotaSelecionada])
  );

  const carregarDados = async () => {
    try {
      setLoading(true);
      const rotaId = rotaSelecionada?.id;

      // Carregar escolas e estatísticas em paralelo
      const [escolasData, estatisticasData] = await Promise.all([
        entregaServiceHybrid.listarEscolasRota(rotaId),
        entregaServiceHybrid.obterEstatisticas(undefined, rotaId).catch(() => null)
      ]);

      setEscolas(escolasData);
      setEstatisticas(estatisticasData);
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

  const handleTrocarRota = () => {
    limparRota();
    navigation.navigate('SelecionarRota');
  };

  const filteredEscolas = escolas.filter(escola => {
    const matchesSearch = escola.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (escola.endereco && escola.endereco.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    switch (filtroStatus) {
      case 'pendentes':
        return escola.percentual_entregue < 100;
      case 'concluidas':
        return escola.percentual_entregue === 100;
      case 'em_andamento':
        return escola.percentual_entregue > 0 && escola.percentual_entregue < 100;
      default:
        return true;
    }
  });

  const getStatusColor = (percentual: number) => {
    if (percentual === 100) return '#4caf50';
    if (percentual > 0) return '#ff9800';
    return '#f44336';
  };

  const getStatusLabel = (percentual: number) => {
    if (percentual === 100) return 'Concluída';
    if (percentual > 0) return 'Em Andamento';
    return 'Pendente';
  };

  const getStatusIcon = (percentual: number) => {
    if (percentual === 100) return 'check-circle';
    if (percentual > 0) return 'clock-outline';
    return 'alert-circle-outline';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando entregas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Entregas</Text>
            <Text style={styles.headerSubtitle}>
              {rotaSelecionada
                ? `Rota: ${rotaSelecionada.nome}`
                : 'Gerencie as entregas por escola'
              }
            </Text>
          </View>
          <Button
            mode="outlined"
            compact
            onPress={handleTrocarRota}
            style={styles.trocarRotaButton}
            icon="swap-horizontal"
          >
            Trocar
          </Button>
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

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Buscar escolas..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <SegmentedButtons
          value={filtroStatus}
          onValueChange={setFiltroStatus}
          buttons={[
            { value: 'todas', label: 'Todas' },
            { value: 'pendentes', label: 'Pendentes' },
            { value: 'em_andamento', label: 'Em Andamento' },
            { value: 'concluidas', label: 'Concluídas' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Estatísticas */}
        {estatisticas ? (
          <Card style={styles.resumoCard}>
            <Card.Content>
              <Text style={styles.resumoTitle}>Estatísticas da Rota</Text>
              <View style={styles.resumoStats}>
                <View style={styles.resumoStat}>
                  <Text style={styles.resumoNumber}>{estatisticas.total_escolas}</Text>
                  <Text style={styles.resumoLabel}>Escolas</Text>
                </View>
                <View style={styles.resumoStat}>
                  <Text style={[styles.resumoNumber, { color: '#388e3c' }]}>
                    {estatisticas.total_itens}
                  </Text>
                  <Text style={styles.resumoLabel}>Itens Total</Text>
                </View>
                <View style={styles.resumoStat}>
                  <Text style={[styles.resumoNumber, { color: '#26a69a' }]}>
                    {estatisticas.itens_entregues}
                  </Text>
                  <Text style={styles.resumoLabel}>Entregues</Text>
                </View>
                <View style={styles.resumoStat}>
                  <Text style={[styles.resumoNumber, { color: '#ffb300' }]}>
                    {estatisticas.itens_pendentes}
                  </Text>
                  <Text style={styles.resumoLabel}>Pendentes</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.resumoCard}>
            <Card.Content>
              <Text style={styles.resumoTitle}>Resumo por Escolas</Text>
              <View style={styles.resumoStats}>
                <View style={styles.resumoStat}>
                  <Text style={styles.resumoNumber}>{escolas.length}</Text>
                  <Text style={styles.resumoLabel}>Total</Text>
                </View>
                <View style={styles.resumoStat}>
                  <Text style={[styles.resumoNumber, { color: '#f44336' }]}>
                    {escolas.filter(e => e.percentual_entregue === 0).length}
                  </Text>
                  <Text style={styles.resumoLabel}>Pendentes</Text>
                </View>
                <View style={styles.resumoStat}>
                  <Text style={[styles.resumoNumber, { color: '#ff9800' }]}>
                    {escolas.filter(e => e.percentual_entregue > 0 && e.percentual_entregue < 100).length}
                  </Text>
                  <Text style={styles.resumoLabel}>Em Andamento</Text>
                </View>
                <View style={styles.resumoStat}>
                  <Text style={[styles.resumoNumber, { color: '#4caf50' }]}>
                    {escolas.filter(e => e.percentual_entregue === 100).length}
                  </Text>
                  <Text style={styles.resumoLabel}>Concluídas</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Lista de Escolas */}
        {filteredEscolas.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="school-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery || filtroStatus !== 'todas'
                  ? 'Nenhuma escola encontrada com os filtros aplicados'
                  : 'Nenhuma escola com itens para entrega'
                }
              </Text>
            </Card.Content>
          </Card>
        ) : (
          filteredEscolas.map((escola) => (
            <Card key={escola.id} style={styles.escolaCard}>
              <Card.Content>
                <View style={styles.escolaHeader}>
                  <View style={styles.escolaInfo}>
                    <Text style={styles.escolaNome}>{escola.nome}</Text>
                    {escola.endereco && (
                      <Text style={styles.escolaEndereco}>
                        📍 {escola.endereco}
                      </Text>
                    )}
                    {escola.telefone && (
                      <Text style={styles.escolaTelefone}>
                        📞 {escola.telefone}
                      </Text>
                    )}
                  </View>

                  <View style={styles.escolaStatus}>
                    <Chip
                      icon={getStatusIcon(escola.percentual_entregue)}
                      mode="outlined"
                      textStyle={{ color: getStatusColor(escola.percentual_entregue) }}
                      style={{ borderColor: getStatusColor(escola.percentual_entregue) }}
                    >
                      {getStatusLabel(escola.percentual_entregue)}
                    </Chip>
                  </View>
                </View>

                <View style={styles.escolaStats}>
                  <View style={styles.escolaStat}>
                    <MaterialCommunityIcons name="package-variant" size={20} color="#666" />
                    <Text style={styles.escolaStatText}>
                      {escola.itens_entregues}/{escola.total_itens} itens
                    </Text>
                  </View>
                  <Text style={styles.escolaPercentual}>
                    {(escola.percentual_entregue || 0).toFixed(1)}% concluído
                  </Text>
                </View>

                {/* Barra de Progresso */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${escola.percentual_entregue}%`,
                          backgroundColor: getStatusColor(escola.percentual_entregue)
                        }
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.escolaActions}>
                  <Button
                    mode="contained"
                    onPress={() => navigation.navigate('EscolaDetalhes', {
                      escolaId: escola.id,
                      escolaNome: escola.nome
                    })}
                    style={styles.escolaButton}
                    icon="eye"
                  >
                    Ver Detalhes
                  </Button>

                  {escola.percentual_entregue < 100 && (
                    <Button
                      mode="outlined"
                      onPress={() => navigation.navigate('EscolaDetalhes', {
                        escolaId: escola.id,
                        escolaNome: escola.nome
                      })}
                      style={styles.escolaButtonSecondary}
                      icon="truck-delivery"
                    >
                      Entregar
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  trocarRotaButton: {
    borderRadius: 8,
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
  filtersContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchbar: {
    elevation: 2,
    marginBottom: 12,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  resumoCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
  },
  resumoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  resumoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resumoStat: {
    alignItems: 'center',
  },
  resumoNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  resumoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  escolaCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  escolaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  escolaInfo: {
    flex: 1,
    marginRight: 12,
  },
  escolaNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  escolaEndereco: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  escolaTelefone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  escolaStatus: {
    alignItems: 'flex-end',
  },
  escolaStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  escolaStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  escolaStatText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
  escolaPercentual: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  escolaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  escolaButton: {
    flex: 1,
    borderRadius: 8,
  },
  escolaButtonSecondary: {
    flex: 1,
    borderRadius: 8,
  },
  emptyCard: {
    borderRadius: 12,
    marginTop: 20,
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
});

export default EntregasScreen;