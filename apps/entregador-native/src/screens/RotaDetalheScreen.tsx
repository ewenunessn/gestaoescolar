import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, Button, Searchbar, IconButton, Menu, Dialog, Portal, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listarEscolasDaRota, listarItensEscola, obterOfflineBundle, EscolaRota } from '../api/rotas';
import { handleAxiosError } from '../api/client';
import { cacheService } from '../services/cacheService';
import OfflineIndicator from '../components/OfflineIndicator';
import { useOffline } from '../contexts/OfflineContext';
import { loadDeliveryOutboxOperations } from '../services/deliveryOutbox';
import { mergeItemsWithOutbox } from '../services/deliveryOutboxCore';
import {
  countPendingItemsFromProjection,
  isSchoolFullyDeliveredOnDateFromProjection,
} from '../services/deliveryProjectionCore';
import {
  getSchoolProjectionEntry,
  saveSchoolItemsSnapshot,
} from '../services/deliveryProjectionStore';
import { getRouteProjection, getRouteProjectionEntry, saveRouteProjectionSnapshot } from '../services/deliveryRouteProjectionStore';
import {
  ROUTE_SCHOOLS_REFRESH_MS,
  SCHOOL_ITEMS_REFRESH_MS,
  shouldRefreshCache,
} from '../services/deliverySyncPolicy';
import { applyDeliveryOfflineBundle } from '../services/deliveryOfflineBundle';

interface EscolaComItens extends EscolaRota {
  total_itens_pendentes?: number;
}

