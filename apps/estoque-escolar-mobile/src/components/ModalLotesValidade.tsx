import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ItemEstoqueEscola, LoteEstoque, MovimentoLote } from '../types';
import { apiService } from '../services/api';

interface ModalLotesValidadeProps {
  visible: boolean;
  onClose: () => void;
  item: ItemEstoqueEscola | null;
  tipoMovimento: 'entrada' | 'saida' | 'ajuste';
  onConfirmar: (lotes: MovimentoLote[]) => void;
}

const ModalLotesValidade: React.FC<ModalLotesValidadeProps> = ({
  visible,
  onClose,
  item,
  tipoMovimento,
  onConfirmar,
}) => {
  const [lotes, setLotes] = useState<LoteEstoque[]>([]);
  const [lotesMovimento, setLotesMovimento] = useState<MovimentoLote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<{ index: number; type: 'fabricacao' | 'validade' } | null>(null);

  useEffect(() => {
    if (visible && item) {
      carregarLotes();
      inicializarLotesMovimento();
    }
  }, [visible, item]);

  const carregarLotes = async () => {
    if (!item) return;
    
    setLoading(true);
    try {
      const lotesData = await apiService.listarLotesProduto(item.produto_id);
      setLotes(lotesData);
    } catch (error) {
      console.error('Erro ao carregar lotes:', error);
      setLotes([]);
    } finally {
      setLoading(false);
    }
  };

  const inicializarLotesMovimento = () => {
    if (tipoMovimento === 'entrada') {
      // Para entrada, criar um lote vazio para preenchimento
      setLotesMovimento([{
        lote: '',
        quantidade: 0,
        data_validade: '',
        data_fabricacao: '',
        observacoes: ''
      }]);
    } else {
      // Para saída/ajuste, usar lotes existentes
      setLotesMovimento([]);
    }
  };

  const adicionarLoteEntrada = () => {
    setLotesMovimento([...lotesMovimento, {
      lote: '',
      quantidade: 0,
      data_validade: '',
      data_fabricacao: '',
      observacoes: ''
    }]);
  };

  const removerLoteEntrada = (index: number) => {
    const novosLotes = lotesMovimento.filter((_, i) => i !== index);
    setLotesMovimento(novosLotes);
  };

  const atualizarLoteMovimento = (index: number, campo: keyof MovimentoLote, valor: any) => {
    const novosLotes = [...lotesMovimento];
    novosLotes[index] = { ...novosLotes[index], [campo]: valor };
    setLotesMovimento(novosLotes);
  };

  const selecionarLoteExistente = (lote: LoteEstoque, quantidade: number) => {
    const loteExistente = lotesMovimento.find(l => l.lote === lote.lote);
    
    if (loteExistente) {
      // Atualizar quantidade do lote existente
      const novosLotes = lotesMovimento.map(l => 
        l.lote === lote.lote ? { ...l, quantidade } : l
      );
      setLotesMovimento(novosLotes);
    } else {
      // Adicionar novo lote
      setLotesMovimento([...lotesMovimento, {
        lote_id: lote.id,
        lote: lote.lote,
        quantidade,
        data_validade: lote.data_validade,
        data_fabricacao: lote.data_fabricacao,
        observacoes: ''
      }]);
    }
  };

  const confirmarMovimento = () => {
    // Validações
    if (lotesMovimento.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um lote');
      return;
    }

    const lotesValidos = lotesMovimento.filter(l => l.lote.trim() && l.quantidade > 0);
    if (lotesValidos.length === 0) {
      Alert.alert('Erro', 'Preencha pelo menos um lote com quantidade válida');
      return;
    }

    // Para entrada, validar datas de validade
    if (tipoMovimento === 'entrada') {
      const lotesComValidadeInvalida = lotesValidos.filter(l => {
        if (!l.data_validade) return false;
        const dataValidade = new Date(l.data_validade);
        const hoje = new Date();
        return dataValidade <= hoje;
      });

      if (lotesComValidadeInvalida.length > 0) {
        Alert.alert(
          'Atenção',
          'Alguns lotes têm data de validade vencida ou muito próxima. Deseja continuar?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: () => onConfirmar(lotesValidos) }
          ]
        );
        return;
      }
    }

    onConfirmar(lotesValidos);
  };

  const formatarData = (data: string): string => {
    if (!data) return '';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const calcularDiasVencimento = (dataValidade: string): number => {
    if (!dataValidade) return 0;
    const hoje = new Date();
    const vencimento = new Date(dataValidade);
    const diffTime = vencimento.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getCorValidade = (dias: number): string => {
    if (dias <= 0) return '#FF4444';
    if (dias <= 7) return '#FF8800';
    if (dias <= 30) return '#FFD700';
    return '#4CAF50';
  };

  const renderLotesExistentes = () => {
    if (tipoMovimento === 'entrada' || lotes.length === 0) return null;

    // Ordenar lotes por prioridade (FEFO - First Expired, First Out)
    const lotesOrdenados = [...lotes]
      .filter(l => l.status === 'ativo' && l.quantidade_atual > 0)
      .sort((a, b) => {
        if (a.data_validade && b.data_validade) {
          return new Date(a.data_validade).getTime() - new Date(b.data_validade).getTime();
        }
        return 0;
      });

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Lotes Disponíveis (ordenados por vencimento)
        </Text>
        {lotesOrdenados.map((lote) => {
          const diasVencimento = lote.data_validade ? calcularDiasVencimento(lote.data_validade) : 0;
          const loteMovimento = lotesMovimento.find(l => l.lote === lote.lote);
          
          return (
            <View key={lote.id} style={styles.loteCard}>
              <View style={styles.loteHeader}>
                <Text style={styles.loteNome}>Lote: {lote.lote}</Text>
                <Text style={styles.loteQuantidade}>
                  {lote.quantidade_atual} {item?.unidade_medida}
                </Text>
              </View>
              
              {lote.data_validade && (
                <View style={styles.loteValidade}>
                  <Ionicons name="calendar-outline" size={14} color="#666" />
                  <Text style={styles.loteValidadeText}>
                    Vence em {formatarData(lote.data_validade)}
                  </Text>
                  <Text style={[
                    styles.diasVencimento,
                    { color: getCorValidade(diasVencimento) }
                  ]}>
                    ({diasVencimento > 0 ? `${diasVencimento} dias` : 'Vencido'})
                  </Text>
                </View>
              )}

              <View style={styles.loteActions}>
                <TextInput
                  style={styles.quantidadeInput}
                  placeholder="Quantidade"
                  value={loteMovimento?.quantidade.toString() || ''}
                  onChangeText={(text) => {
                    const quantidade = parseFloat(text) || 0;
                    if (quantidade <= lote.quantidade_atual) {
                      selecionarLoteExistente(lote, quantidade);
                    } else {
                      Alert.alert('Erro', 'Quantidade não pode ser maior que o disponível');
                    }
                  }}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.usarTodoButton}
                  onPress={() => selecionarLoteExistente(lote, lote.quantidade_atual)}
                >
                  <Text style={styles.usarTodoText}>Usar Tudo</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderLotesEntrada = () => {
    if (tipoMovimento !== 'entrada') return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Novos Lotes</Text>
          <TouchableOpacity style={styles.addButton} onPress={adicionarLoteEntrada}>
            <Ionicons name="add" size={20} color="#2196F3" />
            <Text style={styles.addButtonText}>Adicionar Lote</Text>
          </TouchableOpacity>
        </View>

        {lotesMovimento.map((lote, index) => (
          <View key={index} style={styles.loteEntradaCard}>
            <View style={styles.loteEntradaHeader}>
              <Text style={styles.loteEntradaTitle}>Lote {index + 1}</Text>
              {lotesMovimento.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removerLoteEntrada(index)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF4444" />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Código do lote *"
              value={lote.lote}
              onChangeText={(text) => atualizarLoteMovimento(index, 'lote', text)}
            />

            <TextInput
              style={styles.input}
              placeholder="Quantidade *"
              value={lote.quantidade.toString()}
              onChangeText={(text) => atualizarLoteMovimento(index, 'quantidade', parseFloat(text) || 0)}
              keyboardType="numeric"
            />

            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker({ index, type: 'fabricacao' })}
              >
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.dateButtonText}>
                  {lote.data_fabricacao ? formatarData(lote.data_fabricacao) : 'Data Fabricação'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker({ index, type: 'validade' })}
              >
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.dateButtonText}>
                  {lote.data_validade ? formatarData(lote.data_validade) : 'Data Validade *'}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observações"
              value={lote.observacoes}
              onChangeText={(text) => atualizarLoteMovimento(index, 'observacoes', text)}
              multiline
              numberOfLines={2}
            />
          </View>
        ))}
      </View>
    );
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {tipoMovimento === 'entrada' ? 'Entrada com Lotes' : 'Saída por Lotes'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.produtoInfo}>
              <Text style={styles.produtoNome}>{item.produto_nome}</Text>
              <Text style={styles.produtoQuantidade}>
                Estoque atual: {item.quantidade_atual} {item.unidade_medida}
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Carregando lotes...</Text>
              </View>
            ) : (
              <>
                {renderLotesExistentes()}
                {renderLotesEntrada()}
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={confirmarMovimento}>
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(null);
            if (selectedDate && showDatePicker) {
              const campo = showDatePicker.type === 'fabricacao' ? 'data_fabricacao' : 'data_validade';
              atualizarLoteMovimento(showDatePicker.index, campo, selectedDate.toISOString().split('T')[0]);
            }
          }}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  produtoInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  produtoQuantidade: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  loteCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  loteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loteNome: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  loteQuantidade: {
    fontSize: 14,
    color: '#666',
  },
  loteValidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  loteValidadeText: {
    fontSize: 13,
    color: '#666',
  },
  diasVencimento: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loteActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quantidadeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  usarTodoButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  usarTodoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loteEntradaCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  loteEntradaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loteEntradaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ModalLotesValidade;