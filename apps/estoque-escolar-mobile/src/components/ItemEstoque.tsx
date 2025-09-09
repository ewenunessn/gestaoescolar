import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemEstoqueEscola } from '../types';

interface ItemEstoqueProps {
  item: ItemEstoqueEscola;
  onPress?: (item: ItemEstoqueEscola) => void;
  onHistorico?: (item: ItemEstoqueEscola) => void;
  onMovimentar?: (item: ItemEstoqueEscola) => void;
}

const formatarQuantidade = (quantidade: number | null | undefined): string => {
  if (!quantidade || quantidade === 0) return 'Sem Estoque';
  
  // Remove zeros desnecessários após a vírgula
  const numeroFormatado = parseFloat(quantidade.toString());
  return numeroFormatado % 1 === 0 ? numeroFormatado.toString() : numeroFormatado.toFixed(2).replace(/\.?0+$/, '');
};

const ItemEstoque: React.FC<ItemEstoqueProps> = ({ item, onPress, onHistorico, onMovimentar }) => {
  const getStatusColor = (quantidadeAtual: number): string => {
    const quantidade = Number(quantidadeAtual) || 0;
    if (quantidade === 0) {
      return '#FF6B6B'; // Vermelho para sem estoque
    } else if (quantidade < 10) {
      return '#FFD93D'; // Amarelo para baixo
    } else {
      return '#6BCF7F'; // Verde para normal
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sem_estoque': return 'alert-circle';
      case 'baixo': return 'warning';
      case 'excesso': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  const getStatusText = (quantidadeAtual: number): string => {
    const quantidade = Number(quantidadeAtual) || 0;
    if (quantidade === 0) {
      return 'Sem Estoque';
    } else if (quantidade < 10) {
      return 'Baixo';
    } else {
      return 'Normal';
    }
  };

  const getStatusBackgroundColor = (quantidadeAtual: number): string => {
    const quantidade = Number(quantidadeAtual) || 0;
    if (quantidade === 0) {
      return '#FFE5E5'; // Fundo vermelho claro para sem estoque
    } else if (quantidade < 10) {
      return '#FFF8E1'; // Fundo amarelo claro para baixo
    } else {
      return '#E8F5E8'; // Fundo verde claro para normal
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        { borderLeftColor: getStatusColor(item.quantidade_atual || 0) }
      ]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerInfo}>
            <Text style={styles.nome} numberOfLines={1}>
              {item.produto?.nome || 'Produto sem nome'}
            </Text>
            <Text style={styles.categoria}>
              {formatDate(item.data_ultima_atualizacao ? new Date(item.data_ultima_atualizacao) : new Date())}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          {onMovimentar && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onMovimentar(item);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="swap-horizontal-outline" size={22} color="#2196F3" />
            </TouchableOpacity>
          )}
          {onHistorico && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onHistorico(item);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="time-outline" size={22} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quantity Section */}
      <View style={styles.quantitySection}>
        <View style={styles.quantityContainer}>
          <Text style={styles.quantidadeLabel}>Quantidade Atual</Text>
          <View style={styles.quantityValue}>
            <Text style={[
              styles.quantidadeNumero,
              { color: getStatusColor(item.quantidade_atual || 0) }
            ]}>
              {formatarQuantidade(item.quantidade_atual)}
            </Text>
            <Text style={styles.unidade}>{item.produto?.unidade_medida || item.unidade_medida || ''}</Text>
          </View>
        </View>

        <View style={[
          styles.statusBadge,
          { 
            backgroundColor: getStatusBackgroundColor(item.quantidade_atual || 0),
            borderColor: getStatusColor(item.quantidade_atual || 0)
          }
        ]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(item.quantidade_atual || 0) }
          ]} />
          <Text style={[
            styles.statusText,
            { color: getStatusColor(item.quantidade_atual || 0) }
          ]}>
            {getStatusText(item.quantidade_atual || 0)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
  },
  nome: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  categoria: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  quantityContainer: {
    flex: 1,
  },
  quantidadeLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quantityValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  quantidadeNumero: {
    fontSize: 36,
    fontWeight: '700',
    marginRight: 4,
    letterSpacing: -1,
  },
  unidade: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

export default ItemEstoque;