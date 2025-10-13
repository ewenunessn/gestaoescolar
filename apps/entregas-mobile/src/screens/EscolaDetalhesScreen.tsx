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
  List,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useNotification } from '../contexts/NotificationContext';
import { entregaService, ItemEntrega } from '../services/entregaService';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type EscolaDetalhesRouteProp = RouteProp<RootStackParamList, 'EscolaDetalhes'>;

const EscolaDetalhesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EscolaDetalhesRouteProp>();
  const { showError, showSuccess } = useNotification();
  const { escolaId, escolaNome } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [itens, setItens] = useState<ItemEntrega[]>([]);

  useEffect(() => {
    carregarItens();
  }, []);

  const carregarItens = async () => {
    try {
      setLoading(true);
      const itensData = await entregaService.listarItensEscola(escolaId);
      setItens(itensData);
    } catch (error) {
      showError('Erro ao carregar itens da escola');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarItens();
    setRefreshing(false);
  };

  const handleConfirmarEntrega = (item: ItemEntrega) => {
    navigation.navigate('ConfirmarEntrega', {
      itemId: item.id,
      itemData: item
    });
  };

  const handleCancelarEntrega = async (item: ItemEntrega) => {
    try {
      await entregaService.cancelarEntrega(item.id);
      showSuccess('Entrega cancelada com sucesso');
      await carregarItens();
    } catch (error) {
      showError('Erro ao cancelar entrega');
      console.error('Erro:', error);
    }
  };

  const getStatusColor = (item: ItemEntrega) => {
    if (!item.para_entrega) return '#9e9e9e';
    if (item.entrega_confirmada) return '#4caf50';
    return '#ff9800';
  };

  const getStatusLabel = (item: ItemEntrega) => {
    if (!item.para_entrega) return 'Não p/ entrega';
    if (item.entrega_confirmada) return 'Entregue';
    return 'Pendente';
  };

  const getStatusIcon = (item: ItemEntrega) => {
    if (!item.para_entrega) return 'minus-circle-outline';
    if (item.entrega_confirmada) return 'check-circle';
    return 'clock-outline';
  };

  const itensPendentes = itens.filter(item => item.para_entrega && !item.entrega_confirmada);
  const itensEntregues = itens.filter(item => item.entrega_confirmada);
  const itensNaoEntrega = itens.filter(item => !item.para_entrega);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>Carregando itens...</Paragraph>
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
      {/* Header da Escola */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="school" size={48} color="#1976d2" />
            <View style={styles.headerInfo}>
              <Title style={styles.escolaNome}>{escolaNome}</Title>
              <Paragraph style={styles.totalItens}>
                {itens.length} item(s) total
              </Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Resumo */}
      <Card style={styles.resumoCard}>
        <Card.Content>
          <Title style={styles.resumoTitle}>Resumo</Title>
          <View style={styles.resumoStats}>
            <View style={styles.resumoStat}>
              <Paragraph style={[styles.resumoNumber, { color: '#ff9800' }]}>
                {itensPendentes.length}
              </Paragraph>
              <Paragraph style={styles.resumoLabel}>Pendentes</Paragraph>
            </View>
            <View style={styles.resumoStat}>
              <Paragraph style={[styles.resumoNumber, { color: '#4caf50' }]}>
                {itensEntregues.length}
              </Paragraph>
              <Paragraph style={styles.resumoLabel}>Entregues</Paragraph>
            </View>
            <View style={styles.resumoStat}>
              <Paragraph style={[styles.resumoNumber, { color: '#9e9e9e' }]}>
                {itensNaoEntrega.length}
              </Paragraph>
              <Paragraph style={styles.resumoLabel}>Não p/ entrega</Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Itens Pendentes */}
      {itensPendentes.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>
                Itens Pendentes ({itensPendentes.length})
              </Title>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#ff9800" />
            </View>
            
            {itensPendentes.map((item, index) => (
              <View key={item.id}>
                <List.Item
                  title={item.produto_nome}
                  description={`${item.quantidade} ${item.unidade}${item.lote ? ` - Lote: ${item.lote}` : ''}`}
                  left={(props) => (
                    <List.Icon {...props} icon="package-variant" color="#ff9800" />
                  )}
                  right={() => (
                    <View style={styles.itemActions}>
                      <Button
                        mode="contained"
                        onPress={() => handleConfirmarEntrega(item)}
                        style={styles.confirmarButton}
                        compact
                      >
                        Confirmar
                      </Button>
                    </View>
                  )}
                />
                {item.observacao && (
                  <Paragraph style={styles.observacao}>
                    💬 {item.observacao}
                  </Paragraph>
                )}
                {index < itensPendentes.length - 1 && <Divider />}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Itens Entregues */}
      {itensEntregues.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>
                Itens Entregues ({itensEntregues.length})
              </Title>
              <MaterialCommunityIcons name="check-circle" size={24} color="#4caf50" />
            </View>
            
            {itensEntregues.map((item, index) => (
              <View key={item.id}>
                <List.Item
                  title={item.produto_nome}
                  description={
                    <View>
                      <Paragraph style={styles.itemDescription}>
                        {item.quantidade_entregue || item.quantidade} {item.unidade}
                        {item.lote ? ` - Lote: ${item.lote}` : ''}
                      </Paragraph>
                      {item.data_entrega && (
                        <Paragraph style={styles.dataEntrega}>
                          📅 Entregue em: {new Date(item.data_entrega).toLocaleDateString('pt-BR')}
                        </Paragraph>
                      )}
                      {item.nome_quem_recebeu && (
                        <Paragraph style={styles.quemRecebeu}>
                          👤 Recebido por: {item.nome_quem_recebeu}
                        </Paragraph>
                      )}
                    </View>
                  }
                  left={(props) => (
                    <List.Icon {...props} icon="check-circle" color="#4caf50" />
                  )}
                  right={() => (
                    <View style={styles.itemActions}>
                      <Button
                        mode="outlined"
                        onPress={() => handleCancelarEntrega(item)}
                        style={styles.cancelarButton}
                        compact
                      >
                        Cancelar
                      </Button>
                    </View>
                  )}
                />
                {item.observacao && (
                  <Paragraph style={styles.observacao}>
                    💬 {item.observacao}
                  </Paragraph>
                )}
                {index < itensEntregues.length - 1 && <Divider />}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Itens Não para Entrega */}
      {itensNaoEntrega.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>
                Não para Entrega ({itensNaoEntrega.length})
              </Title>
              <MaterialCommunityIcons name="minus-circle-outline" size={24} color="#9e9e9e" />
            </View>
            
            {itensNaoEntrega.map((item, index) => (
              <View key={item.id}>
                <List.Item
                  title={item.produto_nome}
                  description={`${item.quantidade} ${item.unidade}${item.lote ? ` - Lote: ${item.lote}` : ''}`}
                  left={(props) => (
                    <List.Icon {...props} icon="minus-circle-outline" color="#9e9e9e" />
                  )}
                />
                {item.observacao && (
                  <Paragraph style={styles.observacao}>
                    💬 {item.observacao}
                  </Paragraph>
                )}
                {index < itensNaoEntrega.length - 1 && <Divider />}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Estado Vazio */}
      {itens.length === 0 && (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons name="package-variant-closed" size={48} color="#ccc" />
            <Paragraph style={styles.emptyText}>
              Nenhum item encontrado para esta escola
            </Paragraph>
          </Card.Content>
        </Card>
      )}

      {/* Botão de Ação Rápida */}
      {itensPendentes.length > 0 && (
        <View style={styles.fabContainer}>
          <Button
            mode="contained"
            onPress={() => {
              // Confirmar todos os itens pendentes
              if (itensPendentes.length === 1) {
                handleConfirmarEntrega(itensPendentes[0]);
              } else {
                // Implementar confirmação em lote
              }
            }}
            style={styles.fabButton}
            icon="truck-delivery"
          >
            Confirmar {itensPendentes.length > 1 ? 'Todos' : 'Entrega'}
          </Button>
        </View>
      )}
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
  headerCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  escolaNome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalItens: {
    color: '#666',
    marginTop: 4,
  },
  resumoCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
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
  },
  resumoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemActions: {
    justifyContent: 'center',
  },
  confirmarButton: {
    borderRadius: 6,
    backgroundColor: '#4caf50',
  },
  cancelarButton: {
    borderRadius: 6,
    borderColor: '#f44336',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
  },
  dataEntrega: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 2,
  },
  quemRecebeu: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  observacao: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 56,
    marginBottom: 8,
  },
  emptyCard: {
    margin: 16,
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
  fabContainer: {
    margin: 16,
    marginTop: 8,
  },
  fabButton: {
    borderRadius: 8,
    paddingVertical: 8,
  },
});

export default EscolaDetalhesScreen;