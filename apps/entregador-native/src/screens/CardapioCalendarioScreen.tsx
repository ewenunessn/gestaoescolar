import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, IconButton, Chip, Portal, Modal, Button, TextInput, Menu, ActivityIndicator, FAB } from 'react-native-paper';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { api } from '../api/client';

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

const CORES_TIPO: Record<string, string> = {
  cafe_manha: '#FFA726',
  lanche_manha: '#66BB6A',
  almoco: '#EF5350',
  lanche_tarde: '#42A5F5',
  jantar: '#AB47BC'
};

const MESES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
  7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
};

export default function CardapioCalendarioScreen({ route, navigation }: any) {
  const { cardapioId } = route.params;

  const [cardapio, setCardapio] = useState<any>(null);
  const [refeicoesDias, setRefeicoesDias] = useState<any[]>([]);
  const [refeicoes, setRefeicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form state
  const [refeicaoId, setRefeicaoId] = useState<number | null>(null);
  const [refeicaoSearch, setRefeicaoSearch] = useState('');
  const [showRefeicoesSuggestions, setShowRefeicoesSuggestions] = useState(false);
  const [tipoRefeicao, setTipoRefeicao] = useState<string>('');
  const [observacao, setObservacao] = useState('');

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
        api.get(`/cardapios/${cardapioId}`),
        api.get(`/cardapios/${cardapioId}/refeicoes`),
        api.get('/refeicoes'),
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
          };
        });
      }
      setMarkedDates(marked);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = (day: any) => {
    const date = day.dateString;
    const [year, month, dayNum] = date.split('-');
    const dia = parseInt(dayNum);
    
    setSelectedDate(date);
    setSelectedDay(dia);
    
    // Atualizar marcação de seleção
    const newMarked = { ...markedDates };
    Object.keys(newMarked).forEach(key => {
      if (newMarked[key].selected) {
        delete newMarked[key].selected;
        delete newMarked[key].selectedColor;
      }
    });
    
    if (!newMarked[date]) {
      newMarked[date] = {};
    }
    newMarked[date].selected = true;
    newMarked[date].selectedColor = '#4caf50';
    
    setMarkedDates(newMarked);
  };

  const handleOpenModal = () => {
    if (!selectedDay) {
      Alert.alert('Atenção', 'Selecione um dia no calendário');
      return;
    }
    setRefeicaoId(null);
    setRefeicaoSearch('');
    setShowRefeicoesSuggestions(false);
    setTipoRefeicao('');
    setObservacao('');
    setModalVisible(true);
  };

  const handleRefeicaoSearchChange = (text: string) => {
    setRefeicaoSearch(text);
    setShowRefeicoesSuggestions(text.length > 0);
    if (text.length === 0) {
      setRefeicaoId(null);
    }
  };

  const handleSelectRefeicao = (refeicao: any) => {
    setRefeicaoId(refeicao.id);
    setRefeicaoSearch(refeicao.nome);
    setShowRefeicoesSuggestions(false);
  };

  const getFilteredRefeicoes = () => {
    if (!refeicaoSearch) return refeicoes;
    const searchLower = refeicaoSearch.toLowerCase();
    return refeicoes.filter((r: any) => 
      r.nome.toLowerCase().includes(searchLower) ||
      r.descricao?.toLowerCase().includes(searchLower)
    );
  };

  const handleSave = async () => {
    if (!refeicaoId || !tipoRefeicao) {
      Alert.alert('Erro', 'Selecione refeição e tipo');
      return;
    }

    if (!selectedDay) {
      Alert.alert('Erro', 'Selecione um dia no calendário');
      return;
    }

    try {
      await api.post(`/cardapios/${cardapioId}/refeicoes`, {
        refeicao_id: refeicaoId,
        dia: selectedDay,
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
              await api.delete(`/cardapios/refeicoes/${id}`);
              loadData();
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
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

  const getRefeicoesDodia = () => {
    if (!selectedDay) return [];
    return refeicoesDias.filter((r: any) => r.dia === selectedDay);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  const refeicoesNoDia = getRefeicoesDodia();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>{cardapio?.nome}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {cardapio && `${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`}
          </Text>
          <Text variant="bodySmall" style={styles.hint}>
            Toque em um dia para ver/adicionar refeições
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

        {/* Seção de Refeições do Dia Selecionado */}
        {selectedDay && (
          <View style={styles.refeicoesSection}>
            <View style={styles.refeicoesHeader}>
              <Text variant="titleMedium" style={styles.refeicoesTitle}>
                Dia {selectedDay} - {selectedDate && formatDate(selectedDate)}
              </Text>
              {refeicoesNoDia.length > 0 && (
                <Chip icon="food" compact style={styles.countChip}>
                  {refeicoesNoDia.length}
                </Chip>
              )}
            </View>

            {refeicoesNoDia.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    Nenhuma refeição cadastrada para este dia
                  </Text>
                  <Text variant="bodySmall" style={styles.emptyHint}>
                    Toque no botão + para adicionar
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              <View style={styles.refeicoesList}>
                {refeicoesNoDia.map((refeicao: any) => (
                  <Card 
                    key={refeicao.id} 
                    style={styles.refeicaoCard}
                  >
                    <Card.Content>
                      <View style={styles.refeicaoRow}>
                        <View 
                          style={[
                            styles.refeicaoIconContainer,
                            { backgroundColor: CORES_TIPO[refeicao.tipo_refeicao] + '20' }
                          ]}
                        >
                          <Text style={styles.refeicaoIcon}>🍽️</Text>
                        </View>
                        <View style={styles.refeicaoContent}>
                          <Text variant="titleMedium" style={styles.refeicaoNome}>
                            {refeicao.refeicao_nome}
                          </Text>
                          <Chip 
                            mode="flat" 
                            compact 
                            style={[
                              styles.tipoChip,
                              { backgroundColor: CORES_TIPO[refeicao.tipo_refeicao] + '20' }
                            ]}
                            textStyle={{ 
                              color: CORES_TIPO[refeicao.tipo_refeicao],
                              fontSize: 12,
                              fontWeight: '600'
                            }}
                          >
                            {TIPOS_REFEICAO[refeicao.tipo_refeicao]}
                          </Chip>
                          {refeicao.observacao && (
                            <Text variant="bodySmall" style={styles.observacao} numberOfLines={2}>
                              {refeicao.observacao}
                            </Text>
                          )}
                        </View>
                        <IconButton
                          icon="delete"
                          iconColor="#f44336"
                          size={20}
                          onPress={() => handleDelete(refeicao.id)}
                          style={styles.deleteButton}
                        />
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}

        {!selectedDay && (
          <View style={styles.noSelectionContainer}>
            <Text variant="bodyLarge" style={styles.noSelectionText}>
              👆 Selecione um dia no calendário
            </Text>
          </View>
        )}
      </ScrollView>

      {selectedDay && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleOpenModal}
          color="#fff"
          label="Adicionar Refeição"
        />
      )}

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
            Dia {selectedDay} - {selectedDate && formatDate(selectedDate)}
          </Text>

          <View style={styles.autocompleteContainer}>
            <TextInput
              label="Buscar Refeição"
              value={refeicaoSearch}
              onChangeText={handleRefeicaoSearchChange}
              onFocus={() => setShowRefeicoesSuggestions(refeicaoSearch.length > 0)}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="food" />}
              right={refeicaoSearch ? <TextInput.Icon icon="close" onPress={() => handleRefeicaoSearchChange('')} /> : null}
            />
            
            {showRefeicoesSuggestions && (
              <Card style={styles.suggestionsCard}>
                <ScrollView style={styles.suggestionsList} nestedScrollEnabled>
                  {getFilteredRefeicoes().length === 0 ? (
                    <View style={styles.noSuggestions}>
                      <Text variant="bodyMedium" style={styles.noSuggestionsText}>
                        Nenhuma refeição encontrada
                      </Text>
                    </View>
                  ) : (
                    getFilteredRefeicoes().map((refeicao: any) => (
                      <Card.Content
                        key={refeicao.id}
                        style={[
                          styles.suggestionItem,
                          refeicaoId === refeicao.id && styles.suggestionItemSelected
                        ]}
                      >
                        <TouchableOpacity onPress={() => handleSelectRefeicao(refeicao)}>
                          <Text variant="titleSmall" style={styles.suggestionTitle}>
                            {refeicao.nome}
                          </Text>
                          {refeicao.descricao && (
                            <Text variant="bodySmall" style={styles.suggestionDescription}>
                              {refeicao.descricao}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </Card.Content>
                    ))
                  )}
                </ScrollView>
              </Card>
            )}
          </View>

          <View style={styles.tipoRefeicaoSection}>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              Tipo de Refeição
            </Text>
            <View style={styles.tipoChipsContainer}>
              {Object.entries(TIPOS_REFEICAO).map(([key, label]) => (
                <Chip
                  key={key}
                  mode={tipoRefeicao === key ? 'flat' : 'outlined'}
                  selected={tipoRefeicao === key}
                  onPress={() => setTipoRefeicao(key)}
                  style={[
                    styles.tipoChipButton,
                    tipoRefeicao === key && { backgroundColor: CORES_TIPO[key] + '30' }
                  ]}
                  textStyle={[
                    styles.tipoChipText,
                    tipoRefeicao === key && { color: CORES_TIPO[key], fontWeight: 'bold' }
                  ]}
                  icon={tipoRefeicao === key ? 'check' : undefined}
                >
                  {label}
                </Chip>
              ))}
            </View>
          </View>

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
  scrollView: {
    flex: 1,
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
  refeicoesSection: {
    padding: 16,
    paddingBottom: 80,
  },
  refeicoesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refeicoesTitle: {
    fontWeight: 'bold',
    color: '#212121',
  },
  countChip: {
    backgroundColor: '#e8f5e9',
  },
  emptyCard: {
    backgroundColor: '#fff',
    elevation: 1,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    color: '#999',
    textAlign: 'center',
  },
  refeicoesList: {
    gap: 12,
  },
  refeicaoCard: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  refeicaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refeicaoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  refeicaoIcon: {
    fontSize: 24,
  },
  refeicaoContent: {
    flex: 1,
  },
  refeicaoNome: {
    fontWeight: '600',
    color: '#212121',
    marginBottom: 6,
  },
  tipoChip: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    height: 24,
  },
  observacao: {
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  deleteButton: {
    margin: 0,
  },
  noSelectionContainer: {
    padding: 48,
    alignItems: 'center',
  },
  noSelectionText: {
    color: '#999',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4caf50',
  },
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#666',
    marginBottom: 16,
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 1000,
    marginBottom: 12,
  },
  suggestionsCard: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    maxHeight: 200,
    elevation: 4,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  suggestionTitle: {
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  suggestionDescription: {
    color: '#666',
  },
  noSuggestions: {
    padding: 16,
    alignItems: 'center',
  },
  noSuggestionsText: {
    color: '#999',
  },
  tipoRefeicaoSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 12,
    color: '#666',
  },
  tipoChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoChipButton: {
    marginBottom: 4,
  },
  tipoChipText: {
    fontSize: 13,
  },
  menuButton: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 0,
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
