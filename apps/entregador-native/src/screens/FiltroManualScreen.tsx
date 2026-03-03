import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listarRotas, Rota } from '../api/rotas';
import { handleAxiosError } from '../api/client';

export default function FiltroManualScreen({ navigation }: any) {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotasSelecionadas, setRotasSelecionadas] = useState<number[]>([]);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarRotas();
    carregarFiltroAtual();
  }, []);

  const carregarRotas = async () => {
    try {
      setLoading(true);
      const data = await listarRotas();
      setRotas(data);
    } catch (err) {
      console.error('Erro ao carregar rotas:', err);
      Alert.alert('Erro', handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  };

  const carregarFiltroAtual = async () => {
    try {
      const filtro = await AsyncStorage.getItem('filtro_qrcode');
      if (filtro) {
        const parsed = JSON.parse(filtro);
        if (parsed.rotaIds) {
          setRotasSelecionadas(parsed.rotaIds);
        }
        if (parsed.dataInicio) {
          setDataInicio(parsed.dataInicio);
        }
        if (parsed.dataFim) {
          setDataFim(parsed.dataFim);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar filtro:', err);
    }
  };

  const toggleRota = (rotaId: number) => {
    setRotasSelecionadas(prev => {
      if (prev.includes(rotaId)) {
        return prev.filter(id => id !== rotaId);
      } else {
        return [...prev, rotaId];
      }
    });
  };

  const aplicarFiltro = async () => {
    if (rotasSelecionadas.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos uma rota');
      return;
    }

    if (!dataInicio || !dataFim) {
      Alert.alert('Atenção', 'Preencha as datas de início e fim');
      return;
    }

    if (new Date(dataInicio) > new Date(dataFim)) {
      Alert.alert('Atenção', 'A data de início deve ser anterior à data de fim');
      return;
    }

    setSaving(true);
    try {
      const rotasNomes = rotas
        .filter(r => rotasSelecionadas.includes(r.id))
        .map(r => r.nome);

      const filtro = {
        rotaIds: rotasSelecionadas,
        rotaNomes: rotasNomes,
        rotaNome: rotasNomes.join(', '), // Para compatibilidade
        dataInicio,
        dataFim,
        geradoEm: new Date().toISOString(),
        geradoPor: 'Manual'
      };

      await AsyncStorage.setItem('filtro_qrcode', JSON.stringify(filtro));
      
      Alert.alert(
        'Sucesso',
        'Filtro aplicado com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home')
          }
        ]
      );
    } catch (err) {
      console.error('Erro ao aplicar filtro:', err);
      Alert.alert('Erro', 'Não foi possível aplicar o filtro');
    } finally {
      setSaving(false);
    }
  };

  const limparFiltro = async () => {
    Alert.alert(
      'Limpar Filtro',
      'Tem certeza que deseja remover o filtro ativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('filtro_qrcode');
              setRotasSelecionadas([]);
              Alert.alert('Sucesso', 'Filtro removido com sucesso');
              navigation.navigate('Home');
            } catch (err) {
              Alert.alert('Erro', 'Erro ao remover filtro');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Carregando rotas...</Text>
          </View>
        ) : (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.title}>
                  🔍 Configurar Filtro Manual
                </Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                  Selecione as rotas e o período para filtrar as entregas
                </Text>
              </Card.Content>
            </Card>

            {/* Seleção de Rotas */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Rotas
                </Text>
                <Text variant="bodySmall" style={styles.hint}>
                  Toque nas rotas para selecioná-las
                </Text>
                {rotas.map(rota => (
                  <Button
                    key={rota.id}
                    mode={rotasSelecionadas.includes(rota.id) ? 'contained' : 'outlined'}
                    onPress={() => toggleRota(rota.id)}
                    style={styles.rotaButton}
                    icon={rotasSelecionadas.includes(rota.id) ? 'check-circle' : 'circle-outline'}
                  >
                    {rota.nome}
                  </Button>
                ))}
                {rotas.length === 0 && (
                  <Text variant="bodyMedium" style={styles.noRotas}>
                    Nenhuma rota disponível
                  </Text>
                )}
              </Card.Content>
            </Card>

            {/* Período */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Período
                </Text>
                <TextInput
                  label="Data Início"
                  value={dataInicio}
                  onChangeText={setDataInicio}
                  mode="outlined"
                  style={styles.input}
                  placeholder="AAAA-MM-DD"
                  keyboardType="numeric"
                />
                <TextInput
                  label="Data Fim"
                  value={dataFim}
                  onChangeText={setDataFim}
                  mode="outlined"
                  style={styles.input}
                  placeholder="AAAA-MM-DD"
                  keyboardType="numeric"
                />
                <Text variant="bodySmall" style={styles.hint}>
                  Formato: AAAA-MM-DD (ex: 2026-03-03)
                </Text>
              </Card.Content>
            </Card>

            {/* Resumo */}
            {rotasSelecionadas.length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    📋 Resumo
                  </Text>
                  <View style={styles.resumoItem}>
                    <Text variant="bodyMedium" style={styles.resumoLabel}>
                      Rotas selecionadas:
                    </Text>
                    <Text variant="bodyMedium" style={styles.resumoValue}>
                      {rotasSelecionadas.length} rota(s)
                    </Text>
                  </View>
                  <View style={styles.resumoItem}>
                    <Text variant="bodyMedium" style={styles.resumoLabel}>
                      Período:
                    </Text>
                    <Text variant="bodyMedium" style={styles.resumoValue}>
                      {new Date(dataInicio).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(dataFim).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* Botões de ação */}
            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={aplicarFiltro}
                loading={saving}
                disabled={saving || rotasSelecionadas.length === 0}
                style={styles.actionButton}
                icon="check"
              >
                Aplicar Filtro
              </Button>
              <Button
                mode="outlined"
                onPress={limparFiltro}
                style={styles.actionButton}
                textColor="#dc2626"
                icon="close"
              >
                Limpar Filtro
              </Button>
              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                style={styles.actionButton}
              >
                Cancelar
              </Button>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  hint: {
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  rotaButton: {
    marginBottom: 8,
  },
  noRotas: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  input: {
    marginBottom: 12,
  },
  resumoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  resumoLabel: {
    fontWeight: '600',
    marginRight: 8,
    color: '#666',
  },
  resumoValue: {
    flex: 1,
    color: '#333',
  },
  actions: {
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
});
