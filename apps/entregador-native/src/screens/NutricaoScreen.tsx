import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card } from 'react-native-paper';

export default function NutricaoScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🥗 Nutrição</Text>
          <Text style={styles.headerSubtitle}>Gerencie refeições e cardápios</Text>
        </View>

        <Card style={styles.card} onPress={() => navigation.navigate('Refeicoes')}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>🍽️ Refeições</Text>
            <Text variant="bodyMedium" style={styles.cardDescription}>
              Gerenciar tipos de refeições (café, almoço, lanche, jantar)
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card} onPress={() => navigation.navigate('Cardapios')}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>📅 Cardápios (Lista)</Text>
            <Text variant="bodyMedium" style={styles.cardDescription}>
              Ver cardápios em formato de lista
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card} onPress={() => navigation.navigate('CardapioCalendario')}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>📆 Calendário de Cardápios</Text>
            <Text variant="bodyMedium" style={styles.cardDescription}>
              Visualizar e gerenciar cardápios em calendário mensal
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 8,
    color: '#4caf50',
  },
  cardDescription: {
    color: '#666',
  },
});