export default function RotaDetalheScreen({ route, navigation }: any) {
  const { rotaId, rotaNome } = route.params;
  const [escolas, setEscolas] = useState<EscolaComItens[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Menu e dialog de escolas entregues
  const [menuVisible, setMenuVisible] = useState(false);
  const [dialogEntreguesVisible, setDialogEntreguesVisible] = useState(false);
  const [escolasEntregues, setEscolasEntregues] = useState<EscolaComItens[]>([]);
  const [loadingEntregues, setLoadingEntregues] = useState(false);
  const { syncVersion } = useOffline();

  useEffect(() => {
    carregarFiltro();
    carregarEscolas();
  }, []);

  useEffect(() => {
    // Adicionar botão de menu no header
    navigation.setOptions({
      headerRight: () => (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              iconColor="#fff"
              size={24}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('Comprovantes', { rotaId });
            }}
            title="Ver Comprovantes"
            leadingIcon="file-document"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              carregarEscolasEntregues();
            }}
            title="Escolas Entregues"
            leadingIcon="check-circle"
          />
        </Menu>
      ),
    });
  }, [navigation, menuVisible]);

  useEffect(() => {
    // Recarregar quando a tela ganhar foco (volta de outra tela)
    const unsubscribe = navigation.addListener('focus', () => {
      recalcularEscolasDoCache();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (syncVersion > 0) {
      recalcularEscolasDoCache();
    }
  }, [syncVersion]);

  const carregarFiltro = async () => {
    try {
      const filtro = await AsyncStorage.getItem('filtro_qrcode');
      if (filtro) {
        const parsed = JSON.parse(filtro);
        setFiltroAtivo(parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Erro ao carregar filtro:', err);
    }
    setFiltroAtivo(null);
    return null;
  };

  const carregarEscolas = async (force = false) => {
    let hadCache = false;
    try {
      setLoading(escolas.length === 0);
      setError('');

      const cacheKey = `escolas_rota_${rotaId}`;
      const filtro = await carregarFiltro();
      let cachedEntry = await cacheService.getEntry<EscolaRota[]>(cacheKey);
      hadCache = !!cachedEntry;

      if (cachedEntry) {
        setEscolas(await montarEscolasComContagem(cachedEntry.data, filtro, false));
        setLoading(false);
      }

      if (!shouldRefreshCache({ timestamp: cachedEntry?.timestamp, maxAgeMs: ROUTE_SCHOOLS_REFRESH_MS, force })) {
        return;
      }

      try {
        const bundle = await obterOfflineBundle({ rotaIds: [rotaId] });
        await applyDeliveryOfflineBundle(bundle);
        const data = bundle.escolasPorRota[String(rotaId)] || [];
        setEscolas(await montarEscolasComContagem(data, filtro, false));
      } catch (bundleError) {
        console.error(`Erro ao carregar bundle offline da rota ${rotaId}:`, bundleError);
        const data = await listarEscolasDaRota(rotaId);
        await cacheService.set(cacheKey, data);
        cachedEntry = { data, timestamp: Date.now() };
        setEscolas(await montarEscolasComContagem(data, filtro, !hadCache || force));
      }
    } catch (err) {
      if (!hadCache) {
        setError(handleAxiosError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const recalcularEscolasDoCache = async () => {
    const filtro = await carregarFiltro();
    const cachedEntry = await cacheService.getEntry<EscolaRota[]>(`escolas_rota_${rotaId}`);
    if (cachedEntry) {
      setEscolas(await montarEscolasComContagem(cachedEntry.data, filtro, false));
    }
  };

  const montarEscolasComContagem = async (
    escolasBase: EscolaRota[],
    filtro: any,
    refreshMissingOrStale: boolean,
  ): Promise<EscolaComItens[]> => {
    const outboxOperations = await loadDeliveryOutboxOperations();
    let routeProjectionEntry = await getRouteProjectionEntry(rotaId);

    if (!routeProjectionEntry || refreshMissingOrStale) {
      const projectionsBySchool = new Map();

      for (const escola of escolasBase) {
        let projectionEntry = await getSchoolProjectionEntry(escola.escola_id);

        if (
          refreshMissingOrStale &&
          shouldRefreshCache({
            timestamp: projectionEntry?.timestamp,
            maxAgeMs: SCHOOL_ITEMS_REFRESH_MS,
          })
        ) {
          try {
            const itensAtualizados = await listarItensEscola(escola.escola_id);
            const itensComOffline = mergeItemsWithOutbox(itensAtualizados, outboxOperations, {
              escolaId: escola.escola_id,
            });
            const projections = await saveSchoolItemsSnapshot(escola.escola_id, itensAtualizados, itensComOffline);
            projectionEntry = { data: projections, timestamp: Date.now() };
          } catch (err) {
            console.error(`Erro ao atualizar itens da escola ${escola.escola_id}:`, err);
          }
        }

        projectionsBySchool.set(escola.escola_id, projectionEntry?.data || []);
      }

      const routeProjections = await saveRouteProjectionSnapshot(rotaId, escolasBase, projectionsBySchool);
      routeProjectionEntry = { data: routeProjections, timestamp: Date.now() };
    }

    const projectionsBySchool = new Map(
      routeProjectionEntry.data.map((entry) => [entry.escola_id, entry.projections]),
    );
    const escolasComItens = escolasBase.map((escola) => ({
      ...escola,
      total_itens_pendentes: countPendingItemsFromProjection(
        projectionsBySchool.get(escola.escola_id) || [],
        filtro,
      ),
    }));

    return escolasComItens.filter((escola) => escola.total_itens_pendentes && escola.total_itens_pendentes > 0);
  };

  const carregarEscolasEntregues = async () => {
    try {
      setLoadingEntregues(true);
      setDialogEntreguesVisible(true);

      // Pegar a data do filtro (data de hoje se não houver filtro)
      const filtroSalvo = await AsyncStorage.getItem('filtro_qrcode');
      let dataReferencia = new Date();
      if (filtroSalvo) {
        const filtro = JSON.parse(filtroSalvo);
        dataReferencia = new Date(filtro.dataInicio);
      }
      dataReferencia.setHours(0, 0, 0, 0);

      // Usar as escolas já carregadas
      const escolasComEntregasCompletas: EscolaComItens[] = [];
      const routeProjection = await getRouteProjection(rotaId);
      const escolasDaRota = (await cacheService.get<EscolaRota[]>(`escolas_rota_${rotaId}`)) || escolas;
      const escolasById = new Map(escolasDaRota.map((escola) => [escola.escola_id, escola]));
      
      for (const routeSchool of routeProjection || []) {
        try {
          const escola = escolasById.get(routeSchool.escola_id);
          if (!escola) {
            continue;
          }

          const projection = routeSchool.projections;
          if (!projection || projection.length === 0) {
            continue;
          }
          
          // Verificar se TODOS os itens foram entregues HOJE (pela data do histórico)
          
              
              // Item não deve ter saldo pendente
              
              // Verificar se foi entregue hoje pelo histórico
                // Pegar a última entrega

          if (isSchoolFullyDeliveredOnDateFromProjection(projection, dataReferencia)) {
            escolasComEntregasCompletas.push({
              ...escola,
              total_itens_pendentes: projection.length
            });
          }
        } catch (err) {
          console.error(`Erro ao carregar itens da escola ${routeSchool.escola_id}:`, err);
        }
      }

      setEscolasEntregues(escolasComEntregasCompletas);
    } catch (err) {
      console.error('Erro ao carregar escolas entregues:', err);
    } finally {
      setLoadingEntregues(false);
    }
  };

  // Filtrar escolas pela busca
  const escolasFiltradas = escolas.filter(escola => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const nome = (escola.escola_nome || '').toLowerCase();
    const endereco = (escola.escola_endereco || '').toLowerCase();
    
    return nome.includes(query) || endereco.includes(query);
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando escolas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button mode="contained" onPress={() => carregarEscolas(true)}>
          Tentar Novamente
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      
      {/* Card único com rota e período */}
      <Card style={styles.header}>
        <Card.Content>
          <Text variant="titleMedium">Rota: {rotaNome}</Text>
          {filtroAtivo && (
            <Text variant="bodySmall" style={styles.periodo}>
              Período: {new Date(filtroAtivo.dataInicio).toLocaleDateString('pt-BR')} a{' '}
              {new Date(filtroAtivo.dataFim).toLocaleDateString('pt-BR')}
            </Text>
          )}
          <Text variant="bodySmall">
            {escolasFiltradas.length} de {escolas.length} escola(s) {searchQuery ? 'encontrada(s)' : 'com itens pendentes'}
          </Text>
        </Card.Content>
      </Card>

      {/* Campo de busca */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar escola por nome ou endereço"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          iconColor="#1976d2"
        />
      </View>

      <FlatList
        data={escolasFiltradas}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate('EscolaDetalhe', {
                escolaId: item.escola_id,
                escolaNome: item.escola_nome,
                rotaId,
              })
            }
            android_ripple={{ color: 'transparent' }}
            style={({ pressed }) => [
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text style={styles.ordem}>#{item.ordem}</Text>
                  <View style={styles.cardContent}>
                    <Text variant="titleMedium" style={styles.nome}>
                      {item.escola_nome || `Escola ${item.escola_id}`}
                    </Text>
                    {item.escola_endereco && (
                      <Text variant="bodySmall" style={styles.endereco}>
                        📍 {item.escola_endereco}
                      </Text>
                    )}
                    {item.total_itens_pendentes !== undefined && (
                      <Text variant="bodySmall" style={styles.pendentes}>
                        📦 {item.total_itens_pendentes} {item.total_itens_pendentes === 1 ? 'item pendente' : 'itens pendentes'}
                      </Text>
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineMedium">{searchQuery ? '🔍' : '✓'}</Text>
            <Text variant="titleMedium" style={styles.emptyText}>
              {searchQuery 
                ? 'Nenhuma escola encontrada com esse nome'
                : filtroAtivo 
                  ? 'Nenhuma escola com itens pendentes no período filtrado'
                  : 'Nenhuma escola com itens pendentes'}
            </Text>
            {searchQuery && (
              <Button 
                mode="outlined" 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                Limpar Busca
              </Button>
            )}
          </View>
        }
      />

      {/* Dialog de Escolas Entregues */}
      <Portal>
        <Dialog visible={dialogEntreguesVisible} onDismiss={() => setDialogEntreguesVisible(false)}>
          <Dialog.Title>✓ Escolas Entregues</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ maxHeight: 400 }}>
              {loadingEntregues ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="large" />
                  <Text style={{ marginTop: 12 }}>Carregando...</Text>
                </View>
              ) : escolasEntregues.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ color: '#666', textAlign: 'center' }}>
                    Nenhuma escola com entregas concluídas
                  </Text>
                </View>
              ) : (
                escolasEntregues.map((escola, index) => (
                  <View key={escola.id}>
                    <Pressable
                      onPress={() => {
                        setDialogEntreguesVisible(false);
                        navigation.navigate('EscolaDetalhe', {
                          escolaId: escola.escola_id,
                          escolaNome: escola.escola_nome,
                          rotaId,
                        });
                      }}
                      android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                    >
                      <View style={{ padding: 12 }}>
                        <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                          {escola.escola_nome || `Escola ${escola.escola_id}`}
                        </Text>
                        {escola.escola_endereco && (
                          <Text variant="bodySmall" style={{ color: '#666', marginBottom: 4 }}>
                            📍 {escola.escola_endereco}
                          </Text>
                        )}
                        <Text variant="bodySmall" style={{ color: '#059669', fontWeight: '600' }}>
                          ✓ {escola.total_itens_pendentes} {escola.total_itens_pendentes === 1 ? 'item entregue' : 'itens entregues'}
                        </Text>
                      </View>
                    </Pressable>
                    {index < escolasEntregues.length - 1 && <Divider />}
                  </View>
                ))
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogEntreguesVisible(false)}>Fechar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  header: {
    margin: 12,
    marginBottom: 0,
  },
  periodo: {
    color: '#1565c0',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  searchbar: {
    elevation: 2,
  },
  list: {
    padding: 12,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ordem: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  cardContent: {
    flex: 1,
  },
  nome: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  endereco: {
    color: '#666',
    marginBottom: 4,
  },
  pendentes: {
    color: '#f57c00',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
  },
  clearButton: {
    marginTop: 16,
  },
});
