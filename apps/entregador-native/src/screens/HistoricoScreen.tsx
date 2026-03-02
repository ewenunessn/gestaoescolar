import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function HistoricoScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text variant="headlineMedium">📊</Text>
        <Text variant="titleLarge" style={styles.title}>
          Histórico
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Funcionalidade em desenvolvimento
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
});
