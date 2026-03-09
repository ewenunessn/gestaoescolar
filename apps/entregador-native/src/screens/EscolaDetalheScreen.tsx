import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, ActivityIndicator, Button, Checkbox, TextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listarItensEscola, ItemEntrega, confirmarEntregaItem } from '../api/rotas';
import { handleAxiosError, API_URL } from '../api/client';
import SignaturePad from '../components/SignaturePad';
import OfflineIndicator from '../components/OfflineIndicator';
import { useOffline } from '../contexts/OfflineContext';
import { cacheService } from '../services/cacheService';

// Função para formatar números removendo zeros desnecessários
const formatarQuantidade = (valor: number | string): string => {
  const num = typeof valor === 'string' ? parseFloat(valor) : valor;
  // Se for número inteiro, retorna sem casas decimais
  if (Number.isInteger(num)) {
    return num.toString();
  }
  // Se tiver decimais, retorna com até 3 casas decimais, removendo zeros à direita
  return num.toFixed(3).replace(/\.?0+$/, '');
};

interface ItemSelecionado extends ItemEntrega {
  selecionado: boolean;
  quantidade_a_entregar: number;
}

type Etapa = 'selecao' | 'revisao' | 'sucesso';

export default function EscolaDetalheScreen({ route, navigation }: any) {
  const { escolaId, escolaNome } = route.params;
  const [itens, setItens] = useState<ItemSelecionado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'entregues'>('pendentes');
  const [filtroAtivo, setFiltroAtivo] = useState<any>(null);
  const [etapa, setEtapa] = useState<Etapa>('selecao');
  
  // Dados da revisão
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [nomeEntregador, setNomeEntregador] = useState('');
  const [observacao, setObservacao] = useState('');
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const { isOnline, addOperation } = useOffline();

  useEffect(() => {
    carregarFiltro();
    carregarItens();
    carregarNomeEntregador();
  }, []);

  const carregarNomeEntregador = async () => {
    try {
      const stored = await AsyncStorage.getItem('token');
      console.log('📦 Token armazenado:', stored ? 'Existe' : 'Não existe');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('👤 Dados do token:', { nome: parsed.nome, email: parsed.email });
        if (parsed.nome) {
          setNomeEntregador(parsed.nome);
          console.log('✅ Nome do entregador definido:', parsed.nome);
        } else {
          console.warn('⚠️ Campo "nome" não encontrado no token');
        }
      } else {
        console.warn('⚠️ Token não encontrado no AsyncStorage');
      }
    } catch (e) {
      console.error('❌ Erro ao obter nome do usuário:', e);
    }
  };

  const carregarFiltro = async () => {
    try {
      const filtro = await AsyncStorage.getItem('filtro_qrcode');
      if (filtro) {
        setFiltroAtivo(JSON.parse(filtro));
      }
    } catch (err) {
      console.error('Erro ao carregar filtro:', err);
    }
  };

  const carregarItens = async () => {
    try {
      setLoading(true);
      
      // Tentar carregar do cache primeiro
      const cacheKey = `itens_escola_${escolaId}`;
      const cachedData = await cacheService.get<ItemEntrega[]>(cacheKey);
      
      let data: ItemEntrega[];
      
      try {
        // Tentar buscar dados atualizados
        data = await listarItensEscola(escolaId);
        // Salvar no cache
        await cacheService.set(cacheKey, data);
      } catch (err) {
        // Se falhar e tiver cache, usar cache
        if (cachedData) {
          console.log('Usando dados do cache (offline)');
          data = cachedData;
        } else {
          throw err;
        }
      }
      
      // Aplicar filtro de data se houver
      const filtroSalvo = await AsyncStorage.getItem('filtro_qrcode');
      let dadosFiltrados = data;
      
      if (filtroSalvo) {
        const filtro = JSON.parse(filtroSalvo);
        const dataInicio = new Date(filtro.dataInicio);
        dataInicio.setHours(0, 0, 0, 0);
        const dataFim = new Date(filtro.dataFim);
        dataFim.setHours(23, 59, 59, 999);
        
        dadosFiltrados = data.filter(item => {
          if (item.data_entrega) {
            const dataEntrega = new Date(item.data_entrega);
            return dataEntrega >= dataInicio && dataEntrega <= dataFim;
          }
          return true;
        });
      }
      
      setItens(dadosFiltrados.map(item => ({
        ...item,
        selecionado: false,
        quantidade_a_entregar: item.saldo_pendente !== undefined && item.saldo_pendente > 0 
          ? parseFloat(String(item.saldo_pendente)) 
          : parseFloat(String(item.quantidade))
      })));
    } catch (err) {
      setError(handleAxiosError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: number) => {
    const item = itens.find(i => i.id === itemId);
    if (item?.entrega_confirmada) {
      return;
    }
    
    setItens(prev => prev.map(item =>
      item.id === itemId ? { ...item, selecionado: !item.selecionado } : item
    ));
  };

  const atualizarQuantidade = (itemId: number, valor: string) => {
    const quantidade = parseFloat(valor) || 0;
    
    setItens(prev => prev.map(item => {
      if (item.id === itemId) {
        // Calcular quantidade máxima permitida
        const quantidadeMaxima = item.saldo_pendente !== undefined && item.saldo_pendente > 0 
          ? item.saldo_pendente 
          : item.quantidade;
        
        // Limitar a quantidade ao máximo permitido
        const quantidadeLimitada = Math.min(quantidade, quantidadeMaxima);
        
        return { ...item, quantidade_a_entregar: quantidadeLimitada };
      }
      return item;
    }));
  };

  const itensFiltrados = itens.filter((item) => {
    if (abaAtiva === 'pendentes') {
      return !item.entrega_confirmada || (item.saldo_pendente && item.saldo_pendente > 0);
    } else {
      return item.historico_entregas && item.historico_entregas.length > 0;
    }
  });

  const itensSelecionados = itens.filter(i => i.selecionado);

  const continuar = () => {
    const selecionados = itens.filter(i => i.selecionado);
    
    if (selecionados.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um item para entrega');
      return;
    }

    // Validar quantidades
    const invalidos = selecionados.filter(i => i.quantidade_a_entregar <= 0);
    if (invalidos.length > 0) {
      Alert.alert('Atenção', 'Todas as quantidades devem ser maiores que zero');
      return;
    }

    // Avisar sobre quantidades diferentes (com tolerância de 0.01)
    const diferentes = selecionados.filter(i => {
      const diff = Math.abs(i.quantidade_a_entregar - i.quantidade);
      return diff > 0.01; // Tolerância para evitar problemas de precisão de ponto flutuante
    });
    
    if (diferentes.length > 0) {
      const nomes = diferentes.map(i => {
        const quantidadeEsperada = (i.saldo_pendente !== undefined && i.saldo_pendente > 0) 
          ? i.saldo_pendente 
          : i.quantidade;
        const label = (i.saldo_pendente !== undefined && i.saldo_pendente > 0) 
          ? 'faltam' 
          : 'programado';
        return `${i.produto_nome}: ${formatarQuantidade(i.quantidade_a_entregar)} ${i.unidade} (${label}: ${formatarQuantidade(quantidadeEsperada)} ${i.unidade})`;
      }).join('\n');
      
      Alert.alert(
        '⚠️ Entrega Parcial/Diferente',
        `Os seguintes itens têm quantidade diferente da esperada:\n\n${nomes}\n\nDeseja continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => setEtapa('revisao') }
        ]
      );
    } else {
      setEtapa('revisao');
    }
  };

  const finalizarEntrega = async () => {
    if (!nomeRecebedor.trim()) {
      Alert.alert('Atenção', 'Informe o nome de quem recebeu a entrega');
      return;
    }

    if (!nomeEntregador.trim()) {
      Alert.alert('Atenção', 'Informe o nome de quem entregou');
      return;
    }

    if (!assinatura) {
      Alert.alert('Atenção', 'É necessário coletar a assinatura do recebedor');
      return;
    }

    try {
      setSalvando(true);
      
      const selecionados = itens.filter(i => i.selecionado);
      const historicoIds: number[] = [];
      
      for (const item of selecionados) {
        const entregaData = {
          quantidade_entregue: item.quantidade_a_entregar,
          nome_quem_entregou: nomeEntregador.trim(),
          nome_quem_recebeu: nomeRecebedor.trim(),
          observacao: observacao.trim() || undefined,
          assinatura_base64: assinatura
        };

        // Dados do comprovante para salvar offline
        const comprovanteData = {
          escola_id: escolaId,
          nome_quem_entregou: nomeEntregador.trim(),
          nome_quem_recebeu: nomeRecebedor.trim(),
          observacao: observacao.trim() || undefined,
          assinatura_base64: assinatura,
          produto_nome: item.produto_nome,
          quantidade_entregue: item.quantidade_a_entregar,
        };

        if (isOnline) {
          // Online: tentar enviar diretamente
          try {
            const response = await confirmarEntregaItem(item.id, entregaData);
            console.log(`Entrega do item ${item.id} enviada com sucesso (online)`);
            console.log('Response completa:', JSON.stringify(response));
            // Guardar o ID do histórico para criar o comprovante
            // A API retorna { message, item, historico_id }
            if (response?.historico_id) {
              historicoIds.push(response.historico_id);
              console.log(`✓ Histórico ID ${response.historico_id} adicionado`);
            } else {
              console.warn('⚠️ historico_id não encontrado na resposta:', response);
            }
          } catch (err) {
            // Se falhar online, adicionar à fila para tentar depois (com dados do comprovante)
            console.log('Falha ao enviar online, adicionando à fila');
            await addOperation(item.id, entregaData, comprovanteData);
          }
        } else {
          // Offline: adicionar à fila com dados do comprovante
          console.log(`Entrega do item ${item.id} adicionada à fila (offline) com dados do comprovante`);
          await addOperation(item.id, entregaData, comprovanteData);
        }
      }

      // Criar comprovante se estiver online e tiver históricos
      if (isOnline && historicoIds.length > 0) {
        console.log(`📋 Criando comprovante com ${historicoIds.length} itens...`);
        try {
          await criarComprovante(selecionados, historicoIds);
        } catch (err) {
          console.error('Erro ao criar comprovante:', err);
          // Não bloqueia o fluxo se falhar
        }
      } else {
        console.log('⚠️ Comprovante não criado:', {
          isOnline,
          historicoIdsLength: historicoIds.length,
          selecionadosLength: selecionados.length
        });
      }

      // Atualizar cache local com as entregas realizadas
      await atualizarCacheLocal(selecionados);

      // Não mostrar Alert, apenas a animação de sucesso
      setEtapa('sucesso');
      
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (err) {
      Alert.alert('Erro', `Erro ao finalizar entrega: ${handleAxiosError(err)}`);
      setSalvando(false);
    }
  };

  const criarComprovante = async (itensEntregues: ItemSelecionado[], historicoIds: number[]) => {
    try {
      console.log('🔧 Iniciando criação de comprovante...');
      console.log('📦 Itens:', itensEntregues.length);
      console.log('📋 Histórico IDs:', historicoIds);

      const itensComprovante = itensEntregues.map((item, index) => ({
        historico_entrega_id: historicoIds[index],
        produto_nome: item.produto_nome,
        quantidade_entregue: item.quantidade_a_entregar,
        unidade: item.unidade,
        lote: item.lote || undefined
      }));

      const comprovanteData = {
        escola_id: escolaId,
        nome_quem_entregou: nomeEntregador.trim(),
        nome_quem_recebeu: nomeRecebedor.trim(),
        observacao: observacao.trim() || undefined,
        assinatura_base64: assinatura,
        itens: itensComprovante
      };

      console.log('📤 Enviando comprovante para API...');
      console.log('URL:', `${API_URL}/entregas/comprovantes`);

      const tokenData = await AsyncStorage.getItem('token');
      const token = tokenData ? JSON.parse(tokenData).token : null;

      const response = await fetch(`${API_URL}/entregas/comprovantes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(comprovanteData)
      });

      console.log('📥 Status da resposta:', response.status);

      if (response.ok) {
        const comprovante = await response.json();
        console.log(`✅ Comprovante ${comprovante.numero_comprovante} criado com sucesso`);
      } else {
        const errorText = await response.text();
        console.error('❌ Erro na API:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Erro ao criar comprovante:', error);
      throw error;
    }
  };

  const atualizarCacheLocal = async (itensEntregues: ItemSelecionado[]) => {
    try {
      const cacheKey = `itens_escola_${escolaId}`;
      const cachedData = await cacheService.get<ItemEntrega[]>(cacheKey);
      
      if (!cachedData) {
        console.log('Nenhum cache encontrado para atualizar');
        return;
      }

      console.log('Atualizando cache local...');

      // Atualizar os itens no cache
      const itensAtualizados = cachedData.map(item => {
        const itemEntregue = itensEntregues.find(ie => ie.id === item.id);
        
        if (itemEntregue) {
          // Garantir que todos os valores sejam números
          const quantidadeJaEntregueAtual = parseFloat(String(item.quantidade_ja_entregue || 0));
          const quantidadeOriginal = parseFloat(String(item.quantidade));
          const quantidadeEntregueAgora = parseFloat(String(itemEntregue.quantidade_a_entregar));
          
          // Usar saldo_pendente se existir, senão calcular baseado na quantidade original
          const saldoAtual = item.saldo_pendente !== undefined && item.saldo_pendente !== null
            ? parseFloat(String(item.saldo_pendente))
            : quantidadeOriginal - quantidadeJaEntregueAtual;
          
          const novoSaldo = saldoAtual - quantidadeEntregueAgora;
          const novaQuantidadeEntregue = quantidadeJaEntregueAtual + quantidadeEntregueAgora;
          const entregaCompleta = Math.abs(novoSaldo) < 0.01; // Tolerância

          console.log(`Item ${item.produto_nome}:`, {
            quantidadeJaEntregueAtual,
            quantidadeEntregueAgora,
            novaQuantidadeEntregue,
            saldoAtual,
            novoSaldo,
            entregaCompleta
          });

          return {
            ...item,
            quantidade_ja_entregue: novaQuantidadeEntregue,
            saldo_pendente: entregaCompleta ? 0 : Math.max(0, novoSaldo), // Nunca negativo
            entrega_confirmada: entregaCompleta,
          };
        }
        
        return item;
      });

      // Salvar cache atualizado
      await cacheService.set(cacheKey, itensAtualizados);
      console.log('Cache local atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar cache local:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando itens...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Button mode="contained" onPress={carregarItens}>
          Tentar Novamente
        </Button>
      </View>
    );
  }

  // Tela de sucesso
  if (etapa === 'sucesso') {
    return (
      <View style={styles.sucessoContainer}>
        <View style={styles.sucessoCard}>
          <View style={styles.sucessoIcon}>
            <Text style={styles.sucessoIconText}>✓</Text>
          </View>
          <Text variant="headlineSmall" style={styles.sucessoTitle}>
            Entrega Confirmada!
          </Text>
          <Text variant="bodyMedium" style={styles.sucessoText}>
            {itensSelecionados.length} {itensSelecionados.length === 1 ? 'item confirmado' : 'itens confirmados'} com sucesso
          </Text>
          {!isOnline && (
            <Text variant="bodySmall" style={styles.sucessoOffline}>
              📱 Entrega salva offline. Será sincronizada quando voltar online.
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Tela de revisão
  if (etapa === 'revisao') {
    return (
      <ScrollView style={styles.container}>
        <Card style={styles.revisaoCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.revisaoTitle}>
              Resumo da Entrega
            </Text>

            <View style={styles.revisaoSection}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Itens Selecionados ({itensSelecionados.length})
              </Text>
              {itensSelecionados.map(item => {
                // Comparar com saldo pendente se houver, senão com quantidade original
                const quantidadeEsperada = (item.saldo_pendente !== undefined && item.saldo_pendente > 0) 
                  ? item.saldo_pendente 
                  : item.quantidade;
                const diff = Math.abs(item.quantidade_a_entregar - quantidadeEsperada);
                const quantidadeDiferente = diff > 0.01; // Tolerância para evitar problemas de precisão
                return (
                  <View key={item.id} style={styles.itemRevisao}>
                    <View style={styles.itemRevisaoHeader}>
                      <Text style={styles.itemRevisaoNome}>{item.produto_nome}</Text>
                      <Text style={[
                        styles.itemRevisaoQuantidade,
                        quantidadeDiferente && styles.itemRevisaoQuantidadeDiferente
                      ]}>
                        {formatarQuantidade(item.quantidade_a_entregar)} {item.unidade}
                      </Text>
                    </View>
                    {quantidadeDiferente && (
                      <Text style={styles.itemRevisaoAviso}>
                        ⚠️ {item.saldo_pendente !== undefined && item.saldo_pendente > 0 
                          ? `Faltam: ${formatarQuantidade(item.saldo_pendente)}` 
                          : `Programado: ${formatarQuantidade(item.quantidade)}`} {item.unidade}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            <TextInput
              label="Nome de Quem Entregou *"
              value={nomeEntregador}
              disabled
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Nome de Quem Recebeu *"
              value={nomeRecebedor}
              onChangeText={setNomeRecebedor}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Observações (opcional)"
              value={observacao}
              onChangeText={setObservacao}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.assinaturaSection}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Assinatura do Recebedor *
              </Text>
              {assinatura ? (
                <View>
                  <View style={styles.assinaturaPreview}>
                    <Text style={styles.assinaturaTexto}>✓ Assinatura capturada</Text>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={() => setShowSignaturePad(true)}
                    style={styles.refazerButton}
                    icon="pencil"
                  >
                    Refazer Assinatura
                  </Button>
                </View>
              ) : (
                <Button
                  mode="contained"
                  onPress={() => setShowSignaturePad(true)}
                  style={styles.assinarButton}
                  icon="draw"
                  buttonColor="#1976d2"
                >
                  Coletar Assinatura
                </Button>
              )}
            </View>

            <SignaturePad
              visible={showSignaturePad}
              onClose={() => setShowSignaturePad(false)}
              onSave={(sig) => setAssinatura(sig)}
            />

            <View style={styles.botoesRevisao}>
              <Button
                mode="outlined"
                onPress={() => setEtapa('selecao')}
                disabled={salvando}
                style={styles.botaoVoltar}
              >
                Voltar
              </Button>
              <Button
                mode="contained"
                onPress={finalizarEntrega}
                disabled={salvando}
                loading={salvando}
                style={styles.botaoFinalizar}
              >
                {salvando ? 'Finalizando...' : 'Finalizar Entrega'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.container}>
        <OfflineIndicator />
        
        {/* Card com informações da escola e período */}
        <Card style={styles.header}>
          <Card.Content>
            <Text variant="titleMedium">Escola: {escolaNome}</Text>
            {filtroAtivo && (
              <Text variant="bodySmall" style={styles.periodo}>
                Período: {new Date(filtroAtivo.dataInicio).toLocaleDateString('pt-BR')} a{' '}
                {new Date(filtroAtivo.dataFim).toLocaleDateString('pt-BR')}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Abas */}
        <View style={styles.tabs}>
          <Button
            mode={abaAtiva === 'pendentes' ? 'contained' : 'outlined'}
            onPress={() => setAbaAtiva('pendentes')}
            style={[styles.tab, abaAtiva !== 'pendentes' && styles.tabInativo]}
            buttonColor={abaAtiva === 'pendentes' ? '#1976d2' : undefined}
            textColor={abaAtiva === 'pendentes' ? '#fff' : '#1976d2'}
          >
            📦 Pendentes ({itens.filter((i) => !i.entrega_confirmada).length})
          </Button>
          <Button
            mode={abaAtiva === 'entregues' ? 'contained' : 'outlined'}
            onPress={() => setAbaAtiva('entregues')}
            style={[styles.tab, abaAtiva !== 'entregues' && styles.tabInativo]}
            buttonColor={abaAtiva === 'entregues' ? '#1976d2' : undefined}
            textColor={abaAtiva === 'entregues' ? '#fff' : '#1976d2'}
          >
            ✓ Entregues ({itens.filter((i) => i.historico_entregas?.length).length})
          </Button>
        </View>

        <FlatList
          data={itensFiltrados}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Content>
                {/* Checkbox e Produto */}
                <View style={styles.cardRow}>
                  {abaAtiva === 'pendentes' && !item.entrega_confirmada && (
                    <View style={styles.checkboxContainer}>
                      <Checkbox
                        status={item.selecionado ? 'checked' : 'unchecked'}
                        onPress={() => toggleItem(item.id)}
                        color="#1976d2"
                        uncheckedColor="#999"
                      />
                    </View>
                  )}
                  
                  <View style={styles.cardContent}>
                    <Text variant="titleMedium" style={styles.produto}>
                      {item.produto_nome}
                    </Text>

                    {item.quantidade_ja_entregue && item.quantidade_ja_entregue > 0 ? (
                      <View>
                        <Text style={styles.faltam}>
                          📦 Faltam: {formatarQuantidade(item.saldo_pendente || 0)} {item.unidade}
                        </Text>
                        <Text style={styles.info}>
                          Programado: {formatarQuantidade(item.quantidade)} {item.unidade} • Já entregue:{' '}
                          {formatarQuantidade(item.quantidade_ja_entregue)} {item.unidade}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.quantidade}>
                        📦 Quantidade: {formatarQuantidade(item.quantidade)} {item.unidade}
                      </Text>
                    )}

                    {item.lote && (
                      <Text style={styles.lote}>🏷️ Lote: {item.lote}</Text>
                    )}

                    {item.observacao && (
                      <Text style={styles.observacao}>💬 {item.observacao}</Text>
                    )}

                    {/* Campo de quantidade quando selecionado */}
                    {abaAtiva === 'pendentes' && item.selecionado && (
                      <View style={styles.quantidadeInput} pointerEvents="box-none">
                        <Text variant="labelSmall" style={styles.quantidadeLabel}>
                          Quantidade a entregar *
                        </Text>
                        <Text style={styles.quantidadeHint}>
                          Você pode entregar uma quantidade diferente
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TextInput
                            mode="outlined"
                            keyboardType="numeric"
                            value={String(item.quantidade_a_entregar)}
                            onChangeText={(text) => atualizarQuantidade(item.id, text)}
                            style={{ flex: 1, height: 40 }}
                            dense
                            selectTextOnFocus
                          />
                          <Text variant="bodyMedium" style={{ fontWeight: 'bold', minWidth: 40 }}>
                            {item.unidade}
                          </Text>
                        </View>
                      </View>
                    )}

                    {abaAtiva === 'entregues' && item.historico_entregas && (
                      <View style={styles.historico}>
                        <Text variant="labelMedium" style={styles.historicoTitle}>
                          Histórico:
                        </Text>
                        {item.historico_entregas.map((h, index) => (
                          <View key={h.id} style={styles.historicoItem}>
                            <Text style={styles.historicoQuantidade}>
                              {formatarQuantidade(h.quantidade_entregue)} {item.unidade}
                            </Text>
                            <Text style={styles.historicoData}>
                              {new Date(h.data_entrega).toLocaleDateString('pt-BR')}
                            </Text>
                            <Text style={styles.historicoRecebedor}>
                              Recebido por: {h.nome_quem_recebeu}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="headlineMedium">
                {abaAtiva === 'pendentes' ? '📦' : '✓'}
              </Text>
              <Text variant="titleMedium">
                {abaAtiva === 'pendentes'
                  ? 'Nenhum item pendente'
                  : 'Nenhum item entregue ainda'}
              </Text>
            </View>
          }
        />

        {abaAtiva === 'pendentes' && itensSelecionados.length > 0 && (
          <Button
            mode="contained"
            onPress={continuar}
            style={styles.confirmarButton}
          >
            Continuar ({itensSelecionados.length} {itensSelecionados.length === 1 ? 'item' : 'itens'})
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
  },
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  header: {
    margin: 12,
    marginBottom: 0,
  },
  periodo: {
    color: '#1565c0',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  tabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
  },
  tabInativo: {
    backgroundColor: '#fff',
  },
  list: {
    padding: 12,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cardContent: {
    flex: 1,
  },
  produto: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quantidade: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  faltam: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  info: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  lote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  observacao: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  historico: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  historicoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#047857',
  },
  historicoItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  historicoQuantidade: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  historicoData: {
    fontSize: 12,
    color: '#666',
  },
  historicoRecebedor: {
    fontSize: 12,
    color: '#666',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  confirmarButton: {
    margin: 16,
    paddingVertical: 8,
  },
  quantidadeInput: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  quantidadeLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 2,
    color: '#1e40af',
  },
  quantidadeHint: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 6,
  },
  sucessoContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sucessoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    maxWidth: 400,
  },
  sucessoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sucessoIconText: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  sucessoTitle: {
    color: '#059669',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  sucessoText: {
    color: '#666',
    textAlign: 'center',
  },
  sucessoOffline: {
    color: '#f59e0b',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  revisaoCard: {
    margin: 12,
  },
  revisaoTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  revisaoSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemRevisao: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  itemRevisaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemRevisaoNome: {
    fontWeight: '600',
    flex: 1,
  },
  itemRevisaoQuantidade: {
    fontWeight: 'bold',
    color: '#059669',
  },
  itemRevisaoQuantidadeDiferente: {
    color: '#d97706',
  },
  itemRevisaoAviso: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 4,
    padding: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
  input: {
    marginBottom: 12,
  },
  assinaturaSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  assinaturaPreview: {
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#059669',
    marginBottom: 12,
    alignItems: 'center',
  },
  assinaturaTexto: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 16,
  },
  assinarButton: {
    paddingVertical: 8,
  },
  refazerButton: {
    borderColor: '#1976d2',
  },
  botoesRevisao: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  botaoVoltar: {
    flex: 1,
  },
  botaoFinalizar: {
    flex: 2,
    backgroundColor: '#059669',
  },
});
