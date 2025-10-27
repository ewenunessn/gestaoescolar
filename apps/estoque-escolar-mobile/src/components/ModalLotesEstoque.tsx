import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemEstoqueEscola, LoteEstoque, MovimentoLote } from '../types';

interface ModalLotesEstoqueProps {
  visible: boolean;
  item: ItemEstoqueEscola | null;
  tipoMovimento: 'entrada' | 'saida' | 'ajuste';
  onClose: () => void;
  onSave: (lotes: MovimentoLote[], tipo: 'entrada' | 'saida' | 'ajuste') => Promise<void>;
}

const ModalLotesEstoque: React.FC<ModalLotesEstoqueProps> = ({
  visible,
  item,
  tipoMovimento: tipoInicial,
  onClose,
  onSave,
}) => {
  const [lotes, setLotes] = useState<MovimentoLote[]>([]);
  const [tipoMovimento, setTipoMovimento] = useState<'entrada' | 'saida' | 'ajuste'>(tipoInicial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && item) {
      setTipoMovimento(tipoInicial);
      atualizarLotesPorTipo(tipoInicial);
    }
  }, [visible, item, tipoInicial]);

  const atualizarLotesPorTipo = (tipo: 'entrada' | 'saida' | 'ajuste') => {
    if (!item) return;
    
    if (tipo === 'entrada') {
      // Para entrada, começar com um lote vazio
      setLotes([{
        lote: '',
        quantidade: 0,
        data_validade: '',
        data_fabricacao: '',
        observacoes: ''
      }]);
    } else if (tipo === 'saida' && item.lotes) {
      // Para saída, mostrar lotes existentes com quantidade 0
      setLotes(item.lotes
        .filter(lote => lote.quantidade_atual > 0)
        .map(lote => ({
          lote_id: lote.id,
          lote: lote.lote,
          quantidade: 0,
          data_validade: lote.data_validade,
          data_fabricacao: lote.data_fabricacao,
          observacoes: ''
        }))
      );
    } else {
      // Para ajuste, começar vazio
      setLotes([]);
    }
  };

  const adicionarLote = () => {
    setLotes(prev => [...prev, {
      lote: '',
      quantidade: 0,
      data_validade: '',
      data_fabricacao: '',
      observacoes: ''
    }]);
  };

  const removerLote = (index: number) => {
    setLotes(prev => prev.filter((_, i) => i !== index));
  };

  const atualizarLote = (index: number, campo: keyof MovimentoLote, valor: any) => {
    setLotes(prev => prev.map((lote, i) => 
      i === index ? { ...lote, [campo]: valor } : lote
    ));
  };

  const formatarData = (data: string) => {
    if (!data) return '';
    // Converter de YYYY-MM-DD para DD/MM/YYYY
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const converterData = (data: string) => {
    if (!data) return '';
    // Converter de DD/MM/YYYY para YYYY-MM-DD
    if (data.includes('/')) {
      const [dia, mes, ano] = data.split('/');
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    return data;
  };

  const validarLotes = () => {
    for (let i = 0; i < lotes.length; i++) {
      const lote = lotes[i];
      
      if (tipoMovimento === 'entrada' && !lote.lote?.trim()) {
        Alert.alert('Erro', `Lote ${i + 1}: Nome do lote é obrigatório`);
        return false;
      }
      
      if (lote.quantidade <= 0) {
        Alert.alert('Erro', `Lote ${i + 1}: Quantidade deve ser maior que zero`);
        return false;
      }

      if (tipoMovimento === 'saida' && item?.lotes) {
        const loteOriginal = item.lotes.find(l => l.id === lote.lote_id);
        if (loteOriginal && lote.quantidade > loteOriginal.quantidade_atual) {
          Alert.alert('Erro', `Lote ${lote.lote}: Quantidade de saída (${lote.quantidade}) não pode ser maior que a disponível (${loteOriginal.quantidade_atual})`);
          return false;
        }
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (lotes.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um lote');
      return;
    }

    if (!validarLotes()) {
      return;
    }

    try {
      setLoading(true);
      
      // Converter datas para formato ISO
      const lotesFormatados = lotes.map(lote => ({
        ...lote,
        data_validade: converterData(lote.data_validade || ''),
        data_fabricacao: converterData(lote.data_fabricacao || ''),
      }));

      await onSave(lotesFormatados, tipoMovimento);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar lotes:', error);
      Alert.alert('Erro', 'Não foi possível salvar os lotes');
    } finally {
      setLoading(false);
    }
  };

  const getTituloModal = () => {
    switch (tipoMovimento) {
      case 'entrada': return 'Entrada por Lotes';
      case 'saida': return 'Saída por Lotes';
      case 'ajuste': return 'Ajuste por Lotes';
      default: return 'Gerenciar Lotes';
    }
  };

  const getQuantidadeDisponivel = (loteId?: number) => {
    if (!item?.lotes || !loteId) return 0;
    const lote = item.lotes.find(l => l.id === loteId);
    return lote?.quantidade_atual || 0;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{getTituloModal()}</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        {item && (
          <View style={styles.produtoInfo}>
            <Text style={styles.produtoNome}>{item.produto_nome}</Text>
            <Text style={styles.quantidadeAtual}>
              Quantidade atual: {item.quantidade_atual} {item.unidade_medida}
            </Text>
            
            <View style={styles.tipoMovimentoContainer}>
              {(['entrada', 'saida', 'ajuste'] as const).map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.tipoButton,
                    tipoMovimento === tipo && styles.tipoButtonActive
                  ]}
                  onPress={() => {
                    setTipoMovimento(tipo);
                    atualizarLotesPorTipo(tipo);
                  }}
                >
                  <Text style={[
                    styles.tipoButtonText,
                    tipoMovimento === tipo && styles.tipoButtonTextActive
                  ]}>
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {lotes.map((lote, index) => (
            <View key={index} style={styles.loteContainer}>
              <View style={styles.loteHeader}>
                <Text style={styles.loteTitle}>Lote {index + 1}</Text>
                {lotes.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => removerLote(index)}
                    style={styles.removerButton}
                  >
                    <Ionicons name="trash" size={20} color="#f44336" />
                  </TouchableOpacity>
                )}
              </View>

              {tipoMovimento === 'entrada' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nome do Lote *</Text>
                  <TextInput
                    style={styles.input}
                    value={lote.lote}
                    onChangeText={(value) => atualizarLote(index, 'lote', value)}
                    placeholder="Ex: L001, Lote A, etc."
                    maxLength={50}
                  />
                </View>
              )}

              {tipoMovimento === 'saida' && (
                <View style={styles.loteInfo}>
                  <Text style={styles.loteNome}>Lote: {lote.lote || 'N/A'}</Text>
                  <Text style={styles.quantidadeDisponivel}>
                    Disponível: {getQuantidadeDisponivel(lote.lote_id)} {item?.unidade_medida}
                  </Text>
                  {lote.data_validade && (
                    <Text style={styles.dataValidade}>
                      Validade: {formatarData(lote.data_validade)}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Quantidade {tipoMovimento === 'entrada' ? 'a adicionar' : 
                              tipoMovimento === 'saida' ? 'a retirar' : 'nova'} *
                </Text>
                <View style={styles.quantidadeContainer}>
                  <TextInput
                    style={styles.quantidadeInput}
                    value={lote.quantidade.toString()}
                    onChangeText={(value) => atualizarLote(index, 'quantidade', parseFloat(value) || 0)}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  <Text style={styles.unidadeText}>{item?.unidade_medida}</Text>
                </View>
              </View>

              {tipoMovimento === 'entrada' && (
                <>
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>Data de Fabricação</Text>
                      <TextInput
                        style={styles.input}
                        value={formatarData(lote.data_fabricacao || '')}
                        onChangeText={(value) => atualizarLote(index, 'data_fabricacao', value)}
                        placeholder="DD/MM/AAAA"
                        maxLength={10}
                      />
                    </View>

                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>Data de Validade</Text>
                      <TextInput
                        style={styles.input}
                        value={formatarData(lote.data_validade || '')}
                        onChangeText={(value) => atualizarLote(index, 'data_validade', value)}
                        placeholder="DD/MM/AAAA"
                        maxLength={10}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Observações</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={lote.observacoes}
                      onChangeText={(value) => atualizarLote(index, 'observacoes', value)}
                      placeholder="Observações sobre o lote"
                      multiline
                      numberOfLines={2}
                      maxLength={200}
                    />
                  </View>
                </>
              )}
            </View>
          ))}

          <TouchableOpacity 
            style={styles.adicionarLoteButton}
            onPress={adicionarLote}
          >
            <Ionicons name="add" size={20} color="#2196f3" />
            <Text style={styles.adicionarLoteText}>Adicionar Lote</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  produtoInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  quantidadeAtual: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  tipoMovimentoContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tipoButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  tipoButtonActive: {
    backgroundColor: '#2196f3',
  },
  tipoButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tipoButtonTextActive: {
    color: 'white',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  loteContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removerButton: {
    padding: 4,
  },
  loteInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  loteNome: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  quantidadeDisponivel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dataValidade: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantidadeInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  unidadeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  adicionarLoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2196f3',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  adicionarLoteText: {
    fontSize: 16,
    color: '#2196f3',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ModalLotesEstoque;