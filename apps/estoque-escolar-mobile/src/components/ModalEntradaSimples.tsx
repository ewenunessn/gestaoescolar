import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ItemEstoqueEscola } from '../types';
import { validateData, entradaSimplesSchema, validateDataValidade, EntradaSimplesData } from '../schemas/validation';

interface ModalEntradaSimplesProps {
  visible: boolean;
  item: ItemEstoqueEscola | null;
  onClose: () => void;
  onConfirm: (dados: {
    quantidade: number;
    data_validade?: string;
    motivo: string;
    documento_referencia?: string;
  }) => Promise<void>;
}

const ModalEntradaSimples: React.FC<ModalEntradaSimplesProps> = ({
  visible,
  item,
  onClose,
  onConfirm,
}) => {
  const [quantidade, setQuantidade] = useState('');
  const [dataValidade, setDataValidade] = useState<Date | null>(null);
  const [motivo, setMotivo] = useState('');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setQuantidade('');
    setDataValidade(null);
    setMotivo('');
    setDocumentoReferencia('');
  };

  const formatarDataParaEnvio = (data: Date): string => {
    // Usar o fuso horário local para evitar problemas de timezone
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleConfirm = async () => {
    if (!quantidade || parseFloat(quantidade) <= 0) {
      Alert.alert('Erro', 'Informe uma quantidade válida');
      return;
    }



    try {
      setLoading(true);
      await onConfirm({
        quantidade: parseFloat(quantidade),
        data_validade: dataValidade ? formatarDataParaEnvio(dataValidade) : undefined,
        motivo: motivo.trim() || undefined,
        documento_referencia: documentoReferencia.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      Alert.alert('Erro', 'Falha ao registrar entrada de estoque');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDataValidade(selectedDate);
    }
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Entrada de Estoque</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Produto Info */}
          <View style={styles.produtoInfo}>
            <Text style={styles.produtoNome}>{item.produto_nome}</Text>
            <Text style={styles.produtoDetalhes}>
              Estoque atual: {Number(item.quantidade_atual || 0).toFixed(2)} {item.unidade_medida}
            </Text>
          </View>

          {/* Quantidade */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantidade a Adicionar *</Text>
            <View style={styles.quantidadeContainer}>
              <TextInput
                style={styles.quantidadeInput}
                value={quantidade}
                onChangeText={setQuantidade}
                placeholder="0"
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.unidadeText}>{item.unidade_medida}</Text>
            </View>
          </View>

          {/* Data de Validade */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data de Validade (Opcional)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={[styles.dateText, !dataValidade && styles.placeholderText]}>
                {dataValidade ? formatDate(dataValidade) : 'Selecionar data'}
              </Text>
              {dataValidade && (
                <TouchableOpacity
                  onPress={() => setDataValidade(null)}
                  style={styles.clearDateButton}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Motivo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Motivo da Entrada (Opcional)</Text>
            <TextInput
              style={styles.textInput}
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Ex: Recebimento de fornecedor, Transferência, etc."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Documento de Referência */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Documento de Referência (Opcional)</Text>
            <TextInput
              style={styles.textInput}
              value={documentoReferencia}
              onChangeText={setDocumentoReferencia}
              placeholder="Ex: Nota fiscal, Pedido nº, etc."
            />
          </View>

          {/* Preview */}
          {quantidade && parseFloat(quantidade) > 0 && (
            <View style={styles.preview}>
              <Text style={styles.previewTitle}>Resumo da Operação</Text>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Estoque atual:</Text>
                <Text style={styles.previewValue}>
                  {Number(item.quantidade_atual || 0).toFixed(2)} {item.unidade_medida}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Quantidade a adicionar:</Text>
                <Text style={[styles.previewValue, styles.previewPositive]}>
                  +{quantidade} {item.unidade_medida}
                </Text>
              </View>
              <View style={[styles.previewRow, styles.previewTotal]}>
                <Text style={styles.previewLabel}>Novo estoque:</Text>
                <Text style={[styles.previewValue, styles.previewTotalValue]}>
                  {(Number(item.quantidade_atual || 0) + parseFloat(quantidade || '0')).toFixed(2)} {item.unidade_medida}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.confirmButton, loading && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={loading}
          >
            <Text style={styles.confirmButtonText}>
              {loading ? 'Registrando...' : 'Registrar Entrada'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={dataValidade || new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  produtoInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  produtoDetalhes: {
    fontSize: 14,
    color: '#6B7280',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  quantidadeInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  unidadeText: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dateText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  clearDateButton: {
    padding: 4,
  },
  preview: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewTotal: {
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
    paddingTop: 8,
    marginTop: 4,
  },
  previewLabel: {
    fontSize: 14,
    color: '#374151',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  previewPositive: {
    color: '#059669',
  },
  previewTotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ModalEntradaSimples;