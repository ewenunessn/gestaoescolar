import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Modal,
  TextInput
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { normalizeQrFilter } from '../utils/qrFilter';

interface ItemRomaneio {
  id: number;
  data_entrega: string;
  quantidade: number;
  unidade: string;
  observacao?: string;
  status: string;
  produto_nome: string;
  escola_nome: string;
  escola_rota?: string;
}

interface RomaneioPorEscola {
  escola: string;
  rota?: string;
  itens: ItemRomaneio[];
}

interface ProdutoConsolidado {
  produto_nome: string;
  unidade: string;
  quantidade_total: number;
  escolas: { id: number; nome: string; quantidade: number; status: string; rota?: string }[];
}

interface DataConsolidada {
  data: string;
  produtos: ProdutoConsolidado[];
}

const RomaneioScreen = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [itens, setItens] = useState<ItemRomaneio[]>([]);
  const [rotas, setRotas] = useState<any[]>([]);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [dataFim, setDataFim] = useState<Date>(new Date());
  const [status, setStatus] = useState('pendente');
  const [rotaId, setRotaId] = useState<number | null>(null);
  const [rotaIdsFiltro, setRotaIdsFiltro] = useState<number[] | 'todas'>('todas');
  
  // Controle dos DatePickers
  const [showDataInicio, setShowDataInicio] = useState(false);
  const [showDataFim, setShowDataFim] = useState(false);
  
  // Flag para saber se está usando datas manuais ou do filtro
  const [usarDatasManual, setUsarDatasManual] = useState(false);
  
  // Modo de visualização: 'consolidado' ou 'escola' (consolidado é padrão)
  const [modoVisualizacao, setModoVisualizacao] = useState<'escola' | 'consolidado'>('consolidado');
  
  // Controle do collapse dos filtros
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  
  // Modal de detalhes do produto consolidado
  const [modalVisible, setModalVisible] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoConsolidado | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<string>('');
  const [produtosMarcados, setProdutosMarcados] = useState<Set<string>>(new Set());
  
  // Modal de calculadora de embalagens
  const [modalCalculadoraVisible, setModalCalculadoraVisible] = useState(false);
  const [produtoCalculadora, setProdutoCalculadora] = useState<ProdutoConsolidado | null>(null);
  const [dataCalculadora, setDataCalculadora] = useState<string>('');
  const [embalagens, setEmbalagens] = useState<{ quantidade: number; tipo: string; qtdDisponivel: string }[]>([
    { quantidade: 30, tipo: 'Caixa', qtdDisponivel: '' }
  ]);
  const [resultadoCalculo, setResultadoCalculo] = useState<{
    quantidadeTotal: number;
    pesoTotal: number;
    distribuicao: { 
      tipo: string; 
      qtdPorEmbalagem: number; 
      qtdEmbalagens: number; 
      totalUnidades: number; 
      qtdDisponivel: number;
      faltando: boolean;
    }[];
    quantidadeRestante: number;
  } | null>(null);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  type RomaneioQueryOverride = {
    dataInicio?: Date;
    dataFim?: Date;
    rotaId?: number | null;
    rotaIdsFiltro?: number[] | 'todas';
  };

  const carregarDadosIniciais = async () => {
    await carregarRotas();
    const filtro = await carregarFiltroEntrega();
    await carregarRomaneio(filtro || undefined);
  };

  const carregarFiltroEntrega = async (forcarFiltro = false): Promise<RomaneioQueryOverride | null> => {
    try {
      const filtro = await AsyncStorage.getItem('filtro_qrcode');
      if (filtro && (!usarDatasManual || forcarFiltro)) {
        const parsedFiltro = normalizeQrFilter(filtro);
        if (!parsedFiltro) return null;

        console.log('📅 Usando datas do filtro de entrega:', parsedFiltro);

        const inicio = new Date(parsedFiltro.dataInicio);
        const fim = new Date(parsedFiltro.dataFim);
        const rotaIdsDoFiltro = parsedFiltro.rotaIds === 'todas' ? 'todas' : parsedFiltro.rotaIds;
        const rotaUnica = Array.isArray(rotaIdsDoFiltro) && rotaIdsDoFiltro.length === 1
          ? rotaIdsDoFiltro[0]
          : null;

        setDataInicio(inicio);
        setDataFim(fim);
        setRotaIdsFiltro(rotaIdsDoFiltro);
        setRotaId(rotaUnica);

        return {
          dataInicio: inicio,
          dataFim: fim,
          rotaId: rotaUnica,
          rotaIdsFiltro: rotaIdsDoFiltro,
        };
      }
    } catch (error) {
      console.error('Erro ao carregar filtro de entrega:', error);
    }

    return null;
  };

  const carregarRotas = async () => {
    try {
      const response = await api.get('/entregas/rotas');
      setRotas(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar rotas:', error);
    }
  };

  const carregarRomaneio = async (override?: RomaneioQueryOverride) => {
    setLoading(true);
    try {
      const dataInicioConsulta = override?.dataInicio || dataInicio;
      const dataFimConsulta = override?.dataFim || dataFim;
      const rotaIdConsulta = override?.rotaId !== undefined ? override.rotaId : rotaId;
      const rotaIdsConsulta = override?.rotaIdsFiltro || rotaIdsFiltro;
      const params: any = {
        data_inicio: format(dataInicioConsulta, 'yyyy-MM-dd'),
        data_fim: format(dataFimConsulta, 'yyyy-MM-dd')
      };
      
      if (status !== 'todos') params.status = status;
      if (rotaIdConsulta) {
        params.rota_id = rotaIdConsulta;
      } else if (Array.isArray(rotaIdsConsulta) && rotaIdsConsulta.length > 0) {
        params.rota_ids = rotaIdsConsulta.join(',');
      }

      console.log('🔍 Carregando romaneio com params:', params);
      const response = await api.get('/guias/romaneio', { params });
      console.log('✅ Romaneio carregado:', response.data);
      
      // Backend retorna { success: true, data: [...] }
      const dados = response.data.data || response.data;
      setItens(Array.isArray(dados) ? dados : []);
    } catch (error: any) {
      console.error('❌ Erro ao carregar romaneio:', error);
      console.error('Detalhes:', error.response?.data || error.message);
      Alert.alert(
        'Erro', 
        error.response?.data?.error || error.message || 'Não foi possível carregar o romaneio'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onChangeDataInicio = (event: any, selectedDate?: Date) => {
    setShowDataInicio(Platform.OS === 'ios');
    if (selectedDate) {
      setDataInicio(selectedDate);
      setUsarDatasManual(true);
    }
  };

  const onChangeDataFim = (event: any, selectedDate?: Date) => {
    setShowDataFim(Platform.OS === 'ios');
    if (selectedDate) {
      setDataFim(selectedDate);
      setUsarDatasManual(true);
    }
  };

  const limparDatasManual = async () => {
    setUsarDatasManual(false);
    const filtro = await carregarFiltroEntrega(true);
    await carregarRomaneio(filtro || undefined);
  };

  const abrirDetalhes = (produto: ProdutoConsolidado, data: string) => {
    setProdutoSelecionado(produto);
    setDataSelecionada(data);
    setModalVisible(true);
  };

  const abrirCalculadora = (produto: ProdutoConsolidado, data: string) => {
    setProdutoCalculadora(produto);
    setDataCalculadora(data);
    setModalCalculadoraVisible(true);
    // Resetar valores
    setEmbalagens([{ quantidade: 30, tipo: 'Caixa', qtdDisponivel: '' }]);
    setResultadoCalculo(null);
  };

  const adicionarEmbalagem = () => {
    setEmbalagens([...embalagens, { quantidade: 1, tipo: 'Caixa', qtdDisponivel: '' }]);
  };

  const removerEmbalagem = (index: number) => {
    if (embalagens.length > 1) {
      setEmbalagens(embalagens.filter((_, i) => i !== index));
    }
  };

  const atualizarEmbalagem = (index: number, campo: 'quantidade' | 'tipo' | 'qtdDisponivel', valor: string | number) => {
    const novasEmbalagens = [...embalagens];
    if (campo === 'quantidade') {
      novasEmbalagens[index].quantidade = Number(valor) || 0;
    } else if (campo === 'qtdDisponivel') {
      novasEmbalagens[index].qtdDisponivel = String(valor);
    } else {
      novasEmbalagens[index].tipo = valor as string;
    }
    setEmbalagens(novasEmbalagens);
  };

  const calcularEmbalagens = () => {
    if (!produtoCalculadora) return;

    let quantidadeRestante = produtoCalculadora.quantidade_total;
    
    const resultado: { 
      tipo: string; 
      qtdPorEmbalagem: number; 
      qtdEmbalagens: number; 
      totalUnidades: number; 
      qtdDisponivel: number;
      faltando: boolean;
    }[] = [];

    // Ordenar embalagens por quantidade (maior para menor)
    const embalagensOrdenadas = [...embalagens].sort((a, b) => b.quantidade - a.quantidade);

    embalagensOrdenadas.forEach(emb => {
      if (quantidadeRestante <= 0) return;
      
      const qtdDisponivel = parseInt(emb.qtdDisponivel) || 0;
      const qtdNecessaria = Math.floor(quantidadeRestante / emb.quantidade);
      
      // Usar o mínimo entre o necessário e o disponível (se disponível foi informado)
      const qtdEmbalagens = qtdDisponivel > 0 ? Math.min(qtdNecessaria, qtdDisponivel) : qtdNecessaria;
      
      if (qtdEmbalagens > 0) {
        const totalUnidades = qtdEmbalagens * emb.quantidade;
        const faltando = qtdDisponivel > 0 && qtdNecessaria > qtdDisponivel;
        
        resultado.push({
          tipo: emb.tipo,
          qtdPorEmbalagem: emb.quantidade,
          qtdEmbalagens,
          totalUnidades,
          qtdDisponivel,
          faltando
        });
        quantidadeRestante -= totalUnidades;
      }
    });

    // Se sobrou algo, adicionar como unidades avulsas
    if (quantidadeRestante > 0) {
      resultado.push({
        tipo: 'Avulsas',
        qtdPorEmbalagem: 1,
        qtdEmbalagens: Math.ceil(quantidadeRestante),
        totalUnidades: Math.ceil(quantidadeRestante),
        qtdDisponivel: 0,
        faltando: false
      });
    }

    setResultadoCalculo({
      quantidadeTotal: produtoCalculadora.quantidade_total,
      pesoTotal: 0, // Não calculamos mais peso
      distribuicao: resultado,
      quantidadeRestante: 0
    });
  };

  const toggleProdutoMarcado = (produtoNome: string, unidade: string, data: string) => {
    const chave = `${data}-${produtoNome}-${unidade}`;
    const estaMarcado = produtosMarcados.has(chave);
    
    Alert.alert(
      estaMarcado ? 'Desmarcar Produto' : 'Marcar Produto',
      estaMarcado 
        ? `Desmarcar "${produtoNome}" como não carregado?`
        : `Marcar "${produtoNome}" como carregado no caminhão?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: estaMarcado ? 'Desmarcar' : 'Marcar',
          onPress: () => {
            setProdutosMarcados(prev => {
              const newSet = new Set(prev);
              if (newSet.has(chave)) {
                newSet.delete(chave);
              } else {
                newSet.add(chave);
              }
              return newSet;
            });
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarRomaneio();
  };

  // Agrupar itens por escola
  const dadosAgrupados = React.useMemo(() => {
    const grupos: Record<string, RomaneioPorEscola> = {};
    
    itens.forEach(item => {
      if (!grupos[item.escola_nome]) {
        grupos[item.escola_nome] = {
          escola: item.escola_nome,
          rota: item.escola_rota,
          itens: []
        };
      }
      grupos[item.escola_nome].itens.push(item);
    });

    return Object.values(grupos).sort((a, b) => a.escola.localeCompare(b.escola));
  }, [itens]);

  // Agrupar itens por data e produto (modo consolidado)
  const dadosConsolidados = React.useMemo(() => {
    const grupos: Record<string, {
      data: string;
      produtos: Record<string, ProdutoConsolidado>
    }> = {};

    itens.forEach(item => {
      const data = item.data_entrega.split('T')[0];
      
      if (!grupos[data]) {
        grupos[data] = {
          data,
          produtos: {}
        };
      }

      const chaveProduto = `${item.produto_nome}-${item.unidade}`;

      if (!grupos[data].produtos[chaveProduto]) {
        grupos[data].produtos[chaveProduto] = {
          produto_nome: item.produto_nome,
          unidade: item.unidade,
          quantidade_total: 0,
          escolas: []
        };
      }

      grupos[data].produtos[chaveProduto].quantidade_total += Number(item.quantidade);
      grupos[data].produtos[chaveProduto].escolas.push({
        id: item.id,
        nome: item.escola_nome,
        quantidade: Number(item.quantidade),
        status: item.status,
        rota: item.escola_rota
      });
    });

    return Object.values(grupos)
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(grupo => ({
        data: grupo.data,
        produtos: Object.values(grupo.produtos).sort((a, b) => {
          const nomeCompare = a.produto_nome.localeCompare(b.produto_nome);
          if (nomeCompare !== 0) return nomeCompare;
          return a.unidade.localeCompare(b.unidade);
        })
      }));
  }, [itens]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entregue': return '#4caf50';
      case 'em_rota': return '#ff9800';
      case 'programada': return '#2196f3';
      case 'suspenso': return '#ff5722';
      case 'cancelado': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'entregue': return 'Entregue';
      case 'em_rota': return 'Em Rota';
      case 'programada': return 'Programada';
      case 'suspenso': return 'Suspenso';
      case 'cancelado': return 'Cancelado';
      default: return 'Pendente';
    }
  };

  // Gera uma cor consistente baseada no nome da rota
  const getRotaColor = (rotaNome?: string) => {
    if (!rotaNome) return '#1976d2'; // Cor padrão
    
    // Lista de cores vibrantes para rotas
    const cores = [
      '#e91e63', // Pink
      '#9c27b0', // Purple
      '#673ab7', // Deep Purple
      '#3f51b5', // Indigo
      '#2196f3', // Blue
      '#00bcd4', // Cyan
      '#009688', // Teal
      '#4caf50', // Green
      '#8bc34a', // Light Green
      '#ff9800', // Orange
      '#ff5722', // Deep Orange
      '#795548', // Brown
      '#607d8b', // Blue Grey
      '#f44336', // Red
      '#ffc107', // Amber
    ];
    
    // Gera um hash simples do nome da rota
    let hash = 0;
    for (let i = 0; i < rotaNome.length; i++) {
      hash = rotaNome.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Usa o hash para selecionar uma cor
    const index = Math.abs(hash) % cores.length;
    return cores[index];
  };

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filterContainer}>
        {/* Toggle de modo de visualização - sempre visível */}
        <View style={styles.modoToggleContainer}>
          <TouchableOpacity 
            style={[
              styles.modoButton, 
              modoVisualizacao === 'consolidado' && styles.modoButtonActive
            ]}
            onPress={() => setModoVisualizacao('consolidado')}
          >
            <Text style={[
              styles.modoButtonText,
              modoVisualizacao === 'consolidado' && styles.modoButtonTextActive
            ]}>
              Consolidado
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.modoButton, 
              modoVisualizacao === 'escola' && styles.modoButtonActive
            ]}
            onPress={() => setModoVisualizacao('escola')}
          >
            <Text style={[
              styles.modoButtonText,
              modoVisualizacao === 'escola' && styles.modoButtonTextActive
            ]}>
              Por Escola
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botão para expandir/colapsar filtros */}
        <TouchableOpacity 
          style={styles.toggleFiltrosButton}
          onPress={() => setFiltrosExpandidos(!filtrosExpandidos)}
        >
          <Text style={styles.toggleFiltrosText}>
            {filtrosExpandidos ? '▼' : '▶'} Filtros Avançados
          </Text>
        </TouchableOpacity>

        {/* Filtros colapsáveis */}
        {filtrosExpandidos && (
          <>
            {/* Datas */}
            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <Text style={styles.filterLabel}>Data Início:</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowDataInicio(true)}
                >
                  <Text style={styles.dateButtonText}>
                    📅 {format(dataInicio, 'dd/MM/yyyy')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateColumn}>
                <Text style={styles.filterLabel}>Data Fim:</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowDataFim(true)}
                >
                  <Text style={styles.dateButtonText}>
                    📅 {format(dataFim, 'dd/MM/yyyy')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {usarDatasManual && (
              <TouchableOpacity 
                style={styles.clearDatesButton}
                onPress={limparDatasManual}
              >
                <Text style={styles.clearDatesText}>
                  🔄 Usar datas do filtro de entrega
                </Text>
              </TouchableOpacity>
            )}

            {showDataInicio && (
              <DateTimePicker
                value={dataInicio}
                mode="date"
                display="default"
                onChange={onChangeDataInicio}
              />
            )}

            {showDataFim && (
              <DateTimePicker
                value={dataFim}
                mode="date"
                display="default"
                onChange={onChangeDataFim}
              />
            )}

            <Text style={styles.filterLabel}>Rota:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={rotaId}
                onValueChange={(value) => {
                  const nextRotaId = value ? Number(value) : null;
                  setRotaId(nextRotaId);
                  setRotaIdsFiltro(nextRotaId ? [nextRotaId] : 'todas');
                }}
                style={styles.picker}
              >
                <Picker.Item label="Todas as Rotas" value={null} />
                {rotas.map((rota) => (
                  <Picker.Item key={rota.id} label={rota.nome} value={rota.id} />
                ))}
              </Picker>
            </View>

            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={status}
                onValueChange={(value) => setStatus(value)}
                style={styles.picker}
              >
                <Picker.Item label="Todos (Ativos)" value="todos" />
                <Picker.Item label="Pendente" value="pendente" />
                <Picker.Item label="Programada" value="programada" />
                <Picker.Item label="Em Rota" value="em_rota" />
                <Picker.Item label="Entregue" value="entregue" />
              </Picker>
            </View>

            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => carregarRomaneio()}
            >
              <Text style={styles.searchButtonText}>🔍 Buscar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Lista */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>Carregando romaneio...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {dadosAgrupados.length === 0 && dadosConsolidados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>📋 Nenhum item encontrado</Text>
              <Text style={styles.emptySubtext}>
                Ajuste os filtros e tente novamente
              </Text>
            </View>
          ) : modoVisualizacao === 'consolidado' ? (
            // Modo Consolidado
            dadosConsolidados.map((dataGrupo, index) => (
              <View key={index} style={styles.dataCard}>
                <View style={styles.dataHeader}>
                  <Text style={styles.dataText}>
                    📅 {format(new Date(dataGrupo.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </Text>
                </View>

                {dataGrupo.produtos.map((produto, pIndex) => {
                  const chaveProduto = `${dataGrupo.data}-${produto.produto_nome}-${produto.unidade}`;
                  const isMarcado = produtosMarcados.has(chaveProduto);
                  
                  return (
                    <View key={pIndex} style={[
                      styles.produtoConsolidadoCard,
                      isMarcado && styles.produtoConsolidadoCardMarcado
                    ]}>
                      <TouchableOpacity 
                        style={styles.checkboxArea}
                        onPress={() => toggleProdutoMarcado(produto.produto_nome, produto.unidade, dataGrupo.data)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.checkbox,
                          isMarcado && styles.checkboxMarcado
                        ]}>
                          {isMarcado && (
                            <Text style={styles.checkboxIcon}>✓</Text>
                          )}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.produtoConsolidadoContent}
                        onPress={() => abrirDetalhes(produto, dataGrupo.data)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.produtoConsolidadoHeader}>
                          <Text style={[
                            styles.produtoConsolidadoNome,
                            isMarcado && styles.produtoConsolidadoNomeMarcado
                          ]}>
                            {produto.produto_nome}
                          </Text>
                          <TouchableOpacity
                            style={styles.quantidadeTotalBadge}
                            onPress={() => abrirCalculadora(produto, dataGrupo.data)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.quantidadeTotalText}>
                              {produto.quantidade_total} {produto.unidade}
                            </Text>
                            <Text style={styles.calculadoraHint}>🧮</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.escolasResumo}>
                          <Text style={styles.escolasResumoText}>
                            📍 {produto.escolas.length} {produto.escolas.length === 1 ? 'escola' : 'escolas'}
                          </Text>
                          <Text style={styles.verDetalhesText}>
                            👁️ Toque para ver detalhes
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))
          ) : (
            // Modo por Escola
            dadosAgrupados.map((grupo, index) => (
              <View key={index} style={styles.escolaCard}>
                <View style={styles.escolaHeader}>
                  <Text style={styles.escolaNome}>{grupo.escola}</Text>
                  {grupo.rota && (
                    <View style={[styles.rotaBadge, { backgroundColor: getRotaColor(grupo.rota) }]}>
                      <Text style={styles.rotaText}>{grupo.rota}</Text>
                    </View>
                  )}
                </View>

                {grupo.itens.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.produtoNome}>{item.produto_nome}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemDetailText}>
                        📦 {item.quantidade} {item.unidade}
                      </Text>
                      <Text style={styles.itemDetailText}>
                        📅 {format(new Date(item.data_entrega), 'dd/MM/yyyy', { locale: ptBR })}
                      </Text>
                    </View>

                    {item.observacao && (
                      <Text style={styles.observacao}>💬 {item.observacao}</Text>
                    )}
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal de Detalhes */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalTitle}>
                  {produtoSelecionado?.produto_nome}
                </Text>
                <Text style={styles.modalSubtitle}>
                  📅 {dataSelecionada && format(new Date(dataSelecionada), 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
                <View style={styles.modalTotalBadge}>
                  <Text style={styles.modalTotalText}>
                    Total: {produtoSelecionado?.quantidade_total} {produtoSelecionado?.unidade}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalSectionTitle}>
                Escolas ({produtoSelecionado?.escolas.length})
              </Text>
              
              {produtoSelecionado?.escolas.map((escola, index) => (
                <View key={index} style={styles.modalEscolaItem}>
                  <View style={styles.modalEscolaInfo}>
                    <Text style={styles.modalEscolaNome}>
                      {escola.nome}
                    </Text>
                    {escola.rota && (
                      <View style={[styles.modalRotaBadge, { backgroundColor: getRotaColor(escola.rota) }]}>
                        <Text style={styles.modalRotaText}>
                          🚚 {escola.rota}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.modalEscolaQtd}>
                    <Text style={styles.modalEscolaQtdText}>
                      {escola.quantidade} {produtoSelecionado?.unidade}
                    </Text>
                    <View style={[
                      styles.statusBadgeSmall, 
                      { backgroundColor: getStatusColor(escola.status) }
                    ]}>
                      <Text style={styles.statusTextSmall}>
                        {getStatusLabel(escola.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Calculadora de Embalagens */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalCalculadoraVisible}
        onRequestClose={() => setModalCalculadoraVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalTitle}>
                  🧮 Calculadora de Embalagens
                </Text>
                <Text style={styles.modalSubtitle}>
                  {produtoCalculadora?.produto_nome}
                </Text>
                <View style={styles.modalTotalBadge}>
                  <Text style={styles.modalTotalText}>
                    Total: {produtoCalculadora?.quantidade_total} {produtoCalculadora?.unidade}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setModalCalculadoraVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.calcSectionTitle}>
                Tipos de Embalagens Disponíveis
              </Text>

              {embalagens.map((emb, index) => (
                <View key={index} style={styles.embalagemItem}>
                  <View style={styles.embalagemInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Tipo:</Text>
                      <TextInput
                        style={styles.textInput}
                        value={emb.tipo}
                        onChangeText={(text) => atualizarEmbalagem(index, 'tipo', text)}
                        placeholder="Ex: Caixa, Cuba"
                      />
                    </View>
                    <View style={styles.inputGroupSmall}>
                      <Text style={styles.inputLabel}>Disp:</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={emb.qtdDisponivel}
                        onChangeText={(text) => atualizarEmbalagem(index, 'qtdDisponivel', text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.inputGroupSmall}>
                      <Text style={styles.inputLabel}>Un/Emb:</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={String(emb.quantidade)}
                        onChangeText={(text) => atualizarEmbalagem(index, 'quantidade', Number(text) || 0)}
                        keyboardType="numeric"
                        placeholder="30"
                      />
                    </View>
                  </View>
                  {embalagens.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removerEmbalagem(index)}
                    >
                      <Text style={styles.removeButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={styles.addButton}
                onPress={adicionarEmbalagem}
              >
                <Text style={styles.addButtonText}>+ Adicionar Embalagem</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calcButton}
                onPress={calcularEmbalagens}
              >
                <Text style={styles.calcButtonText}>🧮 Calcular</Text>
              </TouchableOpacity>

              {resultadoCalculo && (
                <View style={styles.resultadoContainer}>
                  <Text style={styles.resultadoTitle}>
                    📦 Carregar no Caminhão
                  </Text>
                  
                  {resultadoCalculo.distribuicao.map((item, index) => (
                    <View key={index} style={[
                      styles.resultadoItemSimples,
                      item.faltando && styles.resultadoItemFaltando
                    ]}>
                      <View style={styles.resultadoInfoSimples}>
                        <Text style={styles.resultadoTipoSimples}>
                          {item.tipo === 'Avulsas' ? '📦 Avulsas' : `📦 ${item.tipo}`}
                        </Text>
                        <Text style={styles.resultadoDetalheSimples}>
                          {item.qtdPorEmbalagem} {produtoCalculadora?.unidade}/embalagem
                        </Text>
                        {item.qtdDisponivel > 0 && (
                          <Text style={styles.resultadoDisponivelSimples}>
                            {item.faltando ? '⚠️' : '✓'} Disponível: {item.qtdDisponivel}
                          </Text>
                        )}
                      </View>
                      <Text style={[
                        styles.resultadoNumeroGrande,
                        item.faltando && styles.resultadoNumeroFaltando
                      ]}>
                        {item.qtdEmbalagens}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.resultadoSummarySimples}>
                    <Text style={styles.summaryTextSimples}>
                      ✅ Total: {resultadoCalculo.quantidadeTotal} {produtoCalculadora?.unidade}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8
  },
  dateColumn: {
    flex: 1
  },
  dateButton: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1976d2',
    alignItems: 'center'
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2'
  },
  clearDatesButton: {
    backgroundColor: '#fff3e0',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f57c00',
    alignItems: 'center',
    marginBottom: 8
  },
  clearDatesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f57c00'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginBottom: 8
  },
  picker: {
    height: 50
  },
  searchButton: {
    backgroundColor: '#1976d2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  modoToggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1976d2',
    marginBottom: 12
  },
  toggleFiltrosButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  toggleFiltrosText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center'
  },
  modoButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  modoButtonActive: {
    backgroundColor: '#1976d2'
  },
  modoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2'
  },
  modoButtonTextActive: {
    color: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  scrollView: {
    flex: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
  },
  escolaCard: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  escolaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0'
  },
  escolaNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  rotaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  rotaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  },
  itemCard: {
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2'
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff'
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  itemDetailText: {
    fontSize: 14,
    color: '#666'
  },
  observacao: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  // Estilos para modo consolidado
  dataCard: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  dataHeader: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  dataText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2'
  },
  produtoConsolidadoCard: {
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    flexDirection: 'row',
    alignItems: 'center'
  },
  produtoConsolidadoCardMarcado: {
    backgroundColor: '#e8f5e9',
    borderLeftColor: '#2e7d32'
  },
  checkboxArea: {
    paddingRight: 12,
    paddingVertical: 8
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxMarcado: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50'
  },
  checkboxIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  produtoConsolidadoContent: {
    flex: 1
  },
  produtoConsolidadoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  produtoConsolidadoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8
  },
  produtoConsolidadoNomeMarcado: {
    color: '#2e7d32'
  },
  quantidadeTotalBadge: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  quantidadeTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff'
  },
  calculadoraHint: {
    fontSize: 12,
    color: '#fff'
  },
  escolasResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  escolasResumoText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600'
  },
  verDetalhesText: {
    fontSize: 12,
    color: '#1976d2',
    fontStyle: 'italic'
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0'
  },
  modalHeaderInfo: {
    flex: 1,
    marginRight: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  modalTotalBadge: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  modalTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff'
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold'
  },
  modalScroll: {
    padding: 20
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  modalEscolaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2'
  },
  modalEscolaInfo: {
    flex: 1,
    marginRight: 12
  },
  modalEscolaNome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  modalRotaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  modalRotaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  },
  modalEscolaRota: {
    fontSize: 13,
    color: '#1976d2'
  },
  modalEscolaQtd: {
    alignItems: 'flex-end'
  },
  modalEscolaQtdText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff'
  },
  // Estilos da calculadora
  calcSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8
  },
  embalagemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8
  },
  embalagemInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 12
  },
  inputGroup: {
    flex: 1
  },
  inputGroupSmall: {
    flex: 0.6
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14
  },
  numberInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    textAlign: 'center'
  },
  removeButton: {
    padding: 8
  },
  removeButtonText: {
    fontSize: 20
  },
  addButton: {
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  calcButton: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20
  },
  calcButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  resultadoContainer: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20
  },
  resultadoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 16,
    textAlign: 'center'
  },
  resultadoItemSimples: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50'
  },
  resultadoItemFaltando: {
    borderLeftColor: '#ff9800',
    backgroundColor: '#fff3e0'
  },
  resultadoInfoSimples: {
    flex: 1,
    marginRight: 16
  },
  resultadoTipoSimples: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  resultadoDetalheSimples: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  resultadoDisponivelSimples: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic'
  },
  resultadoNumeroGrande: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4caf50'
  },
  resultadoNumeroFaltando: {
    color: '#ff9800'
  },
  resultadoSummarySimples: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center'
  },
  summaryTextSimples: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32'
  },
  pesoContainer: {
    backgroundColor: '#fff3e0',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800'
  },
  pesoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  pesoUnidade: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  resultadoPeso: {
    fontSize: 13,
    color: '#ff9800',
    fontWeight: '600',
    marginTop: 2
  },
  pesoTotalGeral: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff9800',
    marginTop: 4
  }
});

export default RomaneioScreen;
