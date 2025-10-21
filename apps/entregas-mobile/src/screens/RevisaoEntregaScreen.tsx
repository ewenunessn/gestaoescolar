import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Title,
  Card,
  Paragraph,
  Button,
  TextInput,
  ActivityIndicator,
  List,
  Divider,
  ProgressBar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { entregaServiceHybrid } from '../services/entregaServiceHybrid';
import { ConfirmarEntregaData } from '../services/entregaService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { appTheme } from '../theme/appTheme';
import { comprovanteService } from '../services/comprovanteService';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type RevisaoEntregaRouteProp = RouteProp<RootStackParamList, 'RevisaoEntrega'>;

const RevisaoEntregaScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RevisaoEntregaRouteProp>();
  const { showError, showSuccess } = useNotification();
  const { user } = useAuth();
  const { itensRevisados, escolaNome, escolaId } = route.params;

  const [nomeQuemRecebeu, setNomeQuemRecebeu] = useState('');
  const [localizacao, setLocalizacao] = useState<Location.LocationObject | null>(null);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    obterLocalizacao();
  }, []);

  const obterLocalizacao = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setLocalizacao(location);
      }
    } catch (error) {
      console.error('Erro ao obter localização:', error);
    }
  };

  const confirmarEntregas = async () => {
    if (!nomeQuemRecebeu.trim()) {
      showError('Por favor, informe quem recebeu a entrega');
      return;
    }

    Alert.alert(
      'Confirmar Entregas',
      `Confirmar entrega de ${itensRevisados.length} item(s) para ${nomeQuemRecebeu}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: processarEntregas }
      ]
    );
  };

  const gerarComprovante = async () => {
    try {
      const dadosComprovante = {
        escolaNome: escolaNome,
        itens: itensRevisados.map(item => ({
          produto_nome: item.produto_nome,
          quantidade_entregue: item.quantidade_entregue,
          unidade: item.unidade,
        })),
        nomeQuemRecebeu: nomeQuemRecebeu.trim(),
        nomeQuemEntregou: user?.nome || 'Entregador',
        dataEntrega: new Date().toISOString(),
      };

      const pdfUri = await comprovanteService.gerarComprovantePDF(dadosComprovante);
      
      // Perguntar se quer compartilhar
      Alert.alert(
        'Comprovante Gerado',
        'Deseja compartilhar o comprovante de entrega?',
        [
          { text: 'Não', style: 'cancel' },
          { 
            text: 'Compartilhar', 
            onPress: async () => {
              try {
                await comprovanteService.compartilharComprovante(pdfUri);
              } catch (error) {
                console.error('Erro ao compartilhar:', error);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao gerar comprovante:', error);
      // Não bloquear o fluxo se falhar
    }
  };

  const processarEntregas = async () => {
    try {
      setProcessando(true);
      setProgresso(0);

      let sucessos = 0;
      let erros = 0;

      for (let i = 0; i < itensRevisados.length; i++) {
        const item = itensRevisados[i];
        
        try {
          const dadosEntrega: ConfirmarEntregaData = {
            quantidade_entregue: item.quantidade_entregue,
            nome_quem_entregou: user?.nome || 'Entregador',
            nome_quem_recebeu: nomeQuemRecebeu.trim(),
            observacao: item.observacao.trim() || undefined,
            latitude: localizacao?.coords.latitude,
            longitude: localizacao?.coords.longitude,
            precisao_gps: localizacao?.coords.accuracy || undefined,
          };

          await entregaServiceHybrid.confirmarEntrega(item.id, dadosEntrega);
          sucessos++;
        } catch (error) {
          console.error(`Erro ao confirmar item ${item.id}:`, error);
          erros++;
        }

        // Atualizar progresso
        setProgresso((i + 1) / itensRevisados.length);
      }

      // Mostrar resultado
      if (erros === 0) {
        showSuccess(`${sucessos} item(s) entregue(s) com sucesso!`);
        
        // Gerar comprovante
        await gerarComprovante();
      } else {
        showError(`${sucessos} item(s) entregue(s), ${erros} erro(s)`);
      }

      // Voltar para tela de detalhes da escola
      navigation.navigate('EscolaDetalhes', {
        escolaId: escolaId,
        escolaNome: escolaNome
      });

    } catch (error) {
      showError('Erro no processamento das entregas');
      console.error('Erro:', error);
    } finally {
      setProcessando(false);
      setProgresso(0);
    }
  };

  const calcularTotalItens = () => {
    return itensRevisados.reduce((total, item) => total + item.quantidade_entregue, 0);
  };

  const obterUnidadePrincipal = () => {
    // Pega a unidade mais comum nos itens
    const unidades = itensRevisados.map(item => item.unidade);
    const unidadeFrequente = unidades.reduce((a, b, i, arr) =>
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
    );
    
    // Se todas as unidades são iguais, mostra a unidade
    const todasIguais = unidades.every(u => u === unidades[0]);
    return todasIguais ? unidades[0] : 'unidades';
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1976d2" />
      <ScrollView style={styles.container}>
        {/* Header */}
        <Card style={styles.headerCard} elevation={0}>
        <Card.Content>
          <Title style={styles.headerTitle}>Revisão Final</Title>
          <Paragraph style={styles.headerSubtitle}>
            {escolaNome} - {itensRevisados.length} item(s)
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Resumo dos Itens */}
      <Card style={styles.summaryCard} elevation={0}>
        <Card.Content>
          <Title style={styles.summaryTitle}>Resumo da Entrega</Title>
          
          {itensRevisados.map((item, index) => (
            <View key={item.id}>
              <List.Item
                title={item.produto_nome}
                description={
                  <View>
                    <Paragraph style={styles.itemQuantity}>
                      {item.quantidade_entregue} {item.unidade}
                    </Paragraph>
                    {item.observacao && (
                      <Paragraph style={styles.itemObservation}>
                        💬 {item.observacao}
                      </Paragraph>
                    )}
                  </View>
                }
                left={(props) => (
                  <List.Icon {...props} icon="package-variant" color="#4caf50" />
                )}
                right={() => (
                  <MaterialCommunityIcons name="check-circle" size={24} color="#4caf50" />
                )}
              />
              {index < itensRevisados.length - 1 && <Divider />}
            </View>
          ))}

          {/* Total */}
          <View style={styles.totalContainer}>
            <Paragraph style={styles.totalText}>
              Total de itens: {itensRevisados.length}
            </Paragraph>

          </View>
        </Card.Content>
      </Card>

      {/* Campo Nome do Recebedor */}
      <Card style={styles.receiverCard} elevation={0}>
        <Card.Content>
          <Title style={styles.receiverTitle}>Confirmação de Recebimento</Title>
          <TextInput
            label="Nome de quem recebeu a entrega *"
            value={nomeQuemRecebeu}
            onChangeText={setNomeQuemRecebeu}
            mode="outlined"
            style={styles.receiverInput}
            placeholder="Digite o nome completo"
          />
          <Paragraph style={styles.receiverHint}>
            Este nome será registrado como responsável pelo recebimento de todos os itens acima.
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Barra de Progresso */}
      {processando && (
        <Card style={styles.progressCard} elevation={0}>
          <Card.Content>
            <Paragraph style={styles.progressText}>
              Processando entregas... {Math.round(progresso * 100)}%
            </Paragraph>
            <ProgressBar progress={progresso} color="#1976d2" />
          </Card.Content>
        </Card>
      )}

      {/* Botões de Ação */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          disabled={processando}
          icon="arrow-left"
        >
          Voltar
        </Button>
        
        <Button
          mode="contained"
          onPress={confirmarEntregas}
          style={styles.confirmButton}
          disabled={processando || !nomeQuemRecebeu.trim()}
          icon="check-all"
        >
          {processando ? 'Processando...' : 'Confirmar Entregas'}
        </Button>
      </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: appTheme.spacing.lg,
    marginBottom: appTheme.spacing.sm,
    borderRadius: appTheme.borderRadius.large,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  summaryCard: {
    margin: appTheme.spacing.lg,
    marginTop: appTheme.spacing.sm,
    borderRadius: appTheme.borderRadius.large,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  itemObservation: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  totalContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
  },
  totalQuantityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4caf50',
    textAlign: 'center',
    marginTop: 4,
  },
  receiverCard: {
    margin: appTheme.spacing.lg,
    marginTop: appTheme.spacing.sm,
    borderRadius: appTheme.borderRadius.large,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: '#fff3e0',
  },
  receiverTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f57c00',
    marginBottom: 12,
  },
  receiverInput: {
    marginBottom: 8,
  },
  receiverHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  progressCard: {
    margin: appTheme.spacing.lg,
    marginTop: appTheme.spacing.sm,
    borderRadius: appTheme.borderRadius.large,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
  },
  progressText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
  },
});

export default RevisaoEntregaScreen;