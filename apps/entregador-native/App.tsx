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
import FiltroManualScreen from './src/screens/FiltroManualScreen';
import RotasScreen from './src/screens/RotasScreen';
import RotaDetalheScreen from './src/screens/RotaDetalheScreen';
import EscolaDetalheScreen from './src/screens/EscolaDetalheScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import ComprovantesScreen from './src/screens/ComprovantesScreen';
import EstoqueCentralScreen from './src/screens/EstoqueCentralScreen';
import EstoqueCentralDetalhesScreen from './src/screens/EstoqueCentralDetalhesScreen';
import EstoqueCentralEntradaScreen from './src/screens/EstoqueCentralEntradaScreen';
import EstoqueCentralSaidaScreen from './src/screens/EstoqueCentralSaidaScreen';
import EstoqueCentralAjusteScreen from './src/screens/EstoqueCentralAjusteScreen';

// Theme
import { theme } from './src/theme';

const Stack = createStackNavigator();

export default function App() {
  return (
    <PaperProvider 
      theme={theme}
      settings={{
        rippleEffectEnabled: false, // Desabilita o ripple effect globalmente
      }}
    >
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
            name="FiltroManual" 
            component={FiltroManualScreen}
            options={{ title: 'Filtro Manual' }}
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
          <Stack.Screen 
            name="Comprovantes" 
            component={ComprovantesScreen}
            options={{ title: 'Comprovantes de Entrega' }}
          />
          <Stack.Screen 
            name="EstoqueCentral" 
            component={EstoqueCentralScreen}
            options={{ title: 'Estoque Central' }}
          />
          <Stack.Screen 
            name="EstoqueCentralDetalhes" 
            component={EstoqueCentralDetalhesScreen}
            options={{ title: 'Detalhes do Estoque' }}
          />
          <Stack.Screen 
            name="EstoqueCentralEntrada" 
            component={EstoqueCentralEntradaScreen}
            options={{ title: 'Registrar Entrada' }}
          />
          <Stack.Screen 
            name="EstoqueCentralSaida" 
            component={EstoqueCentralSaidaScreen}
            options={{ title: 'Registrar Saída' }}
          />
          <Stack.Screen 
            name="EstoqueCentralAjuste" 
            component={EstoqueCentralAjusteScreen}
            options={{ title: 'Ajustar Estoque' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </OfflineProvider>
    </PaperProvider>
  );
}
