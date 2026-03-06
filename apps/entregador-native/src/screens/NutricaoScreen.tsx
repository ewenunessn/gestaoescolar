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
              Gerenciar tipos de refeições e seus ingredientes
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card} onPress={() => navigation.navigate('Cardapios')}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>📅 Cardápios Mensais</Text>
            <Text variant="bodyMedium" style={styles.cardDescription}>
              Gerenciar cardápios por modalidade e mês. Clique em um cardápio para ver o calendário.
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
