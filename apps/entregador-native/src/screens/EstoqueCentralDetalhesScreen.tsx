import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, List, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { listarLotes, listarMovimentacoes, Lote, Movimentacao } from '../api/estoqueCentral';
import { handleAxiosError } from '../api/client';
import { formatarDataBR } from '../utils/dateUtils';

export default function EstoqueCentralDetalhesScreen({ route, navigation }: any) {
  const { estoque } = route.params;
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'lotes' | 'historico'>('lotes');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [lotesData, movimentacoesData] = await Promise.all([
        listarLotes(estoque.id),
        listarMovimentacoes(estoque.id, undefined, 20)
      ]);
      setLotes(lotesData);
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

  const formatarData = (data: string): string => {
    try {
      return formatarDataBR(data.split('T')[0]);
    } catch {
      return data;
    }
  };

  const getDiasParaVencer = (dataValidade: string): number => {
    const validade = new Date(dataValidade);
    const hoje = new Date();
    return Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getCorValidade = (dias: number): string => {
    if (dias < 0) return '#dc2626';
    if (dias <= 7) return '#dc2626';
    if (dias <= 30) return '#f59e0b';
    return '#10b981';
  };

  const getTipoIcon = (tipo: string): string => {
    switch (tipo) {
      case 'entrada': return 'package-down';
      case 'saida': return 'package-up';
      case 'ajuste': return 'pencil';
      default: return 'help';
    }
  };

  const getTipoColor = (tipo: string): string => {
    switch (tipo) {
      case 'entrada': return '#10b981';
      case 'saida': return '#dc2626';
      case 'ajuste': return '#f59e0b';
      default: return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Informações do Produto */}
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
                <Text variant="bodySmall" style={styles.infoLabel}>
                  Quantidade Total
                </Text>
                <Text variant="headlineSmall" style={styles.infoValue}>
                  {estoque.quantidade.toFixed(2)}
                </Text>
                <Text variant="bodySmall" style={styles.infoUnidade}>
                  {estoque.unidade}
                </Text>
              </View>

              <View style={styles.infoBox}>
                <Text variant="bodySmall" style={styles.infoLabel}>
                  Disponível
                </Text>
                <Text variant="headlineSmall" style={[styles.infoValue, { color: '#10b981' }]}>
                  {estoque.quantidade_disponivel.toFixed(2)}
                </Text>
                <Text variant="bodySmall" style={styles.infoUnidade}>
                  {estoque.unidade}
                </Text>
              </View>

              {estoque.quantidade_reservada > 0 && (
                <View style={styles.infoBox}>
                  <Text variant="bodySmall" style={styles.infoLabel}>
                    Reservado
                  </Text>
                  <Text variant="headlineSmall" style={[styles.infoValue, { color: '#f59e0b' }]}>
                    {estoque.quantidade_reservada.toFixed(2)}
                  </Text>
                  <Text variant="bodySmall" style={styles.infoUnidade}>
                    {estoque.unidade}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Abas */}
        <View style={styles.abasContainer}>
          <Button
            mode={abaAtiva === 'lotes' ? 'contained' : 'outlined'}
            onPress={() => setAbaAtiva('lotes')}
            style={styles.abaButton}
          >
            Lotes ({lotes.length})
          </Button>
          <Button
            mode={abaAtiva === 'historico' ? 'contained' : 'outlined'}
            onPress={() => setAbaAtiva('historico')}
            style={styles.abaButton}
          >
            Histórico
          </Button>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <>
            {/* Aba Lotes */}
            {abaAtiva === 'lotes' && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Lotes em Estoque
                  </Text>
                  {lotes.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhum lote cadastrado</Text>
                  ) : (
                    lotes.map((lote) => {
                      const diasParaVencer = getDiasParaVencer(lote.data_validade);
                      return (
                        <View key={lote.id} style={styles.loteItem}>
                          <View style={styles.loteHeader}>
                            <Text variant="titleSmall" style={styles.loteNome}>
                              {lote.lote}
                            </Text>
                            <Chip
                              style={[
                                styles.loteChip,
                                { backgroundColor: getCorValidade(diasParaVencer) }
                              ]}
                              textStyle={{ color: '#fff' }}
                            >
                              {lote.quantidade.toFixed(2)} {estoque.unidade}
                            </Chip>
                          </View>

                          <View style={styles.loteInfo}>
                            {lote.data_fabricacao && (
                              <Text variant="bodySmall" style={styles.loteData}>
                                Fabricação: {formatarData(lote.data_fabricacao)}
                              </Text>
                            )}
                            <Text
                              variant="bodySmall"
                              style={[
                                styles.loteData,
                                { color: getCorValidade(diasParaVencer) }
                              ]}
                            >
                              Validade: {formatarData(lote.data_validade)}
                              {diasParaVencer < 0 && ' (VENCIDO)'}
                              {diasParaVencer >= 0 && diasParaVencer <= 30 && ` (${diasParaVencer}d)`}
                            </Text>
                            {lote.observacao && (
                              <Text variant="bodySmall" style={styles.loteObs}>
                                {lote.observacao}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </Card.Content>
              </Card>
            )}

            {/* Aba Histórico */}
            {abaAtiva === 'historico' && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Últimas Movimentações
                  </Text>
                  {movimentacoes.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhuma movimentação registrada</Text>
                  ) : (
                    movimentacoes.map((mov) => (
                      <List.Item
                        key={mov.id}
                        title={mov.tipo.toUpperCase()}
                        description={`${mov.motivo || 'Sem motivo'}\n${new Date(mov.created_at).toLocaleString('pt-BR')}`}
                        left={(props) => (
                          <List.Icon
                            {...props}
                            icon={getTipoIcon(mov.tipo)}
                            color={getTipoColor(mov.tipo)}
                          />
                        )}
                        right={() => (
                          <View style={styles.movQuantidade}>
                            <Text
                              variant="titleMedium"
                              style={[
                                styles.movQuantidadeText,
                                { color: getTipoColor(mov.tipo) }
                              ]}
                            >
                              {mov.quantidade > 0 ? '+' : ''}{mov.quantidade.toFixed(2)}
                            </Text>
                            <Text variant="bodySmall" style={styles.movUnidade}>
                              {estoque.unidade}
                            </Text>
                          </View>
                        )}
                        style={styles.movItem}
                      />
                    ))
                  )}
                </Card.Content>
              </Card>
            )}
          </>
        )}

        {/* Ações */}
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
            Registrar Saída
          </Button>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => navigation.navigate('EstoqueCentralAjuste', { produto: estoque })}
            style={styles.acaoButton}
          >
            Ajustar Estoque
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginBottom: 0,
  },
  produtoNome: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categoria: {
    color: '#666',
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoBox: {
    alignItems: 'center',
  },
  infoLabel: {
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontWeight: 'bold',
  },
  infoUnidade: {
    color: '#666',
    marginTop: 2,
  },
  abasContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  abaButton: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  loteItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  loteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loteNome: {
    fontWeight: 'bold',
  },
  loteChip: {
    height: 28,
  },
  loteInfo: {
    gap: 4,
  },
  loteData: {
    color: '#666',
  },
  loteObs: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  movItem: {
    paddingHorizontal: 0,
  },
  movQuantidade: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  movQuantidadeText: {
    fontWeight: 'bold',
  },
  movUnidade: {
    color: '#666',
  },
  acoesContainer: {
    padding: 16,
    gap: 12,
  },
  acaoButton: {
    marginBottom: 0,
  },
});
