import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ActivityIndicator, Button, Card, Text, TextInput } from 'react-native-paper';
import {
  AjusteData,
  EstoqueCentral,
  listarEstoqueCentral,
  registrarAjuste,
} from '../api/estoqueCentral';
import { handleAxiosError } from '../api/client';
import { formatarNumeroInteligente } from '../utils/dateUtils';

export default function EstoqueCentralAjusteScreen({ route, navigation }: any) {
  const produtoInicial = route.params?.produto as EstoqueCentral | undefined;

  const [estoque, setEstoque] = useState<EstoqueCentral[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [produtoId, setProdutoId] = useState(
    produtoInicial?.produto_id?.toString() || produtoInicial?.id?.toString() || ''
  );
  const [quantidadeNova, setQuantidadeNova] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    carregarEstoque();
  }, []);

  const carregarEstoque = async () => {
    try {
      setLoading(true);
      setEstoque(await listarEstoqueCentral());
    } catch (err) {
      console.error('Erro ao carregar estoque:', err);
      Alert.alert('Erro', handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  };

  const produtoSelecionado = useMemo(() => {
    if (produtoInicial) return produtoInicial;
    return estoque.find((item) => String(item.produto_id) === produtoId || String(item.id) === produtoId);
  }, [estoque, produtoId, produtoInicial]);

  useEffect(() => {
    if (produtoSelecionado && quantidadeNova === '') {
      setQuantidadeNova(String(Number(produtoSelecionado.quantidade ?? 0)));
    }
  }, [produtoSelecionado, quantidadeNova]);

  const unidade = produtoSelecionado?.unidade || produtoSelecionado?.produto_unidade || 'UN';
  const saldoAtual = Number(produtoSelecionado?.quantidade ?? 0);
  const novaQuantidade = Number(quantidadeNova.replace(',', '.'));
  const diferenca = Number.isFinite(novaQuantidade) ? novaQuantidade - saldoAtual : 0;

  const validarFormulario = () => {
    if (!produtoId) {
      Alert.alert('Atencao', 'Selecione um produto');
      return false;
    }

    if (quantidadeNova === '' || !Number.isFinite(novaQuantidade) || novaQuantidade < 0) {
      Alert.alert('Atencao', 'Informe uma quantidade valida');
      return false;
    }

    if (!motivo.trim()) {
      Alert.alert('Atencao', 'Informe o motivo do ajuste');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    Alert.alert(
      'Confirmar Ajuste',
      `Saldo atual: ${formatarNumeroInteligente(saldoAtual)} ${unidade}\nNovo saldo: ${formatarNumeroInteligente(novaQuantidade)} ${unidade}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setSaving(true);
              const dados: AjusteData = {
                produto_id: Number(produtoId),
                quantidade_nova: novaQuantidade,
                motivo: motivo.trim(),
                observacao: observacao.trim(),
              };

              await registrarAjuste(dados);

              Alert.alert('Sucesso', 'Ajuste registrado com sucesso', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              console.error('Erro ao registrar ajuste:', err);
              Alert.alert('Erro', handleAxiosError(err));
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>Ajustar Estoque</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Ajuste o saldo total do produto no estoque central.
          </Text>
        </Card.Content>
      </Card>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Carregando estoque...</Text>
        </View>
      ) : (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Produto</Text>
              {produtoInicial ? (
                <View style={styles.produtoSelecionado}>
                  <Text variant="bodyLarge" style={styles.produtoNome}>
                    {produtoInicial.produto_nome}
                  </Text>
                  <Text variant="bodyMedium" style={styles.produtoUnidade}>
                    Saldo atual: {formatarNumeroInteligente(saldoAtual)} {unidade}
                  </Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={produtoId}
                    onValueChange={(value) => {
                      setProdutoId(value);
                      setQuantidadeNova('');
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Selecione um produto..." value="" />
                    {estoque.map((item) => (
                      <Picker.Item
                        key={item.produto_id}
                        label={`${item.produto_nome} (${formatarNumeroInteligente(Number(item.quantidade ?? 0))} ${item.unidade || 'UN'})`}
                        value={String(item.produto_id)}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </Card.Content>
          </Card>

          {produtoSelecionado && (
            <>
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Quantidade</Text>
                  <TextInput
                    label={`Nova Quantidade (${unidade})`}
                    value={quantidadeNova}
                    onChangeText={setQuantidadeNova}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                  />
                  <View style={styles.diferencaContainer}>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.diferencaText,
                        { color: diferenca > 0 ? '#10b981' : diferenca < 0 ? '#dc2626' : '#666' },
                      ]}
                    >
                      Diferenca: {diferenca > 0 ? '+' : ''}{formatarNumeroInteligente(diferenca)} {unidade}
                    </Text>
                  </View>
                </Card.Content>
              </Card>

              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Justificativa</Text>
                  <TextInput
                    label="Motivo *"
                    value={motivo}
                    onChangeText={setMotivo}
                    mode="outlined"
                    style={styles.input}
                    placeholder="Ex: inventario, perda, correcao"
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
                  icon="pencil"
                  buttonColor="#f59e0b"
                  style={styles.button}
                >
                  Registrar Ajuste
                </Button>
                <Button mode="outlined" onPress={() => navigation.goBack()} disabled={saving} style={styles.button}>
                  Cancelar
                </Button>
              </View>
            </>
          )}
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
  produtoSelecionado: {
    padding: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  produtoNome: { fontWeight: 'bold', color: '#92400e', marginBottom: 4 },
  produtoUnidade: { color: '#78350f' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, backgroundColor: '#fff' },
  picker: { height: 50 },
  input: { marginBottom: 12 },
  diferencaContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginTop: 8,
  },
  diferencaText: { fontSize: 18, fontWeight: 'bold' },
  actions: { padding: 16, gap: 12 },
  button: { marginBottom: 0 },
});
