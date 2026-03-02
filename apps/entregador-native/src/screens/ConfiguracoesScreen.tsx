import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConfiguracoesScreen({ navigation }: any) {
  const [filtroAtivo, setFiltroAtivo] = useState<any>(null);
  const [nomeUsuario, setNomeUsuario] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const filtro = await AsyncStorage.getItem('filtro_qrcode');
      if (filtro) {
        setFiltroAtivo(JSON.parse(filtro));
      }

      const token = await AsyncStorage.getItem('token');
      if (token) {
        const parsed = JSON.parse(token);
        setNomeUsuario(parsed.nome || 'Usuário');
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const limparFiltro = async () => {
    Alert.alert(
      'Limpar Filtro',
      'Tem certeza que deseja remover o filtro ativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('filtro_qrcode');
              setFiltroAtivo(null);
              Alert.alert('Sucesso', 'Filtro removido com sucesso');
              navigation.navigate('Home');
            } catch (err) {
              Alert.alert('Erro', 'Erro ao remover filtro');
            }
          },
        },
      ]
    );
  };

  const deslogar = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair do aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('filtro_qrcode');
              navigation.replace('Login');
            } catch (err) {
              Alert.alert('Erro', 'Erro ao fazer logout');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Informações do usuário */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              👤 Usuário
            </Text>
            <Text variant="bodyLarge" style={styles.userName}>
              {nomeUsuario}
            </Text>
          </Card.Content>
        </Card>

        {/* Filtro ativo */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              🔍 Filtro de Entregas
            </Text>
            {filtroAtivo ? (
              <View>
                <View style={styles.filtroInfo}>
                  <Text variant="bodyMedium" style={styles.filtroLabel}>
                    Rota:
                  </Text>
                  <Text variant="bodyMedium" style={styles.filtroValue}>
                    {filtroAtivo.rotaNome}
                  </Text>
                </View>
                <View style={styles.filtroInfo}>
                  <Text variant="bodyMedium" style={styles.filtroLabel}>
                    Período:
                  </Text>
                  <Text variant="bodyMedium" style={styles.filtroValue}>
                    {new Date(filtroAtivo.dataInicio).toLocaleDateString('pt-BR')} até{' '}
                    {new Date(filtroAtivo.dataFim).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <Button
                  mode="outlined"
                  onPress={limparFiltro}
                  style={styles.limparButton}
                  textColor="#dc2626"
                >
                  Limpar Filtro
                </Button>
              </View>
            ) : (
              <Text variant="bodyMedium" style={styles.noFiltro}>
                Nenhum filtro ativo. Escaneie um QR Code na tela inicial para aplicar um filtro.
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Ações */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              ⚙️ Ações
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Home')}
              style={styles.actionButton}
              icon="home"
            >
              Voltar para Início
            </Button>
            <Divider style={styles.divider} />
            <Button
              mode="contained"
              onPress={deslogar}
              style={[styles.actionButton, styles.logoutButton]}
              icon="logout"
              buttonColor="#dc2626"
            >
              Sair do Aplicativo
            </Button>
          </Card.Content>
        </Card>

        {/* Informações do app */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              ℹ️ Sobre
            </Text>
            <Text variant="bodySmall" style={styles.aboutText}>
              App Entregador v1.0.0{'\n'}
              Sistema de Gestão Escolar
            </Text>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  userName: {
    fontWeight: '600',
    color: '#1976d2',
  },
  filtroInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filtroLabel: {
    fontWeight: '600',
    marginRight: 8,
    color: '#666',
  },
  filtroValue: {
    flex: 1,
    color: '#333',
  },
  limparButton: {
    marginTop: 12,
    borderColor: '#dc2626',
  },
  noFiltro: {
    color: '#666',
    fontStyle: 'italic',
  },
  actionButton: {
    marginBottom: 12,
  },
  logoutButton: {
    marginBottom: 0,
  },
  divider: {
    marginVertical: 12,
  },
  aboutText: {
    color: '#666',
    lineHeight: 20,
  },
});
