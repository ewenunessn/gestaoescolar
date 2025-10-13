import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import { RotaProvider } from './src/contexts/RotaContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { OfflineProvider } from './src/contexts/OfflineContext';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme/theme';

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <OfflineProvider>
        <AuthProvider>
          <RotaProvider>
            <NotificationProvider>
              <NavigationContainer>
                <AppNavigator />
                <StatusBar style="auto" />
              </NavigationContainer>
            </NotificationProvider>
          </RotaProvider>
        </AuthProvider>
      </OfflineProvider>
    </PaperProvider>
  );
}