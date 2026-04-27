import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, FAB } from 'react-native-paper';

export default function OpcoesFiltroScreen({ navigation, route }: any) {
  const { filtro } = route.params || {};

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Card de informação do filtro */}
        <Card style={styles.filtroCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.filtroTitle}>
              ✓ Filtro Aplicado
            </Text>
            <Text variant="bodyLarge" style={styles.filtroRota}>
              {filtro?.escopoRotas === 'todas' || filtro?.rotaIds === 'todas'
                ? 'Todas as Rotas'
                : filtro?.rotaNomes && filtro.rotaNomes.length > 1 
                ? `Rotas: ${filtro.rotaNomes.join(', ')}`
                : `Rota: ${filtro?.rotaNome || filtro?.rotaNomes?.[0] || 'N/A'}`
              }
            </Text>
            <Text variant="bodyMedium" style={styles.filtroPeriodo}>
              Período: {new Date(filtro?.dataInicio).toLocaleDateString('pt-BR')} até{' '}
              {new Date(filtro?.dataFim).toLocaleDateString('pt-BR')}
            </Text>
          </Card.Content>
        </Card>

        {/* Card de opções */}
        <Card style={styles.opcoesCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.opcoesTitle}>
              O que você deseja fazer?
            </Text>

            {/* Botão Ver Entregas */}
            <View style={styles.opcaoContainer}>
              <FAB
                icon="truck-delivery"
                label="Ver Entregas"
                onPress={() => navigation.navigate('Rotas')}
                style={styles.entregasFab}
                color="#fff"
              />
              <Text variant="bodySmall" style={styles.opcaoDescricao}>
                Visualizar e gerenciar entregas por rota
              </Text>
            </View>

            {/* Botão Ver Romaneio */}
            <View style={styles.opcaoContainer}>
              <FAB
                icon="clipboard-list"
                label="Ver Romaneio"
                onPress={() => navigation.navigate('Romaneio')}
                style={styles.romaneioFab}
                color="#fff"
              />
              <Text variant="bodySmall" style={styles.opcaoDescricao}>
                Visualizar romaneio de entregas por escola
              </Text>
            </View>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filtroCard: {
    marginBottom: 24,
    backgroundColor: '#10b981',
    borderWidth: 0,
    elevation: 4,
  },
  filtroTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  filtroRota: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  filtroPeriodo: {
    color: '#f0fdf4',
  },
  opcoesCard: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  opcoesTitle: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 24,
    textAlign: 'center',
  },
  opcaoContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  entregasFab: {
    backgroundColor: '#1976d2',
    marginBottom: 8,
  },
  romaneioFab: {
    backgroundColor: '#9c27b0',
    marginBottom: 8,
  },
  opcaoDescricao: {
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
