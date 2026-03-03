import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { registrarAjuste, AjusteData } from '../api/estoqueCentral';
import { api, handleAxiosError } from '../api/client';

interface Produto {
  id: number;
  nome: string;
  unidade: string;
}

export default function EstoqueCentralAjusteScreen({ route, navigation }: any) {
  const produtoInicial = route.params?.produto;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [saving, setSaving] = useState(false);

  const [produtoId, setProdutoId] = useState(produtoInicial?.produto_id || '');
  const [quantidadeNova, setQuantidadeNova] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    carregarProdutos();
    if (produtoInicial) {
      setQuantidadeNova(produtoInicial.quantidade.toString());
    }
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

    if (quantidadeNova === '' || parseFloat(quantidadeNova) < 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida (não pode ser negativa)');
      return false;
    }

    if (!motivo) {
      Alert.alert('Atenção', 'Informe o motivo do ajuste');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    const quantidadeAtual = formatarNumero(produtoInicial?.quantidade) || 0;
    const novaQuantidade = parseFloat(quantidadeNova);
    const diferenca = novaQuantidade - quantidadeAtual;

    const mensagem = diferenca > 0
      ? `Aumentar estoque em ${Math.abs(diferenca).toFixed(2)}?`
      : diferenca < 0
      ? `Diminuir estoque em ${Math.abs(diferenca).toFixed(2)}?`
      : 'Quantidade não será alterada. Continuar?';

    Alert.alert(
      'Confirmar Ajuste',
      mensagem,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setSaving(true);

              const dados: AjusteData = {
                produto_id: parseInt(produtoId),
                quantidade_nova: novaQuantidade,
                motivo,
                observacao,
              };

              await registrarAjuste(dados);

              Alert.alert(
                'Sucesso',
                'Ajuste registrado com sucesso!',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (err) {
              console.error('Erro ao registrar ajuste:', err);
              Alert.alert('Erro', handleAxiosError(err));
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const produtoSelecionado = produtos.find(p => p.id === parseInt(produtoId));
  const quantidadeAtual = formatarNumero(produtoInicial?.quantidade) || 0;
  const diferenca = quantidadeNova ? parseFloat(quantidadeNova) - quantidadeAtual : 0;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            ✏️ Ajustar Estoque
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Corrija a quantidade em estoque após inventário
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
                <View style={styles.produtoFixo}>
                  <Text variant="titleMedium">{produtoInicial.produto_nome}</Text>
                  <Text variant="bodySmall" style={styles.quantidadeAtual}>
                    Quantidade atual: {quantidadeAtual.toFixed(2)} {produtoInicial.unidade}
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

          {/* Quantidade */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Nova Quantidade
              </Text>
              <TextInput
                label={`Quantidade${produtoSelecionado ? ` (${produtoSelecionado.unidade})` : ''}`}
                value={quantidadeNova}
                onChangeText={setQuantidadeNova}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />

              {produtoInicial && quantidadeNova && (
                <View style={styles.diferencaContainer}>
                  <Text variant="bodyMedium" style={styles.diferencaLabel}>
                    Diferença:
                  </Text>
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.diferencaValue,
                      {
                        color: diferenca > 0 ? '#10b981' : diferenca < 0 ? '#dc2626' : '#666'
                      }
                    ]}
                  >
                    {diferenca > 0 ? '+' : ''}{diferenca.toFixed(2)} {produtoInicial.unidade}
                  </Text>
                </View>
              )}
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
                placeholder="Ex: Inventário mensal, Correção de contagem"
              />

              <TextInput
                label="Observações"
                value={observacao}
                onChangeText={setObservacao}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Detalhes sobre o ajuste..."
              />
            </Card.Content>
          </Card>

          {/* Alerta */}
          <Card style={[styles.card, styles.alertCard]}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.alertText}>
                ⚠️ O ajuste de estoque deve ser usado apenas para correções após inventário físico.
                Para entradas e saídas normais, use as opções específicas.
              </Text>
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
              buttonColor="#f59e0b"
            >
              Registrar Ajuste
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
  produtoFixo: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  quantidadeAtual: {
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
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
  diferencaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 8,
  },
  diferencaLabel: {
    color: '#666',
  },
  diferencaValue: {
    fontWeight: 'bold',
  },
  alertCard: {
    backgroundColor: '#fff3cd',
  },
  alertText: {
    color: '#856404',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    marginBottom: 0,
  },
});
