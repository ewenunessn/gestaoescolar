import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Button, ActivityIndicator, FAB, Portal, Modal } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listarRotas, Rota } from '../api/rotas';
import { handleAxiosError } from '../api/client';
import QRScanner from '../components/QRScanner';

export default function RotasScreen({ navigation }: any) {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    carregarRotas();
    carregarFiltro();
  }, []);

  const carregarRotas = async () => {
    try {
      setLoading(true);
      const data = await listarRotas();
      setRotas(data);
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  };

  const carregarFiltro = async () => {
    try {
      const filtro = await AsyncStorage.getItem('filtro_qrcode');
      if (filtro) {
        setFiltroAtivo(JSON.parse(filtro));
      }
    } catch (err) {
      console.error('Erro ao carregar filtro:', err);
    }
  };

  const limparFiltro = async () => {
    await AsyncStorage.removeItem('filtro_qrcode');
    setFiltroAtivo(null);
  };

  const handleQRScan = async (data: any) => {
    setFiltroAtivo(data);
    setShowScanner(false);
    carregarRotas();
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Login');
  };

  const rotasFiltradas = filtroAtivo 
    ? rotas.filter(r => r.id === filtroAtivo.rotaId)
    : rotas;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando rotas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button mode="contained" onPress={carregarRotas} style={styles.retryButton}>
          Tentar Novamente
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filtroAtivo && (
        <Card style={styles.filtroCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.filtroTitle}>
              🔍 Filtro Ativo
            </Text>
            <Text variant="bodyMedium">Rota: {filtroAtivo.rotaNome}</Text>
            <Text variant="bodySmall">
              Período: {new Date(filtroAtivo.dataInicio).toLocaleDateString('pt-BR')} até{' '}
              {new Date(filtroAtivo.dataFim).toLocaleDateString('pt-BR')}
            </Text>
            <Button mode="outlined" onPress={limparFiltro} style={styles.limparButton}>
              Limpar Filtro
            </Button>
          </Card.Content>
        </Card>
      )}

      <FlatList
        data={rotasFiltradas}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('RotaDetalhe', { rotaId: item.id, rotaNome: item.nome })}
          >
            <Card style={[styles.card, { borderLeftColor: item.cor || '#1976d2', borderLeftWidth: 4 }]}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.rotaNome}>
                  {item.nome}
                </Text>
                {item.descricao && (
                  <Text variant="bodyMedium" style={styles.descricao}>
                    {item.descricao}
                  </Text>
                )}
                <View style={styles.meta}>
                  <Text style={[styles.badge, item.ativo ? styles.badgeAtivo : styles.badgeInativo]}>
                    {item.ativo ? '✓ Ativa' : '✕ Inativa'}
                  </Text>
                  <Text style={styles.escolas}>🏫 {item.total_escolas || 0} escola(s)</Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineMedium">📍</Text>
            <Text variant="titleMedium">Nenhuma rota encontrada</Text>
          </View>
        }
      />

      <FAB
        icon="qrcode-scan"
        label="Escanear QR"
        style={styles.fab}
        onPress={() => setShowScanner(true)}
      />

      <FAB
        icon="logout"
        style={styles.logoutFab}
        onPress={logout}
        small
      />

      <QRScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
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
  retryButton: {
    marginTop: 8,
  },
  filtroCard: {
    margin: 12,
    backgroundColor: '#e3f2fd',
  },
  filtroTitle: {
    color: '#1565c0',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  limparButton: {
    marginTop: 12,
  },
  list: {
    padding: 12,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  rotaNome: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  descricao: {
    color: '#666',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeAtivo: {
    backgroundColor: '#4caf50',
    color: '#fff',
  },
  badgeInativo: {
    backgroundColor: '#9e9e9e',
    color: '#fff',
  },
  escolas: {
    color: '#666',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  logoutFab: {
    position: 'absolute',
    right: 16,
    bottom: 88,
    backgroundColor: '#f44336',
  },
});
