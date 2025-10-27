import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemEstoqueEscola, LoteEstoque } from '../types';

interface ModalDetalhesLotesProps {
  visible: boolean;
  item: ItemEstoqueEscola | null;
  onClose: () => void;
  onMovimentar?: (item: ItemEstoqueEscola) => void;
}

const ModalDetalhesLotes: React.FC<ModalDetalhesLotesProps> = ({
  visible,
  item,
  onClose,
  onMovimentar,
}) => {
  const formatarData = (data: string | undefined) => {
    if (!data) return 'Não informado';
    try {
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const formatarQuantidade = (quantidade: number, unidade: string) => {
    const num = Number(quantidade) || 0;
    const quantidadeFormatada = num % 1 === 0 
      ? num.toString() 
      : num.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    return `${quantidadeFormatada} ${unidade}`;
  };

  const getStatusLote = (lote: LoteEstoque) => {
    if (lote.quantidade_atual <= 0) return { text: 'Esgotado', color: '#666', bg: '#f5f5f5' };
    
    if (lote.data_validade) {
      const hoje = new Date();
      const validade = new Date(lote.data_validade);
      const diffTime = validade.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return { text: 'Vencido', color: '#d32f2f', bg: '#ffebee' };
      if (diffDays <= 7) return { text: 'Próximo ao vencimento', color: '#f57c00', bg: '#fff3e0' };
    }
    
    return { text: 'Ativo', color: '#388e3c', bg: '#e8f5e8' };
  };

  const getDiasParaVencimento = (dataValidade: string | undefined) => {
    if (!dataValidade) return null;
    
    const hoje = new Date();
    const validade = new Date(dataValidade);
    const diffTime = validade.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Vencido há ${Math.abs(diffDays)} dias`;
    if (diffDays === 0) return 'Vence hoje';
    if (diffDays === 1) return 'Vence amanhã';
    return `Vence em ${diffDays} dias`;
  };

  const lotesOrdenados = item?.lotes?.sort((a, b) => {
    // Primeiro por status (ativos primeiro)
    if (a.quantidade_atual > 0 && b.quantidade_atual <= 0) return -1;
    if (a.quantidade_atual <= 0 && b.quantidade_atual > 0) return 1;
    
    // Depois por data de validade (mais próximos primeiro)
    if (a.data_validade && b.data_validade) {
      return new Date(a.data_validade).getTime() - new Date(b.data_validade).getTime();
    }
    
    // Por último por data de criação (mais recentes primeiro)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }) || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Detalhes dos Lotes</Text>
          {onMovimentar && (
            <TouchableOpacity 
              onPress={() => {
                onClose();
                onMovimentar(item!);
              }}
              style={styles.movimentarButton}
            >
              <Ionicons name="swap-horizontal" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {item && (
          <>
            <View style={styles.produtoInfo}>
              <Text style={styles.produtoNome}>{item.produto_nome}</Text>
              <Text style={styles.produtoCategoria}>{item.categoria}</Text>
              <View style={styles.resumoQuantidade}>
                <Text style={styles.quantidadeTotal}>
                  Total: {formatarQuantidade(item.quantidade_atual, item.unidade_medida)}
                </Text>
                <Text style={styles.totalLotes}>
                  {lotesOrdenados.length} lote(s)
                </Text>
              </View>
            </View>

            <ScrollView style={styles.lotesContainer} showsVerticalScrollIndicator={false}>
              {lotesOrdenados.length === 0 ? (
                <View style={styles.semLotes}>
                  <Ionicons name="cube-outline" size={48} color="#ccc" />
                  <Text style={styles.semLotesText}>Nenhum lote cadastrado</Text>
                  <Text style={styles.semLotesSubtext}>
                    Este produto ainda não possui lotes com controle de validade
                  </Text>
                </View>
              ) : (
                lotesOrdenados.map((lote, index) => {
                  const status = getStatusLote(lote);
                  const diasVencimento = getDiasParaVencimento(lote.data_validade);
                  
                  return (
                    <View key={lote.id} style={styles.loteCard}>
                      <View style={styles.loteHeader}>
                        <View style={styles.loteInfo}>
                          <Text style={styles.loteNome}>{lote.lote}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                            <Text style={[styles.statusText, { color: status.color }]}>
                              {status.text}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.loteQuantidade}>
                          {formatarQuantidade(lote.quantidade_atual, item.unidade_medida)}
                        </Text>
                      </View>

                      <View style={styles.loteDetalhes}>
                        <View style={styles.detalheRow}>
                          <Text style={styles.detalheLabel}>Quantidade inicial:</Text>
                          <Text style={styles.detalheValor}>
                            {formatarQuantidade(lote.quantidade_inicial, item.unidade_medida)}
                          </Text>
                        </View>

                        {lote.data_fabricacao && (
                          <View style={styles.detalheRow}>
                            <Text style={styles.detalheLabel}>Data de fabricação:</Text>
                            <Text style={styles.detalheValor}>
                              {formatarData(lote.data_fabricacao)}
                            </Text>
                          </View>
                        )}

                        {lote.data_validade && (
                          <View style={styles.detalheRow}>
                            <Text style={styles.detalheLabel}>Data de validade:</Text>
                            <View style={styles.validadeContainer}>
                              <Text style={styles.detalheValor}>
                                {formatarData(lote.data_validade)}
                              </Text>
                              {diasVencimento && (
                                <Text style={[
                                  styles.diasVencimento,
                                  { color: status.color }
                                ]}>
                                  {diasVencimento}
                                </Text>
                              )}
                            </View>
                          </View>
                        )}

                        {lote.observacoes && (
                          <View style={styles.detalheRow}>
                            <Text style={styles.detalheLabel}>Observações:</Text>
                            <Text style={styles.detalheValor}>{lote.observacoes}</Text>
                          </View>
                        )}

                        <View style={styles.detalheRow}>
                          <Text style={styles.detalheLabel}>Criado em:</Text>
                          <Text style={styles.detalheValor}>
                            {formatarData(lote.created_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  movimentarButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  produtoInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  produtoNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  produtoCategoria: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  resumoQuantidade: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantidadeTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196f3',
  },
  totalLotes: {
    fontSize: 14,
    color: '#666',
  },
  lotesContainer: {
    flex: 1,
    padding: 16,
  },
  semLotes: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  semLotesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  semLotesSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loteCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  loteInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loteNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loteQuantidade: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  loteDetalhes: {
    padding: 16,
  },
  detalheRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detalheLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detalheValor: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  validadeContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  diasVencimento: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default ModalDetalhesLotes;