import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, StyleSheet, Alert } from 'react-native';
import { Card, Text, Button, Dialog, Portal, TextInput, Chip, IconButton, Divider } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { recebimentosAPI, ItemPedido, PedidoPendente, FornecedorPedido, Recebimento } from '../api/recebimentos';

export default function RecebimentoItensScreen() {
  const route = useRoute<any>();
  const { pedido, fornecedor } = route.params as { 
    pedido: PedidoPendente; 
    fornecedor: FornecedorPedido;
  };

  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [historicoVisible, setHistoricoVisible] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemPedido | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [processando, setProcessando] = useState(false);
  const [historico, setHistorico] = useState<Recebimento[]>([]);

  useEffect(() => {
    carregarItens();
  }, []);

  const carregarItens = async () => {
    try {
      setLoading(true);
      const dados = await recebimentosAPI.listarItens(pedido.id, fornecedor.id);
      setItens(dados);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogRecebimento = (item: ItemPedido) => {
    setItemSelecionado(item);
    setQuantidade(item.saldo_pendente.toString());
    setObservacoes('');
    setDialogVisible(true);
  };

  const registrarRecebimento = async () => {
    if (!itemSelecionado) return;

    const qtd = parseFloat(quantidade);
    const saldo = parseFloat(itemSelecionado.saldo_pendente as any) || 0;
    
    if (isNaN(qtd) || qtd <= 0) {
      Alert.alert('Erro', 'Informe uma quantidade válida');
      return;
    }

    if (qtd > saldo) {
      Alert.alert('Erro', `Quantidade (${qtd}) não pode exceder o saldo pendente (${saldo})`);
      return;
    }

    try {
      setProcessando(true);
      await recebimentosAPI.registrarRecebimento({
        pedidoId: pedido.id,
        pedidoItemId: itemSelecionado.id,
        quantidadeRecebida: qtd,
        observacoes: observacoes || undefined
      });

      Alert.alert('Sucesso', 'Recebimento registrado com sucesso!');
      setDialogVisible(false);
      carregarItens();
    } catch (error: any) {
      console.error('Erro ao registrar:', error);
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao registrar recebimento');
    } finally {
      setProcessando(false);
    }
  };

  const verHistorico = async (item: ItemPedido) => {
    try {
      const dados = await recebimentosAPI.listarRecebimentosItem(item.id);
      setHistorico(dados);
      setItemSelecionado(item);
      setHistoricoVisible(true);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao carregar histórico');
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const renderItem = ({ item }: { item: ItemPedido }) => {
    const quantidade = parseFloat(item.quantidade as any) || 0;
    const quantidadeRecebida = parseFloat(item.quantidade_recebida as any) || 0;
    const saldoPendente = parseFloat(item.saldo_pendente as any) || 0;
    const precoUnitario = parseFloat(item.preco_unitario as any) || 0;
    const valorTotal = parseFloat(item.valor_total as any) || 0;
    const percentualRecebido = quantidade > 0 ? (quantidadeRecebida / quantidade) * 100 : 0;
    const completo = saldoPendente <= 0;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.produto}>
                {item.produto_nome}
              </Text>
              <Text variant="bodySmall" style={styles.contrato}>
                Contrato: {item.contrato_numero}
              </Text>
            </View>
            {completo && (
              <Chip mode="flat" style={{ backgroundColor: '#4CAF50' }} textStyle={{ color: '#FFF' }}>
                Completo
              </Chip>
            )}
          </View>

          <View style={styles.quantidades}>
            <View style={styles.quantidadeItem}>
              <Text variant="bodySmall" style={styles.label}>Pedido</Text>
              <Text variant="titleSmall">
                {quantidade} {item.unidade}
              </Text>
            </View>
            <View style={styles.quantidadeItem}>
              <Text variant="bodySmall" style={styles.label}>Recebido</Text>
              <Text variant="titleSmall" style={{ color: '#4CAF50' }}>
                {quantidadeRecebida} {item.unidade}
              </Text>
            </View>
            <View style={styles.quantidadeItem}>
              <Text variant="bodySmall" style={styles.label}>Saldo</Text>
              <Text variant="titleSmall" style={{ color: completo ? '#4CAF50' : '#FF9800' }}>
                {saldoPendente} {item.unidade}
              </Text>
            </View>
          </View>

          <View style={styles.valores}>
            <View>
              <Text variant="bodySmall" style={styles.label}>Preço Unit.</Text>
              <Text variant="bodyMedium">R$ {precoUnitario.toFixed(2)}</Text>
            </View>
            <View>
              <Text variant="bodySmall" style={styles.label}>Valor Total</Text>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                R$ {valorTotal.toFixed(2)}
              </Text>
            </View>
          </View>

          {item.observacoes && (
            <View style={styles.observacoes}>
              <Text variant="bodySmall" style={styles.label}>Observações:</Text>
              <Text variant="bodySmall">{item.observacoes}</Text>
            </View>
          )}

          <View style={styles.acoes}>
            {!completo && (
              <Button
                mode="contained"
                onPress={() => abrirDialogRecebimento(item)}
                style={{ flex: 1 }}
              >
                Registrar Recebimento
              </Button>
            )}
            {item.total_recebimentos > 0 && (
              <Button
                mode="outlined"
                onPress={() => verHistorico(item)}
                style={completo ? { flex: 1 } : { marginLeft: 8 }}
              >
                Histórico ({item.total_recebimentos})
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.fornecedorNome}>
            {fornecedor.nome}
          </Text>
          <Text variant="bodySmall" style={styles.fornecedorInfo}>
            {itens.length} item(ns) • Pedido {pedido.numero}
          </Text>
        </Card.Content>
      </Card>

      <FlatList
        data={itens}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={carregarItens} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum item encontrado</Text>
        }
      />

      {/* Dialog de Registro */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Registrar Recebimento</Dialog.Title>
          <Dialog.Content>
            {itemSelecionado && (
              <>
                <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                  {itemSelecionado.produto_nome}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 8 }}>
                  Saldo pendente: {parseFloat(itemSelecionado.saldo_pendente as any) || 0} {itemSelecionado.unidade}
                </Text>
                <TextInput
                  label="Quantidade Recebida"
                  value={quantidade}
                  onChangeText={setQuantidade}
                  keyboardType="numeric"
                  mode="outlined"
                  style={{ marginBottom: 12 }}
                  right={<TextInput.Affix text={itemSelecionado.unidade} />}
                />
                <TextInput
                  label="Observações (opcional)"
                  value={observacoes}
                  onChangeText={setObservacoes}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={processando}>
              Cancelar
            </Button>
            <Button onPress={registrarRecebimento} loading={processando} disabled={processando}>
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Dialog de Histórico */}
        <Dialog 
          visible={historicoVisible} 
          onDismiss={() => setHistoricoVisible(false)}
          style={{ maxHeight: '80%' }}
        >
          <Dialog.Title>Histórico de Recebimentos</Dialog.Title>
          <Dialog.ScrollArea>
            <View style={{ paddingHorizontal: 24 }}>
              {itemSelecionado && (
                <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                  {itemSelecionado.produto_nome}
                </Text>
              )}
              {historico.map((rec, index) => (
                <View key={rec.id}>
                  {index > 0 && <Divider style={{ marginVertical: 12 }} />}
                  <View style={styles.historicoItem}>
                    <View style={styles.historicoHeader}>
                      <Text variant="titleSmall" style={{ color: '#4CAF50' }}>
                        {parseFloat(rec.quantidade_recebida as any) || 0} {itemSelecionado?.unidade}
                      </Text>
                      <Text variant="bodySmall" style={{ color: '#666' }}>
                        {formatarData(rec.data_recebimento)}
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={{ color: '#666', marginTop: 4 }}>
                      Por: {rec.usuario_nome}
                    </Text>
                    {rec.observacoes && (
                      <Text variant="bodySmall" style={{ marginTop: 4 }}>
                        {rec.observacoes}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setHistoricoVisible(false)}>Fechar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  headerCard: { margin: 16, marginBottom: 8, backgroundColor: '#4CAF50' },
  fornecedorNome: { color: '#FFF', fontWeight: 'bold' },
  fornecedorInfo: { color: '#FFF', marginTop: 4 },
  list: { padding: 16, paddingTop: 8 },
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  produto: { fontWeight: 'bold' },
  contrato: { color: '#666', marginTop: 4 },
  quantidades: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingVertical: 12, backgroundColor: '#F5F5F5', borderRadius: 8 },
  quantidadeItem: { alignItems: 'center' },
  valores: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0', marginBottom: 12 },
  label: { color: '#666', marginBottom: 4 },
  observacoes: { marginBottom: 12, padding: 12, backgroundColor: '#FFF3E0', borderRadius: 8 },
  acoes: { flexDirection: 'row', marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 32, color: '#999' },
  historicoItem: { paddingVertical: 8 },
  historicoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});
