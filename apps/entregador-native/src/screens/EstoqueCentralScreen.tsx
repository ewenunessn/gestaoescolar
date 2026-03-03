import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, FAB, Searchbar, Chip, List, ActivityIndicator, Badge } from 'react-native-paper';
import { listarEstoqueCentral, EstoqueCentral } from '../api/estoqueCentral';
import { handleAxiosError } from '../api/client';

export default function EstoqueCentralScreen({ navigation }: any) {
  const [estoque, setEstoque] = useState<EstoqueCentral[]>([]);
  const [estoqueFiltrado, setEstoqueFiltrado] = useState<EstoqueCentral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'baixo' | 'vencendo'>('todos');
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    carregarEstoque();
  }, []);

  useEffect(() => {
    filtrarEstoque();
  }, [busca, filtro, estoque]);

  const carregarEstoque = async () => {
    try {
      setLoading(true);
      const data = await listarEstoqueCentral();
      setEstoque(data);
    } catch (err) {
      console.error('Erro ao carregar estoque:', err);
      Alert.alert('Erro', handleAxiosError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtrarEstoque = () => {
    let resultado = estoque;

    // Filtro por busca
    if (busca) {
      resultado = resultado.filter(item =>
        item.produto_nome.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filtro === 'baixo') {
      resultado = resultado.filter(item => item.quantidade_disponivel < 10);
    } else if (filtro === 'vencendo') {
      resultado = resultado.filter(item => {
        if (!item.proxima_validade) return false;
        const diasParaVencer = Math.ceil(
          (new Date(item.proxima_validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return diasParaVencer <= 30;
      });
    }

    setEstoqueFiltrado(resultado);
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarEstoque();
  };

  const abrirDetalhes = (item: EstoqueCentral) => {
    navigation.navigate('EstoqueCentralDetalhes', { estoque: item });
  };

  const getCorQuantidade = (disponivel: number): string => {
    if (disponivel === 0) return '#dc2626';
    if (disponivel < 10) return '#f59e0b';
    return '#10b981';
  };

  const formatarValidade = (data?: string): string => {
    if (!data) return 'Sem validade';
    
    const validade = new Date(data);
    const hoje = new Date();
    const diasParaVencer = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasParaVencer < 0) return '⚠️ VENCIDO';
    if (diasParaVencer <= 7) return `⚠️ ${diasParaVencer}d`;
    if (diasParaVencer <= 30) return `⚡ ${diasParaVencer}d`;
    
    return validade.toLocaleDateString('pt-BR');
  };

  return (
    <View style={styles.container}>
      {/* Busca */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar produto..."
          value={busca}
          onChangeText={setBusca}
          style={styles.searchbar}
        />
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosContainer}
        contentContainerStyle={styles.filtrosContent}
      >
        <Chip
          selected={filtro === 'todos'}
          onPress={() => setFiltro('todos')}
          style={styles.chip}
        >
          Todos ({estoque.length})
        </Chip>
        <Chip
          selected={filtro === 'baixo'}
          onPress={() => setFiltro('baixo')}
          style={styles.chip}
          icon="alert"
        >
          Estoque Baixo
        </Chip>
        <Chip
          selected={filtro === 'vencendo'}
          onPress={() => setFiltro('vencendo')}
          style={styles.chip}
          icon="clock-alert"
        >
          Vencendo
        </Chip>
      </ScrollView>

      {/* Lista */}
      <ScrollView
        style={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Carregando estoque...</Text>
          </View>
        ) : estoqueFiltrado.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                {busca ? 'Nenhum produto encontrado' : 'Estoque vazio'}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          estoqueFiltrado.map((item) => (
            <Card key={item.id} style={styles.card} onPress={() => abrirDetalhes(item)}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Text variant="titleMedium" style={styles.produtoNome}>
                      {item.produto_nome}
                    </Text>
                    {item.categoria && (
                      <Text variant="bodySmall" style={styles.categoria}>
                        {item.categoria}
                      </Text>
                    )}
                  </View>
                  <Badge
                    style={[
                      styles.badge,
                      { backgroundColor: getCorQuantidade(item.quantidade_disponivel) }
                    ]}
                  >
                    {item.quantidade_disponivel.toFixed(0)}
                  </Badge>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text variant="bodySmall" style={styles.infoLabel}>
                      Total
                    </Text>
                    <Text variant="bodyMedium" style={styles.infoValue}>
                      {item.quantidade.toFixed(2)} {item.unidade}
                    </Text>
                  </View>

                  {item.quantidade_reservada > 0 && (
                    <View style={styles.infoItem}>
                      <Text variant="bodySmall" style={styles.infoLabel}>
                        Reservado
                      </Text>
                      <Text variant="bodyMedium" style={styles.infoValue}>
                        {item.quantidade_reservada.toFixed(2)} {item.unidade}
                      </Text>
                    </View>
                  )}

                  <View style={styles.infoItem}>
                    <Text variant="bodySmall" style={styles.infoLabel}>
                      Lotes
                    </Text>
                    <Text variant="bodyMedium" style={styles.infoValue}>
                      {item.total_lotes}
                    </Text>
                  </View>
                </View>

                {item.proxima_validade && (
                  <View style={styles.validadeContainer}>
                    <Text variant="bodySmall" style={styles.validadeLabel}>
                      Próxima validade:
                    </Text>
                    <Text variant="bodySmall" style={styles.validadeValue}>
                      {formatarValidade(item.proxima_validade)}
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* FAB Menu */}
      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'package-down',
            label: 'Registrar Entrada',
            onPress: () => navigation.navigate('EstoqueCentralEntrada'),
          },
          {
            icon: 'package-up',
            label: 'Registrar Saída',
            onPress: () => navigation.navigate('EstoqueCentralSaida'),
          },
          {
            icon: 'pencil',
            label: 'Ajustar Estoque',
            onPress: () => navigation.navigate('EstoqueCentralAjuste'),
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  filtrosContainer: {
    backgroundColor: '#fff',
    paddingBottom: 8,
  },
  filtrosContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    marginRight: 8,
  },
  lista: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  produtoNome: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categoria: {
    color: '#666',
    fontStyle: 'italic',
  },
  badge: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 50,
    height: 28,
    lineHeight: 28,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontWeight: '600',
  },
  validadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  validadeLabel: {
    color: '#666',
    marginRight: 8,
  },
  validadeValue: {
    fontWeight: '600',
    color: '#f59e0b',
  },
});
