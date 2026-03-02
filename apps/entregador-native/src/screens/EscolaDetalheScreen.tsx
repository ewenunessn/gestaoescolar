import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, Button, Checkbox, TextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listarItensEscola, ItemEntrega } from '../api/rotas';
import { handleAxiosError } from '../api/client';

interface ItemSelecionado extends ItemEntrega {
  selecionado: boolean;
  quantidade_a_entregar: number;
}

export default function EscolaDetalheScreen({ route, navigation }: any) {
  const { escolaId, escolaNome } = route.params;
  const [itens, setItens] = useState<ItemSelecionado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'entregues'>('pendentes');
  const [filtroAtivo, setFiltroAtivo] = useState<any>(null);

  useEffect(() => {
    carregarFiltro();
    carregarItens();
  }, []);

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

  const carregarItens = async () => {
    try {
      setLoading(true);
      const data = await listarItensEscola(escolaId);
      
      // Aplicar filtro de data se houver
      const filtroSalvo = await AsyncStorage.getItem('filtro_qrcode');
      let dadosFiltrados = data;
      
      if (filtroSalvo) {
        const filtro = JSON.parse(filtroSalvo);
        const dataInicio = new Date(filtro.dataInicio);
        dataInicio.setHours(0, 0, 0, 0);
        const dataFim = new Date(filtro.dataFim);
        dataFim.setHours(23, 59, 59, 999);
        
        console.log('🔍 Aplicando filtro de data:', { dataInicio, dataFim });
        
        dadosFiltrados = data.filter(item => {
          // Filtrar pela data_entrega se disponível
          if (item.data_entrega) {
            const dataEntrega = new Date(item.data_entrega);
            const dentroDoIntervalo = dataEntrega >= dataInicio && dataEntrega <= dataFim;
            console.log(`Item ${item.produto_nome}: data_entrega=${item.data_entrega}, dentro=${dentroDoIntervalo}`);
            return dentroDoIntervalo;
          }
          // Se não tiver data_entrega, incluir por padrão
          return true;
        });
        
        console.log(`📊 Filtro aplicado: ${data.length} itens → ${dadosFiltrados.length} itens`);
      }
      
      setItens(dadosFiltrados.map(item => ({
        ...item,
        selecionado: false,
        quantidade_a_entregar: item.saldo_pendente !== undefined && item.saldo_pendente > 0 
          ? parseFloat(String(item.saldo_pendente)) 
          : parseFloat(String(item.quantidade))
      })));
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: number) => {
    const item = itens.find(i => i.id === itemId);
    if (item?.entrega_confirmada) {
      return;
    }
    
    setItens(prev => prev.map(item =>
      item.id === itemId ? { ...item, selecionado: !item.selecionado } : item
    ));
  };

  const atualizarQuantidade = (itemId: number, valor: string) => {
    const quantidade = parseFloat(valor) || 0;
    setItens(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantidade_a_entregar: quantidade } : item
    ));
  };

  const itensFiltrados = itens.filter((item) => {
    if (abaAtiva === 'pendentes') {
      return !item.entrega_confirmada || (item.saldo_pendente && item.saldo_pendente > 0);
    } else {
      return item.historico_entregas && item.historico_entregas.length > 0;
    }
  });

  const itensSelecionados = itens.filter(i => i.selecionado);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando itens...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button mode="contained" onPress={carregarItens}>
          Tentar Novamente
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Indicador de filtro ativo */}
      {filtroAtivo && (
        <Card style={styles.filtroCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.filtroTitle}>
              🔍 Filtro de Período Ativo
            </Text>
            <Text variant="bodyMedium">
              Mostrando apenas itens programados para:{'\n'}
              {new Date(filtroAtivo.dataInicio).toLocaleDateString('pt-BR')} até{' '}
              {new Date(filtroAtivo.dataFim).toLocaleDateString('pt-BR')}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Abas */}
      <View style={styles.tabs}>
        <Button
          mode={abaAtiva === 'pendentes' ? 'contained' : 'outlined'}
          onPress={() => setAbaAtiva('pendentes')}
          style={styles.tab}
        >
          📦 Pendentes ({itens.filter((i) => !i.entrega_confirmada).length})
        </Button>
        <Button
          mode={abaAtiva === 'entregues' ? 'contained' : 'outlined'}
          onPress={() => setAbaAtiva('entregues')}
          style={styles.tab}
          buttonColor="#4caf50"
        >
          ✓ Entregues ({itens.filter((i) => i.historico_entregas?.length).length})
        </Button>
      </View>

      <FlatList
        data={itensFiltrados}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              {/* Checkbox e Produto */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                {abaAtiva === 'pendentes' && !item.entrega_confirmada && (
                  <Checkbox
                    status={item.selecionado ? 'checked' : 'unchecked'}
                    onPress={() => toggleItem(item.id)}
                  />
                )}
                
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.produto}>
                    {item.produto_nome}
                  </Text>

                  {item.quantidade_ja_entregue && item.quantidade_ja_entregue > 0 ? (
                    <View>
                      <Text style={styles.faltam}>
                        📦 Faltam: {item.saldo_pendente} {item.unidade}
                      </Text>
                      <Text style={styles.info}>
                        Programado: {item.quantidade} {item.unidade} • Já entregue:{' '}
                        {item.quantidade_ja_entregue} {item.unidade}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.quantidade}>
                      📦 Quantidade: {item.quantidade} {item.unidade}
                    </Text>
                  )}

                  {item.lote && (
                    <Text style={styles.lote}>🏷️ Lote: {item.lote}</Text>
                  )}

                  {item.observacao && (
                    <Text style={styles.observacao}>💬 {item.observacao}</Text>
                  )}

                  {/* Campo de quantidade quando selecionado */}
                  {abaAtiva === 'pendentes' && item.selecionado && (
                    <View style={styles.quantidadeInput}>
                      <Text variant="labelMedium" style={styles.quantidadeLabel}>
                        Quantidade a entregar *
                      </Text>
                      <Text style={styles.quantidadeHint}>
                        Você pode entregar uma quantidade diferente da programada
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <TextInput
                          mode="outlined"
                          keyboardType="numeric"
                          value={String(item.quantidade_a_entregar)}
                          onChangeText={(text) => atualizarQuantidade(item.id, text)}
                          style={{ flex: 1 }}
                        />
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                          {item.unidade}
                        </Text>
                      </View>
                    </View>
                  )}

                  {abaAtiva === 'entregues' && item.historico_entregas && (
                    <View style={styles.historico}>
                      <Text variant="labelMedium" style={styles.historicoTitle}>
                        Histórico:
                      </Text>
                      {item.historico_entregas.map((h, index) => (
                        <View key={h.id} style={styles.historicoItem}>
                          <Text style={styles.historicoQuantidade}>
                            {h.quantidade_entregue} {item.unidade}
                          </Text>
                          <Text style={styles.historicoData}>
                            {new Date(h.data_entrega).toLocaleDateString('pt-BR')}
                          </Text>
                          <Text style={styles.historicoRecebedor}>
                            Recebido por: {h.nome_quem_recebeu}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineMedium">
              {abaAtiva === 'pendentes' ? '📦' : '✓'}
            </Text>
            <Text variant="titleMedium">
              {abaAtiva === 'pendentes'
                ? 'Nenhum item pendente'
                : 'Nenhum item entregue ainda'}
            </Text>
          </View>
        }
      />

      {abaAtiva === 'pendentes' && itensSelecionados.length > 0 && (
        <Button
          mode="contained"
          onPress={() => {
            // TODO: Navegar para tela de confirmação
            alert('Funcionalidade em desenvolvimento');
          }}
          style={styles.confirmarButton}
        >
          Continuar ({itensSelecionados.length} {itensSelecionados.length === 1 ? 'item' : 'itens'})
        </Button>
      )}
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
  filtroCard: {
    margin: 12,
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#1976d2',
  },
  filtroTitle: {
    color: '#1565c0',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
  },
  list: {
    padding: 12,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  produto: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quantidade: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  faltam: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  info: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  lote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  observacao: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  historico: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  historicoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#047857',
  },
  historicoItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  historicoQuantidade: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  historicoData: {
    fontSize: 12,
    color: '#666',
  },
  historicoRecebedor: {
    fontSize: 12,
    color: '#666',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  confirmarButton: {
    margin: 16,
    paddingVertical: 8,
  },
  quantidadeInput: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  quantidadeLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1e40af',
  },
  quantidadeHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
});
