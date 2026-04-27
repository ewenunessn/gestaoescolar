import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listarRotas, listarEscolasDaRota, listarItensEscola, obterOfflineBundle, Rota, EscolaRota } from '../api/rotas';
import { handleAxiosError } from '../api/client';
import { cacheService } from '../services/cacheService';
import OfflineIndicator from '../components/OfflineIndicator';
import { useOffline } from '../contexts/OfflineContext';
import { loadDeliveryOutboxOperations } from '../services/deliveryOutbox';
import { mergeItemsWithOutbox } from '../services/deliveryOutboxCore';
import { hasPendingItemsFromProjection } from '../services/deliveryProjectionCore';
import { getSchoolProjectionEntry, saveSchoolItemsSnapshot } from '../services/deliveryProjectionStore';
import { getRouteProjectionEntry, saveRouteProjectionSnapshot } from '../services/deliveryRouteProjectionStore';
import { applyDeliveryOfflineBundle } from '../services/deliveryOfflineBundle';
import {
  ROUTE_SCHOOLS_REFRESH_MS,
  ROUTES_REFRESH_MS,
  SCHOOL_ITEMS_REFRESH_MS,
  shouldRefreshCache,
} from '../services/deliverySyncPolicy';

interface RotaComEscolas extends Rota {
  escolas_com_pendentes?: number;
}

