import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import {
    Title,
    Card,
    Paragraph,
    Button,
    TextInput,
    List,
    Divider,
    IconButton,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useNotification } from '../contexts/NotificationContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { appTheme } from '../theme/appTheme';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type EntregaMassaRouteProp = RouteProp<RootStackParamList, 'EntregaMassa'>;

interface ItemEntregaMassa {
    id: number;
    produto_nome: string;
    quantidade: number;
    unidade: string;
    lote?: string;
    quantidade_entregue: number;
    observacao: string;
    mostrarObservacao: boolean;
}

const EntregaMassaScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<EntregaMassaRouteProp>();
    const { showError } = useNotification();
    const { itensSelecionados, escolaNome, escolaId } = route.params;

    const [itens, setItens] = useState<ItemEntregaMassa[]>([]);

    useEffect(() => {
        inicializarItens();
    }, []);

    const inicializarItens = () => {
        const itensIniciais = itensSelecionados.map(item => ({
            id: item.id,
            produto_nome: item.produto_nome,
            quantidade: item.quantidade,
            unidade: item.unidade,
            lote: item.lote,
            quantidade_entregue: item.quantidade, // Inicia com a quantidade total
            observacao: '',
            mostrarObservacao: false,
        }));
        setItens(itensIniciais);
    };

    const atualizarQuantidadeItem = (itemId: number, novaQuantidade: string) => {
        const quantidade = parseFloat(novaQuantidade) || 0;
        setItens(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, quantidade_entregue: quantidade }
                : item
        ));
    };

    const atualizarObservacaoItem = (itemId: number, observacao: string) => {
        setItens(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, observacao }
                : item
        ));
    };

    const toggleObservacaoItem = (itemId: number) => {
        setItens(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, mostrarObservacao: !item.mostrarObservacao }
                : item
        ));
    };

    const validarFormulario = () => {
        const itensComQuantidadeInvalida = itens.filter(item =>
            item.quantidade_entregue <= 0 || item.quantidade_entregue > item.quantidade
        );

        if (itensComQuantidadeInvalida.length > 0) {
            showError('Verifique as quantidades entregues. Devem ser maiores que 0 e não podem exceder a quantidade programada.');
            return false;
        }

        return true;
    };

    const prosseguirParaRevisao = () => {
        if (!validarFormulario()) return;

        navigation.navigate('RevisaoEntrega', {
            itensRevisados: itens,
            escolaNome: escolaNome,
            escolaId: escolaId
        });
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#1976d2" />
            <ScrollView style={styles.container}>
                {/* Header */}
                <Card style={styles.headerCard} elevation={0}>
                <Card.Content>
                    <Title style={styles.headerTitle}>Ajustar Quantidades</Title>
                    <Paragraph style={styles.headerSubtitle}>
                        {escolaNome} - {itens.length} item(s)
                    </Paragraph>
                </Card.Content>
            </Card>

            {/* Lista de Itens */}
            <Card style={styles.itemsCard} elevation={0}>
                <Card.Content>
                    <Title style={styles.itemsTitle}>Itens para Entrega</Title>

                    {itens.map((item, index) => (
                        <View key={item.id}>
                            <View style={styles.itemContainer}>
                                <View style={styles.itemHeader}>
                                    <View style={styles.itemInfo}>
                                        <Paragraph style={styles.itemName}>{item.produto_nome}</Paragraph>
                                        <Paragraph style={styles.itemDetails}>
                                            Programado: {item.quantidade} {item.unidade}
                                        </Paragraph>
                                    </View>

                                    <IconButton
                                        icon={item.mostrarObservacao ? 'comment-minus' : 'comment-plus'}
                                        size={20}
                                        onPress={() => toggleObservacaoItem(item.id)}
                                    />
                                </View>

                                {/* Campo Quantidade Entregue */}
                                <TextInput
                                    label="Quantidade entregue *"
                                    value={item.quantidade_entregue.toString()}
                                    onChangeText={(value) => atualizarQuantidadeItem(item.id, value)}
                                    mode="outlined"
                                    keyboardType="numeric"
                                    style={styles.quantityInput}
                                    right={<TextInput.Affix text={item.unidade} />}
                                />

                                {/* Campo Observação (condicional) */}
                                {item.mostrarObservacao && (
                                    <TextInput
                                        label="Observação (opcional)"
                                        value={item.observacao}
                                        onChangeText={(value) => atualizarObservacaoItem(item.id, value)}
                                        mode="outlined"
                                        multiline
                                        numberOfLines={2}
                                        style={styles.observationInput}
                                    />
                                )}
                            </View>

                            {index < itens.length - 1 && <Divider style={styles.divider} />}
                        </View>
                    ))}
                </Card.Content>
            </Card>

            {/* Botões de Ação */}
            <View style={styles.actionButtons}>
                <Button
                    mode="outlined"
                    onPress={() => navigation.goBack()}
                    style={styles.cancelButton}
                    icon="arrow-left"
                >
                    Voltar
                </Button>

                <Button
                    mode="contained"
                    onPress={prosseguirParaRevisao}
                    style={styles.nextButton}
                    icon="arrow-right"
                >
                    Próximo
                </Button>
            </View>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    headerCard: {
        margin: appTheme.spacing.lg,
        marginBottom: appTheme.spacing.sm,
        borderRadius: appTheme.borderRadius.large,
        elevation: 0,
        borderWidth: 1,
        borderColor: appTheme.colors.border,
        backgroundColor: appTheme.colors.surface,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1976d2',
    },
    headerSubtitle: {
        color: '#666',
        marginTop: 4,
    },
    itemsCard: {
        margin: appTheme.spacing.lg,
        marginTop: appTheme.spacing.sm,
        borderRadius: appTheme.borderRadius.large,
        elevation: 0,
        borderWidth: 1,
        borderColor: appTheme.colors.border,
        backgroundColor: appTheme.colors.surface,
    },
    itemsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    itemContainer: {
        marginBottom: 16,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    itemDetails: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    quantityInput: {
        marginBottom: 8,
    },
    observationInput: {
        marginTop: 8,
    },
    divider: {
        marginVertical: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        margin: 16,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
    },
    nextButton: {
        flex: 1,
    },
});

export default EntregaMassaScreen;