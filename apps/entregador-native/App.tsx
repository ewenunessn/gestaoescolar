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
import EstoqueCentralRelatoriosScreen from './src/screens/EstoqueCentralRelatoriosScreen';
import RecebimentosScreen from './src/screens/RecebimentosScreen';
import RecebimentoFornecedoresScreen from './src/screens/RecebimentoFornecedoresScreen';
import RecebimentoItensScreen from './src/screens/RecebimentoItensScreen';
import RecebimentosConcluidosScreen from './src/screens/RecebimentosConcluidosScreen';
import RomaneioScreen from './src/screens/RomaneioScreen';
import OpcoesFiltroScreen from './src/screens/OpcoesFiltroScreen';
import NutricaoScreen from './src/screens/NutricaoScreen';
import RefeicoesScreen from './src/screens/RefeicoesScreen';
import RefeicaoFormScreen from './src/screens/RefeicaoFormScreen';
import CardapiosScreen from './src/screens/CardapiosScreen';
import CardapioFormScreen from './src/screens/CardapioFormScreen';
import RefeicaoDetalheScreen from './src/screens/RefeicaoDetalheScreen';

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
            name="OpcoesFiltro" 
            component={OpcoesFiltroScreen}
            options={{ title: 'Opções' }}
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
          <Stack.Screen 
            name="EstoqueCentralRelatorios" 
            component={EstoqueCentralRelatoriosScreen}
            options={{ title: 'Relatórios do Estoque' }}
          />
          <Stack.Screen 
            name="Recebimentos" 
            component={RecebimentosScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="RecebimentosConcluidos" 
            component={RecebimentosConcluidosScreen}
            options={{ title: 'Pedidos Concluídos' }}
          />
          <Stack.Screen 
            name="RecebimentoFornecedores" 
            component={RecebimentoFornecedoresScreen}
            options={{ title: 'Fornecedores' }}
          />
          <Stack.Screen 
            name="RecebimentoItens" 
            component={RecebimentoItensScreen}
            options={{ title: 'Itens para Receber' }}
          />
          <Stack.Screen 
            name="Romaneio" 
            component={RomaneioScreen}
            options={{ title: 'Romaneio de Entregas' }}
          />
          <Stack.Screen 
            name="Nutricao" 
            component={NutricaoScreen}
            options={{ title: 'Nutrição' }}
          />
          <Stack.Screen 
            name="Refeicoes" 
            component={RefeicoesScreen}
            options={{ title: 'Refeições' }}
          />
          <Stack.Screen 
            name="RefeicaoForm" 
            component={RefeicaoFormScreen}
            options={({ route }) => ({ 
              title: (route.params as any)?.refeicao ? 'Editar Refeição' : 'Nova Refeição'
            })}
          />
          <Stack.Screen 
            name="RefeicaoDetalhe" 
            component={RefeicaoDetalheScreen}
            options={({ route }) => ({ 
              title: (route.params as any)?.refeicao?.nome || 'Detalhes da Refeição'
            })}
          />
          <Stack.Screen 
            name="Cardapios" 
            component={CardapiosScreen}
            options={{ title: 'Cardápios' }}
          />
          <Stack.Screen 
            name="CardapioForm" 
            component={CardapioFormScreen}
            options={({ route }) => ({ 
              title: (route.params as any)?.cardapio ? 'Editar Cardápio' : 'Novo Cardápio'
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </OfflineProvider>
    </PaperProvider>
  );
}
