import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, StyleSheet, Alert, Platform, Modal, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Card, Text, Button, Dialog, Portal, TextInput, Chip, Divider, IconButton } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { recebimentosAPI, ItemPedido, PedidoPendente, FornecedorPedido, Recebimento } from '../api/recebimentos';
import { registrarEntrada, EntradaData } from '../api/estoqueCentral';
import { formatarDataBR, stringParaData, formatarDataParaInput } from '../utils/dateUtils';

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
  
  // Estados para o diálogo de entrada no estoque
  const [dialogEstoqueVisible, setDialogEstoqueVisible] = useState(false);
  const [quantidadeRecebida, setQuantidadeRecebida] = useState(0);
  const [lote, setLote] = useState('');
  const [dataFabricacao, setDataFabricacao] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [observacoesEstoque, setObservacoesEstoque] = useState('');
  const [showDatePickerFabricacao, setShowDatePickerFabricacao] = useState(false);
  const [showDatePickerValidade, setShowDatePickerValidade] = useState(false);

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

  // Gerar código de lote automaticamente
  const gerarCodigoLote = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const hora = String(hoje.getHours()).padStart(2, '0');
    const minuto = String(hoje.getMinutes()).padStart(2, '0');
    const segundo = String(hoje.getSeconds()).padStart(2, '0');
    
    // Formato: LOTE-YYYYMMDD-HHMMSS
    return `LOTE-${ano}${mes}${dia}-${hora}${minuto}${segundo}`;
  };

  // Calcular itens atrasados
  const itensAtrasados = itens.filter(item => {
    if (!item.data_entrega_prevista) return false;
    const saldoPendente = parseFloat(item.saldo_pendente as any) || 0;
    if (saldoPendente <= 0) return false;
    
    const dataEntrega = new Date(item.data_entrega_prevista);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataEntrega.setHours(0, 0, 0, 0);
    return dataEntrega < hoje;
  }).length;

  const abrirDialogRecebimento = (item: ItemPedido) => {
    setItemSelecionado(item);
    // Formatar número removendo zeros desnecessários
    const saldo = parseFloat(item.saldo_pendente as any) || 0;
    setQuantidade(saldo % 1 === 0 ? saldo.toString() : saldo.toFixed(2).replace(/\.?0+$/, ''));
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
      
      // Abrir diálogo de entrada no estoque com lote gerado automaticamente
      setQuantidadeRecebida(qtd);
      setLote(gerarCodigoLote()); // Gerar lote automaticamente
      setDataFabricacao('');
      setDataValidade('');
      setNotaFiscal('');
      setObservacoesEstoque(observacoes || '');
      setDialogEstoqueVisible(true);
      
      carregarItens();
    } catch (error: any) {
      console.error('Erro ao registrar:', error);
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao registrar recebimento');
    } finally {
      setProcessando(false);
    }
  };

  const registrarEntradaEstoque = async () => {
    if (!itemSelecionado) return;

    // Validações
    if (!lote.trim()) {
      Alert.alert('Erro', 'Informe o número do lote');
      return;
    }

    if (!dataValidade.trim()) {
      Alert.alert('Erro', 'Informe a data de validade');
      return;
    }

    try {
      setProcessando(true);
      
      const dadosEntrada: EntradaData = {
        produto_id: itemSelecionado.produto_id,
        quantidade: quantidadeRecebida,
        lote: lote.trim(),
        data_validade: dataValidade.trim(),
        data_fabricacao: dataFabricacao.trim() || undefined,
        nota_fiscal: notaFiscal.trim() || undefined,
        fornecedor: fornecedor.nome,
        observacao: observacoesEstoque.trim() || undefined,
        motivo: `Recebimento do pedido ${pedido.numero}`
      };

      await registrarEntrada(dadosEntrada);
      
      Alert.alert('Sucesso', 'Entrada no estoque registrada com sucesso!');
      setDialogEstoqueVisible(false);
    } catch (error: any) {
      console.error('Erro ao registrar entrada:', error);
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao registrar entrada no estoque');
    } finally {
      setProcessando(false);
    }
  };

  const pularEntradaEstoque = () => {
    Alert.alert(
      'Pular entrada no estoque',
      'Você poderá registrar a entrada no estoque posteriormente através do módulo de Estoque Central.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Pular', 
          onPress: () => setDialogEstoqueVisible(false),
          style: 'destructive'
        }
      ]
    );
  };

  const onChangeDateFabricacao = (_event: any, selectedDate?: Date) => {
    setShowDatePickerFabricacao(Platform.OS === 'ios');
    if (selectedDate) {
      setDataFabricacao(formatarDataParaInput(selectedDate));
    }
  };

  const onChangeDateValidade = (_event: any, selectedDate?: Date) => {
    setShowDatePickerValidade(Platform.OS === 'ios');
    if (selectedDate) {
      setDataValidade(formatarDataParaInput(selectedDate));
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
    const percentualRecebido = quantidade > 0 ? (quantidadeRecebida / quantidade) * 100 : 0;
    const completo = saldoPendente <= 0;

    const formatarDataEntrega = (data: string) => {
      if (!data) return null;
      const d = new Date(data);
      return d.toLocaleDateString('pt-BR');
    };

    // Verificar se está atrasado
    const estaAtrasado = () => {
      if (!item.data_entrega_prevista || completo) return false;
      const dataEntrega = new Date(item.data_entrega_prevista);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      dataEntrega.setHours(0, 0, 0, 0);
      return dataEntrega < hoje;
    };

    const atrasado = estaAtrasado();

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={styles.produto}>
                {item.produto_nome}
              </Text>
              <Text variant="bodySmall" style={styles.contrato}>
                {item.contrato_numero}
              </Text>
              {item.data_entrega_prevista && (
                <Text variant="bodySmall" style={[
                  styles.dataEntrega,
                  atrasado && styles.dataAtrasada
                ]}>
                  Entrega: {formatarDataEntrega(item.data_entrega_prevista)}
                  {atrasado && ' (EM ATRASO)'}
                </Text>
              )}
            </View>
            {completo && (
              <Chip mode="flat" compact style={{ backgroundColor: '#4CAF50' }} textStyle={{ color: '#FFF', fontSize: 11 }}>
                OK
              </Chip>
            )}
          </View>

          <View style={styles.quantidades}>
            <View style={styles.quantidadeItem}>
              <Text variant="bodySmall" style={styles.labelCompact}>Pedido</Text>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                {quantidade} {item.unidade}
              </Text>
            </View>
            <View style={styles.quantidadeItem}>
              <Text variant="bodySmall" style={styles.labelCompact}>Recebido</Text>
              <Text variant="bodyMedium" style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                {quantidadeRecebida}
              </Text>
            </View>
            <View style={styles.quantidadeItem}>
              <Text variant="bodySmall" style={styles.labelCompact}>Saldo</Text>
              <Text variant="bodyMedium" style={{ color: completo ? '#4CAF50' : '#FF9800', fontWeight: 'bold' }}>
                {saldoPendente}
              </Text>
            </View>
          </View>

          {item.observacoes && (
            <Text variant="bodySmall" style={styles.observacoesCompact} numberOfLines={1}>
              Obs: {item.observacoes}
            </Text>
          )}

          <View style={styles.acoesCompact}>
            {!completo && (
              <Button
                mode="contained"
                onPress={() => abrirDialogRecebimento(item)}
                style={{ flex: 1 }}
                compact
              >
                Registrar
              </Button>
            )}
            {item.total_recebimentos > 0 && (
              <Button
                mode="outlined"
                onPress={() => verHistorico(item)}
                style={completo ? { flex: 1 } : { marginLeft: 8 }}
                compact
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

        {/* Dialog de Entrada no Estoque - Usando Modal para melhor controle do teclado */}
        <Modal
          visible={dialogEstoqueVisible}
          transparent
          animationType="slide"
          onRequestClose={pularEntradaEstoque}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Entrada no Estoque Central
                </Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={pularEntradaEstoque}
                />
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
                {itemSelecionado && (
                  <>
                    <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>
                      {itemSelecionado.produto_nome}
                    </Text>
                    <Text variant="bodySmall" style={{ marginBottom: 16, color: '#666' }}>
                      Quantidade recebida: {quantidadeRecebida} {itemSelecionado.unidade}
                    </Text>
                  </>
                )}
                
                <TextInput
                  label="Lote *"
                  value={lote}
                  onChangeText={setLote}
                  mode="outlined"
                  style={{ marginBottom: 8 }}
                  placeholder="Ex: LOTE-20260303-120000"
                />
                <Button
                  mode="outlined"
                  onPress={() => setLote(gerarCodigoLote())}
                  icon="refresh"
                  compact
                  style={{ marginBottom: 12 }}
                >
                  Gerar Novo Lote
                </Button>
                
                <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: '600', color: '#666' }}>
                  Data de Fabricação:
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowDatePickerFabricacao(true)}
                  icon="calendar"
                  style={{ marginBottom: 12, justifyContent: 'flex-start' }}
                >
                  {dataFabricacao ? formatarDataBR(dataFabricacao) : 'Selecionar (opcional)'}
                </Button>

                {showDatePickerFabricacao && (
                  <DateTimePicker
                    value={dataFabricacao ? stringParaData(dataFabricacao) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onChangeDateFabricacao}
                  />
                )}
                
                <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: '600', color: '#666' }}>
                  Data de Validade *:
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowDatePickerValidade(true)}
                  icon="calendar"
                  style={{ marginBottom: 12, justifyContent: 'flex-start' }}
                >
                  {dataValidade ? formatarDataBR(dataValidade) : 'Selecionar'}
                </Button>

                {showDatePickerValidade && (
                  <DateTimePicker
                    value={dataValidade ? stringParaData(dataValidade) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onChangeDateValidade}
                    minimumDate={new Date()}
                  />
                )}
                
                <TextInput
                  label="Nota Fiscal"
                  value={notaFiscal}
                  onChangeText={setNotaFiscal}
                  mode="outlined"
                  style={{ marginBottom: 12 }}
                  placeholder="Número da NF"
                />
                
                <TextInput
                  label="Observações"
                  value={observacoesEstoque}
                  onChangeText={setObservacoesEstoque}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={{ marginBottom: 8 }}
                />
                
                <Text variant="bodySmall" style={{ color: '#666', fontStyle: 'italic', marginBottom: 16 }}>
                  * Campos obrigatórios
                </Text>
              </ScrollView>

              <View style={styles.modalActions}>
                <Button 
                  onPress={pularEntradaEstoque} 
                  disabled={processando}
                  mode="outlined"
                  style={{ flex: 1, marginRight: 8 }}
                >
                  Pular
                </Button>
                <Button 
                  onPress={registrarEntradaEstoque} 
                  loading={processando} 
                  disabled={processando}
                  mode="contained"
                  style={{ flex: 1 }}
                >
                  Registrar
                </Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  card: { marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  produto: { fontWeight: 'bold', fontSize: 14 },
  contrato: { color: '#666', marginTop: 2, fontSize: 11 },
  dataEntrega: { color: '#2196F3', marginTop: 2, fontSize: 11, fontWeight: '500' },
  dataAtrasada: { color: '#D32F2F', fontWeight: 'bold' },
  quantidades: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginVertical: 8, 
    paddingVertical: 8, 
    backgroundColor: '#F5F5F5', 
    borderRadius: 6 
  },
  quantidadeItem: { alignItems: 'center' },
  labelCompact: { color: '#666', marginBottom: 2, fontSize: 10 },
  observacoesCompact: { 
    marginTop: 4, 
    marginBottom: 8, 
    padding: 6, 
    backgroundColor: '#FFF3E0', 
    borderRadius: 4,
    fontSize: 11,
    color: '#666'
  },
  acoesCompact: { flexDirection: 'row', marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 32, color: '#999' },
  historicoItem: { paddingVertical: 8 },
  historicoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // Estilos para o Modal de Entrada no Estoque
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});
