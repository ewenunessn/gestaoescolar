import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemEstoqueEscola, ResumoEstoque, MovimentoEstoque } from '../types';
import ItemEstoque from '../components/ItemEstoque';
import ModalHistoricoItem from '../components/ModalHistoricoItem';
import Header from '../components/Header';

import { useEstoque } from '../hooks/useEstoque';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface EstoqueScreenProps {
  navigation: any;
}

const EstoqueScreen: React.FC<EstoqueScreenProps> = ({ navigation }) => {
  const { usuario } = useAuth();
  const {
    itens,
    resumo,
    loading,
    error,
    escolaId,
    adicionarItem,
    atualizarItem,
    excluirItem,
    refresh,
  } = useEstoque();
  
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<'nenhuma' | 'crescente' | 'decrescente'>('nenhuma');
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [modalMovimento, setModalMovimento] = useState(false);
  const [modalHistoricoVisible, setModalHistoricoVisible] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemEstoqueEscola | null>(null);
  const [itemHistorico, setItemHistorico] = useState<ItemEstoqueEscola | null>(null);
  const [tipoMovimento, setTipoMovimento] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Mostrar erro se houver
  React.useEffect(() => {
    if (error) {
      Alert.alert('Erro', error);
    }
  }, [error]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sem_estoque': return '#f44336';
      case 'baixo': return '#ff9800';
      default: return '#4caf50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sem_estoque': return 'alert-circle';
      case 'baixo': return 'warning';
      default: return 'checkmark-circle';
    }
  };

  const formatarQuantidade = (quantidade: number, unidade: string) => {
    // Verifica se quantidade é um número válido
    const num = Number(quantidade) || 0;
    // Remove zeros desnecessários após a vírgula
    const quantidadeFormatada = num % 1 === 0 
      ? num.toString() 
      : num.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    return `${quantidadeFormatada} ${unidade}`;
  };

  const filtrarItens = () => {
    let itensFiltrados = itens;

    if (busca) {
      itensFiltrados = itensFiltrados.filter(item =>
        item.produto_nome.toLowerCase().includes(busca.toLowerCase())
      );
    }

    if (filtroStatus !== 'todos') {
      itensFiltrados = itensFiltrados.filter(item => item.status_estoque === filtroStatus);
    }

    // Aplicar ordenação por quantidade se selecionada
    if (ordenacao === 'crescente') {
      itensFiltrados = itensFiltrados.sort((a, b) => {
        const quantidadeA = Number(a.quantidade_atual) || 0;
        const quantidadeB = Number(b.quantidade_atual) || 0;
        return quantidadeA - quantidadeB;
      });
    } else if (ordenacao === 'decrescente') {
      itensFiltrados = itensFiltrados.sort((a, b) => {
        const quantidadeA = Number(a.quantidade_atual) || 0;
        const quantidadeB = Number(b.quantidade_atual) || 0;
        return quantidadeB - quantidadeA;
      });
    } else {
      // Ordenação padrão: primeiro por status, depois por quantidade (maior primeiro), depois por nome
      itensFiltrados = itensFiltrados.sort((a, b) => {
        const statusPriority = { normal: 1, baixo: 2, sem_estoque: 3 };
        const priorityA = statusPriority[a.status_estoque as keyof typeof statusPriority] || 0;
        const priorityB = statusPriority[b.status_estoque as keyof typeof statusPriority] || 0;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // Se o status é igual, ordenar por quantidade (maior primeiro)
        const quantidadeA = Number(a.quantidade_atual) || 0;
        const quantidadeB = Number(b.quantidade_atual) || 0;
        if (quantidadeA !== quantidadeB) {
          return quantidadeB - quantidadeA;
        }
        
        // Se quantidade também é igual, ordenar por nome
        return (a.produto?.nome || '').localeCompare(b.produto?.nome || '');
      });
    }

    return itensFiltrados;
  };

  const abrirModalMovimento = (item: ItemEstoqueEscola) => {
    setItemSelecionado(item);
    setModalMovimento(true);
    setQuantidade('');
    setMotivo('');
    setObservacoes('');
  };

  const abrirModalHistorico = (item: ItemEstoqueEscola) => {
    setItemHistorico(item);
    setModalHistoricoVisible(true);
  };

  const fecharModalHistorico = () => {
    setModalHistoricoVisible(false);
    setItemHistorico(null);
  };





  const salvarMovimento = async () => {
    if (!itemSelecionado || !quantidade) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    // Validação para saída: não pode ser maior que a quantidade atual
    const quantidadeMovimento = parseFloat(quantidade);
    if (tipoMovimento === 'saida' && quantidadeMovimento > itemSelecionado.quantidade_atual) {
      Alert.alert(
        'Erro de Validação', 
        `Quantidade de saída (${formatarQuantidade(quantidadeMovimento, itemSelecionado.produto?.unidade_medida || '')}) não pode ser maior que a quantidade atual (${formatarQuantidade(itemSelecionado.quantidade_atual, itemSelecionado.produto?.unidade_medida || '')})`
      );
      return;
    }

    try {
      if (!escolaId || !itemSelecionado) {
        Alert.alert('Erro', 'Dados insuficientes para registrar movimento');
        return;
      }

      const movimento: MovimentoEstoque = {
        tipo_movimentacao: tipoMovimento,
        quantidade_movimentada: parseFloat(quantidade),
        motivo,
        observacoes,
      };

      await apiService.atualizarQuantidadeItem(escolaId, itemSelecionado.produto_id, movimento);
      setModalMovimento(false);
      await refresh();
      Alert.alert('Sucesso', 'Movimento registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar movimento:', error);
      Alert.alert('Erro', 'Não foi possível registrar o movimento');
    }
  };

  const renderItem = ({ item }: { item: ItemEstoqueEscola }) => (
    <ItemEstoque
      item={item}
      onHistorico={() => abrirModalHistorico(item)}
      onMovimentar={() => abrirModalMovimento(item)}
    />
  );

  const renderResumo = () => {
    if (!resumo) return null;

    return (
      <View style={styles.resumoContainer}>
        <View style={styles.resumoCards}>
          <View style={[styles.resumoCard, styles.resumoCardFirst, { backgroundColor: '#4caf50' }]}>
            <Text style={styles.resumoNumero}>{resumo.itens_normais}</Text>
            <Text style={styles.resumoLabel}>Normal</Text>
          </View>
          <View style={[styles.resumoCard, { backgroundColor: '#ff9800' }]}>
            <Text style={styles.resumoNumero}>{resumo.itens_baixos}</Text>
            <Text style={styles.resumoLabel}>Baixo</Text>
          </View>
          <View style={[styles.resumoCard, styles.resumoCardLast, { backgroundColor: '#f44336' }]}>
            <Text style={styles.resumoNumero}>{resumo.itens_sem_estoque}</Text>
            <Text style={styles.resumoLabel}>Sem Estoque</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
        <Text style={styles.loadingText}>Carregando estoque...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Estoque" schoolName={usuario?.escola?.nome} />
      {renderResumo()}
      
      <View style={styles.filtroToggleContainer}>
        <TouchableOpacity 
          style={styles.filtroToggleButton}
          onPress={() => setFiltrosVisiveis(!filtrosVisiveis)}
        >
          <Ionicons 
            name="filter" 
            size={20} 
            color="#2196f3" 
            style={styles.filtroToggleIcon} 
          />
          <Text style={styles.filtroToggleText}>Filtros</Text>
          <Ionicons 
            name={filtrosVisiveis ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>
      
      {filtrosVisiveis && (
        <View style={styles.filtrosContainer}>
          <View style={styles.buscaContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.buscaIcon} />
            <TextInput
              style={styles.buscaInput}
              placeholder="Buscar produto..."
              value={busca}
              onChangeText={setBusca}
            />
          </View>
          
          <View style={styles.filtroStatusContainer}>
            {['todos', 'sem_estoque', 'baixo', 'normal'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filtroButton,
                  filtroStatus === status && styles.filtroButtonActive
                ]}
                onPress={() => setFiltroStatus(status)}
              >
                <Text style={[
                  styles.filtroButtonText,
                  filtroStatus === status && styles.filtroButtonTextActive
                ]}>
                  {status === 'todos' ? 'Todos' : 
                   status === 'sem_estoque' ? 'Sem Estoque' :
                   status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
            
            <View style={styles.ordenacaoSeparator} />
            
            <TouchableOpacity
              style={[
                styles.ordenacaoButtonCompact,
                ordenacao === 'crescente' && styles.ordenacaoButtonActive
              ]}
              onPress={() => setOrdenacao(ordenacao === 'crescente' ? 'nenhuma' : 'crescente')}
            >
              <Ionicons 
                name="arrow-up" 
                size={14} 
                color={ordenacao === 'crescente' ? 'white' : '#666'} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.ordenacaoButtonCompact,
                ordenacao === 'decrescente' && styles.ordenacaoButtonActive
              ]}
              onPress={() => setOrdenacao(ordenacao === 'decrescente' ? 'nenhuma' : 'decrescente')}
            >
              <Ionicons 
                name="arrow-down" 
                size={14} 
                color={ordenacao === 'decrescente' ? 'white' : '#666'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={filtrarItens()}
        renderItem={renderItem}
        keyExtractor={(item, index) => `estoque-${item.id}-${item.produto_id}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.lista}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de Movimento */}
      <Modal
        visible={modalMovimento}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalMovimento(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Registrar Movimento</Text>
              <TouchableOpacity onPress={() => setModalMovimento(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {itemSelecionado && (
              <View style={styles.modalContent}>
                <Text style={styles.produtoNome}>{itemSelecionado.produto?.nome}</Text>
                <Text style={styles.quantidadeAtualModal}>
                  Quantidade atual: {formatarQuantidade(
                    itemSelecionado.quantidade_atual,
                    itemSelecionado.produto?.unidade_medida || ''
                  )}
                </Text>
                
                <View style={styles.tipoMovimentoContainer}>
                  {(['entrada', 'saida', 'ajuste'] as const).map((tipo) => (
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
                        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.quantidadeContainer}>
                  <TextInput
                    style={[styles.input, styles.quantidadeInput]}
                    placeholder="Quantidade"
                    value={quantidade}
                    onChangeText={(text) => setQuantidade(text.replace(',', '.'))}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unidadeText}>{itemSelecionado.produto?.unidade_medida || ''}</Text>
                </View>
                
                <TextInput
                  style={styles.input}
                  placeholder="Motivo (opcional)"
                  value={motivo}
                  onChangeText={setMotivo}
                />
                
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Observações (opcional)"
                  value={observacoes}
                  onChangeText={setObservacoes}
                  multiline
                  numberOfLines={3}
                />
                
                <TouchableOpacity 
                  style={[
                    styles.salvarButton,
                    tipoMovimento === 'entrada' && styles.salvarButtonEntrada,
                    tipoMovimento === 'saida' && styles.salvarButtonSaida,
                    tipoMovimento === 'ajuste' && styles.salvarButtonAjuste
                  ]} 
                  onPress={salvarMovimento}
                >
                  <Text style={[
                    styles.salvarButtonText,
                    tipoMovimento === 'ajuste' && { color: '#000' }
                  ]}>Salvar Movimento</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <ModalHistoricoItem
        visible={modalHistoricoVisible}
        onClose={fecharModalHistorico}
        item={itemHistorico}
        escolaId={escolaId}
      />
    </View>
  );
};

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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resumoContainer: {
    backgroundColor: 'transparent',
    padding: 8,
    marginBottom: 2,
    marginHorizontal: 16,
  },
  resumoTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  resumoCards: {
    flexDirection: 'row',
    gap: 8,
  },
  resumoCard: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  resumoCardFirst: {
    marginLeft: 0,
  },
  resumoCardLast: {
    marginRight: 0,
  },
  resumoNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  resumoLabel: {
    fontSize: 11,
    color: 'white',
    marginTop: 2,
  },
  filtroToggleContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  filtroToggleButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filtroToggleIcon: {
    marginRight: 8,
  },
  filtroToggleText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  filtrosContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  buscaIcon: {
    marginRight: 8,
  },
  buscaInput: {
    flex: 1,
    height: 36,
    fontSize: 15,
  },
  filtroStatusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filtroButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 6,
    marginBottom: 6,
  },
  filtroButtonActive: {
    backgroundColor: '#2196f3',
  },
  filtroButtonText: {
    fontSize: 13,
    color: '#666',
  },
  filtroButtonTextActive: {
    color: 'white',
  },
  lista: {
    flex: 1,
  },
  ordenacaoSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#ddd',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  ordenacaoButtonCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  ordenacaoButtonActive: {
    backgroundColor: '#2196f3',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  quantidadeAtualModal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  tipoMovimentoContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tipoButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 2,
    alignItems: 'center',
  },
  tipoButtonActive: {
    backgroundColor: '#2196f3',
  },
  tipoButtonText: {
    fontSize: 14,
    color: '#666',
  },
  tipoButtonTextActive: {
    color: 'white',
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantidadeInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  unidadeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    minWidth: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  salvarButton: {
    backgroundColor: '#6c757d', // Cor padrão (cinza)
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  salvarButtonEntrada: {
    backgroundColor: '#28a745', // Verde para entrada
  },
  salvarButtonSaida: {
    backgroundColor: '#dc3545', // Vermelho para saída
  },
  salvarButtonAjuste: {
    backgroundColor: '#ffc107', // Amarelo para ajuste
  },
  salvarButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

});

export default EstoqueScreen;