import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { listarEstoqueCentral, listarMovimentacoes } from '../api/estoqueCentral';
import { formatarNumeroInteligente } from '../utils/dateUtils';

export default function EstoqueCentralRelatoriosScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [produtosBaixo, setProdutosBaixo] = useState(0);
  const [totalMovimentacoes, setTotalMovimentacoes] = useState(0);
  const [movimentacoesHoje, setMovimentacoesHoje] = useState(0);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const estoqueData = await listarEstoqueCentral();
      setEstoque(estoqueData);
      setTotalProdutos(estoqueData.length);

      const baixo = estoqueData.filter((item) => {
        const disponivel = typeof item.quantidade_disponivel === 'number'
          ? item.quantidade_disponivel
          : parseFloat(String(item.quantidade_disponivel || 0));
        return disponivel < 10;
      }).length;
      setProdutosBaixo(baixo);

      const movimentacoes = await listarMovimentacoes(undefined, undefined, 100);
      setTotalMovimentacoes(movimentacoes.length);

      const hoje = new Date().toDateString();
      const movHoje = movimentacoes.filter((mov) =>
        new Date(mov.created_at).toDateString() === hoje
      ).length;
      setMovimentacoesHoje(movHoje);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarDados();
  };

  const formatarValor = (valor: any) => {
    const num = typeof valor === 'number' ? valor : parseFloat(String(valor || 0));
    return Number.isNaN(num) ? 0 : formatarNumeroInteligente(num);
  };

  const gerarPDFGeral = async () => {
    try {
      setGenerating(true);
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #1976d2; text-align: center; }
              h2 { color: #333; margin-top: 20px; border-bottom: 2px solid #1976d2; padding-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #1976d2; color: white; }
              tr:nth-child(even) { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Relatorio Geral do Estoque</h1>
            <p style="text-align: center; color: #666;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <h2>Resumo</h2>
            <table>
              <tr><th>Metrica</th><th>Valor</th></tr>
              <tr><td>Total de Produtos</td><td>${totalProdutos}</td></tr>
              <tr><td>Produtos com Estoque Baixo</td><td>${produtosBaixo}</td></tr>
              <tr><td>Movimentacoes Hoje</td><td>${movimentacoesHoje}</td></tr>
              <tr><td>Total de Movimentacoes</td><td>${totalMovimentacoes}</td></tr>
            </table>
            <h2>Produtos em Estoque</h2>
            <table>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Disponivel</th>
                <th>Unidade</th>
              </tr>
              ${estoque.map((item) => `
                <tr>
                  <td>${item.produto_nome}</td>
                  <td>${formatarValor(item.quantidade)}</td>
                  <td>${formatarValor(item.quantidade_disponivel)}</td>
                  <td>${item.unidade}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      Alert.alert('Erro', 'Nao foi possivel gerar o PDF');
    } finally {
      setGenerating(false);
    }
  };

  const gerarPDFMovimentacoes = async () => {
    if (!produtoSelecionado) {
      Alert.alert('Atencao', 'Selecione um produto para gerar o relatorio de movimentacoes');
      return;
    }

    try {
      setGenerating(true);
      const produto = estoque.find((item) => String(item.produto_id) === produtoSelecionado || String(item.id) === produtoSelecionado);
      const movimentacoes = await listarMovimentacoes(Number(produtoSelecionado), undefined, 50);

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #1976d2; text-align: center; }
              h2 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
              th { background-color: #1976d2; color: white; }
              tr:nth-child(even) { background-color: #f2f2f2; }
              .entrada { color: #10b981; font-weight: bold; }
              .saida { color: #dc2626; font-weight: bold; }
              .ajuste { color: #f59e0b; font-weight: bold; }
              .transferencia { color: #2563eb; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>Relatorio de Movimentacoes</h1>
            <h2>${produto?.produto_nome}</h2>
            <p style="color: #666;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <table>
              <tr>
                <th>Data/Hora</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Destino</th>
                <th>Motivo</th>
              </tr>
              ${movimentacoes.map((mov) => {
                const qtd = formatarValor(mov.quantidade);
                const sinal = (mov.quantidade || 0) > 0 ? '+' : '';
                const unidadeMov = mov.unidade || produto?.unidade || '';
                return `
                  <tr>
                    <td>${new Date(mov.created_at).toLocaleString('pt-BR')}</td>
                    <td class="${mov.tipo}">${String(mov.tipo || '').toUpperCase()}</td>
                    <td class="${mov.tipo}">${sinal}${qtd} ${unidadeMov}</td>
                    <td>${mov.escola_nome || '-'}</td>
                    <td>${mov.motivo || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      Alert.alert('Erro', 'Nao foi possivel gerar o PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando relatorios...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text variant="headlineSmall" style={styles.pageTitle}>Relatorios do Estoque</Text>
          <Text variant="bodyMedium" style={styles.pageSubtitle}>Visao geral e geracao de PDFs</Text>
        </View>

        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, styles.statCardBlue]}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.statLabel}>Total de Produtos</Text>
              <Text variant="displaySmall" style={styles.statValue}>{totalProdutos}</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, styles.statCardOrange]}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.statLabel}>Estoque Baixo</Text>
              <Text variant="displaySmall" style={styles.statValue}>{produtosBaixo}</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, styles.statCardGreen]}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.statLabel}>Movimentacoes Hoje</Text>
              <Text variant="displaySmall" style={styles.statValue}>{movimentacoesHoje}</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, styles.statCardPurple]}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.statLabel}>Total Movimentacoes</Text>
              <Text variant="displaySmall" style={styles.statValue}>{totalMovimentacoes}</Text>
            </Card.Content>
          </Card>
        </View>

        <Divider style={styles.divider} />

        <Card style={styles.pdfCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.pdfTitle}>Gerar Relatorios em PDF</Text>
            <Button
              mode="contained"
              icon="file-document"
              onPress={gerarPDFGeral}
              loading={generating}
              disabled={generating}
              style={styles.pdfButton}
            >
              Relatorio Geral
            </Button>

            <Divider style={styles.miniDivider} />

            <Text variant="titleSmall" style={styles.selectLabel}>
              Relatorio de Movimentacoes por Produto
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={produtoSelecionado}
                onValueChange={setProdutoSelecionado}
                style={styles.picker}
              >
                <Picker.Item label="Selecione um produto..." value="" />
                {estoque.map((produto) => (
                  <Picker.Item
                    key={produto.produto_id}
                    label={produto.produto_nome}
                    value={String(produto.produto_id)}
                  />
                ))}
              </Picker>
            </View>
            <Button
              mode="contained"
              icon="history"
              onPress={gerarPDFMovimentacoes}
              loading={generating}
              disabled={generating || !produtoSelecionado}
              style={styles.pdfButton}
              buttonColor="#f59e0b"
            >
              Gerar Movimentacoes
            </Button>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 16, color: '#666' },
  headerSection: { marginBottom: 24 },
  pageTitle: { fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  pageSubtitle: { color: '#666' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, elevation: 2 },
  statCardBlue: { backgroundColor: '#3b82f6' },
  statCardOrange: { backgroundColor: '#f59e0b' },
  statCardGreen: { backgroundColor: '#10b981' },
  statCardPurple: { backgroundColor: '#8b5cf6' },
  statLabel: { color: '#fff', opacity: 0.9, marginBottom: 8, textTransform: 'uppercase', fontSize: 11, fontWeight: '600' },
  statValue: { color: '#fff', fontWeight: 'bold' },
  divider: { marginVertical: 24 },
  miniDivider: { marginVertical: 16 },
  pdfCard: { marginBottom: 16 },
  pdfTitle: { fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  pdfButton: { marginBottom: 12 },
  selectLabel: { fontWeight: '600', marginBottom: 8, color: '#666' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, backgroundColor: '#fff', marginBottom: 12 },
  picker: { height: 50 },
});
