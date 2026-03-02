import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Alert } from 'react-native';
import { Text, Card, ActivityIndicator, Button, Checkbox, TextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listarItensEscola, ItemEntrega, confirmarEntregaItem } from '../api/rotas';
import { handleAxiosError } from '../api/client';
import SignaturePad from '../components/SignaturePad';

interface ItemSelecionado extends ItemEntrega {
  selecionado: boolean;
  quantidade_a_entregar: number;
}

type Etapa = 'selecao' | 'revisao' | 'sucesso';

export default function EscolaDetalheScreen({ route, navigation }: any) {
  const { escolaId, escolaNome } = route.params;
  const [itens, setItens] = useState<ItemSelecionado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'entregues'>('pendentes');
  const [filtroAtivo, setFiltroAtivo] = useState<any>(null);
  const [etapa, setEtapa] = useState<Etapa>('selecao');
  
  // Dados da revisão
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [nomeEntregador, setNomeEntregador] = useState('');
  const [observacao, setObservacao] = useState('');
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarFiltro();
    carregarItens();
    carregarNomeEntregador();
  }, []);

  const carregarNomeEntregador = async () => {
    try {
      const stored = await AsyncStorage.getItem('token');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNomeEntregador(parsed.nome || '');
      }
    } catch (e) {
      console.warn('Erro ao obter nome do usuário:', e);
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

  const continuar = () => {
    const selecionados = itens.filter(i => i.selecionado);
    
    if (selecionados.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um item para entrega');
      return;
    }

    // Validar quantidades
    const invalidos = selecionados.filter(i => i.quantidade_a_entregar <= 0);
    if (invalidos.length > 0) {
      Alert.alert('Atenção', 'Todas as quantidades devem ser maiores que zero');
      return;
    }

    // Avisar sobre quantidades diferentes (com tolerância de 0.01)
    const diferentes = selecionados.filter(i => {
      const diff = Math.abs(i.quantidade_a_entregar - i.quantidade);
      return diff > 0.01; // Tolerância para evitar problemas de precisão de ponto flutuante
    });
    
    if (diferentes.length > 0) {
      const nomes = diferentes.map(i => 
        `${i.produto_nome}: ${i.quantidade_a_entregar} ${i.unidade} (programado: ${i.quantidade} ${i.unidade})`
      ).join('\n');
      
      Alert.alert(
        '⚠️ Entrega Parcial/Diferente',
        `Os seguintes itens têm quantidade diferente da programada:\n\n${nomes}\n\nDeseja continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => setEtapa('revisao') }
        ]
      );
    } else {
      setEtapa('revisao');
    }
  };

  const finalizarEntrega = async () => {
    if (!nomeRecebedor.trim()) {
      Alert.alert('Atenção', 'Informe o nome de quem recebeu a entrega');
      return;
    }

    if (!nomeEntregador.trim()) {
      Alert.alert('Atenção', 'Informe o nome de quem entregou');
      return;
    }

    if (!assinatura) {
      Alert.alert('Atenção', 'É necessário coletar a assinatura do recebedor');
      return;
    }

    try {
      setSalvando(true);
      
      const selecionados = itens.filter(i => i.selecionado);
      
      for (const item of selecionados) {
        await confirmarEntregaItem(item.id, {
          quantidade_entregue: item.quantidade_a_entregar,
          nome_quem_entregou: nomeEntregador.trim(),
          nome_quem_recebeu: nomeRecebedor.trim(),
          observacao: observacao.trim() || undefined,
          assinatura_base64: assinatura
        });
      }

      setEtapa('sucesso');
      
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (err) {
      Alert.alert('Erro', `Erro ao finalizar entrega: ${handleAxiosError(err)}`);
      setSalvando(false);
    }
  };

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

  // Tela de sucesso
  if (etapa === 'sucesso') {
    return (
      <View style={styles.sucessoContainer}>
        <View style={styles.sucessoCard}>
          <View style={styles.sucessoIcon}>
            <Text style={styles.sucessoIconText}>✓</Text>
          </View>
          <Text variant="headlineSmall" style={styles.sucessoTitle}>
            Entrega Confirmada!
          </Text>
          <Text variant="bodyMedium" style={styles.sucessoText}>
            {itensSelecionados.length} {itensSelecionados.length === 1 ? 'item confirmado' : 'itens confirmados'} com sucesso
          </Text>
        </View>
      </View>
    );
  }

  // Tela de revisão
  if (etapa === 'revisao') {
    return (
      <ScrollView style={styles.container}>
        <Card style={styles.revisaoCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.revisaoTitle}>
              Resumo da Entrega
            </Text>

            <View style={styles.revisaoSection}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Itens Selecionados ({itensSelecionados.length})
              </Text>
              {itensSelecionados.map(item => {
                const diff = Math.abs(item.quantidade_a_entregar - item.quantidade);
                const quantidadeDiferente = diff > 0.01; // Tolerância para evitar problemas de precisão
                return (
                  <View key={item.id} style={styles.itemRevisao}>
                    <View style={styles.itemRevisaoHeader}>
                      <Text style={styles.itemRevisaoNome}>{item.produto_nome}</Text>
                      <Text style={[
                        styles.itemRevisaoQuantidade,
                        quantidadeDiferente && styles.itemRevisaoQuantidadeDiferente
                      ]}>
                        {item.quantidade_a_entregar} {item.unidade}
                      </Text>
                    </View>
                    {quantidadeDiferente && (
                      <Text style={styles.itemRevisaoAviso}>
                        ⚠️ Programado: {item.quantidade} {item.unidade}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            <TextInput
              label="Nome de Quem Entregou *"
              value={nomeEntregador}
              disabled
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Nome de Quem Recebeu *"
              value={nomeRecebedor}
              onChangeText={setNomeRecebedor}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Observações (opcional)"
              value={observacao}
              onChangeText={setObservacao}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.assinaturaSection}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Assinatura do Recebedor *
              </Text>
              {assinatura ? (
                <View>
                  <View style={styles.assinaturaPreview}>
                    <Text>Assinatura capturada ✓</Text>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={() => setAssinatura(null)}
                    style={styles.refazerButton}
                  >
                    ✏️ Refazer Assinatura
                  </Button>
                </View>
              ) : (
                <SignaturePad
                  onSave={(sig) => setAssinatura(sig)}
                  onClear={() => setAssinatura(null)}
                />
              )}
            </View>

            <View style={styles.botoesRevisao}>
              <Button
                mode="outlined"
                onPress={() => setEtapa('selecao')}
                disabled={salvando}
                style={styles.botaoVoltar}
              >
                Voltar
              </Button>
              <Button
                mode="contained"
                onPress={finalizarEntrega}
                disabled={salvando}
                loading={salvando}
                style={styles.botaoFinalizar}
              >
                {salvando ? 'Finalizando...' : 'Finalizar Entrega'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
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
          onPress={continuar}
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
  sucessoContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sucessoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    maxWidth: 400,
  },
  sucessoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sucessoIconText: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  sucessoTitle: {
    color: '#059669',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  sucessoText: {
    color: '#666',
    textAlign: 'center',
  },
  revisaoCard: {
    margin: 12,
  },
  revisaoTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  revisaoSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemRevisao: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  itemRevisaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemRevisaoNome: {
    fontWeight: '600',
    flex: 1,
  },
  itemRevisaoQuantidade: {
    fontWeight: 'bold',
    color: '#059669',
  },
  itemRevisaoQuantidadeDiferente: {
    color: '#d97706',
  },
  itemRevisaoAviso: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 4,
    padding: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
  input: {
    marginBottom: 12,
  },
  assinaturaSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  assinaturaPreview: {
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#059669',
    marginBottom: 8,
    alignItems: 'center',
  },
  refazerButton: {
    borderColor: '#d97706',
  },
  botoesRevisao: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  botaoVoltar: {
    flex: 1,
  },
  botaoFinalizar: {
    flex: 2,
    backgroundColor: '#059669',
  },
});
