import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ActivityIndicator, Button, Card, Text, TextInput } from 'react-native-paper';
import {
  Escola,
  EstoqueCentral,
  listarEscolas,
  listarEstoqueCentral,
  registrarTransferencia,
  TransferenciaData,
} from '../api/estoqueCentral';
import { handleAxiosError } from '../api/client';
import { formatarNumeroInteligente } from '../utils/dateUtils';

export default function EstoqueCentralTransferenciaScreen({ route, navigation }: any) {
  const produtoInicial = route.params?.produto as EstoqueCentral | undefined;

  const [estoque, setEstoque] = useState<EstoqueCentral[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [produtoId, setProdutoId] = useState(
    produtoInicial?.produto_id?.toString() || produtoInicial?.id?.toString() || ''
  );
  const [escolaId, setEscolaId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('Transferencia para escola');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [estoqueData, escolasData] = await Promise.all([
        listarEstoqueCentral(),
        listarEscolas(),
      ]);
      setEstoque(estoqueData);
      setEscolas(escolasData);
    } catch (err) {
      console.error('Erro ao carregar dados para transferencia:', err);
      Alert.alert('Erro', handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  };

  const produtoSelecionado = useMemo(() => {
    if (produtoInicial) return produtoInicial;
    return estoque.find((item) => String(item.produto_id) === produtoId || String(item.id) === produtoId);
  }, [estoque, produtoId, produtoInicial]);

  const unidade = produtoSelecionado?.unidade || produtoSelecionado?.produto_unidade || 'UN';
  const saldoAtual = Number(produtoSelecionado?.quantidade_disponivel ?? produtoSelecionado?.quantidade ?? 0);
  const quantidadeNumerica = Number(quantidade.replace(',', '.')) || 0;
  const saldoDepois = saldoAtual - quantidadeNumerica;

  const validarFormulario = () => {
    if (!produtoId) {
      Alert.alert('Atencao', 'Selecione um produto');
      return false;
    }

    if (!escolaId) {
      Alert.alert('Atencao', 'Selecione uma escola');
      return false;
    }

    if (!quantidade || quantidadeNumerica <= 0) {
      Alert.alert('Atencao', 'Informe uma quantidade valida');
      return false;
    }

    if (quantidadeNumerica > saldoAtual) {
      Alert.alert('Quantidade insuficiente', `Disponivel: ${formatarNumeroInteligente(saldoAtual)} ${unidade}`);
      return false;
    }

    if (!motivo.trim()) {
      Alert.alert('Atencao', 'Informe o motivo da transferencia');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    try {
      setSaving(true);
      const dados: TransferenciaData = {
        escola_id: Number(escolaId),
        produto_id: Number(produtoId),
        quantidade: quantidadeNumerica,
        motivo: motivo.trim(),
        observacao: observacao.trim(),
      };

      await registrarTransferencia(dados);

      Alert.alert('Sucesso', 'Transferencia registrada com sucesso', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.error('Erro ao registrar transferencia:', err);
      Alert.alert('Erro', handleAxiosError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>Transferir para Escola</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Baixa do estoque central e entrada no estoque da escola pelo mesmo fluxo do sistema principal.
          </Text>
        </Card.Content>
      </Card>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Carregando dados...</Text>
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
                    Disponivel: {formatarNumeroInteligente(saldoAtual)} {unidade}
                  </Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={produtoId} onValueChange={setProdutoId} style={styles.picker}>
                    <Picker.Item label="Selecione um produto..." value="" />
                    {estoque.map((item) => (
                      <Picker.Item
                        key={item.produto_id}
                        label={`${item.produto_nome} (${formatarNumeroInteligente(Number(item.quantidade_disponivel ?? 0))} ${item.unidade || 'UN'})`}
                        value={String(item.produto_id)}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Destino</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={escolaId} onValueChange={setEscolaId} style={styles.picker}>
                  <Picker.Item label="Selecione uma escola..." value="" />
                  {escolas.map((escola) => (
                    <Picker.Item key={escola.id} label={escola.nome} value={String(escola.id)} />
                  ))}
                </Picker>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Movimentacao</Text>
              <TextInput
                label={`Quantidade${produtoSelecionado ? ` (${unidade})` : ''}`}
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Motivo *"
                value={motivo}
                onChangeText={setMotivo}
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

          {produtoSelecionado && (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>Saldo Central</Text>
                <View style={styles.saldoRow}>
                  <View>
                    <Text style={styles.saldoLabel}>Antes</Text>
                    <Text style={styles.saldoValue}>{formatarNumeroInteligente(saldoAtual)} {unidade}</Text>
                  </View>
                  <View>
                    <Text style={styles.saldoLabel}>Depois</Text>
                    <Text style={[styles.saldoValue, saldoDepois < 0 && styles.saldoNegativo]}>
                      {formatarNumeroInteligente(saldoDepois)} {unidade}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}

          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={saving}
              disabled={saving}
              icon="truck-delivery"
              buttonColor="#2563eb"
              style={styles.button}
            >
              Registrar Transferencia
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
  produtoSelecionado: {
    padding: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  produtoNome: { fontWeight: 'bold', color: '#1e3a8a', marginBottom: 4 },
  produtoUnidade: { color: '#1d4ed8' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, backgroundColor: '#fff' },
  picker: { height: 50 },
  input: { marginBottom: 12 },
  saldoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  saldoLabel: { color: '#666', marginBottom: 4 },
  saldoValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  saldoNegativo: { color: '#dc2626' },
  actions: { padding: 16, gap: 12 },
  button: { marginBottom: 0 },
});
