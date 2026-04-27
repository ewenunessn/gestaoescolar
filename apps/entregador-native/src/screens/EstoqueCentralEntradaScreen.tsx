import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ActivityIndicator, Button, Card, Text, TextInput } from 'react-native-paper';
import { EntradaData, listarProdutos, registrarEntrada } from '../api/estoqueCentral';
import { handleAxiosError } from '../api/client';

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
  const [produtoId, setProdutoId] = useState(
    produtoInicial?.produto_id?.toString() || produtoInicial?.id?.toString() || ''
  );
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [documento, setDocumento] = useState('');

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      setProdutos(await listarProdutos());
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      Alert.alert('Erro', 'Nao foi possivel carregar os produtos');
    } finally {
      setLoadingProdutos(false);
    }
  };

  const produtoSelecionado = useMemo(() => {
    if (produtoInicial) return produtoInicial;
    return produtos.find((produto) => String(produto.id) === produtoId);
  }, [produtoId, produtoInicial, produtos]);

  const quantidadeNumerica = Number(quantidade.replace(',', '.')) || 0;

  const validarFormulario = () => {
    if (!produtoId) {
      Alert.alert('Atencao', 'Selecione um produto');
      return false;
    }

    if (!quantidade || quantidadeNumerica <= 0) {
      Alert.alert('Atencao', 'Informe uma quantidade valida');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    try {
      setSaving(true);

      const detalhes = [
        observacao.trim() || null,
        fornecedor.trim() ? `Fornecedor: ${fornecedor.trim()}` : null,
        notaFiscal.trim() ? `NF: ${notaFiscal.trim()}` : null,
        documento.trim() ? `Documento: ${documento.trim()}` : null,
      ].filter(Boolean).join('\n') || undefined;

      const dados: EntradaData = {
        produto_id: Number(produtoId),
        quantidade: quantidadeNumerica,
        motivo: motivo.trim() || undefined,
        observacao: detalhes,
        fornecedor: fornecedor.trim() || undefined,
        nota_fiscal: notaFiscal.trim() || undefined,
        documento: documento.trim() || undefined,
      };

      await registrarEntrada(dados);

      Alert.alert('Sucesso', 'Entrada registrada com sucesso', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Erro ao registrar entrada:', err);
      Alert.alert('Erro', handleAxiosError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>Registrar Entrada</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Entrada manual no estoque central por produto.
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
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Produto</Text>
              {produtoInicial ? (
                <View style={styles.produtoSelecionado}>
                  <Text variant="bodyLarge" style={styles.produtoNome}>
                    {produtoInicial.produto_nome || produtoInicial.nome}
                  </Text>
                  <Text variant="bodyMedium" style={styles.produtoUnidade}>
                    Unidade: {produtoInicial.unidade || produtoInicial.produto_unidade || 'UN'}
                  </Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={produtoId} onValueChange={setProdutoId} style={styles.picker}>
                    <Picker.Item label="Selecione um produto..." value="" />
                    {produtos.map((produto) => (
                      <Picker.Item
                        key={produto.id}
                        label={`${produto.nome} (${produto.unidade})`}
                        value={String(produto.id)}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Movimentacao</Text>
              <TextInput
                label={`Quantidade${produtoSelecionado ? ` (${produtoSelecionado.unidade || produtoSelecionado.produto_unidade || 'UN'})` : ''}`}
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Motivo"
                value={motivo}
                onChangeText={setMotivo}
                mode="outlined"
                style={styles.input}
                placeholder="Ex: compra mensal, ajuste de recebimento"
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Informacoes Adicionais</Text>
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
              />
              <TextInput
                label="Documento"
                value={documento}
                onChangeText={setDocumento}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Observacao"
                value={observacao}
                onChangeText={setObservacao}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />
            </Card.Content>
          </Card>

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
            <Button mode="outlined" onPress={() => navigation.goBack()} disabled={saving} style={styles.button}>
              Cancelar
            </Button>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 16, marginBottom: 0 },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#666' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#666' },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, backgroundColor: '#fff' },
  picker: { height: 50 },
  produtoSelecionado: {
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  produtoNome: { fontWeight: 'bold', color: '#2e7d32', marginBottom: 4 },
  produtoUnidade: { color: '#558b2f' },
  input: { marginBottom: 12 },
  actions: { padding: 16, gap: 12 },
  button: { marginBottom: 0 },
});
