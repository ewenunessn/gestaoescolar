import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator, Divider, IconButton } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { registrarSaida, simularSaida, SaidaData } from '../api/estoqueCentral';
import { api, handleAxiosError } from '../api/client';
import { formatarNumeroInteligente } from '../utils/dateUtils';

interface Produto {
  id: number;
  nome: string;
  unidade: string;
}

export default function EstoqueCentralSaidaScreen({ route, navigation }: any) {
  const produtoInicial = route.params?.produto;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [saving, setSaving] = useState(false);

  const [produtoId, setProdutoId] = useState(
    produtoInicial?.produto_id?.toString() || produtoInicial?.id?.toString() || ''
  );
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [documento, setDocumento] = useState('');
  
  // Estados para a prévia FEFO
  const [previaVisible, setPreviaVisible] = useState(false);
  const [simulacaoFefo, setSimulacaoFefo] = useState<any>(null);
  const [loadingSimulacao, setLoadingSimulacao] = useState(false);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      const response = await api.get('/produtos');
      setProdutos(response.data.data || response.data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoadingProdutos(false);
    }
  };

  const formatarNumero = (valor: any): number => {
    if (valor === null || valor === undefined) return 0;
    const num = typeof valor === 'number' ? valor : parseFloat(String(valor));
    return isNaN(num) ? 0 : num;
  };

  const validarFormulario = (): boolean => {
    if (!produtoId) {
      Alert.alert('Atenção', 'Selecione um produto');
      return false;
    }

    if (!quantidade || parseFloat(quantidade) <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida');
      return false;
    }

    if (!motivo) {
      Alert.alert('Atenção', 'Informe o motivo da saída');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    // Primeiro, simular a saída para mostrar prévia
    try {
      setLoadingSimulacao(true);

      const dados: SaidaData = {
        produto_id: parseInt(produtoId),
        quantidade: parseFloat(quantidade),
        motivo,
        observacao,
        documento,
      };

      const simulacao = await simularSaida(dados);
      setSimulacaoFefo(simulacao);
      setLoadingSimulacao(false);
      setPreviaVisible(true);
    } catch (err: any) {
      setLoadingSimulacao(false);
      
      // Tratamento específico para erro de quantidade insuficiente
      if (err.response?.data?.error && err.response.data.error.includes('Quantidade insuficiente')) {
        const mensagemErro = err.response.data.error;
        Alert.alert(
          'Quantidade Insuficiente',
          mensagemErro,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erro', handleAxiosError(err));
      }
    }
  };

  const confirmarSaida = async () => {
    try {
      setSaving(true);
      setPreviaVisible(false);

      const dados: SaidaData = {
        produto_id: parseInt(produtoId),
        quantidade: parseFloat(quantidade),
        motivo,
        observacao,
        documento,
      };

      await registrarSaida(dados);

      Alert.alert(
        'Sucesso',
        'Saída registrada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err: any) {
      // Tratamento específico para erro de quantidade insuficiente
      if (err.response?.data?.error && err.response.data.error.includes('Quantidade insuficiente')) {
        const mensagemErro = err.response.data.error;
        Alert.alert(
          'Quantidade Insuficiente',
          mensagemErro,
          [{ text: 'OK' }]
        );
      } else {
        console.error('Erro ao registrar saída:', err);
        Alert.alert('Erro', handleAxiosError(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const formatarData = (data: string) => {
    if (!data) return 'N/A';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
  };

  const produtoSelecionado = produtoInicial || produtos.find(p => p.id === parseInt(produtoId));

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            📤 Registrar Saída
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Registre a saída de produtos do estoque central
          </Text>
        </Card.Content>
      </Card>

      {loadingProdutos ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Carregando produtos...</Text>
        </View>
      ) : (
        <>
          {/* Produto */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Produto
              </Text>
              {produtoInicial ? (
                <View style={styles.produtoSelecionado}>
                  <Text variant="bodyLarge" style={styles.produtoNome}>
                    {produtoInicial.produto_nome || produtoInicial.nome}
                  </Text>
                  <Text variant="bodyMedium" style={styles.produtoUnidade}>
                    Unidade: {produtoInicial.unidade}
                  </Text>
                  <Text variant="bodyMedium" style={styles.disponivel}>
                    Disponível: {formatarNumeroInteligente(formatarNumero(produtoInicial.quantidade_disponivel))} {produtoInicial.unidade}
                  </Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={produtoId}
                    onValueChange={setProdutoId}
                    style={styles.picker}
                  >
                    <Picker.Item label="Selecione um produto..." value="" />
                    {produtos.map(produto => (
                      <Picker.Item
                        key={produto.id}
                        label={`${produto.nome} (${produto.unidade})`}
                        value={produto.id.toString()}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* FEFO Automático */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                🔄 FEFO Automático
              </Text>
              <Text variant="bodyMedium" style={styles.fefoInfo}>
                O sistema utilizará automaticamente os lotes mais próximos do vencimento (FEFO - First Expired, First Out).
              </Text>
            </Card.Content>
          </Card>

          {/* Quantidade */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Quantidade
              </Text>
              <TextInput
                label={`Quantidade${produtoSelecionado ? ` (${produtoSelecionado.unidade})` : ''}`}
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
            </Card.Content>
          </Card>

          {/* Informações */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Informações
              </Text>

              <TextInput
                label="Motivo *"
                value={motivo}
                onChangeText={setMotivo}
                mode="outlined"
                style={styles.input}
                placeholder="Ex: Transferência para Escola A"
              />

              <TextInput
                label="Documento"
                value={documento}
                onChangeText={setDocumento}
                mode="outlined"
                style={styles.input}
                placeholder="GUIA-2026-001"
              />

              <TextInput
                label="Observações"
                value={observacao}
                onChangeText={setObservacao}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />
            </Card.Content>
          </Card>

          {/* Botões */}
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loadingSimulacao}
              disabled={saving || loadingSimulacao}
              style={styles.button}
              icon="check"
              buttonColor="#dc2626"
            >
              {loadingSimulacao ? 'Verificando...' : 'Registrar Saída'}
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={saving || loadingSimulacao}
              style={styles.button}
            >
              Cancelar
            </Button>
          </View>
        </>
      )}

      {/* Modal de Prévia FEFO */}
      <Modal
        visible={previaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviaVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                Prévia da Saída (FEFO)
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setPreviaVisible(false)}
              />
            </View>

            <ScrollView style={styles.modalScroll}>
              {simulacaoFefo && (
                <>
                  <Card style={styles.previaCard}>
                    <Card.Content>
                      <Text variant="titleMedium" style={{ marginBottom: 8 }}>
                        {simulacaoFefo.produto_nome}
                      </Text>
                      <Text variant="bodyMedium" style={{ color: '#666', marginBottom: 16 }}>
                        Quantidade solicitada: {formatarNumeroInteligente(simulacaoFefo.quantidade_solicitada)} {simulacaoFefo.unidade}
                      </Text>

                      <Text variant="titleSmall" style={{ marginBottom: 12, fontWeight: 'bold' }}>
                        Lotes que serão utilizados:
                      </Text>

                      {simulacaoFefo.lotes_utilizados.map((lote: any, index: number) => (
                        <View key={lote.lote_id}>
                          {index > 0 && <Divider style={{ marginVertical: 12 }} />}
                          <View style={styles.loteItem}>
                            <View style={styles.loteHeader}>
                              <Text variant="titleSmall" style={{ flex: 1 }}>
                                {lote.lote}
                              </Text>
                              <Text variant="titleMedium" style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                -{formatarNumeroInteligente(lote.quantidade_retirar)} {simulacaoFefo.unidade}
                              </Text>
                            </View>
                            <Text variant="bodySmall" style={{ color: '#666', marginTop: 4 }}>
                              Disponível: {formatarNumeroInteligente(lote.quantidade_disponivel)} {simulacaoFefo.unidade}
                            </Text>
                            <Text variant="bodySmall" style={{ color: '#666' }}>
                              Validade: {formatarData(lote.data_validade)}
                            </Text>
                            {lote.data_fabricacao && (
                              <Text variant="bodySmall" style={{ color: '#666' }}>
                                Fabricação: {formatarData(lote.data_fabricacao)}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </Card.Content>
                  </Card>

                  <Text variant="bodySmall" style={styles.fefoNote}>
                    💡 Os lotes são selecionados automaticamente seguindo o método FEFO (First Expired, First Out) - primeiro a vencer, primeiro a sair.
                  </Text>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button 
                onPress={() => setPreviaVisible(false)} 
                disabled={saving}
                mode="outlined"
                style={{ flex: 1, marginRight: 8 }}
              >
                Cancelar
              </Button>
              <Button 
                onPress={confirmarSaida} 
                loading={saving} 
                disabled={saving}
                mode="contained"
                buttonColor="#dc2626"
                style={{ flex: 1 }}
              >
                Confirmar Saída
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  produtoSelecionado: {
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  produtoNome: {
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  produtoUnidade: {
    color: '#558b2f',
    marginBottom: 4,
  },
  disponivel: {
    color: '#558b2f',
    fontWeight: '600',
  },
  fefoInfo: {
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  input: {
    marginBottom: 12,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    marginBottom: 0,
  },
  // Estilos para o Modal de Prévia FEFO
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  modalScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  previaCard: {
    marginBottom: 16,
  },
  loteItem: {
    paddingVertical: 8,
  },
  loteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fefoNote: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 18,
  },
});
