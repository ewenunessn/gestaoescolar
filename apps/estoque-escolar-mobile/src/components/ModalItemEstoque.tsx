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
import { ItemEstoqueEscola } from '../types';

interface ModalItemEstoqueProps {
  visible: boolean;
  item?: ItemEstoqueEscola | null;
  onClose: () => void;
  onSave: (item: Partial<ItemEstoqueEscola>) => Promise<void>;
}

const ModalItemEstoque: React.FC<ModalItemEstoqueProps> = ({
  visible,
  item,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    quantidade: '',
    quantidade_minima: '',
    unidade: '',
    localizacao: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        nome: item.produto_nome || '',
        descricao: item.produto_descricao || '',
        categoria: item.categoria || '',
        quantidade: item.quantidade_atual?.toString() || '',
        quantidade_minima: item.quantidade_minima?.toString() || '',
        unidade: item.unidade_medida || '',
        localizacao: item.observacoes || '',
      });
    } else {
      setFormData({
        nome: '',
        descricao: '',
        categoria: '',
        quantidade: '',
        quantidade_minima: '',
        unidade: '',
        localizacao: '',
      });
    }
  }, [item, visible]);

  const handleSave = async () => {
    // Validações
    if (!formData.nome.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }

    if (!formData.categoria.trim()) {
      Alert.alert('Erro', 'Categoria é obrigatória');
      return;
    }

    if (!formData.quantidade.trim() || isNaN(Number(formData.quantidade))) {
      Alert.alert('Erro', 'Quantidade deve ser um número válido');
      return;
    }

    if (!formData.quantidade_minima.trim() || isNaN(Number(formData.quantidade_minima))) {
      Alert.alert('Erro', 'Quantidade mínima deve ser um número válido');
      return;
    }

    if (!formData.unidade.trim()) {
      Alert.alert('Erro', 'Unidade é obrigatória');
      return;
    }

    try {
      setLoading(true);
      
      const itemData: Partial<ItemEstoqueEscola> = {
        produto_nome: formData.nome.trim(),
        produto_descricao: formData.descricao.trim(),
        categoria: formData.categoria.trim(),
        quantidade_atual: Number(formData.quantidade),
        quantidade_minima: Number(formData.quantidade_minima),
        unidade_medida: formData.unidade.trim(),
        observacoes: formData.localizacao.trim(),
      };

      if (item) {
        itemData.id = item.id;
      }

      await onSave(itemData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      Alert.alert('Erro', 'Não foi possível salvar o item');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <Text style={styles.title}>
            {item ? 'Editar Item' : 'Novo Item'}
          </Text>
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

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={formData.nome}
              onChangeText={(value) => updateFormData('nome', value)}
              placeholder="Nome do item"
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoria *</Text>
            <TextInput
              style={styles.input}
              value={formData.categoria}
              onChangeText={(value) => updateFormData('categoria', value)}
              placeholder="Categoria do item"
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.descricao}
              onChangeText={(value) => updateFormData('descricao', value)}
              placeholder="Descrição do item"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Quantidade *</Text>
              <TextInput
                style={styles.input}
                value={formData.quantidade}
                onChangeText={(value) => updateFormData('quantidade', value)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Quantidade Mínima *</Text>
              <TextInput
                style={styles.input}
                value={formData.quantidade_minima}
                onChangeText={(value) => updateFormData('quantidade_minima', value)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Unidade *</Text>
            <TextInput
              style={styles.input}
              value={formData.unidade}
              onChangeText={(value) => updateFormData('unidade', value)}
              placeholder="Ex: un, kg, l, m"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Localização</Text>
            <TextInput
              style={styles.input}
              value={formData.localizacao}
              onChangeText={(value) => updateFormData('localizacao', value)}
              placeholder="Ex: Sala 1, Armário A"
              maxLength={100}
            />
          </View>
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
  form: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
});

export default ModalItemEstoque;