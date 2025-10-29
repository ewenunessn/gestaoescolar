import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  AlertButton,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemEstoqueEscola, LoteEstoque } from '../types';
import Header from '../components/Header';
import { useEstoque } from '../hooks/useEstoque';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { criarDataLocal, calcularDiasParaVencimento, formatarDataBrasileira } from '../utils/dateUtils';

interface ValidadeScreenProps {
  navigation: any;
}

interface ItemValidadeExtendido extends ItemEstoqueEscola {
  loteDetalhes?: LoteEstoque & {
    dias_para_vencimento?: number;
    status_validade?: 'vencido' | 'critico' | 'atencao' | 'normal';
  };
  status_validade?: 'vencido' | 'critico' | 'atencao' | 'normal';
  dias_proximo_vencimento?: number;
}

const ValidadeScreen: React.FC<ValidadeScreenProps> = ({ navigation }) => {
  const { usuario } = useAuth();
  const { itens, refresh } = useEstoque();
  const [refreshing, setRefreshing] = useState(false);
  const [filtroValidade, setFiltroValidade] = useState<'todos' | 'vencidos' | 'criticos' | 'atencao'>('todos');
  const [itensComValidade, setItensComValidade] = useState<ItemValidadeExtendido[]>([]);

  useEffect(() => {
    processarItensComValidade();
  }, [itens]);

  const processarItensComValidade = () => {
    const itensProcessados: ItemValidadeExtendido[] = [];

    itens.forEach(item => {
      if (item.lotes && item.lotes.length > 0) {
        // Para cada lote do item, criar uma entrada separada
        item.lotes.forEach(lote => {
          if (lote.data_validade && lote.quantidade_atual > 0) {
            const diasRestantes = calcularDiasParaVencimento(lote.data_validade);

            let statusValidade: 'vencido' | 'critico' | 'atencao' | 'normal' = 'normal';
            if (diasRestantes <= 0) {
              statusValidade = 'vencido';
            } else if (diasRestantes <= 7) {
              statusValidade = 'critico';
            } else if (diasRestantes <= 30) {
              statusValidade = 'atencao';
            }

            if (statusValidade !== 'normal') {
              itensProcessados.push({
                ...item,
                loteDetalhes: {
                  ...lote,
                  dias_para_vencimento: diasRestantes,
                  status_validade: statusValidade,
                },
                status_validade: statusValidade,
                dias_proximo_vencimento: diasRestantes,
              });
            }
          }
        });
      }
    });

    // Ordenar por prioridade: vencidos primeiro, depois críticos, depois atenção
    itensProcessados.sort((a, b) => {
      const prioridades = { vencido: 1, critico: 2, atencao: 3, normal: 4 };
      const prioridadeA = prioridades[a.status_validade || 'normal'];
      const prioridadeB = prioridades[b.status_validade || 'normal'];

      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }

      // Se mesma prioridade, ordenar por dias restantes
      return (a.dias_proximo_vencimento || 0) - (b.dias_proximo_vencimento || 0);
    });

    setItensComValidade(itensProcessados);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filtrarItens = () => {
    if (filtroValidade === 'todos') {
      return itensComValidade;
    }
    return itensComValidade.filter(item => item.status_validade === filtroValidade);
  };

  const getCorStatus = (status?: string): string => {
    switch (status) {
      case 'vencido': return '#FF4444';
      case 'critico': return '#FF8800';
      case 'atencao': return '#FFD700';
      default: return '#4CAF50';
    }
  };

  const getIconeStatus = (status?: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'vencido': return 'close-circle';
      case 'critico': return 'warning';
      case 'atencao': return 'time';
      default: return 'checkmark-circle';
    }
  };

  const getTextoStatus = (status?: string, dias?: number): string => {
    switch (status) {
      case 'vencido': return 'Vencido';
      case 'critico': return `${dias} dias restantes`;
      case 'atencao': return `${dias} dias restantes`;
      default: return 'Normal';
    }
  };

  const formatarData = (data: string): string => {
    return formatarDataBrasileira(data);
  };

  const processarLoteInteligente = async (item: ItemValidadeExtendido) => {
    if (!item.loteDetalhes) return;

    const opcoes: AlertButton[] = [];

    if (item.status_validade === 'vencido') {
      opcoes.push(
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar Lote',
          style: 'destructive',
          onPress: () => descartarLote(item)
        },
        {
          text: 'Usar Mesmo Assim',
          onPress: () => navigation.navigate('Estoque', {
            itemParaMovimentar: item,
            tipoMovimento: 'saida'
          })
        }
      );
    } else if (item.status_validade === 'critico') {
      opcoes.push(
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Priorizar Saída',
          onPress: () => priorizarSaida(item)
        },
        {
          text: 'Movimentar',
          onPress: () => navigation.navigate('Estoque', {
            itemParaMovimentar: item,
            tipoMovimento: 'saida'
          })
        }
      );
    } else {
      opcoes.push(
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Movimentar',
          onPress: () => navigation.navigate('Estoque', {
            itemParaMovimentar: item
          })
        }
      );
    }

    Alert.alert(
      'Ação Inteligente',
      `Lote ${item.loteDetalhes.lote} - ${getTextoStatus(item.status_validade, item.dias_proximo_vencimento)}`,
      opcoes
    );
  };

  const descartarLote = async (_item: ItemValidadeExtendido) => {
    try {
      // Implementar descarte do lote
      Alert.alert('Funcionalidade em desenvolvimento', 'Descarte de lote será implementado');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível descartar o lote');
    }
  };

  const priorizarSaida = async (_item: ItemValidadeExtendido) => {
    try {
      // Implementar priorização de saída
      Alert.alert('Funcionalidade em desenvolvimento', 'Priorização de saída será implementada');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível priorizar a saída');
    }
  };

  const renderItem = ({ item }: { item: ItemValidadeExtendido }) => (
    <TouchableOpacity
      style={[
        styles.itemCard,
        { borderLeftColor: getCorStatus(item.status_validade) }
      ]}
      onPress={() => processarLoteInteligente(item)}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.produtoNome}>{item.produto_nome}</Text>
          <Text style={styles.loteInfo}>
            Lote: {item.loteDetalhes?.lote} • {item.loteDetalhes?.quantidade_atual} {item.unidade_medida}
          </Text>
        </View>

        <View style={[
          styles.statusBadge,
          { backgroundColor: getCorStatus(item.status_validade) + '20' }
        ]}>
          <Ionicons
            name={getIconeStatus(item.status_validade)}
            size={16}
            color={getCorStatus(item.status_validade)}
          />
          <Text style={[
            styles.statusText,
            { color: getCorStatus(item.status_validade) }
          ]}>
            {getTextoStatus(item.status_validade, item.dias_proximo_vencimento)}
          </Text>
        </View>
      </View>

      <View style={styles.validadeInfo}>
        <View style={styles.validadeRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.validadeLabel}>Vencimento:</Text>
          <Text style={[
            styles.validadeData,
            { color: getCorStatus(item.status_validade) }
          ]}>
            {item.loteDetalhes?.data_validade ? formatarData(item.loteDetalhes.data_validade) : 'N/A'}
          </Text>
        </View>

        {item.loteDetalhes?.data_fabricacao && (
          <View style={styles.validadeRow}>
            <Ionicons name="cube-outline" size={16} color="#666" />
            <Text style={styles.validadeLabel}>Fabricação:</Text>
            <Text style={styles.validadeData}>
              {formatarData(item.loteDetalhes.data_fabricacao)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.acaoInteligente}>
        <Ionicons name="bulb-outline" size={16} color="#2196F3" />
        <Text style={styles.acaoInteligenteText}>Toque para ação inteligente</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFiltros = () => (
    <View style={styles.filtrosContainer}>
      {(['todos', 'vencidos', 'criticos', 'atencao'] as const).map((filtro) => {
        const count = filtro === 'todos'
          ? itensComValidade.length
          : itensComValidade.filter(item => item.status_validade === filtro).length;

        return (
          <TouchableOpacity
            key={filtro}
            style={[
              styles.filtroButton,
              filtroValidade === filtro && styles.filtroButtonActive,
              filtro !== 'todos' && { borderColor: getCorStatus(filtro) }
            ]}
            onPress={() => setFiltroValidade(filtro)}
          >
            <Text style={[
              styles.filtroButtonText,
              filtroValidade === filtro && styles.filtroButtonTextActive,
              filtro !== 'todos' && filtroValidade !== filtro && { color: getCorStatus(filtro) }
            ]}>
              {filtro === 'todos' ? 'Todos' :
                filtro === 'vencidos' ? 'Vencidos' :
                  filtro === 'criticos' ? 'Críticos' :
                    'Atenção'} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderResumo = () => {
    const vencidos = itensComValidade.filter(item => item.status_validade === 'vencido').length;
    const criticos = itensComValidade.filter(item => item.status_validade === 'critico').length;
    const atencao = itensComValidade.filter(item => item.status_validade === 'atencao').length;

    return (
      <View style={styles.resumoContainer}>
        <View style={styles.resumoCard}>
          <Ionicons name="warning" size={24} color="#FF4444" />
          <Text style={styles.resumoNumero}>{vencidos}</Text>
          <Text style={styles.resumoLabel}>Vencidos</Text>
        </View>
        <View style={styles.resumoCard}>
          <Ionicons name="time" size={24} color="#FF8800" />
          <Text style={styles.resumoNumero}>{criticos}</Text>
          <Text style={styles.resumoLabel}>Críticos</Text>
        </View>
        <View style={styles.resumoCard}>
          <Ionicons name="alert-circle" size={24} color="#FFD700" />
          <Text style={styles.resumoNumero}>{atencao}</Text>
          <Text style={styles.resumoLabel}>Atenção</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Controle de Validade" schoolName={usuario?.nome} />

      {renderResumo()}
      {renderFiltros()}

      <FlatList
        data={filtrarItens()}
        renderItem={renderItem}
        keyExtractor={(item, index) => `validade-${item.id}-${item.loteDetalhes?.id}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#4CAF50" />
            <Text style={styles.emptyTitle}>Tudo em ordem!</Text>
            <Text style={styles.emptyText}>
              {filtroValidade === 'todos'
                ? 'Nenhum item com problemas de validade'
                : `Nenhum item ${filtroValidade === 'vencidos' ? 'vencido' :
                  filtroValidade === 'criticos' ? 'crítico' : 'em atenção'}`
              }
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  resumoContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  resumoCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resumoNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  resumoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filtrosContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filtroButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  filtroButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filtroButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  filtroButtonTextActive: {
    color: 'white',
  },
  lista: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  loteInfo: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  validadeInfo: {
    marginBottom: 12,
  },
  validadeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  validadeLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  validadeData: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  acaoInteligente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  acaoInteligenteText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ValidadeScreen;