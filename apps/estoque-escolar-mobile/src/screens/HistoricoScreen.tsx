import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { HistoricoEstoque } from '../types';
import Header from '../components/Header';

import { useEstoque } from '../hooks/useEstoque';
import { useAuth } from '../contexts/AuthContext';

// Função para formatar quantidade
const formatarQuantidade = (quantidade: number | null | undefined, unidade?: string): string => {
  if (quantidade === null || quantidade === undefined || quantidade === 0) {
    return unidade ? `0 ${unidade}` : '0';
  }
  
  // Verifica se quantidade é um número válido
  const num = Number(quantidade) || 0;
  // Remove zeros desnecessários após a vírgula
  const quantidadeFormatada = num % 1 === 0 
    ? num.toString() 
    : num.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
  
  return unidade ? `${quantidadeFormatada} ${unidade}` : quantidadeFormatada;
};

interface HistoricoScreenProps {
  navigation: any;
}

const HistoricoScreen: React.FC<HistoricoScreenProps> = ({ navigation }) => {
  const { usuario } = useAuth();
  const {
    historico,
    historicoLoading,
    hasMoreHistorico,
    error,
    carregarHistorico,
    carregarMaisHistorico,
  } = useEstoque();

  const [refreshing, setRefreshing] = React.useState(false);
  
  // Estados para filtros
  const [filtroNome, setFiltroNome] = React.useState('');
  const [dataInicio, setDataInicio] = React.useState('');
  const [dataFim, setDataFim] = React.useState('');
  const [tipoMovimento, setTipoMovimento] = React.useState<string>('todos');
  const [mostrarFiltros, setMostrarFiltros] = React.useState(false);
  const [mostrarCalendarioInicio, setMostrarCalendarioInicio] = React.useState(false);
  const [mostrarCalendarioFim, setMostrarCalendarioFim] = React.useState(false);

  // Mostrar erro se houver
  React.useEffect(() => {
    if (error) {
      Alert.alert('Erro', error);
    }
  }, [error]);

  // Carregar histórico quando a tela for focada
  React.useEffect(() => {
    carregarHistorico(true);
  }, [carregarHistorico]);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarHistorico(true);
    setRefreshing(false);
  };

  const getTipoMovimentoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return '#4caf50';
      case 'saida': return '#f44336';
      case 'ajuste': return '#2196f3';
      default: return '#666';
    }
  };

  const getTipoMovimentoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'arrow-up-circle';
      case 'saida': return 'arrow-down-circle';
      case 'ajuste': return 'refresh-circle';
      default: return 'help-circle';
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Função para formatar data para exibição
  const formatarDataExibicao = (data: string) => {
    if (!data) return 'Data';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Função para filtrar os dados do histórico
  const filtrarHistorico = () => {
    if (!historico) return [];
    
    return historico.filter(item => {
      // Filtro por nome do produto
      const nomeMatch = !filtroNome || 
        item.produto_nome?.toLowerCase().includes(filtroNome.toLowerCase());
      
      // Filtro por tipo de movimento
      const tipoMatch = tipoMovimento === 'todos' || 
        (item.tipo_movimentacao || item.tipo_movimento) === tipoMovimento;
      
      // Filtro por data
      let dataMatch = true;
      if (dataInicio || dataFim) {
        const itemData = new Date(item.data_movimentacao || item.data_movimento || new Date());
        
        if (dataInicio) {
          try {
            const inicioComparacao = new Date(dataInicio);
            if (!isNaN(inicioComparacao.getTime())) {
              inicioComparacao.setHours(0, 0, 0, 0);
              dataMatch = dataMatch && itemData >= inicioComparacao;
            }
          } catch (e) {
            // Ignora erro de data inválida
          }
        }
        
        if (dataFim) {
          try {
            const fimComparacao = new Date(dataFim);
            if (!isNaN(fimComparacao.getTime())) {
              fimComparacao.setHours(23, 59, 59, 999);
              dataMatch = dataMatch && itemData <= fimComparacao;
            }
          } catch (e) {
            // Ignora erro de data inválida
          }
        }
      }
      
      return nomeMatch && tipoMatch && dataMatch;
    });
  };

  // Dados filtrados
  const historicoFiltrado = filtrarHistorico();

  const renderItem = ({ item }: { item: HistoricoEstoque }) => (
    <View style={styles.historicoItem}>
      {/* Nome do Produto */}
      <View style={styles.produtoContainer}>
        <Text style={styles.produtoNome}>{item.produto_nome}</Text>
        <Text style={styles.unidadeMedida}>{item.unidade_medida}</Text>
      </View>
      
      <View style={styles.historicoHeader}>
        <View style={styles.tipoContainer}>
          <Ionicons
            name={getTipoMovimentoIcon(item.tipo_movimentacao || item.tipo_movimento) as any}
            size={24}
            color={getTipoMovimentoColor(item.tipo_movimentacao || item.tipo_movimento)}
          />
          <Text style={[
            styles.tipoText,
            { color: getTipoMovimentoColor(item.tipo_movimentacao || item.tipo_movimento) }
          ]}>
            {(item.tipo_movimentacao || item.tipo_movimento || 'ajuste').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.dataText}>
          {formatarData((item.data_movimentacao || item.data_movimento) ?? '')}
        </Text>
      </View>
      
      <View style={styles.quantidadeContainer}>
        <Text style={styles.quantidadeLabel}>Quantidade Movimentada:</Text>
        <Text style={styles.quantidadeValue}>
          {(item.tipo_movimentacao || item.tipo_movimento) === 'saida' ? '-' : '+'}
          {formatarQuantidade(item.quantidade_movimentada || item.quantidade, item.unidade_medida)}
        </Text>
      </View>
      
      {(item.quantidade_anterior !== undefined && (item.quantidade_posterior !== undefined || item.quantidade_nova !== undefined)) && (
        <View style={styles.saldoContainer}>
          <Text style={styles.saldoLabel}>Saldo:</Text>
          <Text style={styles.saldoText}>
            {formatarQuantidade(item.quantidade_anterior, item.unidade_medida)} → {formatarQuantidade(item.quantidade_posterior || item.quantidade_nova, item.unidade_medida)}
          </Text>
        </View>
      )}
      
      {item.motivo && (
        <View style={styles.motivoContainer}>
          <Text style={styles.motivoLabel}>Motivo:</Text>
          <Text style={styles.motivoText}>{item.motivo}</Text>
        </View>
      )}
      
      {item.observacoes && (
        <View style={styles.observacoesContainer}>
          <Text style={styles.observacoesLabel}>Observações:</Text>
          <Text style={styles.observacoesText}>{item.observacoes}</Text>
        </View>
      )}
      
      {(item.usuario_nome || item.usuario?.nome) && (
        <View style={styles.usuarioContainer}>
          <Text style={styles.usuarioLabel}>Usuário:</Text>
          <Text style={styles.usuarioText}>{item.usuario_nome || item.usuario?.nome}</Text>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>Nenhum movimento encontrado</Text>
      <Text style={styles.emptySubtext}>
        Os movimentos dos produtos aparecerão aqui quando forem registrados
      </Text>
    </View>
  );

  if (historicoLoading && (!historico || historico.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Histórico de Movimentos" schoolName={usuario?.escola?.nome} />
      
      {/* Botão para mostrar/ocultar filtros */}
      <TouchableOpacity 
        style={styles.filtroToggle}
        onPress={() => setMostrarFiltros(!mostrarFiltros)}
      >
        <Ionicons 
          name={mostrarFiltros ? 'chevron-up' : 'filter'} 
          size={20} 
          color="#2196f3" 
        />
        <Text style={styles.filtroToggleText}>
          {mostrarFiltros ? 'Ocultar Filtros' : 'Filtros'}
        </Text>
      </TouchableOpacity>

      {/* Interface de filtros */}
      {mostrarFiltros && (
        <View style={styles.filtrosContainer}>
          {/* Filtro por nome */}
          <View style={styles.filtroItem}>
            <Text style={styles.filtroLabel}>Buscar por produto:</Text>
            <TextInput
              style={styles.filtroInput}
              placeholder="Digite o nome do produto..."
              value={filtroNome}
              onChangeText={setFiltroNome}
            />
          </View>

          {/* Filtros de data */}
          <View style={styles.filtroItem}>
            <Text style={styles.filtroLabel}>Período:</Text>
            <View style={styles.dataContainer}>
              <View style={styles.datePickerGroup}>
                <Text style={styles.dateLabel}>Período:</Text>
                <View style={styles.datePickerRow}>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setMostrarCalendarioInicio(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {formatarDataExibicao(dataInicio)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                  </TouchableOpacity>
                  
                  <Text style={styles.dateSeparator}>até</Text>
                  
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setMostrarCalendarioFim(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {formatarDataExibicao(dataFim)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Filtro por tipo de movimento */}
          <View style={styles.filtroItem}>
            <Text style={styles.filtroLabel}>Tipo de movimento:</Text>
            <View style={styles.tipoContainer}>
              {['todos', 'entrada', 'saida', 'ajuste'].map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.tipoButton,
                    tipoMovimento === tipo && styles.tipoButtonActive
                  ]}
                  onPress={() => setTipoMovimento(tipo)}
                >
                  <Text style={[
                    styles.tipoButtonText,
                    tipoMovimento === tipo && styles.tipoButtonTextActive
                  ]}>
                    {tipo === 'todos' ? 'Todos' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Botão para limpar filtros */}
          <TouchableOpacity 
            style={styles.limparFiltrosButton}
            onPress={() => {
              setFiltroNome('');
              setDataInicio('');
              setDataFim('');
              setTipoMovimento('todos');
            }}
          >
            <Ionicons name="refresh" size={16} color="#f44336" />
            <Text style={styles.limparFiltrosText}>Limpar Filtros</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal do Calendário de Início */}
      <Modal
        visible={mostrarCalendarioInicio}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarCalendarioInicio(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Data de Início</Text>
              <TouchableOpacity onPress={() => setMostrarCalendarioInicio(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={(day) => {
                setDataInicio(day.dateString);
                setMostrarCalendarioInicio(false);
              }}
              markedDates={{
                [dataInicio]: { selected: true, selectedColor: '#007AFF' }
              }}
              theme={{
                selectedDayBackgroundColor: '#007AFF',
                todayTextColor: '#007AFF',
                arrowColor: '#007AFF',
              }}
            />
          </View>
        </View>
      </Modal>
      
      {/* Modal do Calendário de Fim */}
      <Modal
        visible={mostrarCalendarioFim}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarCalendarioFim(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Data de Fim</Text>
              <TouchableOpacity onPress={() => setMostrarCalendarioFim(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={(day) => {
                setDataFim(day.dateString);
                setMostrarCalendarioFim(false);
              }}
              markedDates={{
                [dataFim]: { selected: true, selectedColor: '#007AFF' }
              }}
              theme={{
                selectedDayBackgroundColor: '#007AFF',
                todayTextColor: '#007AFF',
                arrowColor: '#007AFF',
              }}
            />
          </View>
        </View>
      </Modal>

      <FlatList
        data={historicoFiltrado}
        renderItem={renderItem}
        keyExtractor={(item, index) => `historico-geral-${item.id}-${item.estoque_escola_id || item.item_estoque_id}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={carregarMaisHistorico}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          hasMoreHistorico && historico.length > 0 ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#2196f3" />
              <Text style={styles.loadingMoreText}>Carregando mais...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={renderEmpty}
        style={styles.lista}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={historicoFiltrado.length === 0 ? styles.emptyListContainer : undefined}
      />
      

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  lista: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  historicoItem: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  produtoContainer: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  unidadeMedida: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  historicoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipoText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  dataText: {
    fontSize: 12,
    color: '#666',
  },
  quantidadeContainer: {
    marginBottom: 8,
  },
  quantidadeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  quantidadeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  saldoContainer: {
    marginBottom: 8,
  },
  saldoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  saldoText: {
    fontSize: 14,
    color: '#333',
  },
  motivoContainer: {
    marginBottom: 8,
  },
  motivoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  motivoText: {
    fontSize: 14,
    color: '#333',
  },
  observacoesContainer: {
    marginBottom: 8,
  },
  observacoesLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  observacoesText: {
    fontSize: 14,
    color: '#333',
  },
  usuarioContainer: {
    marginBottom: 8,
  },
  usuarioLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  usuarioText: {
    fontSize: 14,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  placeholder: {
    width: 40,
  },
  // Estilos para filtros
  filtroToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filtroToggleText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2196f3',
    fontWeight: '500',
  },
  filtrosContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filtroItem: {
    marginBottom: 16,
  },
  filtroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filtroInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  dataContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  datePickerGroup: {
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipoMovimentoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  tipoButtonActive: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  tipoButtonText: {
    fontSize: 14,
    color: '#666',
  },
  tipoButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  limparFiltrosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f44336',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  limparFiltrosText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#f44336',
    fontWeight: '500',
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
  },
  dateSeparator: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 8,
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: '90%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },

});

export default HistoricoScreen;