import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  listarEscolas,
  obterSessaoGestor,
  type Escola
} from '../services/gestorEscola';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  navigation: any;
}

const { width, height } = Dimensions.get('window');

const LoginGestorScreen: React.FC<Props> = ({ navigation }) => {
  const { loginGestor } = useAuth();
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState<Escola | null>(null);
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingEscolas, setLoadingEscolas] = useState(true);
  const [step, setStep] = useState<'escola' | 'codigo'>('escola');

  useEffect(() => {
    // Verificar se já existe uma sessão ativa
    verificarSessaoAtiva();
    // Carregar lista de escolas
    carregarEscolas();
  }, []);

  const verificarSessaoAtiva = async () => {
    try {
      const sessaoAtiva = await obterSessaoGestor();
      if (sessaoAtiva) {
        navigation.replace('EstoqueEscola', { escolaId: sessaoAtiva.escola.id });
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
    }
  };

  const carregarEscolas = async () => {
    try {
      setLoadingEscolas(true);
      const escolasData = await listarEscolas();
      setEscolas(escolasData);
    } catch (err: any) {
      Alert.alert('Erro', 'Erro ao carregar lista de escolas');
      console.error('Erro ao carregar escolas:', err);
    } finally {
      setLoadingEscolas(false);
    }
  };

  const handleEscolaNext = () => {
    if (!escolaSelecionada) {
      Alert.alert('Atenção', 'Por favor, selecione uma escola');
      return;
    }
    setStep('codigo');
  };

  const handleLogin = async () => {
    if (!escolaSelecionada || !codigoAcesso.trim()) {
      Alert.alert('Atenção', 'Por favor, complete todos os campos');
      return;
    }

    if (codigoAcesso.length !== 6) {
      Alert.alert('Atenção', 'O código deve ter 6 dígitos');
      return;
    }

    try {
      setLoading(true);

      const success = await loginGestor(escolaSelecionada.id, codigoAcesso.trim());

      if (success) {
        // Navegação será gerenciada pelo AuthContext/AppNavigator
        // O usuário será redirecionado automaticamente
      } else {
        Alert.alert('Erro', 'Código de acesso inválido para esta escola');
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Código de acesso inválido');
    } finally {
      setLoading(false);
    }
  };

  const renderEscolaStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Selecione sua escola</Text>
      
      {loadingEscolas ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1d9bf0" />
          <Text style={styles.loadingText}>Carregando escolas...</Text>
        </View>
      ) : (
        <>
          <View style={styles.pickerContainer}>
            <Icon name="school" size={24} color="#1d9bf0" style={styles.pickerIcon} />
            <Picker
              selectedValue={escolaSelecionada?.id || ''}
              onValueChange={(itemValue) => {
                const escola = escolas.find(e => e.id === itemValue);
                setEscolaSelecionada(escola || null);
              }}
              style={styles.picker}
            >
              <Picker.Item label="Selecione uma escola..." value="" />
              {escolas.map((escola) => (
                <Picker.Item
                  key={escola.id}
                  label={escola.nome}
                  value={escola.id}
                />
              ))}
            </Picker>
          </View>

          {escolaSelecionada && (
            <View style={styles.escolaInfo}>
              <Icon name="check-circle" size={20} color="#1d9bf0" />
              <Text style={styles.escolaInfoText}>{escolaSelecionada.nome}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, !escolaSelecionada && styles.buttonDisabled]}
            onPress={handleEscolaNext}
            disabled={!escolaSelecionada}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderCodigoStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.backHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('escola')}
        >
          <Icon name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Código de acesso</Text>
      </View>

      {escolaSelecionada && (
        <View style={styles.escolaConfirm}>
          <Icon name="check-circle" size={18} color="#1d9bf0" />
          <Text style={styles.escolaConfirmText}>{escolaSelecionada.nome}</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <Icon name="lock" size={24} color="#1d9bf0" style={styles.inputIcon} />
        <TextInput
          style={styles.codeInput}
          placeholder="000000"
          value={codigoAcesso}
          onChangeText={(text) => setCodigoAcesso(text.replace(/\D/g, ''))}
          keyboardType="numeric"
          maxLength={6}
          secureTextEntry={!showCode}
          textAlign="center"
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowCode(!showCode)}
        >
          <Icon
            name={showCode ? 'visibility-off' : 'visibility'}
            size={24}
            color="#666"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.helpText}>
        Solicite o código de acesso à administração da escola
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          (loading || codigoAcesso.length !== 6) && styles.buttonDisabled
        ]}
        onPress={handleLogin}
        disabled={loading || codigoAcesso.length !== 6}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Icon name="login" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Acessar Sistema</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Icon name="school" size={32} color="white" />
            </View>
            <Text style={styles.title}>Gestor Escolar</Text>
            <Text style={styles.subtitle}>Sistema de Gestão de Estoque</Text>
            <View style={styles.badge}>
              <Icon name="security" size={16} color="#1d9bf0" />
              <Text style={styles.badgeText}>Acesso Restrito</Text>
            </View>
          </View>

          <View style={styles.card}>
            {step === 'escola' ? renderEscolaStep() : renderCodigoStep()}
          </View>

          <Text style={styles.footerText}>
            Sistema destinado exclusivamente aos gestores das escolas.
            Para suporte técnico, entre em contato com a administração.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1d9bf0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 155, 240, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(29, 155, 240, 0.3)',
  },
  badgeText: {
    color: '#1d9bf0',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stepContainer: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
    textAlign: 'center',
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(29, 155, 240, 0.2)',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    marginBottom: 16,
  },
  pickerIcon: {
    marginLeft: 16,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  escolaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 155, 240, 0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  escolaInfoText: {
    marginLeft: 8,
    color: '#1d9bf0',
    fontWeight: '600',
    flex: 1,
  },
  escolaConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 155, 240, 0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  escolaConfirmText: {
    marginLeft: 8,
    color: '#1d9bf0',
    fontWeight: '600',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(29, 155, 240, 0.2)',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    marginBottom: 16,
  },
  inputIcon: {
    marginLeft: 16,
  },
  codeInput: {
    flex: 1,
    height: 60,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    textAlign: 'center',
  },
  eyeButton: {
    padding: 16,
  },
  helpText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginBottom: 24,
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#1d9bf0',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1d9bf0',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  footerText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});

export default LoginGestorScreen;