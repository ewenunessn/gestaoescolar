import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemEstoqueEscola } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface LoteValidade {
    id: number;
    lote: string;
    quantidade_atual: number;
    data_validade?: string;
    data_fabricacao?: string;
    status: string;
    observacoes?: string;
}

interface DistribuicaoSaida {
    lote: LoteValidade;
    quantidadeConsumida: number;
    quantidadeRestante: number;
}

interface ModalSaidaInteligenteProps {
    visible: boolean;
    onClose: () => void;
    item: ItemEstoqueEscola | null;
    escolaId: number | null;
    onSuccess: () => void;
}

const ModalSaidaInteligente: React.FC<ModalSaidaInteligenteProps> = ({
    visible,
    onClose,
    item,
    escolaId,
    onSuccess,
}) => {
    const { usuario } = useAuth();
    const [quantidade, setQuantidade] = useState('');
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);
    const [lotes, setLotes] = useState<LoteValidade[]>([]);
    const [distribuicao, setDistribuicao] = useState<DistribuicaoSaida[]>([]);

    useEffect(() => {
        if (visible && item) {
            carregarLotes();
            setQuantidade('');
            setMotivo('');
            setDistribuicao([]);
        }
    }, [visible, item]);

    useEffect(() => {
        if (quantidade && lotes.length > 0) {
            calcularDistribuicao();
        } else {
            setDistribuicao([]);
        }
    }, [quantidade, lotes]);

    const carregarLotes = async () => {
        if (!item) return;

        try {
            setLoading(true);

            // Primeiro tenta carregar lotes específicos
            const lotesData = await apiService.listarLotesProduto(item.produto_id);

            if (lotesData && lotesData.length > 0) {
                // Se há lotes específicos, usa eles
                const lotesAtivos = lotesData.filter(l => l.status === 'ativo' && l.quantidade_atual > 0);
                setLotes(lotesAtivos);
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

    const calcularDistribuicao = () => {
        const quantidadeSaida = parseFloat(quantidade) || 0;
        if (quantidadeSaida <= 0) {
            setDistribuicao([]);
            return;
        }

        // Ordenar lotes por validade (mais próxima primeiro)
        const lotesOrdenados = [...lotes].sort((a, b) => {
            // Lotes sem validade vão por último
            if (!a.data_validade && !b.data_validade) return 0;
            if (!a.data_validade) return 1;
            if (!b.data_validade) return -1;

            // CORREÇÃO: Processar datas corrigindo problema de timezone
            const getDateCorrect = (dataStr: string) => {
              if (dataStr.includes('T')) {
                return new Date(dataStr);
              } else {
                const [ano, mes, dia] = dataStr.split('-').map(Number);
                return new Date(ano, mes - 1, dia);
              }
            };
            
            return getDateCorrect(a.data_validade).getTime() - getDateCorrect(b.data_validade).getTime();
        });

        const novaDistribuicao: DistribuicaoSaida[] = [];
        let quantidadeRestante = quantidadeSaida;

        for (const lote of lotesOrdenados) {
            if (quantidadeRestante <= 0) break;

            const quantidadeDisponivel = lote.quantidade_atual;
            const quantidadeConsumida = Math.min(quantidadeRestante, quantidadeDisponivel);

            if (quantidadeConsumida > 0) {
                novaDistribuicao.push({
                    lote,
                    quantidadeConsumida,
                    quantidadeRestante: quantidadeDisponivel - quantidadeConsumida
                });

                quantidadeRestante -= quantidadeConsumida;
            }
        }

        setDistribuicao(novaDistribuicao);
    };

    const formatarData = (data: string): string => {
        try {
            if (!data) return 'Data não informada';
            
            // Tentar diferentes formatos de data
            let dataLocal: Date;
            
            if (data.includes('T')) {
                // Se já tem timezone, usar diretamente
                dataLocal = new Date(data);
            } else {
                // CORREÇÃO: Para datas apenas (YYYY-MM-DD), criar data local sem timezone
                const [ano, mes, dia] = data.split('-').map(Number);
                dataLocal = new Date(ano, mes - 1, dia);
            }
            
            // Verificar se a data é válida
            if (isNaN(dataLocal.getTime())) {
                return 'Data inválida';
            }
            
            return dataLocal.toLocaleDateString('pt-BR');
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return 'Data inválida';
        }
    };

    const formatarQuantidade = (quantidade: number): string => {
        const num = Number(quantidade) || 0;
        return num % 1 === 0
            ? num.toString()
            : num.toFixed(2).replace(/\.?0+$/, '');
    };

    const calcularDiasParaVencimento = (dataValidade: string): number => {
        try {
            if (!dataValidade) return 0;
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de datas
            
            // Tentar diferentes formatos de data
            let validade: Date;
            
            if (dataValidade.includes('T')) {
                // Se já tem timezone, usar diretamente
                validade = new Date(dataValidade);
            } else {
                // CORREÇÃO: Para datas apenas (YYYY-MM-DD), criar data local sem timezone
                const [ano, mes, dia] = dataValidade.split('-').map(Number);
                validade = new Date(ano, mes - 1, dia);
            }
            
            // Verificar se a data é válida
            if (isNaN(validade.getTime())) {
                return 0;
            }
            
            const diffTime = validade.getTime() - hoje.getTime();
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch (error) {
            console.error('Erro ao calcular dias para vencimento:', error);
            return 0;
        }
    };

    const getStatusValidade = (dataValidade?: string): { cor: string; texto: string } => {
        if (!dataValidade) {
            return { cor: '#6B7280', texto: 'Sem validade' };
        }

        const dias = calcularDiasParaVencimento(dataValidade);

        if (dias < 0) {
            return { cor: '#DC2626', texto: `Vencido há ${Math.abs(dias)} dia(s)` };
        } else if (dias === 0) {
            return { cor: '#EA580C', texto: 'Vence hoje' };
        } else if (dias <= 7) {
            return { cor: '#EA580C', texto: `${dias} dia(s)` };
        } else if (dias <= 30) {
            return { cor: '#D97706', texto: `${dias} dia(s)` };
        } else {
            return { cor: '#059669', texto: `${dias} dia(s)` };
        }
    };

    const validarSaida = (): string | null => {
        const quantidadeSaida = parseFloat(quantidade) || 0;

        if (quantidadeSaida <= 0) {
            return 'Quantidade deve ser maior que zero';
        }

        const totalDisponivel = lotes.reduce((total, lote) => total + lote.quantidade_atual, 0);

        if (quantidadeSaida > totalDisponivel) {
            return `Quantidade insuficiente. Disponível: ${formatarQuantidade(totalDisponivel)} ${item?.unidade_medida}`;
        }



        return null;
    };

    const confirmarSaida = async () => {
        const erro = validarSaida();
        if (erro) {
            Alert.alert('Erro', erro);
            return;
        }

        if (!item || !escolaId || !usuario) {
            Alert.alert('Erro', 'Dados insuficientes para registrar saída');
            return;
        }

        try {
            setLoading(true);

            // Registrar saída usando a API
            const response = await fetch(`https://gestaoescolar-backend.vercel.app/api/estoque-escola/escola/${escolaId}/movimentacao`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    produto_id: item.produto_id,
                    tipo_movimentacao: 'saida',
                    quantidade: parseFloat(quantidade),
                    motivo: motivo.trim() || undefined,
                    usuario_id: usuario.id,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            Alert.alert('Sucesso', 'Saída registrada com sucesso!');
            onSuccess();
            onClose();

        } catch (error) {
            console.error('Erro ao registrar saída:', error);
            Alert.alert('Erro', 'Não foi possível registrar a saída. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const quantidadeTotal = parseFloat(quantidade) || 0;
    const quantidadeDistribuida = distribuicao.reduce((total, dist) => total + dist.quantidadeConsumida, 0);
    const quantidadeFaltante = quantidadeTotal - quantidadeDistribuida;

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
                        <Text style={styles.titulo}>Saída Inteligente</Text>
                        <Text style={styles.subtitulo}>{item.produto_nome}</Text>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Informações do produto */}
                    <View style={styles.produtoInfo}>
                        <Text style={styles.produtoNome}>{item.produto_nome}</Text>
                        <Text style={styles.quantidadeDisponivel}>
                            Disponível: {formatarQuantidade(item.quantidade_atual || 0)} {item.unidade_medida}
                        </Text>
                    </View>

                    {/* Formulário */}
                    <View style={styles.formulario}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Quantidade para saída *</Text>
                            <View style={styles.quantidadeInputContainer}>
                                <TextInput
                                    style={styles.quantidadeInput}
                                    value={quantidade}
                                    onChangeText={setQuantidade}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    placeholderTextColor="#9CA3AF"
                                />
                                <Text style={styles.unidadeText}>{item.unidade_medida}</Text>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Motivo da saída (Opcional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={motivo}
                                onChangeText={setMotivo}
                                placeholder="Ex: Consumo na merenda, transferência, etc."
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>

                    {/* Distribuição inteligente */}
                    {distribuicao.length > 0 && (
                        <View style={styles.distribuicaoContainer}>
                            <Text style={styles.distribuicaoTitulo}>Distribuição por Validade (FIFO)</Text>
                            <Text style={styles.distribuicaoSubtitulo}>
                                Consumo automático dos produtos com validade mais próxima
                            </Text>

                            {distribuicao.map((dist, index) => {
                                const statusValidade = getStatusValidade(dist.lote.data_validade);

                                return (
                                    <View key={index} style={styles.distribuicaoItem}>
                                        <View style={styles.distribuicaoHeader}>
                                            <View style={styles.distribuicaoInfo}>
                                                <Text style={styles.distribuicaoLote}>
                                                    {dist.lote.lote}
                                                </Text>
                                                <Text style={styles.distribuicaoValidade}>
                                                    {dist.lote.data_validade
                                                        ? `Validade: ${formatarData(dist.lote.data_validade)}`
                                                        : 'Sem validade'
                                                    }
                                                </Text>
                                            </View>
                                            {dist.lote.data_validade && (
                                                <View style={[styles.statusBadge, { backgroundColor: `${statusValidade.cor}20` }]}>
                                                    <Text style={[styles.statusText, { color: statusValidade.cor }]}>
                                                        {statusValidade.texto}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.distribuicaoQuantidades}>
                                            <View style={styles.quantidadeItem}>
                                                <Text style={styles.quantidadeLabel}>Consumir</Text>
                                                <Text style={[styles.quantidadeValor, { color: '#DC2626' }]}>
                                                    -{formatarQuantidade(dist.quantidadeConsumida)} {item.unidade_medida}
                                                </Text>
                                            </View>
                                            <View style={styles.quantidadeItem}>
                                                <Text style={styles.quantidadeLabel}>Restará</Text>
                                                <Text style={styles.quantidadeValor}>
                                                    {formatarQuantidade(dist.quantidadeRestante)} {item.unidade_medida}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}

                            {/* Aviso se quantidade insuficiente */}
                            {quantidadeFaltante > 0 && (
                                <View style={styles.avisoContainer}>
                                    <Ionicons name="warning" size={20} color="#F59E0B" />
                                    <Text style={styles.avisoTexto}>
                                        Faltam {formatarQuantidade(quantidadeFaltante)} {item.unidade_medida} para completar a saída
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Botões */}
                <View style={styles.botoesContainer}>
                    <TouchableOpacity style={styles.botaoCancelar} onPress={onClose}>
                        <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.botaoConfirmar,
                            (loading || quantidadeFaltante > 0) && styles.botaoDesabilitado
                        ]}
                        onPress={confirmarSaida}
                        disabled={loading || quantidadeFaltante > 0}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.botaoConfirmarTexto}>Confirmar Saída</Text>
                        )}
                    </TouchableOpacity>
                </View>
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
    content: {
        flex: 1,
    },
    produtoInfo: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    produtoNome: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    quantidadeDisponivel: {
        fontSize: 14,
        color: '#6B7280',
    },
    formulario: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        marginTop: 8,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    quantidadeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    quantidadeInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    unidadeText: {
        paddingHorizontal: 16,
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: '#FFFFFF',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    distribuicaoContainer: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    distribuicaoTitulo: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    distribuicaoSubtitulo: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 16,
    },
    distribuicaoItem: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    distribuicaoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    distribuicaoInfo: {
        flex: 1,
    },
    distribuicaoLote: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    distribuicaoValidade: {
        fontSize: 13,
        color: '#6B7280',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    distribuicaoQuantidades: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    quantidadeItem: {
        flex: 1,
    },
    quantidadeLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    quantidadeValor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    avisoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    avisoTexto: {
        fontSize: 13,
        color: '#92400E',
        marginLeft: 8,
        flex: 1,
    },
    botoesContainer: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 12,
    },
    botaoCancelar: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
    },
    botaoCancelarTexto: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    botaoConfirmar: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#DC2626',
        alignItems: 'center',
    },
    botaoDesabilitado: {
        backgroundColor: '#9CA3AF',
    },
    botaoConfirmarTexto: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default ModalSaidaInteligente;