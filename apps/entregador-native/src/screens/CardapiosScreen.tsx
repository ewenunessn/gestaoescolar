import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { FAB, Card, Text, IconButton, Searchbar, Chip } from 'react-native-paper';
import { listarCardapios, deletarCardapio } from '../api/nutricao';

export default function CardapiosScreen({ navigation }: any) {
  const [cardapios, setCardapios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCardapios();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCardapios();
    });
    return unsubscribe;
  }, [navigation]);

  const loadCardapios = async () => {
    try {
      setLoading(true);
      const data = await listarCardapios();
      setCardapios(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erro ao carregar cardápios:', error);
      Alert.alert('Erro', error.message);
      setCardapios([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, data: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja excluir o cardápio de ${formatDate(data)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletarCardapio(id);
              loadCardapios();
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const filteredCardapios = Array.isArray(cardapios)
    ? cardapios.filter((c: any) =>
        c.data?.includes(searchQuery) ||
        c.refeicao_nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.modalidade_nome?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Buscar cardápios..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          elevation={0}
        />
      </View>

      <View style={styles.statsContainer}>
        <Chip icon="calendar" style={styles.statChip}>
          {cardapios.length} {cardapios.length === 1 ? 'cardápio' : 'cardápios'}
        </Chip>
      </View>

      <FlatList
        data={filteredCardapios}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => navigation.navigate('CardapioForm', { cardapio: item })}>
            <Card.Content>
              <View style={styles.cardRow}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>📅</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    {formatDate(item.data)}
                  </Text>
                  <View style={styles.chipsRow}>
                    <Chip mode="outlined" compact style={styles.chip} icon="food">
                      {item.refeicao_nome}
                    </Chip>
                    <Chip mode="outlined" compact style={styles.chip} icon="school">
                      {item.modalidade_nome}
                    </Chip>
                  </View>
                  {item.observacoes && (
                    <Text variant="bodySmall" style={styles.observacoes} numberOfLines={2}>
                      {item.observacoes}
                    </Text>
                  )}
                </View>
                <View style={styles.cardActions}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    iconColor="#1976d2"
                    onPress={() => navigation.navigate('CardapioForm', { cardapio: item })}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor="#f44336"
                    onPress={() => handleDelete(item.id, item.data)}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        refreshing={loading}
        onRefresh={loadCardapios}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineSmall" style={styles.emptyIcon}>📅</Text>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              Nenhum cardápio cadastrado
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
        onPress={() => navigation.navigate('CardapioForm')}
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    height: 28,
  },
  observacoes: {
    color: '#666',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    marginLeft: 8,
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
