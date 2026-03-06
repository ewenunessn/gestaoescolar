import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, IconButton, Chip, Portal, Modal, Button, TextInput, Menu, ActivityIndicator } from 'react-native-paper';
import { Calendar, LocaleConfig } from 'react-native-calendars';
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

const TIPOS_REFEICAO: Record<string, string> = {
  cafe_manha: 'Café da Manhã',
  lanche_manha: 'Lanche da Manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da Tarde',
  jantar: 'Jantar'
};

const MESES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
  7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
};

export default function CardapioCalendarioScreen({ route, navigation }: any) {
  const { cardapioId } = route.params;
  const baseURL = 'https://gestaoescolar-backend.vercel.app/api';

  const [cardapio, setCardapio] = useState<any>(null);
  const [refeicoesDias, setRefeicoesDias] = useState<any[]>([]);
  const [refeicoes, setRefeicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState<any>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedRefeicoes, setSelectedRefeicoes] = useState<any[]>([]);
  
  // Form state
  const [refeicaoId, setRefeicaoId] = useState<number | null>(null);
  const [tipoRefeicao, setTipoRefeicao] = useState<string>('');
  const [observacao, setObservacao] = useState('');
  const [refeicaoMenuVisible, setRefeicaoMenuVisible] = useState(false);
  const [tipoMenuVisible, setTipoMenuVisible] = useState(false);

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
      const [cardapioResponse, refeicoesResponse, refeicoesDisponiveisResponse] = await Promise.all([
        axios.get(`${baseURL}/cardapios/${cardapioId}`),
        axios.get(`${baseURL}/cardapios/${cardapioId}/refeicoes`),
        axios.get(`${baseURL}/refeicoes`),
      ]);
      
      const cardapioData = cardapioResponse.data.data || cardapioResponse.data;
      const refeicoesData = refeicoesResponse.data.data || refeicoesResponse.data || [];
      const refeicoesDisponiveisData = refeicoesDisponiveisResponse.data.data || refeicoesDisponiveisResponse.data || [];
      
      setCardapio(cardapioData);
      setRefeicoesDias(Array.isArray(refeicoesData) ? refeicoesData : []);
      setRefeicoes(Array.isArray(refeicoesDisponiveisData) ? refeicoesDisponiveisData : []);
      
      // Marcar datas com refeições
      const marked: any = {};
      if (Array.isArray(refeicoesData)) {
        refeicoesData.forEach((refeicao: any) => {
          const dateKey = `${cardapioData.ano}-${String(cardapioData.mes).padStart(2, '0')}-${String(refeicao.dia).padStart(2, '0')}`;
          marked[dateKey] = {
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

  const handleDayPress = (day: any) => {
    const date = day.dateString;
    const [year, month, dayNum] = date.split('-');
    const dia = parseInt(dayNum);
    
    setSelectedDate(date);
    
    // Buscar refeições deste dia
    const refeicoesNoDia = refeicoesDias.filter((r: any) => r.dia === dia);
    setSelectedRefeicoes(refeicoesNoDia);
    
    if (refeicoesNoDia.length > 0) {
      setDetailsVisible(true);
    } else {
      // Abrir modal para criar novo
      setRefeicaoId(null);
      setTipoRefeicao('');
      setObservacao('');
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
    if (!refeicaoId || !tipoRefeicao) {
      Alert.alert('Erro', 'Selecione refeição e tipo');
      return;
    }

    try {
      const [year, month, dayNum] = selectedDate.split('-');
      const dia = parseInt(dayNum);

      await axios.post(`${baseURL}/cardapios/${cardapioId}/refeicoes`, {
        refeicao_id: refeicaoId,
        dia,
        tipo_refeicao: tipoRefeicao,
        observacao: observacao.trim() || undefined,
      });
      
      setModalVisible(false);
      loadData();
      Alert.alert('Sucesso', 'Refeição adicionada com sucesso');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || error.message);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Deseja excluir esta refeição?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${baseURL}/cardapios/refeicoes/${id}`);
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

  const getTipoRefeicaoNome = () => {
    return tipoRefeicao ? TIPOS_REFEICAO[tipoRefeicao] : 'Selecione o tipo';
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getCalendarDate = () => {
    if (!cardapio) return new Date().toISOString().split('T')[0];
    return `${cardapio.ano}-${String(cardapio.mes).padStart(2, '0')}-01`;
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
          <Text variant="titleLarge" style={styles.title}>{cardapio?.nome}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {cardapio && `${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`}
          </Text>
          <Text variant="bodySmall" style={styles.hint}>
            Toque em um dia para adicionar refeições
          </Text>
        </View>

        <Calendar
          current={getCalendarDate()}
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
          minDate={`${cardapio?.ano}-${String(cardapio?.mes).padStart(2, '0')}-01`}
          maxDate={`${cardapio?.ano}-${String(cardapio?.mes).padStart(2, '0')}-${new Date(cardapio?.ano, cardapio?.mes, 0).getDate()}`}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
            <Text variant="bodySmall">Dia com refeição</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Chip icon="food" style={styles.statChip}>
            {refeicoesDias.length} {refeicoesDias.length === 1 ? 'refeição' : 'refeições'}
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
            {selectedRefeicoes.map((refeicao: any) => (
              <Card key={refeicao.id} style={styles.refeicaoCard}>
                <Card.Content>
                  <View style={styles.refeicaoRow}>
                    <View style={styles.refeicaoInfo}>
                      <Text variant="titleMedium">{refeicao.refeicao_nome}</Text>
                      <Chip mode="outlined" compact style={styles.tipoChip}>
                        {TIPOS_REFEICAO[refeicao.tipo_refeicao]}
                      </Chip>
                      {refeicao.observacao && (
                        <Text variant="bodySmall" style={styles.observacao}>
                          {refeicao.observacao}
                        </Text>
                      )}
                    </View>
                    <IconButton
                      icon="delete"
                      iconColor="#f44336"
                      size={20}
                      onPress={() => handleDelete(refeicao.id)}
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
                setTipoRefeicao('');
                setObservacao('');
                setModalVisible(true);
              }}
              style={styles.modalButton}
              buttonColor="#4caf50"
            >
              Adicionar Outra
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
            Adicionar Refeição
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
            visible={tipoMenuVisible}
            onDismiss={() => setTipoMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setTipoMenuVisible(true)}
                style={styles.menuButton}
                icon="clock-outline"
              >
                {getTipoRefeicaoNome()}
              </Button>
            }
          >
            {Object.entries(TIPOS_REFEICAO).map(([key, label]) => (
              <Menu.Item
                key={key}
                onPress={() => {
                  setTipoRefeicao(key);
                  setTipoMenuVisible(false);
                }}
                title={label}
              />
            ))}
          </Menu>

          <TextInput
            label="Observação"
            value={observacao}
            onChangeText={setObservacao}
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
    marginBottom: 4,
  },
  hint: {
    color: '#999',
    fontStyle: 'italic',
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
  refeicaoCard: {
    marginBottom: 8,
    elevation: 1,
  },
  refeicaoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refeicaoInfo: {
    flex: 1,
  },
  tipoChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  observacao: {
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
