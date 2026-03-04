import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Card, Text, Chip, FAB, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { recebimentosAPI, PedidoPendente } from '../api/recebimentos';
import { formatarDataBR } from '../utils/dateUtils';

export default function RecebimentosScreen() {
  const navigation = useNavigation<any>();
  const [pedidos, setPedidos] = useState<PedidoPendente[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarPedidos();
  }, []);

  const carregarPedidos = async () => {
    try {
      setLoading(true);
      const dados = await recebimentosAPI.listarPedidosPendentes();
      setPedidos(dados);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const pedidosFiltrados = pedidos.filter(p =>
    p.numero.toLowerCase().includes(busca.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return '#FF9800';
      case 'recebido_parcial': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'recebido_parcial': return 'Parcial';
      default: return status;
    }
  };

  const renderPedido = ({ item }: { item: PedidoPendente }) => {
    const valorTotal = parseFloat(item.valor_total as any) || 0;
    const valorRecebido = parseFloat(item.valor_recebido as any) || 0;
    const percentualRecebido = valorTotal > 0 ? (valorRecebido / valorTotal) * 100 : 0;

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('RecebimentoFornecedores', { pedido: item })}
      >
        <Card.Content>
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.numero}>{item.numero}</Text>
            <Chip
              mode="flat"
              style={{ backgroundColor: getStatusColor(item.status) }}
              textStyle={{ color: '#FFF' }}
            >
              {getStatusLabel(item.status)}
            </Chip>
          </View>

          <Text variant="bodySmall" style={styles.data}>
            {formatarDataBR(item.data_pedido)}
          </Text>

          <View style={styles.info}>
            <Text variant="bodyMedium">
              {item.total_fornecedores} fornecedor(es) • {item.total_itens} item(ns)
            </Text>
          </View>

          <View style={styles.valores}>
            <View>
              <Text variant="bodySmall" style={styles.label}>Valor Total</Text>
              <Text variant="titleSmall">
                R$ {valorTotal.toFixed(2)}
              </Text>
            </View>
            <View>
              <Text variant="bodySmall" style={styles.label}>Recebido</Text>
              <Text variant="titleSmall" style={{ color: '#4CAF50' }}>
                R$ {valorRecebido.toFixed(2)}
              </Text>
            </View>
            <View>
              <Text variant="bodySmall" style={styles.label}>Progresso</Text>
              <Text variant="titleSmall">
                {percentualRecebido.toFixed(0)}%
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Buscar pedido..."
        value={busca}
        onChangeText={setBusca}
        style={styles.searchbar}
      />

      <FlatList
        data={pedidosFiltrados}
        renderItem={renderPedido}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={carregarPedidos} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum pedido pendente</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  searchbar: { margin: 16 },
  list: { padding: 16, paddingTop: 0 },
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  numero: { fontWeight: 'bold' },
  data: { color: '#666', marginBottom: 12 },
  info: { marginBottom: 12 },
  valores: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  label: { color: '#666', marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 32, color: '#999' }
});
