import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { FAB, Card, Text, IconButton, Searchbar, Chip } from 'react-native-paper';
import { listarRefeicoes, deletarRefeicao } from '../api/nutricao';

export default function RefeicoesScreen({ navigation }: any) {
  const [refeicoes, setRefeicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRefeicoes();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadRefeicoes();
    });
    return unsubscribe;
  }, [navigation]);

  const loadRefeicoes = async () => {
    try {
      setLoading(true);
      const data = await listarRefeicoes();
      console.log('📥 Refeições recebidas:', data);
      console.log('📥 Tipo:', typeof data);
      console.log('📥 É array?', Array.isArray(data));
      setRefeicoes(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erro ao carregar refeições:', error);
      Alert.alert('Erro', error.message);
      setRefeicoes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, nome: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja excluir a refeição "${nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletarRefeicao(id);
              loadRefeicoes();
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const getRefeicaoIcon = (nome: string) => {
    const lower = nome.toLowerCase();
    if (lower.includes('café') || lower.includes('manha')) return '☕';
    if (lower.includes('almoço') || lower.includes('almoco')) return '🍽️';
    if (lower.includes('lanche')) return '🥪';
    if (lower.includes('jantar')) return '🌙';
    return '🍴';
  };

  const filteredRefeicoes = Array.isArray(refeicoes) 
    ? refeicoes.filter((r: any) =>
        r.nome?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Buscar refeições..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          elevation={0}
        />
      </View>

      <View style={styles.statsContainer}>
        <Chip icon="food" style={styles.statChip}>
          {refeicoes.length} {refeicoes.length === 1 ? 'refeição' : 'refeições'}
        </Chip>
      </View>

      <FlatList
        data={filteredRefeicoes}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => navigation.navigate('RefeicaoDetalhe', { refeicao: item })}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Text style={styles.refeicaoIcon}>{getRefeicaoIcon(item.nome)}</Text>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    {item.nome}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    iconColor="#1976d2"
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('RefeicaoForm', { refeicao: item });
                    }}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor="#f44336"
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id, item.nome);
                    }}
                  />
                </View>
              </View>

              {item.descricao && (
                <Text variant="bodyMedium" style={styles.cardDescription} numberOfLines={2}>
                  {item.descricao}
                </Text>
              )}

              {item.tipo && (
                <View style={styles.infoRow}>
                  <Chip mode="outlined" compact style={styles.typeChip} icon="tag">
                    {item.tipo}
                  </Chip>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
        refreshing={loading}
        onRefresh={loadRefeicoes}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineSmall" style={styles.emptyIcon}>🍽️</Text>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              Nenhuma refeição cadastrada
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Toque no botão + para adicionar
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('RefeicaoForm')}
        color="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    elevation: 2,
  },
  searchbar: {
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statChip: {
    backgroundColor: '#e3f2fd',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#fff',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refeicaoIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontWeight: '600',
    color: '#212121',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  cardDescription: {
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    height: 28,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4caf50',
  },
  empty: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
  },
});
