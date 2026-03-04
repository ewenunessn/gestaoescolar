import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { registrarEntrada, EntradaData } from '../api/estoqueCentral';
import { api, handleAxiosError } from '../api/client';
import { formatarDataBR, stringParaData, formatarDataParaInput } from '../utils/dateUtils';

interface Produto {
  id: number;
  nome: string;
  unidade: string;
}

export default function EstoqueCentralEntradaScreen({ route, navigation }: any) {
  const produtoInicial = route.params?.produto;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [saving, setSaving] = useState(false);

  const [produtoId, setProdutoId] = useState(produtoInicial?.produto_id || '');
  const [quantidade, setQuantidade] = useState('');
  const [lote, setLote] = useState('');
  const [dataFabricacao, setDataFabricacao] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [documento, setDocumento] = useState('');

  const [showDatePickerFabricacao, setShowDatePickerFabricacao] = useState(false);
  const [showDatePickerValidade, setShowDatePickerValidade] = useState(false);

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

  const validarFormulario = (): boolean => {
    if (!produtoId) {
      Alert.alert('Atenção', 'Selecione um produto');
      return false;
    }

    if (!quantidade || parseFloat(quantidade) <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida');
      return false;
    }

    // Lote e validade são obrigatórios
    if (!lote) {
      Alert.alert('Atenção', 'Informe o código do lote');
      return false;
    }
    
    if (!dataValidade) {
      Alert.alert('Atenção', 'Informe a data de validade do lote');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    try {
      setSaving(true);

      const dados: EntradaData = {
        produto_id: parseInt(produtoId),
        quantidade: parseFloat(quantidade),
        lote: lote, // Obrigatório
        data_validade: dataValidade, // Obrigatório
        data_fabricacao: dataFabricacao || undefined,
        motivo,
        observacao,
        fornecedor,
        nota_fiscal: notaFiscal,
        documento,
      };

      await registrarEntrada(dados);

      Alert.alert(
        'Sucesso',
        'Entrada registrada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      console.error('Erro ao registrar entrada:', err);
      Alert.alert('Erro', handleAxiosError(err));
    } finally {
      setSaving(false);
    }
  };

  const onChangeDateFabricacao = (_event: any, selectedDate?: Date) => {
    setShowDatePickerFabricacao(Platform.OS === 'ios');
    if (selectedDate) {
      setDataFabricacao(formatarDataParaInput(selectedDate));
    }
  };

  const onChangeDateValidade = (_event: any, selectedDate?: Date) => {
    setShowDatePickerValidade(Platform.OS === 'ios');
    if (selectedDate) {
      setDataValidade(formatarDataParaInput(selectedDate));
    }
  };

  const produtoSelecionado = produtos.find(p => p.id === parseInt(produtoId));

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            📦 Registrar Entrada
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Registre a entrada de produtos no estoque central
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

          {/* Lote (Obrigatório) */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Informações do Lote (Obrigatório)
              </Text>
                  <TextInput
                    label="Código do Lote"
                    value={lote}
                    onChangeText={setLote}
                    mode="outlined"
                    style={styles.input}
                    placeholder="LOTE-2026-001"
                  />

                  <View style={styles.dateContainer}>
                    <Text variant="bodyMedium" style={styles.dateLabel}>
                      Data de Fabricação (opcional):
                    </Text>
                    <Button
                      mode="outlined"
                      onPress={() => setShowDatePickerFabricacao(true)}
                      icon="calendar"
                      style={styles.dateButton}
                    >
                      {dataFabricacao ? formatarDataBR(dataFabricacao) : 'Selecionar'}
                    </Button>
                  </View>

                  {showDatePickerFabricacao && (
                    <DateTimePicker
                      value={dataFabricacao ? stringParaData(dataFabricacao) : new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onChangeDateFabricacao}
                    />
                  )}

                  <View style={styles.dateContainer}>
                    <Text variant="bodyMedium" style={styles.dateLabel}>
                      Data de Validade (obrigatória):
                    </Text>
                    <Button
                      mode="outlined"
                      onPress={() => setShowDatePickerValidade(true)}
                      icon="calendar"
                      style={styles.dateButton}
                    >
                      {dataValidade ? formatarDataBR(dataValidade) : 'Selecionar'}
                    </Button>
                  </View>

                  {showDatePickerValidade && (
                    <DateTimePicker
                      value={dataValidade ? stringParaData(dataValidade) : new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onChangeDateValidade}
                      minimumDate={new Date()}
                    />
                  )}
            </Card.Content>
          </Card>

          {/* Informações Adicionais */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Informações Adicionais
              </Text>

              <TextInput
                label="Motivo"
                value={motivo}
                onChangeText={setMotivo}
                mode="outlined"
                style={styles.input}
                placeholder="Ex: Compra mensal"
              />

              <TextInput
                label="Fornecedor"
                value={fornecedor}
                onChangeText={setFornecedor}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Nota Fiscal"
                value={notaFiscal}
                onChangeText={setNotaFiscal}
                mode="outlined"
                style={styles.input}
                placeholder="NF-12345"
              />

              <TextInput
                label="Documento"
                value={documento}
                onChangeText={setDocumento}
                mode="outlined"
                style={styles.input}
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
              loading={saving}
              disabled={saving}
              style={styles.button}
              icon="check"
            >
              Registrar Entrada
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={saving}
              style={styles.button}
            >
              Cancelar
            </Button>
          </View>
        </>
      )}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#666',
  },
  dateButton: {
    justifyContent: 'flex-start',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    marginBottom: 0,
  },
});
