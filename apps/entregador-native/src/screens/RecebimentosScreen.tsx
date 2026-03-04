import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Card, Text, Chip, Searchbar, Menu, IconButton, Appbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { recebimentosAPI, PedidoPendente } from '../api/recebimentos';
import { formatarDataBR, formatarCompetencia } from '../utils/dateUtils';

export default function RecebimentosScreen() {
  const navigation = useNavigation<any>();
  const [pedidos, setPedidos] = useState<PedidoPendente[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

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
    const totalItens = parseInt(item.total_itens as any) || 0;
    const itensCompletos = parseInt(item.itens_completos as any) || 0;
    const percentualCompleto = totalItens > 0 ? (itensCompletos / totalItens) * 100 : 0;

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('RecebimentoFornecedores', { pedido: item })}
      >
        <Card.Content>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.numero}>{item.numero}</Text>
              {item.competencia_mes_ano && (
                <Text variant="bodySmall" style={styles.competencia}>
                  {formatarCompetencia(item.competencia_mes_ano)}
                </Text>
              )}
            </View>
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
              {item.total_fornecedores} fornecedor(es) • {totalItens} item(ns)
            </Text>
          </View>

          <View style={styles.valores}>
            <View>
              <Text variant="bodySmall" style={styles.label}>Total Itens</Text>
              <Text variant="titleSmall">
                {totalItens}
              </Text>
            </View>
            <View>
              <Text variant="bodySmall" style={styles.label}>Completos</Text>
              <Text variant="titleSmall" style={{ color: '#4CAF50' }}>
                {itensCompletos}
              </Text>
            </View>
            <View>
              <Text variant="bodySmall" style={styles.label}>Progresso</Text>
              <Text variant="titleSmall">
                {percentualCompleto.toFixed(0)}%
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#1976d2' }}>
        <Appbar.Content title="Recebimentos" titleStyle={{ color: '#FFF' }} />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action 
              icon="dots-vertical" 
              color="#FFF"
              onPress={() => setMenuVisible(true)} 
            />
          }
        >
          <Menu.Item 
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('RecebimentosConcluidos');
            }} 
            title="Pedidos Concluídos" 
            leadingIcon="check-circle"
          />
        </Menu>
      </Appbar.Header>

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  numero: { fontWeight: 'bold' },
  competencia: { color: '#2196F3', marginTop: 2, fontSize: 12, fontWeight: '500' },
  data: { color: '#666', marginBottom: 12 },
  info: { marginBottom: 12 },
  valores: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  label: { color: '#666', marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 32, color: '#999' }
});
