import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, IconButton } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { OfflineProvider } from './src/contexts/OfflineContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ConfiguracoesScreen from './src/screens/ConfiguracoesScreen';
import RotasScreen from './src/screens/RotasScreen';
import RotaDetalheScreen from './src/screens/RotaDetalheScreen';
import EscolaDetalheScreen from './src/screens/EscolaDetalheScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';

// Theme
import { theme } from './src/theme';

const Stack = createStackNavigator();

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <OfflineProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1976d2',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={({ navigation }) => ({ 
              title: 'Home',
              headerLeft: () => null, // Remove botão voltar
              headerRight: () => (
                <IconButton
                  icon="cog"
                  iconColor="#fff"
                  size={24}
                  onPress={() => navigation.navigate('Configuracoes')}
                />
              ),
            })}
          />
          <Stack.Screen 
            name="Configuracoes" 
            component={ConfiguracoesScreen}
            options={{ title: 'Configurações' }}
          />
          <Stack.Screen 
            name="Rotas" 
            component={RotasScreen}
            options={{ title: 'Rotas de Entrega' }}
          />
          <Stack.Screen 
            name="RotaDetalhe" 
            component={RotaDetalheScreen}
            options={{ title: 'Detalhes da Rota' }}
          />
          <Stack.Screen 
            name="EscolaDetalhe" 
            component={EscolaDetalheScreen}
            options={{ title: 'Itens da Escola' }}
          />
          <Stack.Screen 
            name="Historico" 
            component={HistoricoScreen}
            options={{ title: 'Histórico' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </OfflineProvider>
    </PaperProvider>
  );
}
