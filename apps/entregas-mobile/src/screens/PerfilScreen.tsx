import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Title,
  Card,
  Paragraph,
  Button,
  List,
  Divider,
  Avatar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const PerfilScreen = () => {
  const { user, signOut } = useAuth();
  const { showSuccess } = useNotification();

  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
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
              <Title style={styles.userName}>{user?.nome}</Title>
              <Paragraph style={styles.userEmail}>{user?.email}</Paragraph>
              <Paragraph style={styles.userType}>
                {getTipoUsuarioLabel(user?.tipo || '')}
              </Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Informações da Conta */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Informações da Conta</Title>
          
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
          <Title style={styles.sectionTitle}>Configurações</Title>
          
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
          <Title style={styles.sectionTitle}>Sobre o App</Title>
          
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

      {/* Ações */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Ações</Title>
          
          <List.Item
            title="Sincronizar Dados"
            description="Atualizar dados com o servidor"
            left={(props) => <List.Icon {...props} icon="sync" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // Implementar sincronização
            }}
          />
          <Divider />
          

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
        <Paragraph style={styles.footerText}>
          Sistema de Alimentação Escolar
        </Paragraph>
        <Paragraph style={styles.footerVersion}>
          Entregas Mobile v1.0.0
        </Paragraph>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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