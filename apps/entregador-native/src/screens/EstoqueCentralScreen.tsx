import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, FAB, Searchbar, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import { listarEstoqueCentral, EstoqueCentral } from '../api/estoqueCentral';
import { handleAxiosError } from '../api/client';
import { formatarNumeroInteligente } from '../utils/dateUtils';

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
      console.log('Estoque carregado:', data.length, 'itens');
      if (data.length > 0) {
        console.log('Primeiro item:', JSON.stringify(data[0], null, 2));
      }
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
        item.produto_nome?.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filtro === 'baixo') {
      resultado = resultado.filter(item => formatarNumero(item.quantidade_disponivel) < 10);
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

  const formatarNumero = (valor: any): number => {
    if (valor === null || valor === undefined) return 0;
    const num = typeof valor === 'number' ? valor : parseFloat(String(valor));
    return isNaN(num) ? 0 : num;
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
      {/* Header com Busca */}
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

      {/* Filtros */}
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
          <Chip
            selected={filtro === 'vencendo'}
            onPress={() => setFiltro('vencendo')}
            style={styles.chip}
            icon="clock-alert-outline"
            mode={filtro === 'vencendo' ? 'flat' : 'outlined'}
          >
            Vencendo
          </Chip>
        </ScrollView>
      </View>

      {/* Lista */}
      <ScrollView
        style={styles.lista}
        contentContainerStyle={styles.listaContent}
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
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>
                {busca ? 'Nenhum produto encontrado' : 'Estoque vazio'}
              </Text>
              {!busca && (
                <Text style={styles.emptySubtext}>
                  Clique no botão + para registrar uma entrada
                </Text>
              )}
            </Card.Content>
          </Card>
        ) : (
          estoqueFiltrado.map((item) => {
            const disponivel = formatarNumero(item.quantidade_disponivel);
            const corQuantidade = getCorQuantidade(disponivel);
            
            return (
              <Card key={item.id} style={styles.card} onPress={() => abrirDetalhes(item)}>
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
                      <Text variant="bodySmall" style={styles.quantidadeLabel}>
                        Disponível
                      </Text>
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
                        <Text variant="bodySmall" style={styles.infoLabel}>
                          Total
                        </Text>
                        <Text variant="titleSmall" style={styles.infoValue}>
                          {formatarNumeroInteligente(formatarNumero(item.quantidade))}
                        </Text>
                      </View>

                      <View style={styles.infoGridItem}>
                        <Text variant="bodySmall" style={styles.infoLabel}>
                          Lotes
                        </Text>
                        <Text variant="titleSmall" style={styles.infoValue}>
                          {formatarNumero(item.total_lotes)}
                        </Text>
                      </View>

                      {formatarNumero(item.quantidade_reservada) > 0 && (
                        <View style={styles.infoGridItem}>
                          <Text variant="bodySmall" style={styles.infoLabel}>
                            Reservado
                          </Text>
                          <Text variant="titleSmall" style={[styles.infoValue, { color: '#f59e0b' }]}>
                            {formatarNumeroInteligente(formatarNumero(item.quantidade_reservada))}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {item.proxima_validade && (
                    <View style={styles.validadeContainer}>
                      <Text variant="bodySmall" style={styles.validadeLabel}>
                        🗓️ Próxima validade: {formatarValidade(item.proxima_validade)}
                      </Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })
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
            color: '#10b981',
          },
          {
            icon: 'package-up',
            label: 'Registrar Saída',
            onPress: () => navigation.navigate('EstoqueCentralSaida'),
            color: '#dc2626',
          },
          {
            icon: 'pencil',
            label: 'Ajustar Estoque',
            onPress: () => navigation.navigate('EstoqueCentralAjuste'),
            color: '#f59e0b',
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        fabStyle={styles.fab}
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
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchbar: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  menuButton: {
    margin: 0,
  },
  filtrosWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  },
  listaContent: {
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
    marginTop: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  card: {
    marginBottom: 12,
    elevation: 4,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  produtoNome: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    fontSize: 15,
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#fafafa',
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  quantidadeBox: {
    flex: 1,
  },
  quantidadeLabel: {
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: '600',
  },
  quantidadeValorContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  quantidadeValor: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  unidade: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  dividerVertical: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 12,
  },
  infoGrid: {
    flex: 1,
    gap: 6,
  },
  infoGridItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#666',
    fontSize: 11,
  },
  infoValue: {
    fontWeight: '600',
    color: '#1a1a1a',
    fontSize: 14,
  },
  validadeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  validadeLabel: {
    color: '#f59e0b',
    fontWeight: '600',
    fontSize: 12,
  },
  fab: {
    backgroundColor: '#1976d2',
  },
});
