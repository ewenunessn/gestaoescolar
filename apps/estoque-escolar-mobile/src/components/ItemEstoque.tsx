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

const formatarDataValidade = (dataValidade: string): string => {
  const hoje = new Date();
  const validade = new Date(dataValidade);
  const diffTime = validade.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Vencido';
  if (diffDays === 0) return 'Vence hoje';
  if (diffDays === 1) return 'Vence amanhã';
  if (diffDays <= 7) return `${diffDays} dias`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} sem`;
  return `${Math.ceil(diffDays / 30)} mês`;
};

const getValidadeColor = (dataValidade: string): string => {
  const hoje = new Date();
  const validade = new Date(dataValidade);
  const diffTime = validade.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return '#ffebee'; // Vencido - vermelho claro
  if (diffDays <= 7) return '#fff3e0'; // Próximo ao vencimento - laranja claro
  return '#e8f5e8'; // Normal - verde claro
};

const getValidadeTextColor = (dataValidade: string): string => {
  const hoje = new Date();
  const validade = new Date(dataValidade);
  const diffTime = validade.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return '#d32f2f'; // Vencido - vermelho
  if (diffDays <= 7) return '#f57c00'; // Próximo ao vencimento - laranja
  return '#388e3c'; // Normal - verde
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

      {/* Lotes Section */}
      {item.lotes && item.lotes.length > 0 && (
        <View style={styles.lotesSection}>
          <Text style={styles.lotesLabel}>Lotes ({item.lotes.length})</Text>
          <View style={styles.lotesContainer}>
            {item.lotes.slice(0, 3).map((lote, index) => (
              <View key={lote.id} style={styles.loteItem}>
                <View style={styles.loteInfo}>
                  <Text style={styles.loteNome} numberOfLines={1}>{lote.lote}</Text>
                  <Text style={styles.loteQuantidade}>
                    {formatarQuantidade(lote.quantidade_atual)} {item.unidade_medida}
                  </Text>
                </View>
                {lote.data_validade && (
                  <View style={[
                    styles.validadeBadge,
                    { backgroundColor: getValidadeColor(lote.data_validade) }
                  ]}>
                    <Text style={[
                      styles.validadeText,
                      { color: getValidadeTextColor(lote.data_validade) }
                    ]}>
                      {formatarDataValidade(lote.data_validade)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
            {item.lotes.length > 3 && (
              <Text style={styles.maisLotes}>+{item.lotes.length - 3} lotes</Text>
            )}
          </View>
        </View>
      )}
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
  lotesSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  lotesLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  lotesContainer: {
    gap: 6,
  },
  loteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  loteInfo: {
    flex: 1,
    marginRight: 8,
  },
  loteNome: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  loteQuantidade: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  validadeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  validadeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  maisLotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default ItemEstoque;