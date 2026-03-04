import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { registrarSaida, SaidaData } from '../api/estoqueCentral';
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

    try {
      setSaving(true);

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
    } catch (err) {
      console.error('Erro ao registrar saída:', err);
      console.error('Tipo do erro:', typeof err);
      console.error('Erro stringificado:', JSON.stringify(err, null, 2));
      Alert.alert('Erro', handleAxiosError(err));
    } finally {
      setSaving(false);
    }
  };

  const produtoSelecionado = produtos.find(p => p.id === parseInt(produtoId));

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
              loading={saving}
              disabled={saving}
              style={styles.button}
              icon="check"
              buttonColor="#dc2626"
            >
              Registrar Saída
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
});
