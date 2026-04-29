import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, Image } from 'react-native';
import { Text, Card, ActivityIndicator, Divider, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../api/client';
import { obterFotoComprovante } from '../api/rotas';
import OfflineIndicator from '../components/OfflineIndicator';
import { useOffline } from '../contexts/OfflineContext';
import { obterDataAtual, formatarDataBR } from '../utils/dateUtils';
import { cacheService } from '../services/cacheService';
import { loadDeliveryOutboxOperations } from '../services/deliveryOutbox';
import { buildPendingComprovanteDrafts, type DeliveryOutboxStatus } from '../services/deliveryOutboxCore';
import { COMPROVANTES_REFRESH_MS, shouldRefreshCache } from '../services/deliverySyncPolicy';

interface Comprovante {
  id: number;
  numero_comprovante: string;
  escola_nome: string;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  data_entrega: string;
  observacao?: string;
  assinatura_base64?: string;
  foto_local_uri?: string;
  total_itens: number;
  itens: Array<{
    produto_nome: string;
    quantidade_entregue: number;
    unidade: string;
    lote?: string;
  }>;
  offline_status?: DeliveryOutboxStatus;
  offline_error?: string;
  client_operation_ids?: string[];
}

const getOfflineComprovanteStatus = (status: DeliveryOutboxStatus): string => {
  switch (status) {
    case 'pending':
      return 'Entrega aguardando envio';
    case 'syncing':
      return 'Sincronizando';
    case 'failed_retryable':
      return 'Falha temporaria. Sera reenviado.';
    case 'failed_needs_action':
      return 'Erro de sincronizacao. Precisa de acao.';
    case 'comprovante_pending':
      return 'Comprovante aguardando envio';
    case 'foto_pending':
      return 'Foto aguardando envio';
    default:
      return '';
  }
};

export default function ComprovantesScreen({ route, navigation }: any) {
  const { rotaId } = route.params;
  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fotoUrls, setFotoUrls] = useState<Record<number, string>>({});
  const [fotoErros, setFotoErros] = useState<Record<number, string>>({});
  const { syncVersion } = useOffline();

  useEffect(() => {
    carregarComprovantesOfflineFirst();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      carregarComprovantesOfflineFirst();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (syncVersion > 0) {
      carregarComprovantesOfflineFirst(true);
    }
  }, [syncVersion]);

  const carregarComprovantes = async () => {
    try {
      setLoading(true);
      
      const tokenData = await AsyncStorage.getItem('token');
      const token = tokenData ? JSON.parse(tokenData).token : null;

      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.');
      }

      // Usar apenas a data de hoje (sem problemas de timezone)
      const hoje = obterDataAtual();

      const url = `${API_URL}/entregas/comprovantes?data_inicio=${hoje}&data_fim=${hoje}`;
      console.log('🔍 Buscando comprovantes de hoje:', url, '| Data:', hoje);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Status da resposta:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta:', errorText);
        
        // Tentar fazer parse do erro
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.message || 'Erro ao carregar comprovantes');
        } catch (parseError) {
          throw new Error(`Erro ${response.status}: ${errorText || 'Erro ao carregar comprovantes'}`);
        }
      }

      const data = await response.json();
      console.log('✅ Comprovantes recebidos:', data);
      
      // A API retorna { comprovantes: [], limit, offset }
      const comprovantesArray = data.comprovantes || data;
      console.log('📋 Total de comprovantes de hoje:', comprovantesArray.length);
      
      setComprovantes(Array.isArray(comprovantesArray) ? comprovantesArray : []);
    } catch (err: any) {
      console.error('❌ Erro ao carregar comprovantes:', err);
      const errorMessage = err.message || 'Não foi possível carregar os comprovantes';
      Alert.alert('Erro', errorMessage);
      setComprovantes([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarComprovantesOfflineFirst = async (force = false) => {
    try {
      setLoading(comprovantes.length === 0);

      const hoje = obterDataAtual();
      const cacheKey = `comprovantes_${hoje}`;
      const cachedEntry = await cacheService.getEntry<Comprovante[]>(cacheKey);
      const outboxOperations = await loadDeliveryOutboxOperations();
      const comprovantesPendentes = buildPendingComprovanteDrafts(outboxOperations, {
        onlyDate: hoje,
      }) as Comprovante[];
      let comprovantesServidor: Comprovante[] = [];
      let fetchError: Error | null = null;

      if (cachedEntry) {
        comprovantesServidor = cachedEntry.data;
        setComprovantes([...comprovantesPendentes, ...comprovantesServidor]);
      }

      if (!shouldRefreshCache({ timestamp: cachedEntry?.timestamp, maxAgeMs: COMPROVANTES_REFRESH_MS, force })) {
        return;
      }

      try {
        const tokenData = await AsyncStorage.getItem('token');
        const token = tokenData ? JSON.parse(tokenData).token : null;

        if (!token) {
          throw new Error('Token nao encontrado. Faca login novamente.');
        }

        const url = `${API_URL}/entregas/comprovantes?data_inicio=${hoje}&data_fim=${hoje}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ${response.status}: ${errorText || 'Erro ao carregar comprovantes'}`);
        }

        const data = await response.json();
        const comprovantesArray = data.comprovantes || data;
        comprovantesServidor = Array.isArray(comprovantesArray) ? comprovantesArray : [];
        await cacheService.set(cacheKey, comprovantesServidor);
      } catch (err: any) {
        fetchError = err;
        comprovantesServidor = cachedEntry?.data || [];
      }

      setComprovantes([...comprovantesPendentes, ...comprovantesServidor]);

      if (fetchError && comprovantesPendentes.length === 0 && comprovantesServidor.length === 0) {
        Alert.alert('Erro', fetchError.message || 'Nao foi possivel carregar os comprovantes');
      }
    } finally {
      setLoading(false);
    }
  };

  const carregarFotoComprovante = async (comprovante: Comprovante) => {
    const comprovanteId = comprovante.id;
    if (fotoUrls[comprovanteId] || fotoErros[comprovanteId]) {
      return;
    }

    if (comprovante.foto_local_uri) {
      setFotoUrls((current) => ({ ...current, [comprovanteId]: comprovante.foto_local_uri! }));
      return;
    }

    if (comprovanteId < 0) {
      setFotoErros((current) => ({ ...current, [comprovanteId]: 'Foto aguardando envio' }));
      return;
    }

    try {
      const foto = await obterFotoComprovante(comprovanteId);
      setFotoUrls((current) => ({ ...current, [comprovanteId]: foto.url }));
    } catch {
      setFotoErros((current) => ({ ...current, [comprovanteId]: 'Foto nao encontrada ou expirada' }));
    }
  };

  const toggleExpand = (comprovante: Comprovante) => {
    const next = expandedId === comprovante.id ? null : comprovante.id;
    setExpandedId(next);
    if (next !== null) {
      carregarFotoComprovante(comprovante);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando comprovantes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      
      <FlatList
        data={comprovantes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.numero}>
                    Comprovante #{item.numero_comprovante}
                  </Text>
                  <Text variant="bodyMedium" style={styles.escola}>
                    {item.escola_nome}
                  </Text>
                  <Text variant="bodySmall" style={styles.data}>
                    📅 {formatarDataBR(item.data_entrega)}
                  </Text>
                  {item.offline_status && (
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.offlineStatus,
                        item.offline_status === 'failed_needs_action' && styles.offlineStatusError,
                      ]}
                    >
                      {getOfflineComprovanteStatus(item.offline_status)}
                      {item.offline_error ? ` ${item.offline_error}` : ''}
                    </Text>
                  )}
                </View>
                <IconButton
                  icon={expandedId === item.id ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  onPress={() => toggleExpand(item)}
                />
              </View>

              {expandedId === item.id && (
                <View style={styles.detalhes}>
                  <Divider style={styles.divider} />
                  
                  <View style={styles.section}>
                    <Text variant="labelMedium" style={styles.sectionTitle}>
                      Itens Entregues ({item.total_itens})
                    </Text>
                    {item.itens.map((itemEntrega, index) => (
                      <View key={index} style={styles.item}>
                        <Text style={styles.itemNome}>{itemEntrega.produto_nome}</Text>
                        <Text style={styles.itemQuantidade}>
                          {itemEntrega.quantidade_entregue} {itemEntrega.unidade}
                        </Text>
                        {itemEntrega.lote && (
                          <Text style={styles.itemLote}>Lote: {itemEntrega.lote}</Text>
                        )}
                      </View>
                    ))}
                  </View>

                  <View style={styles.section}>
                    <Text variant="labelMedium" style={styles.sectionTitle}>
                      Responsáveis
                    </Text>
                    <Text style={styles.responsavel}>
                      👤 Entregador: {item.nome_quem_entregou}
                    </Text>
                    <Text style={styles.responsavel}>
                      ✍️ Recebedor: {item.nome_quem_recebeu}
                    </Text>
                  </View>

                  {item.observacao && (
                    <View style={styles.section}>
                      <Text variant="labelMedium" style={styles.sectionTitle}>
                        Observações
                      </Text>
                      <Text style={styles.observacao}>{item.observacao}</Text>
                    </View>
                  )}

                  <View style={styles.section}>
                    <Text variant="labelMedium" style={styles.sectionTitle}>
                      Foto da mercadoria
                    </Text>
                    {fotoUrls[item.id] ? (
                      <Image
                        source={{ uri: fotoUrls[item.id] }}
                        style={styles.fotoMercadoria}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.observacao}>
                        {fotoErros[item.id] || 'Carregando foto...'}
                      </Text>
                    )}
                  </View>

                  {item.assinatura_base64 && (
                    <View style={styles.section}>
                      <Text variant="labelMedium" style={styles.sectionTitle}>
                        Assinatura
                      </Text>
                      <View style={styles.assinaturaContainer}>
                        <Image
                          source={{ uri: item.assinatura_base64 }}
                          style={styles.assinatura}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineMedium">📋</Text>
            <Text variant="titleMedium" style={styles.emptyText}>
              Nenhum comprovante de hoje
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Os comprovantes aparecem aqui após finalizar entregas
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
  },
  list: {
    padding: 12,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numero: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  escola: {
    fontWeight: '600',
    marginBottom: 4,
  },
  data: {
    color: '#666',
  },
  offlineStatus: {
    color: '#92400e',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  offlineStatusError: {
    color: '#991b1b',
    backgroundColor: '#fee2e2',
  },
  detalhes: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  item: {
    paddingVertical: 6,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1976d2',
    marginBottom: 8,
  },
  itemNome: {
    fontWeight: '600',
    marginBottom: 2,
  },
  itemQuantidade: {
    color: '#059669',
    fontWeight: 'bold',
  },
  itemLote: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  responsavel: {
    marginBottom: 4,
    color: '#333',
  },
  observacao: {
    color: '#666',
    fontStyle: 'italic',
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  assinaturaContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 8,
    alignItems: 'center',
  },
  assinatura: {
    width: 200,
    height: 100,
  },
  fotoMercadoria: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: 4,
    color: '#999',
  },
});
