import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listarEscolasDaRota, listarItensEscola, EscolaRota } from '../api/rotas';
import { handleAxiosError } from '../api/client';
import { cacheService } from '../services/cacheService';
import OfflineIndicator from '../components/OfflineIndicator';

interface EscolaComItens extends EscolaRota {
  total_itens_pendentes?: number;
}

export default function RotaDetalheScreen({ route, navigation }: any) {
  const { rotaId, rotaNome } = route.params;
  const [escolas, setEscolas] = useState<EscolaComItens[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<any>(null);

  useEffect(() => {
    carregarFiltro();
    carregarEscolas();
    
    // Recarregar quando a tela ganhar foco (volta de outra tela)
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('RotaDetalheScreen ganhou foco, recarregando...');
      carregarEscolas();
    });

    return unsubscribe;
  }, [navigation]);

  const carregarFiltro = async () => {
    try {
      const filtro = await AsyncStorage.getItem('filtro_qrcode');
      if (filtro) {
        setFiltroAtivo(JSON.parse(filtro));
      }
    } catch (err) {
      console.error('Erro ao carregar filtro:', err);
    }
  };

  const carregarEscolas = async () => {
    try {
      setLoading(true);
      setError(''); // Limpar erro anterior
      
      const cacheKey = `escolas_rota_${rotaId}`;
      
      let data: EscolaRota[];
      
      try {
        // Tentar buscar dados atualizados
        data = await listarEscolasDaRota(rotaId);
        // Salvar no cache
        await cacheService.set(cacheKey, data);
      } catch (err) {
        // Se falhar, tentar usar cache
        const cachedData = await cacheService.get<EscolaRota[]>(cacheKey);
        if (cachedData) {
          console.log('Usando dados do cache (offline)');
          data = cachedData;
        } else {
          throw err;
        }
      }
      
      // Carregar filtro
      const filtroSalvo = await AsyncStorage.getItem('filtro_qrcode');
      let filtro = null;
      if (filtroSalvo) {
        filtro = JSON.parse(filtroSalvo);
      }
      
      // Carregar itens de cada escola e contar pendentes
      const escolasComItens = await Promise.all(
        data.map(async (escola) => {
          try {
            const cacheKeyItens = `itens_escola_${escola.escola_id}`;
            let itens;
            
            try {
              itens = await listarItensEscola(escola.escola_id);
              await cacheService.set(cacheKeyItens, itens);
            } catch (err) {
              const cachedItens = await cacheService.get(cacheKeyItens);
              if (cachedItens) {
                itens = cachedItens;
              } else {
                throw err;
              }
            }
            
            // Aplicar filtro de data se houver
            let itensFiltrados = itens;
            if (filtro) {
              const dataInicio = new Date(filtro.dataInicio);
              dataInicio.setHours(0, 0, 0, 0);
              const dataFim = new Date(filtro.dataFim);
              dataFim.setHours(23, 59, 59, 999);
              
              itensFiltrados = itens.filter(item => {
                if (item.data_entrega) {
                  const dataEntrega = new Date(item.data_entrega);
                  return dataEntrega >= dataInicio && dataEntrega <= dataFim;
                }
                return true;
              });
            }
            
            // Contar itens pendentes
            const itensPendentes = itensFiltrados.filter(
              item => !item.entrega_confirmada || (item.saldo_pendente && item.saldo_pendente > 0)
            );
            
            return {
              ...escola,
              total_itens_pendentes: itensPendentes.length
            };
          } catch (err) {
            console.error(`Erro ao carregar itens da escola ${escola.escola_id}:`, err);
            return {
              ...escola,
              total_itens_pendentes: 0
            };
          }
        })
      );
      
      // Filtrar apenas escolas com itens pendentes
      const escolasComPendentes = escolasComItens.filter(e => e.total_itens_pendentes && e.total_itens_pendentes > 0);
      
      setEscolas(escolasComPendentes);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  };

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
        <Button mode="contained" onPress={carregarEscolas}>
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
            {escolas.length} escola(s) com itens pendentes
          </Text>
        </Card.Content>
      </Card>

      <FlatList
        data={escolas}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('EscolaDetalhe', {
                escolaId: item.escola_id,
                escolaNome: item.escola_nome,
                rotaId,
              })
            }
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
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineMedium">✓</Text>
            <Text variant="titleMedium">
              {filtroAtivo 
                ? 'Nenhuma escola com itens pendentes no período filtrado'
                : 'Nenhuma escola com itens pendentes'}
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
});
