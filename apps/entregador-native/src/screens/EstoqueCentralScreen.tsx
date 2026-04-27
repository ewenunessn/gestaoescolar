import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, FAB, IconButton, Searchbar, Text } from 'react-native-paper';
import { EstoqueCentral, listarEstoqueCentral } from '../api/estoqueCentral';
import { handleAxiosError } from '../api/client';
import { formatarNumeroInteligente } from '../utils/dateUtils';

export default function EstoqueCentralScreen({ navigation }: any) {
  const [estoque, setEstoque] = useState<EstoqueCentral[]>([]);
  const [estoqueFiltrado, setEstoqueFiltrado] = useState<EstoqueCentral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'baixo'>('todos');
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
      setEstoque(await listarEstoqueCentral());
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

    if (busca) {
      resultado = resultado.filter((item) =>
        item.produto_nome?.toLowerCase().includes(busca.toLowerCase())
      );
    }

    if (filtro === 'baixo') {
      resultado = resultado.filter((item) => formatarNumero(item.quantidade_disponivel) < 10);
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

  const formatarNumero = (valor: any): number => {
    if (valor === null || valor === undefined) return 0;
    const num = typeof valor === 'number' ? valor : parseFloat(String(valor));
    return Number.isNaN(num) ? 0 : num;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Searchbar
            placeholder="Buscar produto..."
            value={busca}
            onChangeText={setBusca}
            style={styles.searchbar}
            elevation={0}
          />
          <IconButton
            icon="chart-box"
            size={24}
            onPress={() => navigation.navigate('EstoqueCentralRelatorios')}
            style={styles.menuButton}
          />
        </View>
      </View>

      <View style={styles.filtrosWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosContent}
        >
          <Chip
            selected={filtro === 'todos'}
            onPress={() => setFiltro('todos')}
            style={styles.chip}
            mode={filtro === 'todos' ? 'flat' : 'outlined'}
          >
            Todos ({estoque.length})
          </Chip>
          <Chip
            selected={filtro === 'baixo'}
            onPress={() => setFiltro('baixo')}
            style={styles.chip}
            icon="alert-circle"
            mode={filtro === 'baixo' ? 'flat' : 'outlined'}
          >
            Estoque Baixo
          </Chip>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.lista}
        contentContainerStyle={styles.listaContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
              {!busca && (
                <Text style={styles.emptySubtext}>
                  Clique no botao + para registrar uma entrada
                </Text>
              )}
            </Card.Content>
          </Card>
        ) : (
          estoqueFiltrado.map((item) => {
            const disponivel = formatarNumero(item.quantidade_disponivel);
            const corQuantidade = getCorQuantidade(disponivel);

            return (
              <Card key={item.produto_id} style={styles.card} onPress={() => abrirDetalhes(item)}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                      <Text variant="titleMedium" style={styles.produtoNome}>
                        {item.produto_nome}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.quantidadeContainer}>
                    <View style={styles.quantidadeBox}>
                      <Text variant="bodySmall" style={styles.quantidadeLabel}>Disponivel</Text>
                      <View style={styles.quantidadeValorContainer}>
                        <Text
                          variant="headlineMedium"
                          style={[styles.quantidadeValor, { color: corQuantidade }]}
                        >
                          {formatarNumeroInteligente(disponivel, 0)}
                        </Text>
                        <Text variant="bodyMedium" style={styles.unidade}>
                          {item.unidade || 'UN'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dividerVertical} />

                    <View style={styles.infoGrid}>
                      <View style={styles.infoGridItem}>
                        <Text variant="bodySmall" style={styles.infoLabel}>Total</Text>
                        <Text variant="titleSmall" style={styles.infoValue}>
                          {formatarNumeroInteligente(formatarNumero(item.quantidade))}
                        </Text>
                      </View>

                      {formatarNumero(item.quantidade_reservada) > 0 && (
                        <View style={styles.infoGridItem}>
                          <Text variant="bodySmall" style={styles.infoLabel}>Reservado</Text>
                          <Text variant="titleSmall" style={[styles.infoValue, { color: '#f59e0b' }]}>
                            {formatarNumeroInteligente(formatarNumero(item.quantidade_reservada))}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'package-down',
            label: 'Registrar Entrada',
            onPress: () => navigation.navigate('EstoqueCentralEntrada'),
            color: '#10b981',
          },
          {
            icon: 'package-up',
            label: 'Registrar Saida',
            onPress: () => navigation.navigate('EstoqueCentralSaida'),
            color: '#dc2626',
          },
          {
            icon: 'pencil',
            label: 'Ajustar Estoque',
            onPress: () => navigation.navigate('EstoqueCentralAjuste'),
            color: '#f59e0b',
          },
          {
            icon: 'truck-delivery',
            label: 'Transferir para Escola',
            onPress: () => navigation.navigate('EstoqueCentralTransferencia'),
            color: '#2563eb',
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        fabStyle={styles.fab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchbar: { flex: 1, elevation: 0, backgroundColor: '#f5f5f5' },
  menuButton: { margin: 0 },
  filtrosWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filtrosContent: { paddingHorizontal: 16, gap: 8 },
  chip: { marginRight: 8 },
  lista: { flex: 1 },
  listaContent: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, color: '#666' },
  emptyCard: { marginTop: 40, alignItems: 'center' },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: { textAlign: 'center', color: '#999', fontSize: 14 },
  card: {
    marginBottom: 12,
    elevation: 4,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  produtoNome: { fontWeight: 'bold', color: '#1a1a1a', fontSize: 15 },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#fafafa',
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  quantidadeBox: { flex: 1 },
  quantidadeLabel: {
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: '600',
  },
  quantidadeValorContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  quantidadeValor: { fontWeight: 'bold', fontSize: 24 },
  unidade: { color: '#666', fontWeight: '600', fontSize: 13 },
  dividerVertical: { width: 1, height: 40, backgroundColor: '#e0e0e0', marginHorizontal: 12 },
  infoGrid: { flex: 1, gap: 6 },
  infoGridItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: '#666', fontSize: 11 },
  infoValue: { fontWeight: '600', color: '#1a1a1a', fontSize: 14 },
  fab: { backgroundColor: '#1976d2' },
});
