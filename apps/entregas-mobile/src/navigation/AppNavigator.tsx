import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import EntregasScreen from '../screens/EntregasScreen';
import EscolaDetalhesScreen from '../screens/EscolaDetalhesScreen';
import ConfirmarEntregaScreen from '../screens/ConfirmarEntregaScreen';
import EntregaMassaScreen from '../screens/EntregaMassaScreen';
import RevisaoEntregaScreen from '../screens/RevisaoEntregaScreen';
import PerfilScreen from '../screens/PerfilScreen';


export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  EscolaDetalhes: { escolaId: number; escolaNome: string };
  ConfirmarEntrega: { itemId: number; itemData: any };
  EntregaMassa: { itensSelecionados: any[]; escolaNome: string };
  RevisaoEntrega: { itensRevisados: any[]; escolaNome: string };

};

export type TabParamList = {
  Home: undefined;
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

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Entregas') {
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
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Início' }}
      />
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
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
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