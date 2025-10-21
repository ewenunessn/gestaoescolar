import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useRota } from '../contexts/RotaContext';

// Screens
import SplashScreen from '../screens/SplashScreen';
import InitialLoadingScreen from '../screens/InitialLoadingScreen';
import LoginScreen from '../screens/LoginScreen';
import SelecionarRotaScreen from '../screens/SelecionarRotaScreen';
import EntregasScreen from '../screens/EntregasScreen';
import EscolaDetalhesScreen from '../screens/EscolaDetalhesScreen';
import ConfirmarEntregaScreen from '../screens/ConfirmarEntregaScreen';
import EntregaMassaScreen from '../screens/EntregaMassaScreen';
import RevisaoEntregaScreen from '../screens/RevisaoEntregaScreen';
import PerfilScreen from '../screens/PerfilScreen';
import { appTheme } from '../theme/appTheme';

export type RootStackParamList = {
  Splash: undefined;
  InitialLoading: undefined;
  Login: undefined;
  SelecionarRota: undefined;
  MainTabs: undefined;
  EscolaDetalhes: { escolaId: number; escolaNome: string };
  ConfirmarEntrega: { itemId: number; itemData: any };
  EntregaMassa: { itensSelecionados: any[]; escolaNome: string; escolaId: number };
  RevisaoEntrega: { itensRevisados: any[]; escolaNome: string; escolaId: number };
};

export type TabParamList = {
  Entregas: undefined;
  Perfil: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap;

          if (route.name === 'Entregas') {
            iconName = focused ? 'truck-delivery' : 'truck-delivery-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'account' : 'account-outline';
          } else {
            iconName = 'help';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Entregas" 
        component={EntregasScreen}
        options={{ tabBarLabel: 'Entregas' }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={PerfilScreen}
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const { rotaSelecionada } = useRota();
  const [showInitialLoading, setShowInitialLoading] = React.useState(false);
  const [needsInitialLoad, setNeedsInitialLoad] = React.useState(false);

  React.useEffect(() => {
    checkInitialLoad();
  }, [isAuthenticated]);

  const checkInitialLoad = async () => {
    if (isAuthenticated && !rotaSelecionada) {
      const jaCarregou = await AsyncStorage.getItem('@entregas:initial_load_done');
      setNeedsInitialLoad(jaCarregou !== 'true');
    }
  };

  const handleInitialLoadComplete = () => {
    setShowInitialLoading(false);
    setNeedsInitialLoad(false);
  };

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        headerStyle: {
          backgroundColor: appTheme.colors.navbar,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {loading ? (
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen}
          options={{ headerShown: false }}
        />
      ) : !isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : needsInitialLoad && !rotaSelecionada ? (
        <Stack.Screen name="InitialLoading" options={{ headerShown: false }}>
          {() => <InitialLoadingScreen onComplete={handleInitialLoadComplete} />}
        </Stack.Screen>
      ) : !rotaSelecionada ? (
        <Stack.Screen name="SelecionarRota" component={SelecionarRotaScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen 
            name="SelecionarRota" 
            component={SelecionarRotaScreen}
            options={{ headerShown: true, title: 'Selecionar Rota' }}
          />
          <Stack.Screen 
            name="EscolaDetalhes" 
            component={EscolaDetalhesScreen}
            options={{ headerShown: true, title: 'Detalhes da Escola' }}
          />
          <Stack.Screen 
            name="ConfirmarEntrega" 
            component={ConfirmarEntregaScreen}
            options={{ headerShown: true, title: 'Confirmar Entrega' }}
          />
          <Stack.Screen 
            name="EntregaMassa" 
            component={EntregaMassaScreen}
            options={{ headerShown: true, title: 'Ajustar Quantidades' }}
          />
          <Stack.Screen 
            name="RevisaoEntrega" 
            component={RevisaoEntregaScreen}
            options={{ headerShown: true, title: 'Revisão Final' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;