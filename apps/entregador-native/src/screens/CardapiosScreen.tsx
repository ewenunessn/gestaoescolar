import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { FAB, Card, Text, IconButton, Searchbar, Chip, Portal, Modal, Button, TextInput, Menu, ActivityIndicator } from 'react-native-paper';
import axios from 'axios';

const MESES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
  7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
};

export default function CardapiosScreen({ navigation }: any) {
  const [cardapios, setCardapios] = useState<any[]>([]);
  const [filteredCardapios, setFilteredCardapios] = useState<any[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  // Form state
  const [nome, setNome] = useState('');
  const [mes, setMes] = useState<number | null>(null);
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [modalidadeId, setModalidadeId] = useState<number | null>(null);
  const [observacao, setObservacao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [mesMenuVisible, setMesMenuVisible] = useState(false);
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
      const baseURL = 'https://gestaoescolar-backend.vercel.app/api';
      
      const [cardapiosResponse, modalidadesResponse] = await Promise.all([
        axios.get(`${baseURL}/cardapios`),
        axios.get(`${baseURL}/modalidades`),
      ]);
      
      const cardapiosData = cardapiosResponse.data.data || cardapiosResponse.data || [];
      const modalidadesData = modalidadesResponse.data.data || modalidadesResponse.data || [];
      
      setCardapios(Array.isArray(cardapiosData) ? cardapiosData : []);
      setModalidades(Array.isArray(modalidadesData) ? modalidadesData : []);
      setFilteredCardapios(Array.isArray(cardapiosData) ? cardapiosData : []);
    } catch (error: any) {
      console.error('Erro ao carregar cardápios:', error);
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredCardapios(cardapios);
    } else {
      const filtered = cardapios.filter((cardapio: any) =>
        cardapio.nome?.toLowerCase().includes(query.toLowerCase()) ||
        cardapio.modalidade_nome?.toLowerCase().includes(query.toLowerCase()) ||
        cardapio.observacao?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCardapios(filtered);
    }
  };

  const handleOpenModal = (cardapio?: any) => {
    if (cardapio) {
      setEditMode(true);
      setSelectedId(cardapio.id);
      setNome(cardapio.nome);
      setMes(cardapio.mes);
      setAno(cardapio.ano.toString());
      setModalidadeId(cardapio.modalidade_id);
      setObservacao(cardapio.observacao || '');
      setAtivo(cardapio.ativo);
    } else {
      setEditMode(false);
      setSelectedId(null);
      setNome('');
      setMes(null);
      setAno(new Date().getFullYear().toString());
      setModalidadeId(null);
      setObservacao('');
      setAtivo(true);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!nome || !mes || !ano || !modalidadeId) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const baseURL = 'https://gestaoescolar-backend.vercel.app/api';
      const cardapioData = {
        nome,
        mes,
        ano: parseInt(ano),
        modalidade_id: modalidadeId,
        observacao: observacao.trim() || undefined,
        ativo,
      };

      if (editMode && selectedId) {
        await axios.put(`${baseURL}/cardapios/${selectedId}`, cardapioData);
        Alert.alert('Sucesso', 'Cardápio atualizado com sucesso');
      } else {
        await axios.post(`${baseURL}/cardapios`, cardapioData);
        Alert.alert('Sucesso', 'Cardápio criado com sucesso');
      }
      
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || error.message);
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
              const baseURL = 'https://gestaoescolar-backend.vercel.app/api';
              await axios.delete(`${baseURL}/cardapios/${id}`);
              loadData();
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const getMesNome = () => {
    return mes ? MESES[mes] : 'Selecione o mês';
  };

  const getModalidadeNome = () => {
    const modalidade = modalidades.find((m: any) => m.id === modalidadeId);
    return modalidade ? modalidade.nome : 'Selecione uma modalidade';
  };

  if (loading && cardapios.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Buscar cardápios..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
          elevation={0}
        />
      </View>

      <View style={styles.statsContainer}>
        <Chip icon="calendar" style={styles.statChip}>
          {cardapios.length} {cardapios.length === 1 ? 'cardápio' : 'cardápios'}
        </Chip>
      </View>

      <FlatList
        data={filteredCardapios}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => navigation.navigate('CardapioCalendario', { cardapioId: item.id })}>
            <Card.Content>
              <View style={styles.cardRow}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>📅</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    {item.nome}
                  </Text>
                  <View style={styles.chipsRow}>
                    <Chip mode="outlined" compact style={styles.chip} icon="calendar">
                      {MESES[item.mes]} / {item.ano}
                    </Chip>
                    <Chip mode="outlined" compact style={styles.chip} icon="school">
                      {item.modalidade_nome}
                    </Chip>
                  </View>
                  <View style={styles.statsRow}>
                    <Chip mode="flat" compact style={styles.statChipSmall}>
                      {item.total_refeicoes || 0} refeições
                    </Chip>
                    <Chip mode="flat" compact style={styles.statChipSmall}>
                      {item.total_dias || 0} dias
                    </Chip>
                    <Chip 
                      mode="flat" 
                      compact 
                      style={[styles.statusChip, item.ativo ? styles.statusChipActive : styles.statusChipInactive]}
                    >
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Chip>
                  </View>
                  {item.observacao && (
                    <Text variant="bodySmall" style={styles.observacao} numberOfLines={2}>
                      {item.observacao}
                    </Text>
                  )}
                </View>
                <View style={styles.cardActions}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    iconColor="#1976d2"
                    onPress={() => handleOpenModal(item)}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor="#f44336"
                    onPress={() => handleDelete(item.id)}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              Nenhum cardápio cadastrado
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Toque no botão + para criar um cardápio mensal
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => handleOpenModal()}
        color="#fff"
      />

      {/* Modal de Criação/Edição */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editMode ? 'Editar Cardápio' : 'Novo Cardápio'}
          </Text>

          <TextInput
            label="Nome do Cardápio"
            value={nome}
            onChangeText={setNome}
            mode="outlined"
            style={styles.input}
          />

          <Menu
            visible={mesMenuVisible}
            onDismiss={() => setMesMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setMesMenuVisible(true)}
                style={styles.menuButton}
                icon="calendar"
              >
                {getMesNome()}
              </Button>
            }
          >
            {Object.entries(MESES).map(([num, nome]) => (
              <Menu.Item
                key={num}
                onPress={() => {
                  setMes(parseInt(num));
                  setMesMenuVisible(false);
                }}
                title={nome}
              />
            ))}
          </Menu>

          <TextInput
            label="Ano"
            value={ano}
            onChangeText={setAno}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />

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
              {editMode ? 'Salvar' : 'Criar'}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    elevation: 2,
  },
  searchbar: {
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statChip: {
    backgroundColor: '#e3f2fd',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#fff',
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    height: 28,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  statChipSmall: {
    height: 24,
    backgroundColor: '#e3f2fd',
  },
  statusChip: {
    height: 24,
  },
  statusChipActive: {
    backgroundColor: '#e8f5e9',
  },
  statusChipInactive: {
    backgroundColor: '#f5f5f5',
  },
  observacao: {
    color: '#666',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4caf50',
  },
  empty: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  menuButton: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  modalButton: {
    minWidth: 100,
  },
});
