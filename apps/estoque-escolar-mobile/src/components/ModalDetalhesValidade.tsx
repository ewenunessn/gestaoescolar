import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemEstoqueEscola } from '../types';
import { apiService } from '../services/api';

interface LoteValidade {
  id: number;
  lote: string;
  quantidade_atual: number;
  data_validade?: string;
  data_fabricacao?: string;
  status: string;
  observacoes?: string;
}

interface ModalDetalhesValidadeProps {
  visible: boolean;
  onClose: () => void;
  item: ItemEstoqueEscola | null;
  onMovimentacao?: (item: ItemEstoqueEscola, tipo: 'entrada' | 'saida', quantidade?: number) => void;
}

const ModalDetalhesValidade: React.FC<ModalDetalhesValidadeProps> = ({
  visible,
  onClose,
  item,
  onMovimentacao,
}) => {
  const [lotes, setLotes] = useState<LoteValidade[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && item) {
      carregarLotes();
    }
  }, [visible, item]);

  const carregarLotes = async () => {
    if (!item) return;

    try {
      setLoading(true);
      
      // Primeiro tenta carregar lotes específicos
      const lotesData = await apiService.listarLotesProduto(item.produto_id);
      
      if (lotesData && lotesData.length > 0) {
        // Se há lotes específicos, usa eles
        setLotes(lotesData);
      } else {
        // Se não há lotes específicos, cria um "lote virtual" com os dados do item principal
        const loteVirtual: LoteValidade = {
          id: item.id || 0,
          lote: 'Estoque Principal',
          quantidade_atual: item.quantidade_atual || 0,
          data_validade: item.data_validade,
          data_fabricacao: item.data_entrada,
          status: 'ativo',
          observacoes: 'Controle de validade simples'
        };
        
        setLotes([loteVirtual]);
      }
    } catch (error) {
      console.error('Erro ao carregar lotes:', error);
      
      // Em caso de erro, ainda assim mostra os dados do item principal
      if (item.quantidade_atual && item.quantidade_atual > 0) {
        const loteVirtual: LoteValidade = {
          id: item.id || 0,
          lote: 'Estoque Principal',
          quantidade_atual: item.quantidade_atual || 0,
          data_validade: item.data_validade,
          data_fabricacao: item.data_entrada,
          status: 'ativo',
          observacoes: 'Dados do estoque principal'
        };
        
        setLotes([loteVirtual]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string): string => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarQuantidade = (quantidade: number): string => {
    const num = Number(quantidade) || 0;
    return num % 1 === 0 
      ? num.toString() 
      : num.toFixed(2).replace(/\.?0+$/, '');
  };

  const calcularDiasParaVencimento = (dataValidade: string): number => {
    const hoje = new Date();
    const validade = new Date(dataValidade);
    const diffTime = validade.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusValidade = (dataValidade?: string): { 
    status: 'vencido' | 'critico' | 'atencao' | 'normal' | 'sem_validade';
    cor: string;
    texto: string;
  } => {
    if (!dataValidade) {
      return {
        status: 'sem_validade',
        cor: '#6B7280',
        texto: 'Não perecível'
      };
    }

    const dias = calcularDiasParaVencimento(dataValidade);
    
    if (dias < 0) {
      return {
        status: 'vencido',
        cor: '#DC2626',
        texto: `Vencido há ${Math.abs(dias)} dia(s)`
      };
    } else if (dias === 0) {
      return {
        status: 'critico',
        cor: '#EA580C',
        texto: 'Vence hoje'
      };
    } else if (dias <= 7) {
      return {
        status: 'critico',
        cor: '#EA580C',
        texto: `${dias} dia(s)`
      };
    } else if (dias <= 30) {
      return {
        status: 'atencao',
        cor: '#D97706',
        texto: `${dias} dia(s)`
      };
    } else {
      return {
        status: 'normal',
        cor: '#059669',
        texto: `${dias} dia(s)`
      };
    }
  };

  const agruparLotesPorValidade = () => {
    const grupos: { [key: string]: LoteValidade[] } = {};
    
    lotes.forEach((lote) => {
      const statusInfo = getStatusValidade(lote.data_validade);
      const chave = lote.data_validade 
        ? `${statusInfo.status}_${lote.data_validade}`
        : 'sem_validade';
      
      if (!grupos[chave]) {
        grupos[chave] = [];
      }
      grupos[chave].push(lote);
    });

    // Ordenar grupos por prioridade (vencidos primeiro, depois críticos, etc.)
    const ordemPrioridade = ['vencido', 'critico', 'atencao', 'normal', 'sem_validade'];
    
    return Object.entries(grupos).sort(([chaveA], [chaveB]) => {
      const statusA = chaveA.split('_')[0];
      const statusB = chaveB.split('_')[0];
      const prioridadeA = ordemPrioridade.indexOf(statusA);
      const prioridadeB = ordemPrioridade.indexOf(statusB);
      
      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }
      
      // Se mesmo status, ordenar por data de validade
      const dataA = chaveA.includes('_') ? chaveA.split('_')[1] : '';
      const dataB = chaveB.includes('_') ? chaveB.split('_')[1] : '';
      
      if (dataA && dataB) {
        return new Date(dataA).getTime() - new Date(dataB).getTime();
      }
      
      return 0;
    });
  };

  const calcularTotalPorGrupo = (lotesGrupo: LoteValidade[]): number => {
    return lotesGrupo.reduce((total, lote) => total + (lote.quantidade_atual || 0), 0);
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.titulo}>Detalhes por Validade</Text>
            <Text style={styles.subtitulo}>{item.produto_nome}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Resumo do produto */}
        <View style={styles.resumoProduto}>
          <View style={styles.resumoItem}>
            <Text style={styles.resumoLabel}>Quantidade Total</Text>
            <Text style={styles.resumoValor}>
              {formatarQuantidade(item.quantidade_atual || 0)} {item.unidade_medida}
            </Text>
          </View>
          <View style={styles.resumoItem}>
            <Text style={styles.resumoLabel}>Categoria</Text>
            <Text style={styles.resumoValor}>{item.categoria}</Text>
          </View>
        </View>

        {/* Botões de Ação */}
        {item && (
          <View style={styles.acaoContainer}>
            <TouchableOpacity 
              style={styles.botaoEntrada}
              onPress={() => {
                if (onMovimentacao) {
                  onMovimentacao(item, 'entrada');
                }
              }}
            >
              <Ionicons name="trending-up" size={20} color="#FFFFFF" />
              <Text style={styles.botaoTexto}>Entrada</Text>
            </TouchableOpacity>
            
            {item.quantidade_atual > 0 && (
              <TouchableOpacity 
                style={styles.botaoSaida}
                onPress={() => {
                  if (onMovimentacao) {
                    onMovimentacao(item, 'saida');
                  }
                }}
              >
                <Ionicons name="trending-down" size={20} color="#FFFFFF" />
                <Text style={styles.botaoTexto}>Saída Inteligente</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Conteúdo */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Carregando lotes...</Text>
            </View>
          ) : lotes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Sem estoque</Text>
              <Text style={styles.emptySubtitle}>
                Este produto não possui quantidade em estoque no momento
              </Text>
            </View>
          ) : (
            <View style={styles.lotesContainer}>
              {agruparLotesPorValidade().map(([chave, lotesGrupo]) => {
                const primeiroLote = lotesGrupo[0];
                const statusInfo = getStatusValidade(primeiroLote.data_validade);
                const totalGrupo = calcularTotalPorGrupo(lotesGrupo);

                return (
                  <View key={chave} style={styles.grupoContainer}>
                    {/* Header do grupo */}
                    <View style={[styles.grupoHeader, { borderLeftColor: statusInfo.cor }]}>
                      <View style={styles.grupoHeaderLeft}>
                        <View style={styles.grupoTitleContainer}>
                          <Text style={styles.grupoTitulo}>
                            {primeiroLote.data_validade 
                              ? `Validade: ${formatarData(primeiroLote.data_validade)}`
                              : 'Sem validade definida'
                            }
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.cor}20` }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusInfo.cor }]} />
                            <Text style={[styles.statusText, { color: statusInfo.cor }]}>
                              {statusInfo.texto}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.grupoSubtitulo}>
                          {lotesGrupo.length === 1 && lotesGrupo[0].lote === 'Estoque Principal' 
                            ? `${formatarQuantidade(totalGrupo)} ${item.unidade_medida}`
                            : `${lotesGrupo.length} lote(s) • ${formatarQuantidade(totalGrupo)} ${item.unidade_medida}`
                          }
                        </Text>
                      </View>
                    </View>

                    {/* Lotes do grupo */}
                    <View style={styles.lotesGrupo}>
                      {lotesGrupo.map((lote, index) => (
                        <View key={lote.id} style={styles.loteItem}>
                          <View style={styles.loteHeader}>
                            <View style={styles.loteInfo}>
                              <Text style={styles.loteNome}>Lote: {lote.lote}</Text>
                              <Text style={styles.loteQuantidade}>
                                {formatarQuantidade(lote.quantidade_atual)} {item.unidade_medida}
                              </Text>
                            </View>
                            <View style={[styles.loteStatus, { backgroundColor: statusInfo.cor }]}>
                              <Text style={styles.loteStatusText}>
                                {lote.status === 'ativo' ? 'Ativo' : 'Inativo'}
                              </Text>
                            </View>
                          </View>

                          {/* Informações adicionais do lote */}
                          {lote.lote !== 'Estoque Principal' && (
                            <View style={styles.loteDetalhes}>
                              {lote.data_fabricacao && (
                                <View style={styles.loteDetalheItem}>
                                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                                  <Text style={styles.loteDetalheTexto}>
                                    Fabricação: {formatarData(lote.data_fabricacao)}
                                  </Text>
                                </View>
                              )}
                              {lote.observacoes && lote.observacoes !== 'Controle de validade simples' && lote.observacoes !== 'Dados do estoque principal' && (
                                <View style={styles.loteDetalheItem}>
                                  <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                                  <Text style={styles.loteDetalheTexto}>
                                    {lote.observacoes}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  subtitulo: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumoProduto: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resumoItem: {
    flex: 1,
  },
  resumoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resumoValor: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  acaoContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 12,
  },
  botaoEntrada: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  botaoSaida: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  botaoTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  lotesContainer: {
    padding: 16,
  },
  grupoContainer: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  grupoHeader: {
    padding: 16,
    borderLeftWidth: 4,
    backgroundColor: '#FFFFFF',
  },
  grupoHeaderLeft: {
    flex: 1,
  },
  grupoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grupoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  grupoSubtitulo: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  lotesGrupo: {
    backgroundColor: '#F9FAFB',
  },
  loteItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  loteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loteInfo: {
    flex: 1,
  },
  loteNome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  loteQuantidade: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  loteStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  loteStatusText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  loteDetalhes: {
    gap: 6,
  },
  loteDetalheItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loteDetalheTexto: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
});

export default ModalDetalhesValidade;