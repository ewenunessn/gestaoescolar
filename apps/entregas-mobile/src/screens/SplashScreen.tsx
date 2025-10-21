import React from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { appTheme } from '../theme/appTheme';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={appTheme.colors.navbar} />
      <View style={styles.content}>
        <MaterialCommunityIcons 
          name="truck-delivery" 
          size={80} 
          color={appTheme.colors.primary} 
        />
        <Text style={styles.title}>Entregas</Text>
        <Text style={styles.subtitle}>Alimentação Escolar</Text>
        
        <ActivityIndicator 
          size="large" 
          color={appTheme.colors.primary} 
          style={styles.loader}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: appTheme.colors.primary,
    marginTop: appTheme.spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    color: appTheme.colors.text.secondary,
    marginTop: appTheme.spacing.sm,
  },
  loader: {
    marginTop: appTheme.spacing.xxl,
  },
});

export default SplashScreen;
