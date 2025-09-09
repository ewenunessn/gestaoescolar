import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemEstoqueEscola, HistoricoEstoque } from '../types';
import { apiService } from '../services/api';

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

interface ModalHistoricoItemProps {
  visible: boolean;
  onClose: () => void;
  item: ItemEstoqueEscola | null;
  escolaId: number | null;
}

const ModalHistoricoItem: React.FC<ModalHistoricoItemProps> = ({
  visible,
  onClose,
  item,
  escolaId,
}) => {
  const [historico, setHistorico] = useState<HistoricoEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  const LIMIT = 10;

  const carregarHistorico = async (reset = false) => {
    if (!item || !escolaId) return;

    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      
      const currentOffset = reset ? 0 : offset;
      // Carregar histórico com paginação
      const dados = await apiService.listarHistoricoMovimentos(escolaId, LIMIT, currentOffset);
      const historicoFiltrado = dados.filter(
        (h: HistoricoEstoque) => h.produto_id === item.produto_id
      );
      
      if (reset) {
        setHistorico(historicoFiltrado);
      } else {
        setHistorico(prev => [...prev, ...historicoFiltrado]);
      }
      
      setOffset(prev => prev + LIMIT);
      setHasMore(historicoFiltrado.length === LIMIT);
    } catch (error) {
      console.error('Erro ao carregar histórico do item:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico do item');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  const carregarMais = async () => {
    if (!hasMore || loadingMore) return;
    await carregarHistorico(false);
  };

  useEffect(() => {
    if (visible && item) {
      carregarHistorico(true);
    }
  }, [visible, item]);

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTipoMovimentoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'arrow-down-circle';
      case 'saida':
        return 'arrow-up-circle';
      case 'ajuste':
        return 'refresh-circle';
      default:
        return 'help-circle';
    }
  };

  const getTipoMovimentoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return '#4caf50'; // Verde
      case 'saida':
        return '#f44336'; // Vermelho
      case 'ajuste':
        return '#ff9800'; // Laranja
      default:
        return '#666';
    }
  };

  const renderHistoricoItem = ({ item: historicoItem }: { item: HistoricoEstoque }) => (
    <View style={styles.historicoItem}>
      <View style={styles.historicoHeader}>
        <View style={styles.tipoContainer}>
          <Ionicons
            name={getTipoMovimentoIcon(historicoItem.tipo_movimentacao || historicoItem.tipo_movimento || '')}
            size={24}
            color={getTipoMovimentoColor(historicoItem.tipo_movimentacao || historicoItem.tipo_movimento || '')}
          />
          <Text style={[
            styles.tipoText,
            { color: getTipoMovimentoColor(historicoItem.tipo_movimentacao || historicoItem.tipo_movimento || '') }
          ]}>
            {(historicoItem.tipo_movimentacao || historicoItem.tipo_movimento || '').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.dataText}>
          {formatarData(historicoItem.data_movimentacao || historicoItem.data_movimento || '')}
        </Text>
      </View>
      
      <View style={styles.quantidadeContainer}>
        <Text style={styles.quantidadeLabel}>Quantidade Movimentada:</Text>
        <Text style={styles.quantidadeValue}>
          {(historicoItem.tipo_movimentacao || historicoItem.tipo_movimento) === 'saida' ? '-' : '+'}
          {formatarQuantidade(historicoItem.quantidade_movimentada || historicoItem.quantidade || 0, historicoItem.unidade_medida)}
        </Text>
      </View>
      
      {(historicoItem.quantidade_anterior !== undefined && historicoItem.quantidade_posterior !== undefined) && (
        <View style={styles.saldoContainer}>
          <Text style={styles.saldoLabel}>Saldo:</Text>
          <Text style={styles.saldoText}>
            {formatarQuantidade(historicoItem.quantidade_anterior, historicoItem.unidade_medida)} → {formatarQuantidade(historicoItem.quantidade_posterior, historicoItem.unidade_medida)}
          </Text>
        </View>
      )}
      
      {historicoItem.motivo && (
        <View style={styles.motivoContainer}>
          <Text style={styles.motivoLabel}>Motivo:</Text>
          <Text style={styles.motivoText}>{historicoItem.motivo}</Text>
        </View>
      )}
      
      {historicoItem.observacoes && (
        <View style={styles.observacoesContainer}>
          <Text style={styles.observacoesLabel}>Observações:</Text>
          <Text style={styles.observacoesText}>{historicoItem.observacoes}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Histórico - {item?.produto?.nome || 'Item'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196f3" />
            <Text style={styles.loadingText}>Carregando histórico...</Text>
          </View>
        ) : (
          <FlatList
            data={historico}
            keyExtractor={(item, index) => `historico-${item.id}-${index}-${item.data_movimentacao || item.data_movimento || ''}`}
            renderItem={renderHistoricoItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={carregarMais}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#2196f3" />
                  <Text style={styles.loadingMoreText}>Carregando mais...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Nenhuma movimentação encontrada</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
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
  listContainer: {
    padding: 16,
  },
  historicoItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataText: {
    fontSize: 14,
    color: '#666',
  },
  quantidadeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantidadeLabel: {
    fontSize: 14,
    color: '#666',
  },
  quantidadeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  saldoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saldoLabel: {
    fontSize: 14,
    color: '#666',
  },
  saldoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196f3',
  },
  motivoContainer: {
    marginBottom: 8,
  },
  motivoLabel: {
    fontSize: 14,
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
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  observacoesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default ModalHistoricoItem;