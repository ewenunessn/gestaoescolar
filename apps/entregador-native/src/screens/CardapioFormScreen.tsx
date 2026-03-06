import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, HelperText, Menu, ActivityIndicator } from 'react-native-paper';
import { criarCardapio, atualizarCardapio, listarRefeicoes } from '../api/nutricao';
import axios from 'axios';

export default function CardapioFormScreen({ navigation, route }: any) {
  const { cardapio } = route.params || {};
  const [data, setData] = useState('');
  const [refeicaoId, setRefeicaoId] = useState<number | null>(null);
  const [modalidadeId, setModalidadeId] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<any>({});
  
  const [refeicoes, setRefeicoes] = useState<any[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [refeicaoMenuVisible, setRefeicaoMenuVisible] = useState(false);
  const [modalidadeMenuVisible, setModalidadeMenuVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
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

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [refeicoesData, modalidadesData] = await Promise.all([
        listarRefeicoes(),
        loadModalidades(),
      ]);
      setRefeicoes(Array.isArray(refeicoesData) ? refeicoesData : []);
      setModalidades(Array.isArray(modalidadesData) ? modalidadesData : []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Erro ao carregar dados: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  const loadModalidades = async () => {
    try {
      const baseURL = 'https://gestaoescolar-backend.vercel.app/api';
      const response = await axios.get(`${baseURL}/modalidades`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Erro ao carregar modalidades:', error);
      return [];
    }
  };

  const validate = () => {
    const newErrors: any = {};
    
    if (!data) {
      newErrors.data = 'Data é obrigatória';
    } else {
      // Validar formato de data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data)) {
        newErrors.data = 'Formato inválido. Use YYYY-MM-DD';
      }
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
    return refeicao ? refeicao.nome : 'Selecione uma refeição';
  };

  const getModalidadeNome = () => {
    const modalidade = modalidades.find((m: any) => m.id === modalidadeId);
    return modalidade ? modalidade.nome : 'Selecione uma modalidade';
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  if (loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

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
          placeholder="YYYY-MM-DD (ex: 2024-03-15)"
          right={<TextInput.Icon icon="calendar" />}
        />
        <HelperText type="error" visible={!!errors.data}>
          {errors.data}
        </HelperText>
        {data && !errors.data && (
          <HelperText type="info">
            {formatDateForDisplay(data)}
          </HelperText>
        )}

        <Menu
          visible={refeicaoMenuVisible}
          onDismiss={() => setRefeicaoMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setRefeicaoMenuVisible(true)}
              style={[styles.input, errors.refeicaoId && styles.errorButton]}
              icon="food"
            >
              {getRefeicaoNome()}
            </Button>
          }
        >
          {refeicoes.length > 0 ? (
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
              icon="school"
            >
              {getModalidadeNome()}
            </Button>
          }
        >
          {modalidades.length > 0 ? (
            modalidades.map((modalidade: any) => (
              <Menu.Item
                key={modalidade.id}
                onPress={() => {
                  setModalidadeId(modalidade.id);
                  setModalidadeMenuVisible(false);
                }}
                title={modalidade.nome}
              />
            ))
          ) : (
            <Menu.Item title="Nenhuma modalidade cadastrada" disabled />
          )}
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
          placeholder="Observações sobre o cardápio (opcional)"
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.button}
          buttonColor="#4caf50"
        >
          {cardapio ? 'Atualizar Cardápio' : 'Criar Cardápio'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
