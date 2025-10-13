import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import {
  Title,
  Card,
  Paragraph,
  Button,
  TextInput,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { entregaService, ConfirmarEntregaData } from '../services/entregaService';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type ConfirmarEntregaRouteProp = RouteProp<RootStackParamList, 'ConfirmarEntrega'>;

const ConfirmarEntregaScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ConfirmarEntregaRouteProp>();
  const { showError, showSuccess } = useNotification();
  const { user } = useAuth();
  const { itemId, itemData } = route.params;

  const [loading, setLoading] = useState(false);
  const [quantidadeEntregue, setQuantidadeEntregue] = useState(itemData.quantidade.toString());
  const [nomeQuemRecebeu, setNomeQuemRecebeu] = useState('');
  const [observacao, setObservacao] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [localizacao, setLocalizacao] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    obterLocalizacao();
  }, []);

  const obterLocalizacao = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError('Permissão de localização negada');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocalizacao(location);
    } catch (error) {
      console.error('Erro ao obter localização:', error);
    }
  };

  const tirarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showError('Permissão de câmera negada');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFotoUri(result.assets[0].uri);
      }
    } catch (error) {
      showError('Erro ao tirar foto');
      console.error('Erro:', error);
    }
  };

  const selecionarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError('Permissão de galeria negada');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFotoUri(result.assets[0].uri);
      }
    } catch (error) {
      showError('Erro ao selecionar foto');
      console.error('Erro:', error);
    }
  };

  const confirmarEntrega = async () => {
    if (!nomeQuemRecebeu.trim()) {
      showError('Por favor, informe quem recebeu a entrega');
      return;
    }

    const quantidade = parseFloat(quantidadeEntregue);
    if (isNaN(quantidade) || quantidade <= 0) {
      showError('Quantidade entregue deve ser um número válido');
      return;
    }

    if (quantidade > itemData.quantidade) {
      Alert.alert(
        'Quantidade Excedida',
        `A quantidade entregue (${quantidade}) é maior que a quantidade programada (${itemData.quantidade}). Deseja continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => processarConfirmacao() }
        ]
      );
    } else {
      processarConfirmacao();
    }
  };

  const processarConfirmacao = async () => {
    try {
      setLoading(true);

      const dadosEntrega: ConfirmarEntregaData = {
        quantidade_entregue: parseFloat(quantidadeEntregue),
        nome_quem_entregou: user?.nome || 'Entregador',
        nome_quem_recebeu: nomeQuemRecebeu.trim(),
        observacao: observacao.trim() || undefined,
        latitude: localizacao?.coords.latitude,
        longitude: localizacao?.coords.longitude,
        precisao_gps: localizacao?.coords.accuracy,
      };

      // Salvar foto localmente se foi tirada
      if (fotoUri) {
        await entregaService.salvarFotoLocal(itemId, fotoUri);
      }

      // Upload da foto se houver
      if (fotoUri) {
        try {
          const fotoResult = await entregaService.uploadFotoComprovante(itemId, fotoUri);
          dadosEntrega.foto_comprovante = fotoResult.url;
        } catch (error) {
          console.error('Erro ao fazer upload da foto:', error);
          // Continua sem a foto
        }
      }

      await entregaService.confirmarEntrega(itemId, dadosEntrega);
      
      showSuccess('Entrega confirmada com sucesso!');
      navigation.goBack();
    } catch (error) {
      showError('Erro ao confirmar entrega');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Informações do Item */}
      <Card style={styles.itemCard}>
        <Card.Content>
          <View style={styles.itemHeader}>
            <MaterialCommunityIcons name="package-variant" size={32} color="#1976d2" />
            <View style={styles.itemInfo}>
              <Title style={styles.itemNome}>{itemData.produto_nome}</Title>
              <Paragraph style={styles.itemDetalhes}>
                Quantidade: {itemData.quantidade} {itemData.unidade}
              </Paragraph>
              {itemData.lote && (
                <Chip mode="outlined" style={styles.loteChip}>
                  Lote: {itemData.lote}
                </Chip>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Formulário de Confirmação */}
      <Card style={styles.formCard}>
        <Card.Content>
          <Title style={styles.formTitle}>Confirmar Entrega</Title>

          <TextInput
            label="Quantidade Entregue *"
            value={quantidadeEntregue}
            onChangeText={setQuantidadeEntregue}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            right={<TextInput.Affix text={itemData.unidade} />}
          />

          <TextInput
            label="Nome de Quem Recebeu *"
            value={nomeQuemRecebeu}
            onChangeText={setNomeQuemRecebeu}
            mode="outlined"
            style={styles.input}
            placeholder="Nome completo da pessoa que recebeu"
          />

          <TextInput
            label="Observações"
            value={observacao}
            onChangeText={setObservacao}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder="Observações sobre a entrega (opcional)"
          />
        </Card.Content>
      </Card>

      {/* Foto Comprovante */}
      <Card style={styles.fotoCard}>
        <Card.Content>
          <Title style={styles.fotoTitle}>Foto Comprovante (Opcional)</Title>
          
          {fotoUri ? (
            <View style={styles.fotoContainer}>
              <Image source={{ uri: fotoUri }} style={styles.fotoPreview} />
              <View style={styles.fotoActions}>
                <Button
                  mode="outlined"
                  onPress={() => setFotoUri(null)}
                  style={styles.fotoButton}
                  icon="delete"
                >
                  Remover
                </Button>
                <Button
                  mode="outlined"
                  onPress={tirarFoto}
                  style={styles.fotoButton}
                  icon="camera"
                >
                  Nova Foto
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.fotoPlaceholder}>
              <MaterialCommunityIcons name="camera-outline" size={48} color="#ccc" />
              <Paragraph style={styles.fotoPlaceholderText}>
                Adicione uma foto como comprovante da entrega
              </Paragraph>
              <View style={styles.fotoButtons}>
                <Button
                  mode="outlined"
                  onPress={tirarFoto}
                  style={styles.fotoButton}
                  icon="camera"
                >
                  Tirar Foto
                </Button>
                <Button
                  mode="outlined"
                  onPress={selecionarFoto}
                  style={styles.fotoButton}
                  icon="image"
                >
                  Galeria
                </Button>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Localização */}
      {localizacao && (
        <Card style={styles.localizacaoCard}>
          <Card.Content>
            <View style={styles.localizacaoHeader}>
              <MaterialCommunityIcons name="map-marker" size={24} color="#4caf50" />
              <Title style={styles.localizacaoTitle}>Localização Capturada</Title>
            </View>
            <Paragraph style={styles.localizacaoText}>
              Lat: {localizacao.coords.latitude.toFixed(6)}
            </Paragraph>
            <Paragraph style={styles.localizacaoText}>
              Lng: {localizacao.coords.longitude.toFixed(6)}
            </Paragraph>
            <Paragraph style={styles.localizacaoAccuracy}>
              Precisão: ±{localizacao.coords.accuracy?.toFixed(0)}m
            </Paragraph>
          </Card.Content>
        </Card>
      )}

      {/* Botões de Ação */}
      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          disabled={loading}
        >
          Cancelar
        </Button>
        
        <Button
          mode="contained"
          onPress={confirmarEntrega}
          style={styles.confirmButton}
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Confirmando...' : 'Confirmar Entrega'}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  itemCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    marginLeft: 16,
    flex: 1,
  },
  itemNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemDetalhes: {
    color: '#666',
    marginTop: 4,
  },
  loteChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  formCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    marginBottom: 16,
  },
  fotoCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  fotoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  fotoContainer: {
    alignItems: 'center',
  },
  fotoPreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
  },
  fotoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  fotoPlaceholder: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  fotoPlaceholderText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  fotoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  fotoButton: {
    borderRadius: 8,
  },
  localizacaoCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  localizacaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  localizacaoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  localizacaoText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  localizacaoAccuracy: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
  },
  confirmButton: {
    flex: 2,
    borderRadius: 8,
  },
});

export default ConfirmarEntregaScreen;