export default function RotasScreen({ navigation }: any) {
  const [rotas, setRotas] = useState<RotaComEscolas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<any>(null);
  const { syncVersion } = useOffline();

  useEffect(() => {
    carregarFiltro();
    carregarRotas();
  }, []);

  useEffect(() => {
    if (syncVersion > 0) {
      recalcularRotasDoCache();
    }
  }, [syncVersion]);

  const carregarRotas = async (force = false) => {
    let hadCache = false;
    try {
      setLoading(rotas.length === 0);
      setError(''); // Limpar erro anterior

      const filtro = await carregarFiltro();
      const cachedEntry = await cacheService.getEntry<Rota[]>('rotas');
      hadCache = !!cachedEntry;
      if (cachedEntry) {
        setRotas(await montarRotasComContagem(cachedEntry.data, filtro, false));
        setLoading(false);
      }

      if (!shouldRefreshCache({ timestamp: cachedEntry?.timestamp, maxAgeMs: ROUTES_REFRESH_MS, force })) {
        return;
      }

      try {
        const bundle = await obterOfflineBundle();
        await applyDeliveryOfflineBundle(bundle);
        setRotas(await montarRotasComContagem(bundle.rotas, filtro, false));
      } catch (bundleError) {
        console.error('Erro ao carregar bundle offline de rotas:', bundleError);
        const data = await listarRotas();
        await cacheService.set('rotas', data);
        setRotas(await montarRotasComContagem(data, filtro, !hadCache || force));
      }
    } catch (err) {
      if (!hadCache) {
        setError(handleAxiosError(err));
      }
    } finally {
      setLoading(false);
    }
  };

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

  const recalcularRotasDoCache = async () => {
    const filtro = await carregarFiltro();
    const cachedEntry = await cacheService.getEntry<Rota[]>('rotas');
    if (cachedEntry) {
      setRotas(await montarRotasComContagem(cachedEntry.data, filtro, false));
    }
  };

  const montarRotasComContagem = async (
    rotasBase: Rota[],
    filtro: any,
    refreshMissingOrStale: boolean,
  ): Promise<RotaComEscolas[]> => {
    const outboxOperations = await loadDeliveryOutboxOperations();

    return Promise.all(
      rotasBase.map(async (rota) => {
        const cacheKeyEscolas = `escolas_rota_${rota.id}`;
        let escolasEntry = await cacheService.getEntry<EscolaRota[]>(cacheKeyEscolas);

        if (
          refreshMissingOrStale &&
          shouldRefreshCache({
            timestamp: escolasEntry?.timestamp,
            maxAgeMs: ROUTE_SCHOOLS_REFRESH_MS,
          })
        ) {
          try {
            const escolasAtualizadas = await listarEscolasDaRota(rota.id);
            await cacheService.set(cacheKeyEscolas, escolasAtualizadas);
            escolasEntry = { data: escolasAtualizadas, timestamp: Date.now() };
          } catch (err) {
            console.error(`Erro ao atualizar escolas da rota ${rota.id}:`, err);
          }
        }

        const escolas = escolasEntry?.data || [];
        let routeProjectionEntry = await getRouteProjectionEntry(rota.id);

        if (!routeProjectionEntry || refreshMissingOrStale) {
          const projectionsBySchool = new Map();

          for (const escola of escolas) {
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

          const routeProjections = await saveRouteProjectionSnapshot(rota.id, escolas, projectionsBySchool);
          routeProjectionEntry = { data: routeProjections, timestamp: Date.now() };
        }

        const escolasComPendentes = routeProjectionEntry.data.filter((entry) =>
          hasPendingItemsFromProjection(entry.projections, filtro),
        ).length;

        return {
          ...rota,
          escolas_com_pendentes: escolasComPendentes,
        };
      }),
    );
  };

  const rotasFiltradas = filtroAtivo 
    ? rotas.filter(r => {
        // Suportar tanto rotaId (antigo) quanto rotaIds (novo)
        if (filtroAtivo.escopoRotas === 'todas' || filtroAtivo.rotaIds === 'todas') {
          return true;
        }
        if (filtroAtivo.rotaIds && Array.isArray(filtroAtivo.rotaIds)) {
          if (filtroAtivo.rotaIds.length === 0) return true;
          return filtroAtivo.rotaIds.includes(r.id);
        }
        // Fallback para formato antigo
        return r.id === filtroAtivo.rotaId;
      })
    : rotas;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando rotas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button mode="contained" onPress={() => carregarRotas(true)} style={styles.retryButton}>
          Tentar Novamente
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      
      {filtroAtivo && (
        <Card style={styles.filtroCard}>
          <Card.Content>
            <Text variant="titleMedium">
              {filtroAtivo.escopoRotas === 'todas' || filtroAtivo.rotaIds === 'todas'
                ? 'Todas as Rotas'
                : filtroAtivo.rotaNomes && filtroAtivo.rotaNomes.length > 1
                ? `Rotas: ${filtroAtivo.rotaNomes.join(', ')}`
                : `Rota: ${filtroAtivo.rotaNome || filtroAtivo.rotaNomes?.[0] || 'N/A'}`
              }
            </Text>
            <Text variant="bodySmall" style={styles.periodo}>
              Período: {new Date(filtroAtivo.dataInicio).toLocaleDateString('pt-BR')} a{' '}
              {new Date(filtroAtivo.dataFim).toLocaleDateString('pt-BR')}
            </Text>
          </Card.Content>
        </Card>
      )}

      <FlatList
        data={rotasFiltradas}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('RotaDetalhe', { rotaId: item.id, rotaNome: item.nome })}
            android_ripple={{ color: 'transparent' }}
            style={({ pressed }) => [
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Card style={[styles.card, { borderLeftColor: item.cor || '#1976d2', borderLeftWidth: 4 }]}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.rotaNome}>
                  {item.nome}
                </Text>
                {item.descricao && (
                  <Text variant="bodyMedium" style={styles.descricao}>
                    {item.descricao}
                  </Text>
                )}
                <View style={styles.meta}>
                  <Text style={[styles.badge, item.ativo ? styles.badgeAtivo : styles.badgeInativo]}>
                    {item.ativo ? '✓ Ativa' : '✕ Inativa'}
                  </Text>
                  <Text style={styles.escolas}>
                    🏫 {item.escolas_com_pendentes || 0}/{item.total_escolas || 0} Escola(s)
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineMedium">📍</Text>
            <Text variant="titleMedium">Nenhuma rota encontrada</Text>
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
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  filtroCard: {
    margin: 12,
    backgroundColor: '#fff',
  },
  periodo: {
    color: '#666',
    marginTop: 4,
  },
  list: {
    padding: 12,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  rotaNome: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  descricao: {
    color: '#666',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeAtivo: {
    backgroundColor: '#4caf50',
    color: '#fff',
  },
  badgeInativo: {
    backgroundColor: '#9e9e9e',
    color: '#fff',
  },
  escolas: {
    color: '#666',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
});
