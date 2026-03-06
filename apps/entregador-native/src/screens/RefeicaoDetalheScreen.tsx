import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList } from 'react-native';
import { Text, Card, FAB, IconButton, Searchbar, Chip, TextInput, Button, Portal, Modal, Divider } from 'react-native-paper';
import { listarProdutosDaRefeicao, adicionarProdutoNaRefeicao, editarProdutoNaRefeicao, removerProdutoDaRefeicao } from '../api/nutricao';
import { listarProdutos } from '../api/estoqueCentral';

export default function RefeicaoDetalheScreen({ navigation, route }: any) {
  const { refeicao } = route.params;
  const [produtos, setProdutos] = useState<any[]>([]);
  const [associacoes, setAssociacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAssoc, setEditingAssoc] = useState<any>(null);
  const [perCapita, setPerCapita] = useState('');
  const [tipoMedida, setTipoMedida] = useState<'gramas' | 'unidades'>('gramas');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [produtosData, associacoesData] = await Promise.all([
        listarProdutos(),
        listarProdutosDaRefeicao(refeicao.id),
      ]);
      setProdutos(produtosData);
      setAssociacoes(associacoesData);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const produtosDisponiveis = produtos
    .filter((produto: any) => !associacoes.some((assoc: any) => assoc.produto_id === produto.id))
    .filter((produto: any) => 
      produto.nome?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const produtosAdicionados = associacoes
    .map((assoc: any) => ({
      ...assoc,
      produto: produtos.find((p: any) => p.id === assoc.produto_id),
    }))
    .filter((assoc: any) => assoc.produto);

  const handleAddProduto = async (produtoId: number) => {
    try {
      await adicionarProdutoNaRefeicao(refeicao.id, produtoId, 100, 'gramas');
      await loadData();
      Alert.alert('Sucesso', 'Produto adicionado à refeição');
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleRemoveProduto = async (assocId: number, produtoNome: string) => {
    Alert.alert(
      'Confirmar Remoção',
      `Deseja remover "${produtoNome}" desta refeição?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await removerProdutoDaRefeicao(assocId);
              await loadData();
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const handleEditPerCapita = (assoc: any) => {
    setEditingAssoc(assoc);
    setPerCapita(String(assoc.per_capita));
    setTipoMedida(assoc.tipo_medida || 'gramas');
    setModalVisible(true);
  };

  const handleSavePerCapita = async () => {
    if (!editingAssoc) return;

    const value = parseFloat(perCapita);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    try {
      await editarProdutoNaRefeicao(editingAssoc.id, value, tipoMedida);
      await loadData();
      setModalVisible(false);
      setEditingAssoc(null);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {refeicao.nome}
        </Text>
        {refeicao.descricao && (
          <Text variant="bodyMedium" style={styles.description}>
            {refeicao.descricao}
          </Text>
        )}
        <View style={styles.statsRow}>
          <Chip icon="food" style={styles.statChip}>
            {produtosAdicionados.length} {produtosAdicionados.length === 1 ? 'produto' : 'produtos'}
          </Chip>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Produtos Adicionados */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Produtos da Refeição
          </Text>
          {produtosAdicionados.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>
                  Nenhum produto adicionado. Use o botão + para adicionar.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            produtosAdicionados.map((assoc: any) => (
              <Card key={assoc.id} style={styles.card}>
                <Card.Content>
                  <View style={styles.cardRow}>
                    <View style={styles.cardContent}>
                      <Text variant="titleMedium">{assoc.produto.nome}</Text>
                      <View style={styles.quantityRow}>
                        <Chip mode="outlined" compact style={styles.quantityChip}>
                          {assoc.per_capita} {assoc.tipo_medida === 'gramas' ? 'g' : 'un'}
                        </Chip>
                        <Text variant="bodySmall" style={styles.perCapitaLabel}>
                          per capita
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        iconColor="#1976d2"
                        onPress={() => handleEditPerCapita(assoc)}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor="#f44336"
                        onPress={() => handleRemoveProduto(assoc.id, assoc.produto.nome)}
                      />
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </View>

        {/* Produtos Disponíveis */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Adicionar Produtos
          </Text>
          <Searchbar
            placeholder="Buscar produtos..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            elevation={0}
          />
          {produtosDisponiveis.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Nenhum produto encontrado' : 'Todos os produtos foram adicionados'}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            produtosDisponiveis.map((produto: any) => (
              <Card key={produto.id} style={styles.card}>
                <Card.Content>
                  <View style={styles.cardRow}>
                    <View style={styles.cardContent}>
                      <Text variant="titleMedium">{produto.nome}</Text>
                      {produto.unidade && (
                        <Text variant="bodySmall" style={styles.unidade}>
                          Unidade: {produto.unidade}
                        </Text>
                      )}
                    </View>
                    <IconButton
                      icon="plus-circle"
                      size={28}
                      iconColor="#4caf50"
                      onPress={() => handleAddProduto(produto.id)}
                    />
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal de Edição */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Editar Quantidade
          </Text>
          {editingAssoc && (
            <Text variant="bodyMedium" style={styles.modalSubtitle}>
              {editingAssoc.produto?.nome}
            </Text>
          )}
          <Divider style={styles.divider} />
          
          <TextInput
            label="Quantidade per capita"
            value={perCapita}
            onChangeText={setPerCapita}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.tipoMedidaRow}>
            <Chip
              selected={tipoMedida === 'gramas'}
              onPress={() => setTipoMedida('gramas')}
              style={styles.tipoChip}
              mode={tipoMedida === 'gramas' ? 'flat' : 'outlined'}
            >
              Gramas (g)
            </Chip>
            <Chip
              selected={tipoMedida === 'unidades'}
              onPress={() => setTipoMedida('unidades')}
              style={styles.tipoChip}
              mode={tipoMedida === 'unidades' ? 'flat' : 'outlined'}
            >
              Unidades (un)
            </Chip>
          </View>

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setModalVisible(false)} style={styles.modalButton}>
              Cancelar
            </Button>
            <Button mode="contained" onPress={handleSavePerCapita} style={styles.modalButton}>
              Salvar
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  description: {
    color: '#666',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    backgroundColor: '#e8f5e9',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  searchbar: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  card: {
    marginBottom: 8,
    backgroundColor: '#fff',
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  quantityChip: {
    backgroundColor: '#e3f2fd',
  },
  perCapitaLabel: {
    color: '#666',
  },
  unidade: {
    color: '#666',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
  },
  emptyCard: {
    backgroundColor: '#fff',
    elevation: 1,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  tipoMedidaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tipoChip: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    minWidth: 100,
  },
});
