import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, Chip, IconButton, Portal, Modal, Button, TextInput, Menu, ActivityIndicator } from 'react-native-paper';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { listarCardapios, deletarCardapio, criarCardapio, listarRefeicoes } from '../api/nutricao';
import axios from 'axios';

// Configurar calendário em português
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

export default function CardapioCalendarioScreen({ navigation }: any) {
  const [cardapios, setCardapios] = useState<any[]>([]);
  const [refeicoes, setRefeicoes] = useState<any[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState<any>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedCardapios, setSelectedCardapios] = useState<any[]>([]);
  
  // Form state
  const [refeicaoId, setRefeicaoId] = useState<number | null>(null);
  const [modalidadeId, setModalidadeId] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [refeicaoMenuVisible, setRefeicaoMenuVisible] = useState(false);
  const [modalidadeMenuVisible, setModalidadeMenuVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardapiosData, refeicoesData, modalidadesData] = await Promise.all([
        listarCardapios(),
        listarRefeicoes(),
        loadModalidades(),
      ]);
      
      setCardapios(Array.isArray(cardapiosData) ? cardapiosData : []);
      setRefeicoes(Array.isArray(refeicoesData) ? refeicoesData : []);
      setModalidades(Array.isArray(modalidadesData) ? modalidadesData : []);
      
      // Marcar datas com cardápios
      const marked: any = {};
      if (Array.isArray(cardapiosData)) {
        cardapiosData.forEach((cardapio: any) => {
          marked[cardapio.data] = {
            marked: true,
            dotColor: '#4caf50',
            selected: false,
          };
        });
      }
      setMarkedDates(marked);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadModalidades = async () => {
    try {
      const baseURL = 'https://gestaoescolar-backend.vercel.app/api';
      const response = await axios.get(`${baseURL}/modalidades`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Erro ao carregar modalidades:', error);
      return [];
    }
  };

  const handleDayPress = (day: any) => {
    const date = day.dateString;
    setSelectedDate(date);
    
    // Buscar cardápios deste dia
    const cardapiosDoDia = cardapios.filter((c: any) => c.data === date);
    setSelectedCardapios(cardapiosDoDia);
    
    if (cardapiosDoDia.length > 0) {
      setDetailsVisible(true);
    } else {
      // Abrir modal para criar novo
      setRefeicaoId(null);
      setModalidadeId(null);
      setObservacoes('');
      setModalVisible(true);
    }
    
    // Atualizar marcação
    const newMarked = { ...markedDates };
    Object.keys(newMarked).forEach(key => {
      newMarked[key] = { ...newMarked[key], selected: key === date };
    });
    if (!newMarked[date]) {
      newMarked[date] = { selected: true };
    } else {
      newMarked[date].selected = true;
    }
    setMarkedDates(newMarked);
  };

  const handleSave = async () => {
    if (!refeicaoId || !modalidadeId) {
      Alert.alert('Erro', 'Selecione refeição e modalidade');
      return;
    }

    try {
      await criarCardapio({
        data: selectedDate,
        refeicao_id: refeicaoId,
        modalidade_id: modalidadeId,
        observacoes: observacoes.trim() || undefined,
      });
      
      setModalVisible(false);
      loadData();
      Alert.alert('Sucesso', 'Cardápio criado com sucesso');
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Deseja excluir este cardápio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletarCardapio(id);
              setDetailsVisible(false);
              loadData();
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const getRefeicaoNome = () => {
    const refeicao = refeicoes.find((r: any) => r.id === refeicaoId);
    return refeicao ? refeicao.nome : 'Selecione uma refeição';
  };

  const getModalidadeNome = () => {
    const modalidade = modalidades.find((m: any) => m.id === modalidadeId);
    return modalidade ? modalidade.nome : 'Selecione uma modalidade';
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>Calendário de Cardápios</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Toque em um dia para ver ou adicionar cardápios
          </Text>
        </View>

        <Calendar
          current={new Date().toISOString().split('T')[0]}
          markedDates={markedDates}
          onDayPress={handleDayPress}
          theme={{
            todayTextColor: '#4caf50',
            selectedDayBackgroundColor: '#4caf50',
            selectedDayTextColor: '#ffffff',
            dotColor: '#4caf50',
            arrowColor: '#4caf50',
          }}
          style={styles.calendar}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
            <Text variant="bodySmall">Dia com cardápio</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Chip icon="calendar" style={styles.statChip}>
            {cardapios.length} {cardapios.length === 1 ? 'cardápio' : 'cardápios'}
          </Chip>
        </View>
      </ScrollView>

      {/* Modal de Detalhes */}
      <Portal>
        <Modal
          visible={detailsVisible}
          onDismiss={() => setDetailsVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {selectedDate && formatDate(selectedDate)}
          </Text>
          
          <ScrollView style={styles.modalContent}>
            {selectedCardapios.map((cardapio: any) => (
              <Card key={cardapio.id} style={styles.cardapioCard}>
                <Card.Content>
                  <View style={styles.cardapioRow}>
                    <View style={styles.cardapioInfo}>
                      <Text variant="titleMedium">{cardapio.refeicao_nome}</Text>
                      <Chip mode="outlined" compact style={styles.modalidadeChip}>
                        {cardapio.modalidade_nome}
                      </Chip>
                      {cardapio.observacoes && (
                        <Text variant="bodySmall" style={styles.observacoes}>
                          {cardapio.observacoes}
                        </Text>
                      )}
                    </View>
                    <IconButton
                      icon="delete"
                      iconColor="#f44336"
                      size={20}
                      onPress={() => handleDelete(cardapio.id)}
                    />
                  </View>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              mode="contained"
              onPress={() => {
                setDetailsVisible(false);
                setRefeicaoId(null);
                setModalidadeId(null);
                setObservacoes('');
                setModalVisible(true);
              }}
              style={styles.modalButton}
              buttonColor="#4caf50"
            >
              Adicionar Outro
            </Button>
            <Button
              mode="outlined"
              onPress={() => setDetailsVisible(false)}
              style={styles.modalButton}
            >
              Fechar
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Modal de Criação */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Novo Cardápio
          </Text>
          <Text variant="bodyMedium" style={styles.modalSubtitle}>
            {selectedDate && formatDate(selectedDate)}
          </Text>

          <Menu
            visible={refeicaoMenuVisible}
            onDismiss={() => setRefeicaoMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setRefeicaoMenuVisible(true)}
                style={styles.menuButton}
                icon="food"
              >
                {getRefeicaoNome()}
              </Button>
            }
          >
            {refeicoes.map((refeicao: any) => (
              <Menu.Item
                key={refeicao.id}
                onPress={() => {
                  setRefeicaoId(refeicao.id);
                  setRefeicaoMenuVisible(false);
                }}
                title={refeicao.nome}
              />
            ))}
          </Menu>

          <Menu
            visible={modalidadeMenuVisible}
            onDismiss={() => setModalidadeMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setModalidadeMenuVisible(true)}
                style={styles.menuButton}
                icon="school"
              >
                {getModalidadeNome()}
              </Button>
            }
          >
            {modalidades.map((modalidade: any) => (
              <Menu.Item
                key={modalidade.id}
                onPress={() => {
                  setModalidadeId(modalidade.id);
                  setModalidadeMenuVisible(false);
                }}
                title={modalidade.nome}
              />
            ))}
          </Menu>

          <TextInput
            label="Observações"
            value={observacoes}
            onChangeText={setObservacoes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <View style={styles.modalActions}>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.modalButton}
              buttonColor="#4caf50"
            >
              Salvar
            </Button>
            <Button
              mode="outlined"
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Cancelar
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  calendar: {
    marginTop: 8,
    elevation: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stats: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statChip: {
    backgroundColor: '#e8f5e9',
  },
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#666',
    marginBottom: 16,
  },
  modalContent: {
    maxHeight: 300,
    marginBottom: 16,
  },
  cardapioCard: {
    marginBottom: 8,
    elevation: 1,
  },
  cardapioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardapioInfo: {
    flex: 1,
  },
  modalidadeChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  observacoes: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  menuButton: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    minWidth: 100,
  },
});
