import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, Button, Searchbar, IconButton, Menu, Dialog, Portal, Divider } from 'react-native-paper';
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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Menu e dialog de escolas entregues
  const [menuVisible, setMenuVisible] = useState(false);
  const [dialogEntreguesVisible, setDialogEntreguesVisible] = useState(false);
  const [escolasEntregues, setEscolasEntregues] = useState<EscolaComItens[]>([]);
  const [loadingEntregues, setLoadingEntregues] = useState(false);

  useEffect(() => {
    carregarFiltro();
    carregarEscolas();
    
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
    
    // Recarregar quando a tela ganhar foco (volta de outra tela)
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('RotaDetalheScreen ganhou foco, recarregando...');
      carregarEscolas();
    });

    return unsubscribe;
  }, [navigation, menuVisible]);

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
      
      for (const escola of escolas) {
        try {
          const itensEscola = await listarItensEscola(escola.escola_id);
          
          // Verificar se TODOS os itens foram entregues HOJE (pela data do histórico)
          let todosEntreguesHoje = false;
          
          if (itensEscola.length > 0) {
            todosEntreguesHoje = itensEscola.every(item => {
              // Item deve estar confirmado
              if (!item.entrega_confirmada) return false;
              
              // Item não deve ter saldo pendente
              if (item.saldo_pendente && item.saldo_pendente > 0) return false;
              
              // Verificar se foi entregue hoje pelo histórico
              if (item.historico_entregas && item.historico_entregas.length > 0) {
                // Pegar a última entrega
                const ultimaEntrega = item.historico_entregas[item.historico_entregas.length - 1];
                const dataEntregaReal = new Date(ultimaEntrega.data_entrega);
                dataEntregaReal.setHours(0, 0, 0, 0);
                
                return dataEntregaReal.getTime() === dataReferencia.getTime();
              }
              
              return false;
            });
          }

          if (todosEntreguesHoje) {
            escolasComEntregasCompletas.push({
              ...escola,
              total_itens_pendentes: itensEscola.length
            });
          }
        } catch (err) {
          console.error(`Erro ao carregar itens da escola ${escola.escola_id}:`, err);
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
