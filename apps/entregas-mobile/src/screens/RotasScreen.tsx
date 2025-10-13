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
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNotification } from '../contexts/NotificationContext';
import { entregaService, RotaEntrega, EscolaEntrega } from '../services/entregaService';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const RotasScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rotas, setRotas] = useState<RotaEntrega[]>([]);
  const [escolasRota, setEscolasRota] = useState<{[key: number]: EscolaEntrega[]}>({});
  const [rotaSelecionada, setRotaSelecionada] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    carregarRotas();
  }, []);

  const carregarRotas = async () => {
    try {
      setLoading(true);
      const rotasData = await entregaService.listarRotas();
      setRotas(rotasData);
    } catch (error) {
      showError('Erro ao carregar rotas');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarEscolasRota = async (rotaId: number) => {
    try {
      if (escolasRota[rotaId]) {
        // Se já carregou, apenas expandir/recolher
        setRotaSelecionada(rotaSelecionada === rotaId ? null : rotaId);
        return;
      }

      const escolasData = await entregaService.listarEscolasRota(rotaId);
      setEscolasRota(prev => ({
        ...prev,
        [rotaId]: escolasData
      }));
      setRotaSelecionada(rotaId);
    } catch (error) {
      showError('Erro ao carregar escolas da rota');
      console.error('Erro:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarRotas();
    setRefreshing(false);
  };

  const filteredRotas = rotas.filter(rota =>
    rota.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rota.descricao && rota.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getProgressColor = (percentual: number) => {
    if (percentual >= 80) return '#4caf50';
    if (percentual >= 50) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>Carregando rotas...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Rotas de Entrega</Title>
        <Paragraph style={styles.headerSubtitle}>
          Selecione uma rota para ver as escolas
        </Paragraph>
      </View>

      {/* Busca */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar rotas..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRotas.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="map-marker-off" size={48} color="#ccc" />
              <Paragraph style={styles.emptyText}>
                {searchQuery ? 'Nenhuma rota encontrada' : 'Nenhuma rota disponível'}
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          filteredRotas.map((rota) => {
            const isExpanded = rotaSelecionada === rota.id;
            const escolas = escolasRota[rota.id] || [];
            const percentualEntrega = rota.total_itens > 0 
              ? (rota.itens_entregues / rota.total_itens) * 100 
              : 0;

            return (
              <Card key={rota.id} style={styles.rotaCard}>
                <Card.Content>
                  {/* Cabeçalho da Rota */}
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
                    <Chip
                      mode="outlined"
                      textStyle={{ color: getProgressColor(percentualEntrega) }}
                      style={{ borderColor: getProgressColor(percentualEntrega) }}
                    >
                      {percentualEntrega.toFixed(1)}%
                    </Chip>
                  </View>

                  {/* Estatísticas da Rota */}
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

                  {/* Barra de Progresso */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { 
                            width: `${percentualEntrega}%`,
                            backgroundColor: getProgressColor(percentualEntrega)
                          }
                        ]}
                      />
                    </View>
                  </View>

                  {/* Botão para Expandir */}
                  <Button
                    mode="outlined"
                    onPress={() => carregarEscolasRota(rota.id)}
                    style={styles.expandButton}
                    icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                  >
                    {isExpanded ? 'Ocultar Escolas' : 'Ver Escolas'}
                  </Button>

                  {/* Lista de Escolas (Expandida) */}
                  {isExpanded && (
                    <View style={styles.escolasContainer}>
                      <Title style={styles.escolasTitle}>
                        Escolas da Rota ({escolas.length})
                      </Title>
                      
                      {escolas.length === 0 ? (
                        <View style={styles.emptyEscolas}>
                          <Paragraph style={styles.emptyEscolasText}>
                            Nenhuma escola com itens para entrega
                          </Paragraph>
                        </View>
                      ) : (
                        escolas.map((escola) => (
                          <Card key={escola.id} style={styles.escolaCard}>
                            <Card.Content>
                              <View style={styles.escolaHeader}>
                                <View style={styles.escolaInfo}>
                                  <Paragraph style={styles.escolaNome}>
                                    {escola.nome}
                                  </Paragraph>
                                  {escola.endereco && (
                                    <Paragraph style={styles.escolaEndereco}>
                                      📍 {escola.endereco}
                                    </Paragraph>
                                  )}
                                </View>
                                <View style={styles.escolaStats}>
                                  <Paragraph style={styles.escolaProgress}>
                                    {escola.itens_entregues}/{escola.total_itens}
                                  </Paragraph>
                                  <Paragraph style={styles.escolaPercentual}>
                                    {escola.percentual_entregue.toFixed(1)}%
                                  </Paragraph>
                                </View>
                              </View>

                              <View style={styles.escolaProgressBar}>
                                <View
                                  style={[
                                    styles.escolaProgressFill,
                                    { 
                                      width: `${escola.percentual_entregue}%`,
                                      backgroundColor: getProgressColor(escola.percentual_entregue)
                                    }
                                  ]}
                                />
                              </View>

                              <Button
                                mode="contained"
                                onPress={() => navigation.navigate('EscolaDetalhes', {
                                  escolaId: escola.id,
                                  escolaNome: escola.nome
                                })}
                                style={styles.escolaButton}
                                compact
                              >
                                Ver Itens
                              </Button>
                            </Card.Content>
                          </Card>
                        ))
                      )}
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })
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
  searchContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  searchbar: {
    elevation: 2,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  rotaCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
  },
  rotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rotaInfo: {
    flex: 1,
    marginRight: 12,
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
    marginBottom: 12,
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
  expandButton: {
    borderRadius: 8,
  },
  escolasContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  escolasTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  escolaCard: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  escolaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  escolaInfo: {
    flex: 1,
    marginRight: 12,
  },
  escolaNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  escolaEndereco: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  escolaStats: {
    alignItems: 'flex-end',
  },
  escolaProgress: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  escolaPercentual: {
    fontSize: 12,
    color: '#666',
  },
  escolaProgressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  escolaProgressFill: {
    height: '100%',
  },
  escolaButton: {
    borderRadius: 6,
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
  emptyEscolas: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyEscolasText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default RotasScreen;