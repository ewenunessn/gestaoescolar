import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  ActivityIndicator,
  Searchbar,
  SegmentedButtons,
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
  const { rotaSelecionada } = useRota();
  const { isOffline, sincronizando } = useOffline();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [escolas, setEscolas] = useState<EscolaEntrega[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEntregas | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('pendentes');

  // Recarregar dados sempre que a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [rotaSelecionada])
  );

  // Recalcular estatísticas quando as escolas mudarem (após entregas offline)
  useEffect(() => {
    if (escolas.length > 0 && isOffline) {
      const estatisticasLocais = calcularEstatisticasLocais(escolas);
      setEstatisticas(estatisticasLocais);
    }
  }, [escolas, isOffline]);

  const calcularEstatisticasLocais = (escolas: EscolaEntrega[]) => {
    const totalEscolas = escolas.length;
    const totalItens = escolas.reduce((sum, e) => sum + (e.total_itens || 0), 0);
    const itensEntregues = escolas.reduce((sum, e) => sum + (e.itens_entregues || 0), 0);
    const itensPendentes = totalItens - itensEntregues;
    const percentualEntregue = totalItens > 0 ? (itensEntregues / totalItens) * 100 : 0;

    return {
      total_escolas: totalEscolas,
      total_itens: totalItens,
      itens_entregues: itensEntregues,
      itens_pendentes: itensPendentes,
      percentual_entregue: percentualEntregue,
    };
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      const rotaId = rotaSelecionada?.id;

      // Carregar escolas (obrigatório)
      const escolasData = await entregaServiceHybrid.listarEscolasRota(rotaId);
      setEscolas(escolasData);

      // Tentar carregar estatísticas online
      if (!isOffline) {
        try {
          const estatisticasData = await entregaServiceHybrid.obterEstatisticas(undefined, rotaId);
          setEstatisticas(estatisticasData);
        } catch (error) {
          // Se falhar online, calcular localmente
          console.log('Estatísticas online não disponíveis, calculando localmente');
          const estatisticasLocais = calcularEstatisticasLocais(escolasData);
          setEstatisticas(estatisticasLocais);
        }
      } else {
        // Se offline, sempre calcular localmente
        console.log('Modo offline: calculando estatísticas localmente');
        const estatisticasLocais = calcularEstatisticasLocais(escolasData);
        setEstatisticas(estatisticasLocais);
      }
    } catch (error) {
      showError('Erro ao carregar escolas');
      console.error('Erro ao carregar escolas:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  };

  const filteredEscolas = escolas.filter(escola => {
    const matchesSearch = escola.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (escola.endereco && escola.endereco.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    switch (filtroStatus) {
      case 'pendentes':
        // Mostra todas que ainda estão em andamento (não concluídas)
        return escola.percentual_entregue < 100;
      case 'parciais':
        // Mostra SOMENTE as que estão em andamento (já começaram mas não terminaram)
        return escola.percentual_entregue > 0 && escola.percentual_entregue < 100;
      case 'concluidas':
        return escola.percentual_entregue === 100;
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Buscar escolas..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          icon="magnify"
          iconColor="#666"
          placeholderTextColor="#999"
        />

        <SegmentedButtons
          value={filtroStatus}
          onValueChange={setFiltroStatus}
          buttons={[
            { value: 'pendentes', label: 'Pendentes' },
            { value: 'parciais', label: 'Parciais' },
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
        {/* Estatísticas por Escolas */}
        <Card style={styles.resumoCard} elevation={0}>
          <Card.Content>
            <Text style={styles.resumoTitle}>Resumo de Escolas</Text>
            <View style={styles.resumoStats}>
              <View style={styles.resumoStat}>
                <Text style={styles.resumoNumber}>{escolas.length}</Text>
                <Text style={styles.resumoLabel}>Escolas</Text>
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
                <Text style={styles.resumoLabel}>Parciais</Text>
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

        {/* Lista de Escolas */}
        {filteredEscolas.length === 0 ? (
          <Card style={styles.emptyCard} elevation={0}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="school-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery || filtroStatus !== 'pendentes'
                  ? 'Nenhuma escola encontrada com os filtros aplicados'
                  : 'Nenhuma escola com itens para entrega'
                }
              </Text>
            </Card.Content>
          </Card>
        ) : (
          filteredEscolas.map((escola) => (
            <Card key={escola.id} style={styles.escolaCard} elevation={0}>
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

                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('EscolaDetalhes', {
                    escolaId: escola.id,
                    escolaNome: escola.nome
                  })}
                  style={styles.escolaButton}
                  icon="truck-delivery"
                >
                  {escola.percentual_entregue === 100 ? 'Ver Detalhes' : 'Entregar'}
                </Button>
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
    paddingTop: StatusBar.currentHeight || 0,
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 235, 59, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusBannerText: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '600',
  },
  filtersContainer: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 0,
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
    elevation: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
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
    elevation: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
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
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
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
    height: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  escolaButton: {
    borderRadius: 8,
  },
  emptyCard: {
    borderRadius: 12,
    marginTop: 20,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
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