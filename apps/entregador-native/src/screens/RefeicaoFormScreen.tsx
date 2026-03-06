import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { criarRefeicao, atualizarRefeicao } from '../api/nutricao';

export default function RefeicaoFormScreen({ navigation, route }: any) {
  const { refeicao } = route.params || {};
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (refeicao) {
      setNome(refeicao.nome);
      setDescricao(refeicao.descricao || '');
    }
  }, [refeicao]);

  const validate = () => {
    const newErrors: any = {};
    
    if (!nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const data = {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
      };

      if (refeicao) {
        await atualizarRefeicao(refeicao.id, data);
        Alert.alert('Sucesso', 'Refeição atualizada com sucesso');
      } else {
        await criarRefeicao(data);
        Alert.alert('Sucesso', 'Refeição criada com sucesso');
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TextInput
          label="Nome *"
          value={nome}
          onChangeText={setNome}
          mode="outlined"
          style={styles.input}
          error={!!errors.nome}
        />
        <HelperText type="error" visible={!!errors.nome}>
          {errors.nome}
        </HelperText>

        <TextInput
          label="Descrição"
          value={descricao}
          onChangeText={setDescricao}
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
          {refeicao ? 'Atualizar' : 'Criar'}
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
  button: {
    marginTop: 10,
  },
});
