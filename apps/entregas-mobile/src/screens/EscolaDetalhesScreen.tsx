import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Alert,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import {
    Text,
    Card,
    Button,
    Chip,
    ActivityIndicator,
    List,
    Divider,
    Checkbox,
    Surface,
    Title,
    Paragraph,
    TextInput as TextField,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useNotification } from '../contexts/NotificationContext';
import { useOffline } from '../contexts/OfflineContext';
import { entregaServiceHybrid } from '../services/entregaServiceHybrid';
import { offlineService } from '../services/offlineService';
import { ItemEntrega } from '../services/entregaService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { formatarNumero } from '../utils/formatters';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type EscolaDetalhesRouteProp = RouteProp<RootStackParamList, 'EscolaDetalhes'>;

const EscolaDetalhesScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<EscolaDetalhesRouteProp>();
    const { showError, showSuccess } = useNotification();
    const { isOffline, operacoesPendentes, atualizarStatusOperacoes } = useOffline();
    const { escolaId, escolaNome } = route.params;
    
    console.log(`🏫 === TELA ESCOLA DETALHES CARREGADA ===`);
    console.log(`Escola ID: ${escolaId}`);
    console.log(`Escola Nome: ${escolaNome}`);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [itens, setItens] = useState<ItemEntrega[]>([]);

    // Estados para seleção múltipla e quantidades
    const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
    const [quantidadesEntrega, setQuantidadesEntrega] = useState<Map<number, string>>(new Map());

    // Recarregar dados sempre que a tela ganhar foco
    useFocusEffect(
        useCallback(() => {
            setItensSelecionados(new Set());
            setQuantidadesEntrega(new Map());
            carregarItens();
        }, [escolaId])
    );

    const carregarItens = async () => {
        try {
            setLoading(true);
            
            // Validar escolaId
            if (!escolaId || escolaId === 0) {
                console.error('❌ ID da escola inválido:', escolaId);
                showError('Erro: ID da escola inválido');
                return;
            }
            
            console.log(`📥 Carregando itens da escola ${escolaId}...`);
            
            // Debug do cache quando offline
            if (isOffline) {
                console.log('🔍 Modo offline detectado, verificando cache...');
                await offlineService.debugCache();
            }
            
            const itensData = await entregaServiceHybrid.listarItensEscola(escolaId);
            console.log(`✅ ${itensData.length} itens carregados`);
            setItens(itensData);
        } catch (error: any) {
            console.error(`❌ Erro ao carregar itens da escola ${escolaId}:`, error?.message);
            showError(isOffline ? 'Dados não disponíveis offline' : 'Erro ao carregar itens da escola');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await carregarItens();
        setRefreshing(false);
    };

    const handleConfirmarEntrega = (item: ItemEntrega) => {
        navigation.navigate('ConfirmarEntrega', {
            itemId: item.id,
            itemData: item
        });
    };

    const handleCancelarEntrega = async (item: ItemEntrega) => {
        Alert.alert(
            'Cancelar Entrega',
            `Tem certeza que deseja cancelar a entrega de ${item.produto_nome}?`,
            [
                {
                    text: 'Não',
                    style: 'cancel'
                },
                {
                    text: 'Sim, Cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        console.log(`🔴 === CANCELAR ENTREGA ===`);
                        console.log(`Item ID: ${item.id}`);
                        console.log(`Produto: ${item.produto_nome}`);
                        
                        try {
                            const resultado = await entregaServiceHybrid.cancelarEntrega(item.id);
                            console.log(`✅ Resultado:`, resultado.message);
                            showSuccess(resultado.message);
                            
                            // Atualizar o item localmente na lista sem recarregar a tela
                            setItens(prevItens => 
                                prevItens.map(i => 
                                    i.id === item.id 
                                        ? { ...i, entrega_confirmada: false, quantidade_entregue: undefined, data_entrega: undefined, nome_quem_recebeu: undefined, nome_quem_entregou: undefined }
                                        : i
                                )
                            );
                            
                            await atualizarStatusOperacoes();
                        } catch (error: any) {
                            console.error(`❌ Erro ao cancelar item ${item.id}:`, error?.message);
                            showError('Erro ao cancelar entrega');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (item: ItemEntrega) => {
        if (!item.para_entrega) return '#9e9e9e';
        if (item.entrega_confirmada) return '#4caf50';
        return '#ff9800';
    };

    const getStatusLabel = (item: ItemEntrega) => {
        if (!item.para_entrega) return 'Não p/ entrega';
        if (item.entrega_confirmada) return 'Entregue';
        return 'Pendente';
    };

    const getStatusIcon = (item: ItemEntrega) => {
        if (!item.para_entrega) return 'minus-circle-outline';
        if (item.entrega_confirmada) return 'check-circle';
        return 'clock-outline';
    };

    const itensPendentes = itens.filter(item => item.para_entrega && !item.entrega_confirmada);
    const itensEntregues = itens.filter(item => item.entrega_confirmada);
    const itensNaoEntrega = itens.filter(item => !item.para_entrega);

    // Funções para seleção múltipla
    const toggleSelecaoItem = (itemId: number, quantidadePadrao: number) => {
        const novaSelecao = new Set(itensSelecionados);
        const novasQuantidades = new Map(quantidadesEntrega);
        
        if (novaSelecao.has(itemId)) {
            novaSelecao.delete(itemId);
            novasQuantidades.delete(itemId);
        } else {
            novaSelecao.add(itemId);
            // Inicializar com a quantidade padrão do item
            novasQuantidades.set(itemId, quantidadePadrao.toString());
        }
        
        setItensSelecionados(novaSelecao);
        setQuantidadesEntrega(novasQuantidades);
    };
    
    const atualizarQuantidadeItem = (itemId: number, quantidade: string) => {
        const novasQuantidades = new Map(quantidadesEntrega);
        novasQuantidades.set(itemId, quantidade);
        setQuantidadesEntrega(novasQuantidades);
    };

    const selecionarTodosPendentes = () => {
        if (itensSelecionados.size === itensPendentes.length) {
            setItensSelecionados(new Set());
            setQuantidadesEntrega(new Map());
        } else {
            const novosIds = new Set(itensPendentes.map(item => item.id));
            const novasQuantidades = new Map<number, string>();
            itensPendentes.forEach(item => {
                novasQuantidades.set(item.id, item.quantidade.toString());
            });
            setItensSelecionados(novosIds);
            setQuantidadesEntrega(novasQuantidades);
        }
    };

    const iniciarEntregaMassa = () => {
        if (itensSelecionados.size === 0) {
            showError('Selecione pelo menos um item para entrega');
            return;
        }

        // Validar quantidades
        let quantidadeInvalida = false;
        itensSelecionados.forEach(itemId => {
            const quantidade = parseFloat(quantidadesEntrega.get(itemId) || '0');
            if (isNaN(quantidade) || quantidade <= 0) {
                quantidadeInvalida = true;
            }
        });

        if (quantidadeInvalida) {
            showError('Todas as quantidades devem ser maiores que zero');
            return;
        }

        // Preparar itens com as quantidades informadas
        const itensParaEntregar = itensPendentes
            .filter(item => itensSelecionados.has(item.id))
            .map(item => ({
                ...item,
                quantidade_entregue: parseFloat(quantidadesEntrega.get(item.id) || item.quantidade.toString())
            }));

        navigation.navigate('RevisaoEntrega', {
            itensRevisados: itensParaEntregar.map(item => ({
                id: item.id,
                produto_nome: item.produto_nome,
                quantidade: item.quantidade,
                unidade: item.unidade,
                lote: item.lote,
                quantidade_entregue: item.quantidade_entregue,
                observacao: '',
                mostrarObservacao: false,
            })),
            escolaNome: escolaNome,
            escolaId: escolaId
        });
    };



    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Carregando itens...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#1976d2" />
            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header da Escola */}
                <Surface style={styles.headerCard} elevation={0}>
                    <View style={styles.headerContent}>
                        <MaterialCommunityIcons name="school" size={48} color="#1976d2" />
                        <View style={styles.headerInfo}>
                            <Text style={styles.escolaNome}>{escolaNome}</Text>
                            <Text style={styles.totalItens}>
                                {itens.length} item(s) total
                            </Text>
                            {isOffline && (
                                <View style={styles.offlineIndicator}>
                                    <MaterialCommunityIcons name="wifi-off" size={16} color="#ff9800" />
                                    <Text style={styles.offlineText}>Modo Offline</Text>
                                </View>
                            )}
                            {operacoesPendentes > 0 && (
                                <View style={styles.pendingIndicator}>
                                    <MaterialCommunityIcons name="sync" size={16} color="#2196f3" />
                                    <Text style={styles.pendingText}>
                                        {operacoesPendentes} operação(ões) pendente(s)
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Surface>

            {/* Resumo */}
            <Card style={styles.resumoCard} elevation={0}>
                <Card.Content>
                    <Title style={styles.resumoTitle}>Resumo</Title>
                    <View style={styles.resumoStats}>
                        <View style={styles.resumoStat}>
                            <Paragraph style={[styles.resumoNumber, { color: '#ff9800' }]}>
                                {itensPendentes.length}
                            </Paragraph>
                            <Paragraph style={styles.resumoLabel}>Pendentes</Paragraph>
                        </View>
                        <View style={styles.resumoStat}>
                            <Paragraph style={[styles.resumoNumber, { color: '#4caf50' }]}>
                                {itensEntregues.length}
                            </Paragraph>
                            <Paragraph style={styles.resumoLabel}>Entregues</Paragraph>
                        </View>
                        <View style={styles.resumoStat}>
                            <Paragraph style={[styles.resumoNumber, { color: '#9e9e9e' }]}>
                                {itensNaoEntrega.length}
                            </Paragraph>
                            <Paragraph style={styles.resumoLabel}>Não p/ entrega</Paragraph>
                        </View>
                    </View>
                </Card.Content>
            </Card>

            {/* Itens Pendentes */}
            {itensPendentes.length > 0 && (
                <Card style={styles.sectionCard} elevation={0}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <Title style={styles.sectionTitle}>
                                Itens Pendentes ({itensPendentes.length})
                            </Title>
                            <MaterialCommunityIcons name="clock-outline" size={24} color="#ff9800" />
                        </View>

                        {/* Botão Selecionar Todos */}
                        <Button
                            mode="outlined"
                            onPress={selecionarTodosPendentes}
                            style={styles.selectAllButton}
                            compact
                        >
                            {itensSelecionados.size === itensPendentes.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                        </Button>

                        {itensPendentes.map((item, index) => (
                            <View key={item.id}>
                                <List.Item
                                    title={item.produto_nome}
                                    description={`Programado: ${formatarNumero(item.quantidade)} ${item.unidade}`}
                                    left={() => (
                                        <View style={styles.itemLeftContainer}>
                                            <Checkbox
                                                status={itensSelecionados.has(item.id) ? 'checked' : 'unchecked'}
                                                onPress={() => toggleSelecaoItem(item.id, item.quantidade)}
                                            />
                                            <List.Icon icon="package-variant" color="#ff9800" />
                                        </View>
                                    )}
                                    right={() => null}
                                    onPress={() => toggleSelecaoItem(item.id, item.quantidade)}
                                />
                                
                                {/* Campo de quantidade aparece quando o item está selecionado */}
                                {itensSelecionados.has(item.id) && (
                                    <View style={styles.quantidadeContainer}>
                                        <TextField
                                            label="Quantidade a entregar"
                                            value={quantidadesEntrega.get(item.id) || item.quantidade.toString()}
                                            onChangeText={(value) => atualizarQuantidadeItem(item.id, value)}
                                            mode="outlined"
                                            keyboardType="numeric"
                                            style={styles.quantidadeInput}
                                            dense
                                            right={<TextField.Affix text={item.unidade} />}
                                        />
                                    </View>
                                )}
                                
                                {item.observacao && (
                                    <Paragraph style={styles.observacao}>
                                        💬 {item.observacao}
                                    </Paragraph>
                                )}
                                {index < itensPendentes.length - 1 && <Divider />}
                            </View>
                        ))}

                        {/* Botão Continuar - Aparece no final quando há itens selecionados */}
                        {itensSelecionados.size > 0 && (
                            <Button
                                mode="contained"
                                onPress={iniciarEntregaMassa}
                                style={styles.entregaMassaButton}
                                icon="arrow-right"
                            >
                                Continuar ({itensSelecionados.size} {itensSelecionados.size === 1 ? 'item' : 'itens'})
                            </Button>
                        )}
                    </Card.Content>
                </Card>
            )}

            {/* Itens Entregues */}
            {itensEntregues.length > 0 && (
                <Card style={styles.sectionCard} elevation={0}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <Title style={styles.sectionTitle}>
                                Itens Entregues ({itensEntregues.length})
                            </Title>
                            <MaterialCommunityIcons name="check-circle" size={24} color="#4caf50" />
                        </View>

                        {itensEntregues.map((item, index) => (
                            <View key={item.id}>
                                <List.Item
                                    title={item.produto_nome}
                                    description={`${formatarNumero(item.quantidade_entregue ?? item.quantidade)}/${formatarNumero(item.quantidade)} ${item.unidade}`}
                                    left={(props) => (
                                        <List.Icon {...props} icon="check-circle" color="#4caf50" />
                                    )}
                                    right={() => (
                                        <View style={styles.itemActions}>
                                            <Button
                                                mode="outlined"
                                                onPress={() => handleCancelarEntrega(item)}
                                                style={styles.cancelarButton}
                                                compact
                                            >
                                                Cancelar
                                            </Button>
                                        </View>
                                    )}
                                />
                                {item.observacao && (
                                    <Paragraph style={styles.observacao}>
                                        💬 {item.observacao}
                                    </Paragraph>
                                )}
                                {index < itensEntregues.length - 1 && <Divider />}
                            </View>
                        ))}
                    </Card.Content>
                </Card>
            )}

            {/* Itens Não para Entrega */}
            {itensNaoEntrega.length > 0 && (
                <Card style={styles.sectionCard} elevation={0}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <Title style={styles.sectionTitle}>
                                Não para Entrega ({itensNaoEntrega.length})
                            </Title>
                            <MaterialCommunityIcons name="minus-circle-outline" size={24} color="#9e9e9e" />
                        </View>

                        {itensNaoEntrega.map((item, index) => (
                            <View key={item.id}>
                                <List.Item
                                    title={item.produto_nome}
                                    description={`${formatarNumero(item.quantidade)} ${item.unidade}`}
                                    left={(props) => (
                                        <List.Icon {...props} icon="minus-circle-outline" color="#9e9e9e" />
                                    )}
                                />
                                {item.observacao && (
                                    <Paragraph style={styles.observacao}>
                                        💬 {item.observacao}
                                    </Paragraph>
                                )}
                                {index < itensNaoEntrega.length - 1 && <Divider />}
                            </View>
                        ))}
                    </Card.Content>
                </Card>
            )}

            {/* Estado Vazio */}
            {itens.length === 0 && (
                <Card style={styles.emptyCard} elevation={0}>
                    <Card.Content style={styles.emptyContent}>
                        <MaterialCommunityIcons name="package-variant-closed" size={48} color="#ccc" />
                        <Paragraph style={styles.emptyText}>
                            Nenhum item encontrado para esta escola
                        </Paragraph>
                    </Card.Content>
                </Card>
            )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        color: '#666',
    },
    headerCard: {
        margin: 16,
        marginBottom: 8,
        borderRadius: 12,
        elevation: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        padding: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerInfo: {
        marginLeft: 16,
        flex: 1,
    },
    escolaNome: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    totalItens: {
        color: '#666',
        marginTop: 4,
    },
    resumoCard: {
        margin: 16,
        marginTop: 8,
        borderRadius: 12,
        elevation: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    resumoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    resumoStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    resumoStat: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    resumoNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 32,
        includeFontPadding: false,
    },
    resumoLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    sectionCard: {
        margin: 16,
        marginTop: 8,
        borderRadius: 12,
        elevation: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    itemActions: {
        justifyContent: 'center',
    },
    confirmarButton: {
        borderRadius: 6,
        backgroundColor: '#4caf50',
    },
    cancelarButton: {
        borderRadius: 6,
        borderColor: '#f44336',
    },
    itemDescription: {
        fontSize: 14,
        color: '#666',
    },
    dataEntrega: {
        fontSize: 12,
        color: '#4caf50',
        marginTop: 2,
    },
    quemRecebeu: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    observacao: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        marginLeft: 56,
        marginBottom: 8,
    },
    emptyCard: {
        margin: 16,
        borderRadius: 12,
        elevation: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    emptyContent: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        color: '#666',
        marginTop: 12,
        textAlign: 'center',
    },
    fabContainer: {
        margin: 16,
        marginTop: 8,
    },
    fabButton: {
        borderRadius: 8,
        paddingVertical: 8,
    },
    // Estilos para seleção múltipla
    sectionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectionChip: {
        borderColor: '#1976d2',
    },
    selectAllButton: {
        marginBottom: 12,
    },
    entregaMassaButton: {
        marginTop: 12,
        borderRadius: 8,
    },
    itemLeftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 8,
    },
    offlineIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    offlineText: {
        fontSize: 12,
        color: '#ff9800',
        marginLeft: 4,
        fontWeight: 'bold',
    },
    pendingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    pendingText: {
        fontSize: 12,
        color: '#2196f3',
        marginLeft: 4,
    },
    quantidadeContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f8f9fa',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
    },
    quantidadeInput: {
        backgroundColor: '#ffffff',
    },

});

export default EscolaDetalhesScreen;