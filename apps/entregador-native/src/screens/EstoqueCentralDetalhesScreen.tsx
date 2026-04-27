import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, List, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { EstoqueCentral, listarEstoqueCentral, listarMovimentacoes, Movimentacao } from '../api/estoqueCentral';
import { handleAxiosError } from '../api/client';
import { formatarNumeroInteligente } from '../utils/dateUtils';

export default function EstoqueCentralDetalhesScreen({ route, navigation }: any) {
  const { estoque: estoqueInicial } = route.params;
  const [estoque, setEstoque] = useState<EstoqueCentral>(estoqueInicial);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [estoqueAtualizado, movimentacoesData] = await Promise.all([
        listarEstoqueCentral(),
        listarMovimentacoes(estoque.produto_id, undefined, 3),
      ]);

      const estoqueNovo = estoqueAtualizado.find((item) => item.produto_id === estoque.produto_id);
      if (estoqueNovo) {
        setEstoque(estoqueNovo);
      }

      setMovimentacoes(movimentacoesData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      Alert.alert('Erro', handleAxiosError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarDados();
  };

  const formatarNumero = (valor: any): number => {
    if (valor === null || valor === undefined) return 0;
    const num = typeof valor === 'number' ? valor : parseFloat(String(valor));
    return Number.isNaN(num) ? 0 : num;
  };

  const getTipoIcon = (tipo: string): string => {
    switch (tipo) {
      case 'entrada': return 'package-down';
      case 'saida': return 'package-up';
      case 'ajuste': return 'pencil';
      case 'transferencia': return 'truck-delivery';
      default: return 'help';
    }
  };

  const getTipoColor = (tipo: string): string => {
    switch (tipo) {
      case 'entrada': return '#10b981';
      case 'saida': return '#dc2626';
      case 'ajuste': return '#f59e0b';
      case 'transferencia': return '#2563eb';
      default: return '#666';
    }
  };

  const getTipoLabel = (tipo?: string): string => {
    if (!tipo) return 'MOVIMENTACAO';
    return tipo.replace(/_/g, ' ').toUpperCase();
  };

  const getMovimentacaoDescricao = (mov: Movimentacao): string => {
    const tipo = mov.tipo || 'movimentacao';
    const motivo = mov.motivo || mov.observacao || mov.observacoes || 'Sem motivo';
    const destino = tipo === 'transferencia'
      ? `Destino: ${mov.escola_nome || (mov.escola_id ? `Escola ${mov.escola_id}` : 'escola nao informada')}`
      : null;
    const dataMovimentacao = mov.created_at || mov.data_movimentacao;

    return [
      destino,
      motivo,
      dataMovimentacao ? new Date(dataMovimentacao).toLocaleString('pt-BR') : null,
    ].filter(Boolean).join('\n');
  };

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.produtoNome}>
              {estoque.produto_nome}
            </Text>
            {estoque.categoria && (
              <Text variant="bodyMedium" style={styles.categoria}>
                {estoque.categoria}
              </Text>
            )}

            <Divider style={styles.divider} />

            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Text variant="bodySmall" style={styles.infoLabel}>Total</Text>
                <Text variant="headlineSmall" style={styles.infoValue}>
                  {formatarNumeroInteligente(formatarNumero(estoque.quantidade))}
                </Text>
                <Text variant="bodySmall" style={styles.infoUnidade}>{estoque.unidade}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text variant="bodySmall" style={styles.infoLabel}>Disponivel</Text>
                <Text variant="headlineSmall" style={[styles.infoValue, { color: '#10b981' }]}>
                  {formatarNumeroInteligente(formatarNumero(estoque.quantidade_disponivel))}
                </Text>
                <Text variant="bodySmall" style={styles.infoUnidade}>{estoque.unidade}</Text>
              </View>

              {formatarNumero(estoque.quantidade_reservada) > 0 && (
                <View style={styles.infoBox}>
                  <Text variant="bodySmall" style={styles.infoLabel}>Reservado</Text>
                  <Text variant="headlineSmall" style={[styles.infoValue, { color: '#f59e0b' }]}>
                    {formatarNumeroInteligente(formatarNumero(estoque.quantidade_reservada))}
                  </Text>
                  <Text variant="bodySmall" style={styles.infoUnidade}>{estoque.unidade}</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Ultimas Movimentacoes</Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => navigation.navigate('EstoqueCentralMovimentacoes', { estoque })}
                >
                  Ver todas
                </Button>
              </View>
              {movimentacoes.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma movimentacao registrada</Text>
              ) : (
                <>
                  {movimentacoes.map((mov, index) => {
                    const tipo = mov.tipo || 'movimentacao';

                    return (
                      <List.Item
                        key={`${mov.id}-${index}`}
                        title={getTipoLabel(tipo)}
                        titleNumberOfLines={2}
                        description={getMovimentacaoDescricao(mov)}
                        descriptionNumberOfLines={6}
                        left={(props) => (
                          <List.Icon {...props} icon={getTipoIcon(tipo)} color={getTipoColor(tipo)} />
                        )}
                        right={() => (
                          <View style={styles.movQuantidade}>
                            <Text
                              variant="titleMedium"
                              style={[styles.movQuantidadeText, { color: getTipoColor(tipo) }]}
                            >
                              {formatarNumero(mov.quantidade) > 0 ? '+' : ''}
                              {formatarNumeroInteligente(formatarNumero(mov.quantidade))}
                            </Text>
                            <Text variant="bodySmall" style={styles.movUnidade}>
                              {mov.unidade || estoque.unidade}
                            </Text>
                          </View>
                        )}
                        style={styles.movItem}
                      />
                    );
                  })}
                </>
              )}
            </Card.Content>
          </Card>
        )}

        <View style={styles.acoesContainer}>
          <Button
            mode="contained"
            icon="package-down"
            onPress={() => navigation.navigate('EstoqueCentralEntrada', { produto: estoque })}
            style={styles.acaoButton}
          >
            Registrar Entrada
          </Button>
          <Button
            mode="contained"
            icon="package-up"
            onPress={() => navigation.navigate('EstoqueCentralSaida', { produto: estoque })}
            style={styles.acaoButton}
            buttonColor="#dc2626"
          >
            Registrar Saida
          </Button>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => navigation.navigate('EstoqueCentralAjuste', { produto: estoque })}
            style={styles.acaoButton}
          >
            Ajustar Estoque
          </Button>
          <Button
            mode="contained"
            icon="truck-delivery"
            onPress={() => navigation.navigate('EstoqueCentralTransferencia', { produto: estoque })}
            style={styles.acaoButton}
            buttonColor="#2563eb"
          >
            Transferir para Escola
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 16, marginBottom: 0 },
  produtoNome: { fontWeight: 'bold', marginBottom: 4 },
  categoria: { color: '#666', fontStyle: 'italic' },
  divider: { marginVertical: 16 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  infoBox: { alignItems: 'center' },
  infoLabel: { color: '#666', marginBottom: 4 },
  infoValue: { fontWeight: 'bold' },
  infoUnidade: { color: '#666', marginTop: 2 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#666', padding: 20 },
  limitText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  movItem: { paddingHorizontal: 0 },
  movQuantidade: { alignItems: 'flex-end', justifyContent: 'center' },
  movQuantidadeText: { fontWeight: 'bold' },
  movUnidade: { color: '#666' },
  acoesContainer: { padding: 16, gap: 12 },
  acaoButton: { marginBottom: 0 },
});
