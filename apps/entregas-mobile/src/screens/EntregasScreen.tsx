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
  ActivityIndicator,
  Searchbar,
  SegmentedButtons,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNotification } from '../contexts/NotificationContext';
import { entregaService, EscolaEntrega } from '../services/entregaService';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const EntregasScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [escolas, setEscolas] = useState<EscolaEntrega[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todas');

  useEffect(() => {
    carregarEscolas();
  }, []);

  const carregarEscolas = async () => {
    try {
      setLoading(true);
      const escolasData = await entregaService.listarEscolasRota();
      setEscolas(escolasData);
    } catch (error) {
      showError('Erro ao carregar escolas');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarEscolas();
    setRefreshing(false);
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
        <Paragraph style={styles.loadingText}>Carregando entregas...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Entregas</Title>
        <Paragraph style={styles.headerSubtitle}>
          Gerencie as entregas por escola
        </Paragraph>
      </View>

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
        {/* Resumo */}
        <Card style={styles.resumoCard}>
          <Card.Content>
            <Title style={styles.resumoTitle}>Resumo</Title>
            <View style={styles.resumoStats}>
              <View style={styles.resumoStat}>
                <Paragraph style={styles.resumoNumber}>{escolas.length}</Paragraph>
                <Paragraph style={styles.resumoLabel}>Total</Paragraph>
              </View>
              <View style={styles.resumoStat}>
                <Paragraph style={[styles.resumoNumber, { color: '#f44336' }]}>
                  {escolas.filter(e => e.percentual_entregue === 0).length}
                </Paragraph>
                <Paragraph style={styles.resumoLabel}>Pendentes</Paragraph>
              </View>
              <View style={styles.resumoStat}>
                <Paragraph style={[styles.resumoNumber, { color: '#ff9800' }]}>
                  {escolas.filter(e => e.percentual_entregue > 0 && e.percentual_entregue < 100).length}
                </Paragraph>
                <Paragraph style={styles.resumoLabel}>Em Andamento</Paragraph>
              </View>
              <View style={styles.resumoStat}>
                <Paragraph style={[styles.resumoNumber, { color: '#4caf50' }]}>
                  {escolas.filter(e => e.percentual_entregue === 100).length}
                </Paragraph>
                <Paragraph style={styles.resumoLabel}>Concluídas</Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Lista de Escolas */}
        {filteredEscolas.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="school-outline" size={48} color="#ccc" />
              <Paragraph style={styles.emptyText}>
                {searchQuery || filtroStatus !== 'todas' 
                  ? 'Nenhuma escola encontrada com os filtros aplicados'
                  : 'Nenhuma escola com itens para entrega'
                }
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          filteredEscolas.map((escola) => (
            <Card key={escola.id} style={styles.escolaCard}>
              <Card.Content>
                <View style={styles.escolaHeader}>
                  <View style={styles.escolaInfo}>
                    <Title style={styles.escolaNome}>{escola.nome}</Title>
                    {escola.endereco && (
                      <Paragraph style={styles.escolaEndereco}>
                        📍 {escola.endereco}
                      </Paragraph>
                    )}
                    {escola.telefone && (
                      <Paragraph style={styles.escolaTelefone}>
                        📞 {escola.telefone}
                      </Paragraph>
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
                    <Paragraph style={styles.escolaStatText}>
                      {escola.itens_entregues}/{escola.total_itens} itens
                    </Paragraph>
                  </View>
                  <Paragraph style={styles.escolaPercentual}>
                    {escola.percentual_entregue.toFixed(1)}% concluído
                  </Paragraph>
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
                      onPress={() => {
                        // Navegar diretamente para confirmar próxima entrega
                      }}
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
    </View>
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
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
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