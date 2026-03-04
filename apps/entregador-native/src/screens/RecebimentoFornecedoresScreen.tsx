import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Card, Text, Chip, IconButton, ProgressBar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { recebimentosAPI, FornecedorPedido, PedidoPendente } from '../api/recebimentos';

export default function RecebimentoFornecedoresScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { pedido } = route.params as { pedido: PedidoPendente };

  const [fornecedores, setFornecedores] = useState<FornecedorPedido[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarFornecedores();
  }, []);

  const carregarFornecedores = async () => {
    try {
      setLoading(true);
      const dados = await recebimentosAPI.listarFornecedores(pedido.id);
      setFornecedores(dados);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFornecedor = ({ item }: { item: FornecedorPedido }) => {
    const valorTotal = parseFloat(item.valor_total as any) || 0;
    const valorRecebido = parseFloat(item.valor_recebido as any) || 0;
    const percentualRecebido = valorTotal > 0 ? (valorRecebido / valorTotal) * 100 : 0;

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('RecebimentoItens', { 
          pedido, 
          fornecedor: item 
        })}
      >
        <Card.Content>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.nome}>
                {item.nome}
              </Text>
              <Text variant="bodySmall" style={styles.cnpj}>
                CNPJ: {item.cnpj}
              </Text>
            </View>
            <IconButton icon="chevron-right" size={24} />
          </View>

          <View style={styles.info}>
            <View style={styles.infoItem}>
              <Text variant="bodySmall" style={styles.label}>Itens</Text>
              <Text variant="titleSmall">{item.total_itens}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text variant="bodySmall" style={styles.label}>Recebimentos</Text>
              <Text variant="titleSmall">{item.total_recebimentos}</Text>
            </View>
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
          </View>

          <View style={styles.progressContainer}>
            <Text variant="bodySmall" style={styles.progressLabel}>
              Progresso: {percentualRecebido.toFixed(0)}%
            </Text>
            <ProgressBar 
              progress={percentualRecebido / 100} 
              color="#4CAF50"
              style={styles.progressBar}
            />
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.pedidoNumero}>
            {pedido.numero}
          </Text>
          <Text variant="bodySmall" style={styles.pedidoInfo}>
            {fornecedores.length} fornecedor(es) • {pedido.total_itens} item(ns)
          </Text>
        </Card.Content>
      </Card>

      <FlatList
        data={fornecedores}
        renderItem={renderFornecedor}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={carregarFornecedores} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum fornecedor encontrado</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  headerCard: { margin: 16, marginBottom: 8, backgroundColor: '#2196F3' },
  pedidoNumero: { color: '#FFF', fontWeight: 'bold' },
  pedidoInfo: { color: '#FFF', marginTop: 4 },
  list: { padding: 16, paddingTop: 8 },
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  nome: { fontWeight: 'bold' },
  cnpj: { color: '#666', marginTop: 4 },
  info: { flexDirection: 'row', gap: 24, marginBottom: 12 },
  infoItem: { alignItems: 'center' },
  valores: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#E0E0E0',
    marginBottom: 12
  },
  label: { color: '#666', marginBottom: 4 },
  progressContainer: { marginTop: 8 },
  progressLabel: { color: '#666', marginBottom: 4 },
  progressBar: { height: 8, borderRadius: 4 },
  empty: { textAlign: 'center', marginTop: 32, color: '#999' }
});
