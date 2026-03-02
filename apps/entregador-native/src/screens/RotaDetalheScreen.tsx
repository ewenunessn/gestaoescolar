import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { listarEscolasDaRota, EscolaRota } from '../api/rotas';
import { handleAxiosError } from '../api/client';

export default function RotaDetalheScreen({ route, navigation }: any) {
  const { rotaId, rotaNome } = route.params;
  const [escolas, setEscolas] = useState<EscolaRota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    carregarEscolas();
  }, []);

  const carregarEscolas = async () => {
    try {
      setLoading(true);
      const data = await listarEscolasDaRota(rotaId);
      setEscolas(data);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando escolas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button mode="contained" onPress={carregarEscolas}>
          Tentar Novamente
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.header}>
        <Card.Content>
          <Text variant="titleMedium">Rota: {rotaNome}</Text>
          <Text variant="bodySmall">{escolas.length} escola(s) na rota</Text>
        </Card.Content>
      </Card>

      <FlatList
        data={escolas}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('EscolaDetalhe', {
                escolaId: item.escola_id,
                escolaNome: item.escola_nome,
                rotaId,
              })
            }
          >
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text style={styles.ordem}>#{item.ordem}</Text>
                  <View style={styles.cardContent}>
                    <Text variant="titleMedium" style={styles.nome}>
                      {item.escola_nome || `Escola ${item.escola_id}`}
                    </Text>
                    {item.escola_endereco && (
                      <Text variant="bodySmall" style={styles.endereco}>
                        📍 {item.escola_endereco}
                      </Text>
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineMedium">🏫</Text>
            <Text variant="titleMedium">Nenhuma escola nesta rota</Text>
          </View>
        }
      />
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
  header: {
    margin: 12,
    marginBottom: 0,
  },
  list: {
    padding: 12,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ordem: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  cardContent: {
    flex: 1,
  },
  nome: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  endereco: {
    color: '#666',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
});
