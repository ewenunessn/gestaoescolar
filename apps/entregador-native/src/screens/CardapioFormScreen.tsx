import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, HelperText, Menu } from 'react-native-paper';
import { criarCardapio, atualizarCardapio, listarRefeicoes } from '../api/nutricao';

export default function CardapioFormScreen({ navigation, route }: any) {
  const { cardapio } = route.params || {};
  const [data, setData] = useState('');
  const [refeicaoId, setRefeicaoId] = useState<number | null>(null);
  const [modalidadeId, setModalidadeId] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  
  const [refeicoes, setRefeicoes] = useState<any[]>([]);
  const [refeicaoMenuVisible, setRefeicaoMenuVisible] = useState(false);
  const [modalidadeMenuVisible, setModalidadeMenuVisible] = useState(false);

  const modalidades = [
    { id: 1, nome: 'Creche' },
    { id: 2, nome: 'Pré-Escola' },
    { id: 3, nome: 'Fundamental' },
    { id: 4, nome: 'EJA' },
  ];

  useEffect(() => {
    loadRefeicoes();
    if (cardapio) {
      setData(cardapio.data);
      setRefeicaoId(cardapio.refeicao_id);
      setModalidadeId(cardapio.modalidade_id);
      setObservacoes(cardapio.observacoes || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setData(today);
    }
  }, [cardapio]);

  const loadRefeicoes = async () => {
    try {
      const data = await listarRefeicoes();
      setRefeicoes(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erro ao carregar refeições:', error);
      Alert.alert('Erro', error.message);
      setRefeicoes([]);
    }
  };

  const validate = () => {
    const newErrors: any = {};
    
    if (!data) {
      newErrors.data = 'Data é obrigatória';
    }
    if (!refeicaoId) {
      newErrors.refeicaoId = 'Refeição é obrigatória';
    }
    if (!modalidadeId) {
      newErrors.modalidadeId = 'Modalidade é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const payload = {
        data,
        refeicao_id: refeicaoId!,
        modalidade_id: modalidadeId!,
        observacoes: observacoes.trim() || undefined,
      };

      if (cardapio) {
        await atualizarCardapio(cardapio.id, payload);
        Alert.alert('Sucesso', 'Cardápio atualizado com sucesso');
      } else {
        await criarCardapio(payload);
        Alert.alert('Sucesso', 'Cardápio criado com sucesso');
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRefeicaoNome = () => {
    const refeicao = refeicoes.find((r: any) => r.id === refeicaoId);
    return refeicao ? (refeicao as any).nome : 'Selecione uma refeição';
  };

  const getModalidadeNome = () => {
    const modalidade = modalidades.find((m: any) => m.id === modalidadeId);
    return modalidade ? modalidade.nome : 'Selecione uma modalidade';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TextInput
          label="Data *"
          value={data}
          onChangeText={setData}
          mode="outlined"
          style={styles.input}
          error={!!errors.data}
          placeholder="YYYY-MM-DD"
        />
        <HelperText type="error" visible={!!errors.data}>
          {errors.data}
        </HelperText>

        <Menu
          visible={refeicaoMenuVisible}
          onDismiss={() => setRefeicaoMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setRefeicaoMenuVisible(true)}
              style={[styles.input, errors.refeicaoId && styles.errorButton]}
            >
              {getRefeicaoNome()}
            </Button>
          }
        >
          {Array.isArray(refeicoes) && refeicoes.length > 0 ? (
            refeicoes.map((refeicao: any) => (
              <Menu.Item
                key={refeicao.id}
                onPress={() => {
                  setRefeicaoId(refeicao.id);
                  setRefeicaoMenuVisible(false);
                }}
                title={refeicao.nome}
              />
            ))
          ) : (
            <Menu.Item title="Nenhuma refeição cadastrada" disabled />
          )}
        </Menu>
        <HelperText type="error" visible={!!errors.refeicaoId}>
          {errors.refeicaoId}
        </HelperText>

        <Menu
          visible={modalidadeMenuVisible}
          onDismiss={() => setModalidadeMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setModalidadeMenuVisible(true)}
              style={[styles.input, errors.modalidadeId && styles.errorButton]}
            >
              {getModalidadeNome()}
            </Button>
          }
        >
          {modalidades.map((modalidade: any) => (
            <Menu.Item
              key={modalidade.id}
              onPress={() => {
                setModalidadeId(modalidade.id);
                setModalidadeMenuVisible(false);
              }}
              title={modalidade.nome}
            />
          ))}
        </Menu>
        <HelperText type="error" visible={!!errors.modalidadeId}>
          {errors.modalidadeId}
        </HelperText>

        <TextInput
          label="Observações"
          value={observacoes}
          onChangeText={setObservacoes}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {cardapio ? 'Atualizar' : 'Criar'}
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.button}
        >
          Cancelar
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  input: {
    marginBottom: 5,
  },
  errorButton: {
    borderColor: '#f44336',
  },
  button: {
    marginTop: 10,
  },
});
