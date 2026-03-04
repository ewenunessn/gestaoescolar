import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Card, Text, IconButton } from 'react-native-paper';
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
    const totalItens = parseInt(item.total_itens as any) || 0;
    const itensCompletos = parseInt(item.itens_completos as any) || 0;
    const itensAtrasados = parseInt(item.itens_atrasados as any) || 0;

    // Determinar cor do card
    let cardColor = '#FFF'; // Branco padrão
    let statusIcon = null;
    
    if (itensCompletos === totalItens && totalItens > 0) {
      // Todos os itens foram recebidos - VERDE
      cardColor = '#E8F5E9';
      statusIcon = 'check-circle';
    } else if (itensAtrasados > 0) {
      // Tem itens em atraso - VERMELHO
      cardColor = '#FFEBEE';
      statusIcon = 'alert-circle';
    } else if (itensCompletos < totalItens) {
      // Tem pendências mas sem atraso - AMARELO
      cardColor = '#FFF9C4';
      statusIcon = 'clock-outline';
    }

    return (
      <Card
        style={[styles.card, { backgroundColor: cardColor }]}
        onPress={() => navigation.navigate('RecebimentoItens', { 
          pedido, 
          fornecedor: item 
        })}
      >
        <Card.Content>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {statusIcon && (
                  <IconButton 
                    icon={statusIcon} 
                    size={20} 
                    iconColor={
                      itensCompletos === totalItens ? '#4CAF50' : 
                      itensAtrasados > 0 ? '#F44336' : '#FFC107'
                    }
                    style={{ margin: 0 }}
                  />
                )}
                <Text variant="titleMedium" style={styles.nome}>
                  {item.nome}
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.cnpj}>
                CNPJ: {item.cnpj}
              </Text>
            </View>
            <IconButton icon="chevron-right" size={24} />
          </View>

          <View style={styles.info}>
            <View style={styles.infoItem}>
              <Text variant="bodySmall" style={styles.label}>Itens</Text>
              <Text variant="titleSmall">{totalItens}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text variant="bodySmall" style={styles.label}>Completos</Text>
              <Text variant="titleSmall" style={{ color: '#4CAF50' }}>{itensCompletos}</Text>
            </View>
            {itensAtrasados > 0 && (
              <View style={styles.infoItem}>
                <Text variant="bodySmall" style={styles.label}>Atrasados</Text>
                <Text variant="titleSmall" style={{ color: '#F44336' }}>{itensAtrasados}</Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Text variant="bodySmall" style={styles.label}>Recebimentos</Text>
              <Text variant="titleSmall">{item.total_recebimentos}</Text>
            </View>
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
  info: { flexDirection: 'row', gap: 24 },
  infoItem: { alignItems: 'center' },
  label: { color: '#666', marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 32, color: '#999' }
});
