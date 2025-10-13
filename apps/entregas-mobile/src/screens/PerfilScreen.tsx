import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  Divider,
  Avatar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useRota } from '../contexts/RotaContext';
import { useOffline } from '../contexts/OfflineContext';
import { useNotification } from '../contexts/NotificationContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const PerfilScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuth();
  const { rotaSelecionada, limparRota } = useRota();
  const { isOffline, sincronizando, sincronizarAgora, operacoesPendentes } = useOffline();
  const { showSuccess, showError } = useNotification();

  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleTrocarRota = () => {
    limparRota();
    navigation.navigate('SelecionarRota');
  };

  const handleSincronizar = async () => {
    try {
      if (isOffline) {
        showError('Não é possível sincronizar no modo offline');
        return;
      }
      
      await sincronizarAgora();
      showSuccess('Dados sincronizados com sucesso');
    } catch (error) {
      showError('Erro ao sincronizar dados');
      console.error('Erro na sincronização:', error);
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getTipoUsuarioLabel = (tipo: string) => {
    switch (tipo) {
      case 'admin':
        return 'Administrador';
      case 'entregador':
        return 'Entregador';
      case 'escola':
        return 'Escola';
      default:
        return tipo;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header do Perfil */}
        <Card style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <Avatar.Text
                size={80}
                label={getInitials(user?.nome || 'U')}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user?.nome}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <Text style={styles.userType}>
                  {getTipoUsuarioLabel(user?.tipo || '')}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Rota Atual */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Rota Atual</Text>
            
            {rotaSelecionada ? (
              <>
                <List.Item
                  title={rotaSelecionada.nome}
                  description={rotaSelecionada.descricao || 'Rota selecionada'}
                  left={(props) => (
                    <View style={styles.rotaIconContainer}>
                      <View 
                        style={[
                          styles.rotaColorIndicator, 
                          { backgroundColor: rotaSelecionada.cor || '#1976d2' }
                        ]} 
                      />
                    </View>
                  )}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  onPress={handleTrocarRota}
                />
                <Divider />
                <List.Item
                  title="Trocar Rota"
                  description="Selecionar uma rota diferente"
                  left={(props) => <List.Icon {...props} icon="swap-horizontal" />}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  onPress={handleTrocarRota}
                />
              </>
            ) : (
              <List.Item
                title="Nenhuma rota selecionada"
                description="Toque para selecionar uma rota"
                left={(props) => <List.Icon {...props} icon="map-search" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={handleTrocarRota}
              />
            )}
          </Card.Content>
        </Card>

        {/* Status de Sincronização */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Sincronização</Text>
            
            <List.Item
              title={isOffline ? "Modo Offline" : "Online"}
              description={
                isOffline 
                  ? `${operacoesPendentes} operações pendentes`
                  : sincronizando 
                    ? "Sincronizando dados..."
                    : "Dados atualizados"
              }
              left={(props) => (
                <List.Icon 
                  {...props} 
                  icon={isOffline ? "wifi-off" : sincronizando ? "sync" : "wifi"} 
                  color={isOffline ? "#f44336" : sincronizando ? "#ff9800" : "#4caf50"}
                />
              )}
            />
            <Divider />
            
            <List.Item
              title="Sincronizar Agora"
              description="Atualizar dados com o servidor"
              left={(props) => <List.Icon {...props} icon="sync" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleSincronizar}
              disabled={isOffline || sincronizando}
            />
          </Card.Content>
        </Card>

        {/* Informações da Conta */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Informações da Conta</Text>
            
            <List.Item
              title="Nome Completo"
              description={user?.nome}
              left={(props) => <List.Icon {...props} icon="account" />}
            />
            <Divider />
            
            <List.Item
              title="Email"
              description={user?.email}
              left={(props) => <List.Icon {...props} icon="email" />}
            />
            <Divider />
            
            <List.Item
              title="Tipo de Usuário"
              description={getTipoUsuarioLabel(user?.tipo || '')}
              left={(props) => <List.Icon {...props} icon="account-group" />}
            />
          </Card.Content>
        </Card>

        {/* Configurações */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Configurações</Text>
          
          <List.Item
            title="Notificações"
            description="Gerenciar notificações do app"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // Implementar configurações de notificação
            }}
          />
          <Divider />
          
          <List.Item
            title="Localização"
            description="Configurações de GPS e localização"
            left={(props) => <List.Icon {...props} icon="map-marker" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // Implementar configurações de localização
            }}
          />
          <Divider />
          
          <List.Item
            title="Câmera"
            description="Configurações de câmera e fotos"
            left={(props) => <List.Icon {...props} icon="camera" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // Implementar configurações de câmera
            }}
          />
          </Card.Content>
        </Card>

        {/* Sobre o App */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Sobre o App</Text>
          
          <List.Item
            title="Versão"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          <Divider />
          
          <List.Item
            title="Ajuda e Suporte"
            description="Central de ajuda e FAQ"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // Implementar tela de ajuda
            }}
          />
          <Divider />
          
          <List.Item
            title="Termos de Uso"
            description="Leia os termos de uso do aplicativo"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // Implementar tela de termos
            }}
          />
          <Divider />
          
          <List.Item
            title="Política de Privacidade"
            description="Como tratamos seus dados"
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // Implementar tela de privacidade
            }}
          />
          </Card.Content>
        </Card>

        {/* Botão de Logout */}
        <View style={styles.logoutContainer}>
          <Button
            mode="contained"
            onPress={handleLogout}
            style={styles.logoutButton}
            buttonColor="#f44336"
            icon="logout"
          >
            Sair da Conta
          </Button>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sistema de Alimentação Escolar
          </Text>
          <Text style={styles.footerVersion}>
            Entregas Mobile v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#1976d2',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    color: '#666',
    marginTop: 4,
  },
  userType: {
    color: '#1976d2',
    fontWeight: 'bold',
    marginTop: 4,
  },
  sectionCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  rotaIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  rotaColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  logoutContainer: {
    margin: 16,
    marginTop: 8,
  },
  logoutButton: {
    borderRadius: 8,
    paddingVertical: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  footerVersion: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default PerfilScreen;