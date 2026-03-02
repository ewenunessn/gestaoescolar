import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listarRotas, listarEscolasDaRota, listarItensEscola, Rota } from '../api/rotas';
import { handleAxiosError } from '../api/client';
import { cacheService } from '../services/cacheService';
import OfflineIndicator from '../components/OfflineIndicator';

interface RotaComEscolas extends Rota {
  escolas_com_pendentes?: number;
}

export default function RotasScreen({ navigation }: any) {
  const [rotas, setRotas] = useState<RotaComEscolas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<any>(null);

  useEffect(() => {
    carregarRotas();
    carregarFiltro();
  }, []);

  const carregarRotas = async () => {
    try {
      setLoading(true);
      setError(''); // Limpar erro anterior
      
      let data: Rota[];
      
      try {
        data = await listarRotas();
        await cacheService.set('rotas', data);
      } catch (err) {
        const cachedData = await cacheService.get<Rota[]>('rotas');
        if (cachedData) {
          console.log('Usando rotas do cache (offline)');
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
      
      // Para cada rota, contar escolas com pendentes
      const rotasComContagem = await Promise.all(
        data.map(async (rota) => {
          try {
            const escolas = await listarEscolasDaRota(rota.id);
            
            // Contar escolas com itens pendentes
            let escolasComPendentes = 0;
            
            for (const escola of escolas) {
              try {
                const itens = await listarItensEscola(escola.escola_id);
                
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
                
                // Verificar se tem itens pendentes
                const temPendentes = itensFiltrados.some(
                  item => !item.entrega_confirmada || (item.saldo_pendente && item.saldo_pendente > 0)
                );
                
                if (temPendentes) {
                  escolasComPendentes++;
                }
              } catch (err) {
                console.error(`Erro ao carregar itens da escola ${escola.escola_id}:`, err);
              }
            }
            
            return {
              ...rota,
              escolas_com_pendentes: escolasComPendentes
            };
          } catch (err) {
            console.error(`Erro ao carregar escolas da rota ${rota.id}:`, err);
            return {
              ...rota,
              escolas_com_pendentes: 0
            };
          }
        })
      );
      
      setRotas(rotasComContagem);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  };

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

  const rotasFiltradas = filtroAtivo 
    ? rotas.filter(r => r.id === filtroAtivo.rotaId)
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
        <Button mode="contained" onPress={carregarRotas} style={styles.retryButton}>
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
            <Text variant="titleMedium">Rota: {filtroAtivo.rotaNome}</Text>
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
