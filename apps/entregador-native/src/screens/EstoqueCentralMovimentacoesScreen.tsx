import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, List, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { EstoqueCentral, listarMovimentacoes, Movimentacao } from '../api/estoqueCentral';
import { handleAxiosError } from '../api/client';
import { formatarNumeroInteligente } from '../utils/dateUtils';

export default function EstoqueCentralMovimentacoesScreen({ route }: any) {
  const { estoque } = route.params as { estoque: EstoqueCentral };
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      carregarMovimentacoes();
    }, [])
  );

  const carregarMovimentacoes = async () => {
    try {
      setLoading(true);
      setMovimentacoes(await listarMovimentacoes(estoque.produto_id, undefined, 100));
    } catch (err) {
      console.error('Erro ao carregar movimentacoes:', err);
      Alert.alert('Erro', handleAxiosError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarMovimentacoes();
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
    const documento = mov.documento ? `Documento: ${mov.documento}` : null;
    const dataMovimentacao = mov.created_at || mov.data_movimentacao;

    return [
      destino,
      motivo,
      documento,
      dataMovimentacao ? new Date(dataMovimentacao).toLocaleString('pt-BR') : null,
    ].filter(Boolean).join('\n');
  };

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.produtoNome}>{estoque.produto_nome}</Text>
            <Text variant="bodySmall" style={styles.subtitulo}>Historico de movimentacoes do produto</Text>
          </Card.Content>
        </Card>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <Card style={styles.card}>
            <Card.Content>
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
                  {movimentacoes.length >= 100 && (
                    <Text variant="bodySmall" style={styles.limitText}>
                      Exibindo as ultimas 100 movimentacoes
                    </Text>
                  )}
                </>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 16, marginBottom: 0 },
  produtoNome: { fontWeight: 'bold' },
  subtitulo: { color: '#666', marginTop: 4 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#666', padding: 20 },
  movItem: { paddingHorizontal: 0 },
  movQuantidade: { alignItems: 'flex-end', justifyContent: 'center' },
  movQuantidadeText: { fontWeight: 'bold' },
  movUnidade: { color: '#666' },
  limitText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});
