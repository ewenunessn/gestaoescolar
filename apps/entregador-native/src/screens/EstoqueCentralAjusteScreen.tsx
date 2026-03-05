import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { registrarAjuste, AjusteData, listarLotes, Lote } from '../api/estoqueCentral';
import { api, handleAxiosError } from '../api/client';
import { formatarNumeroInteligente } from '../utils/dateUtils';

interface Produto {
  id: number;
  nome: string;
  unidade: string;
}

export default function EstoqueCentralAjusteScreen({ route, navigation }: any) {
  const produtoInicial = route.params?.produto;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [saving, setSaving] = useState(false);

  const [produtoId, setProdutoId] = useState(
    produtoInicial?.produto_id?.toString() || produtoInicial?.id?.toString() || ''
  );
  const [loteId, setLoteId] = useState('');
  const [quantidadeNova, setQuantidadeNova] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    carregarProdutos();
    if (produtoInicial) {
      carregarLotes(produtoInicial.id);
    }
  }, []);

  useEffect(() => {
    if (produtoId && !produtoInicial) {
      // Buscar o estoque_central_id do produto selecionado
      buscarEstoqueProduto(parseInt(produtoId));
    }
  }, [produtoId]);

  const buscarEstoqueProduto = async (prodId: number) => {
    try {
      setLoadingLotes(true);
      const response = await api.get(`/estoque-central/produto/${prodId}`);
      if (response.data && response.data.id) {
        carregarLotes(response.data.id);
      }
    } catch (err) {
      console.error('Erro ao buscar estoque do produto:', err);
    } finally {
      setLoadingLotes(false);
    }
  };

  const carregarLotes = async (estoqueId: number) => {
    try {
      setLoadingLotes(true);
      const lotesData = await listarLotes(estoqueId);
      setLotes(lotesData);
      
      // Se houver apenas um lote, seleciona automaticamente
      if (lotesData.length === 1) {
        setLoteId(lotesData[0].id.toString());
        setQuantidadeNova(lotesData[0].quantidade.toString());
      }
    } catch (err) {
      console.error('Erro ao carregar lotes:', err);
      Alert.alert('Erro', 'Não foi possível carregar os lotes');
    } finally {
      setLoadingLotes(false);
    }
  };

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

    if (!loteId) {
      Alert.alert('Atenção', 'Selecione um lote para ajustar');
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

  const handleLoteChange = (loteIdSelecionado: string) => {
    setLoteId(loteIdSelecionado);
    const lote = lotes.find(l => l.id.toString() === loteIdSelecionado);
    if (lote) {
      setQuantidadeNova(lote.quantidade.toString());
    }
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    const lote = lotes.find(l => l.id.toString() === loteId);
    const quantidadeAtual = lote ? formatarNumero(lote.quantidade) : 0;
    const novaQuantidade = parseFloat(quantidadeNova);
    const diferenca = novaQuantidade - quantidadeAtual;

    const mensagem = diferenca > 0
      ? `Aumentar lote em ${formatarNumeroInteligente(Math.abs(diferenca))}?`
      : diferenca < 0
      ? `Diminuir lote em ${formatarNumeroInteligente(Math.abs(diferenca))}?`
      : 'Quantidade não será alterada. Continuar?';

    Alert.alert(
      'Confirmar Ajuste',
      `Lote: ${lote?.lote}\n${mensagem}`,
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
                lote_id: parseInt(loteId),
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
            } catch (err: any) {
              // Tratamento específico para erros de validação
              if (err.response?.data?.error) {
                const mensagemErro = err.response.data.error;
                if (mensagemErro.includes('Quantidade insuficiente') || 
                    mensagemErro.includes('não encontrado') ||
                    mensagemErro.includes('inválid')) {
                  Alert.alert('Atenção', mensagemErro, [{ text: 'OK' }]);
                  return;
                }
              }
              
              // Outros erros - log apenas para erros não esperados
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
  const loteSelecionado = lotes.find(l => l.id.toString() === loteId);
  const quantidadeAtual = loteSelecionado ? formatarNumero(loteSelecionado.quantidade) : 0;
  const diferenca = quantidadeNova ? parseFloat(quantidadeNova) - quantidadeAtual : 0;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            ✏️ Ajustar Estoque por Lote
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Corrija a quantidade de um lote específico após inventário
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

          {/* Seleção de Lote */}
          {produtoId && (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Selecione o Lote
                </Text>
                {loadingLotes ? (
                  <ActivityIndicator />
                ) : lotes.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum lote disponível para este produto</Text>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={loteId}
                      onValueChange={handleLoteChange}
                      style={styles.picker}
                    >
                      <Picker.Item label="Selecione um lote..." value="" />
                      {lotes.map((lote) => (
                        <Picker.Item
                          key={lote.id}
                          label={`${lote.lote} - ${formatarNumeroInteligente(formatarNumero(lote.quantidade))} ${produtoSelecionado?.unidade || produtoInicial?.unidade}`}
                          value={lote.id.toString()}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Quantidade */}
          {loteId && (
            <>
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Ajustar Quantidade
                  </Text>
                  
                  <Text variant="bodyMedium" style={styles.quantidadeAtual}>
                    Quantidade atual do lote: {formatarNumeroInteligente(quantidadeAtual)} {produtoSelecionado?.unidade || produtoInicial?.unidade}
                  </Text>

                  <TextInput
                    label="Nova Quantidade"
                    value={quantidadeNova}
                    onChangeText={setQuantidadeNova}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                  />

                  {diferenca !== 0 && (
                    <View style={styles.diferencaContainer}>
                      <Text
                        variant="bodyMedium"
                        style={[
                          styles.diferencaText,
                          { color: diferenca > 0 ? '#10b981' : '#dc2626' }
                        ]}
                      >
                        {diferenca > 0 ? '+' : ''}{formatarNumeroInteligente(diferenca)} {produtoSelecionado?.unidade || produtoInicial?.unidade}
                      </Text>
                    </View>
                  )}
                </Card.Content>
              </Card>

              {/* Informações Adicionais */}
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Motivo do Ajuste (Obrigatório)
                  </Text>

                  <TextInput
                    label="Motivo"
                    value={motivo}
                    onChangeText={setMotivo}
                    mode="outlined"
                    style={styles.input}
                    placeholder="Ex: Inventário, Perda, Correção"
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
    marginBottom: 16,
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
  quantidadeAtual: {
    color: '#558b2f',
    fontWeight: '600',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  input: {
    marginBottom: 12,
  },
  diferencaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginTop: 8,
  },
  diferencaText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    marginBottom: 0,
  },
});
