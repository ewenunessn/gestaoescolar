import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Switch,
  FormControlLabel,
  Collapse,
  IconButton,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Route as RouteIcon,
  Assignment as GuiaIcon,
  Inventory as InventoryIcon,
  School as SchoolIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Print as PrintIcon,
  Settings as ConfigIcon
} from '@mui/icons-material';
import { guiaService } from '../services/guiaService';
import { rotaService } from '../modules/entregas/services/rotaService';
import { itemGuiaService, ItemGuia } from '../services/itemGuiaService';
import { RotaEntrega, ConfiguracaoEntrega as ConfiguracaoEntregaType } from '../modules/entregas/types/rota';
import { useNavigate } from 'react-router-dom';

interface ItemGuiaComSelecao extends ItemGuia {
  selecionado: boolean;
}

// Usar o tipo importado
type ConfiguracaoAtiva = ConfiguracaoEntregaType;

const ConfiguracaoEntrega: React.FC = () => {
  const navigate = useNavigate();
  const [guias, setGuias] = useState<any[]>([]);
  const [rotas, setRotas] = useState<RotaEntrega[]>([]);
  const [itensGuia, setItensGuia] = useState<ItemGuiaComSelecao[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado da configuração atual
  const [configuracao, setConfiguracao] = useState<ConfiguracaoAtiva>({
    guiaId: 0,
    rotasSelecionadas: [],
    itensSelecionados: [],
    ativa: true
  });

  // Estado para controlar expansão dos grupos de produtos
  const [produtosExpandidos, setProdutosExpandidos] = useState<Set<string>>(new Set());

  // Estado para modal de visualização por escola
  const [modalVisualizacaoAberto, setModalVisualizacaoAberto] = useState(false);
  const [dadosEscolas, setDadosEscolas] = useState<any[]>([]);

  // Estado para modal de romaneio
  const [modalRomaneioAberto, setModalRomaneioAberto] = useState(false);
  const [dadosRomaneio, setDadosRomaneio] = useState<any[]>([]);

  // Estado para configuração de unidades de impressão
  const [modalConfigUnidadesAberto, setModalConfigUnidadesAberto] = useState(false);
  const [configUnidades, setConfigUnidades] = useState<{
    [key: string]: {
      ativo: boolean;
      pacote: number;
      caixa: number;
      tipoCaixa: 'caixa' | 'fardo';
    }
  }>({});

  // Estado para modal de seleção de rotas
  const [modalEscolherRotasAberto, setModalEscolherRotasAberto] = useState(false);
  const [rotasDisponiveis, setRotasDisponiveis] = useState<RotaEntrega[]>([]);
  const [rotasEscolhidas, setRotasEscolhidas] = useState<RotaEntrega[]>([]);
  const [conflitosEscolas, setConflitosEscolas] = useState<{[key: number]: number[]}>({});
  
  // Estado local para os campos de input durante a digitação
  const [inputValues, setInputValues] = useState<{
    [key: string]: {
      pacote: string;
      caixa: string;
      tipoCaixa: 'caixa' | 'fardo';
    }
  }>({});

  useEffect(() => {
    carregarDados();
  }, []);

  // Recarregar dados quando a página receber foco
  useEffect(() => {
    const handleFocus = () => {
      if (configuracao.guiaId > 0) {
        carregarItensGuia(configuracao.guiaId);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [configuracao.guiaId]);

  useEffect(() => {
    if (configuracao.guiaId > 0) {
      carregarItensGuia(configuracao.guiaId);
    }
  }, [configuracao.guiaId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar dados básicos
      const [guiasData, rotasData] = await Promise.all([
        guiaService.listarGuias(),
        rotaService.listarRotas()
      ]);

      const guiasResponse = guiasData?.data || guiasData;
      const guiasAbertas = Array.isArray(guiasResponse)
        ? guiasResponse.filter(g => g.status === 'aberta')
        : [];
      setGuias(guiasAbertas);
      setRotas(rotasData);

      // Tentar carregar configuração ativa existente
      await carregarConfiguracaoAtiva();

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      // Usar dados simulados em caso de erro
      setGuias([
        { id: 1, mes: 1, ano: 2025, status: 'aberta', observacao: 'Guia Janeiro 2025' },
        { id: 2, mes: 2, ano: 2025, status: 'aberta', observacao: 'Guia Fevereiro 2025' }
      ]);
      setRotas([
        { id: 1, nome: 'Rota Centro', cor: '#2563eb', ativo: true, created_at: '', updated_at: '', total_escolas: 5 },
        { id: 2, nome: 'Rota Norte', cor: '#dc2626', ativo: true, created_at: '', updated_at: '', total_escolas: 3 },
        { id: 3, nome: 'Rota Sul', cor: '#16a34a', ativo: true, created_at: '', updated_at: '', total_escolas: 4 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const carregarConfiguracaoAtiva = async () => {
    try {
      const config = await rotaService.buscarConfiguracaoAtiva();
      if (config) {
        setConfiguracao(config);
      }
    } catch (err) {
      console.log('Nenhuma configuração ativa encontrada');
    }
  };

  const carregarItensGuia = async (guiaId: number) => {
    try {
      const itens = await itemGuiaService.listarItensPorGuia(guiaId);

      // Limpar IDs inválidos da configuração (itens que não existem mais)
      const idsValidos = itens.map(item => item.id);
      const itensSelecionadosLimpos = configuracao.itensSelecionados.filter(id => idsValidos.includes(id));

      // Atualizar configuração se houve mudanças (IDs inválidos foram removidos)
      if (itensSelecionadosLimpos.length !== configuracao.itensSelecionados.length) {
        setConfiguracao(prev => ({
          ...prev,
          itensSelecionados: itensSelecionadosLimpos
        }));
      }

      const itensComSelecao: ItemGuiaComSelecao[] = itens.map(item => ({
        ...item,
        selecionado: itensSelecionadosLimpos.includes(item.id)
      }));

      setItensGuia(itensComSelecao);
    } catch (err) {
      console.error('Erro ao carregar itens da guia:', err);
    }
  };

  const toggleRota = (rotaId: number) => {
    setConfiguracao(prev => ({
      ...prev,
      rotasSelecionadas: prev.rotasSelecionadas.includes(rotaId)
        ? prev.rotasSelecionadas.filter(id => id !== rotaId)
        : [...prev.rotasSelecionadas, rotaId]
    }));
  };

  const toggleItem = (itemId: number) => {
    setConfiguracao(prev => ({
      ...prev,
      itensSelecionados: prev.itensSelecionados.includes(itemId)
        ? prev.itensSelecionados.filter(id => id !== itemId)
        : [...prev.itensSelecionados, itemId]
    }));
  };

  const selecionarTodasRotas = () => {
    setConfiguracao(prev => ({
      ...prev,
      rotasSelecionadas: rotas.map(rota => rota.id)
    }));
  };

  const deselecionarTodasRotas = () => {
    setConfiguracao(prev => ({
      ...prev,
      rotasSelecionadas: []
    }));
  };

  const selecionarTodosItens = () => {
    setConfiguracao(prev => ({
      ...prev,
      itensSelecionados: itensGuia.map(item => item.id)
    }));
  };

  const deselecionarTodosItens = () => {
    setConfiguracao(prev => ({
      ...prev,
      itensSelecionados: []
    }));
  };

  // Agrupar itens por produto
  const itensAgrupados = useMemo(() => {
    const grupos = new Map<string, ItemGuiaComSelecao[]>();

    itensGuia.forEach(item => {
      const chave = item.produto_nome;
      if (!grupos.has(chave)) {
        grupos.set(chave, []);
      }
      grupos.get(chave)!.push(item);
    });

    return Array.from(grupos.entries()).map(([produto, itens]) => ({
      produto,
      itens: itens.sort((a, b) => a.escola_nome.localeCompare(b.escola_nome)),
      totalItens: itens.length,
      itensSelecionados: itens.filter(item => configuracao.itensSelecionados.includes(item.id)).length,
      quantidadeTotal: itens.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0),
      unidade: itens[0]?.unidade || ''
    }));
  }, [itensGuia, configuracao.itensSelecionados]);

  const toggleProdutoExpansao = (produto: string) => {
    setProdutosExpandidos(prev => {
      const novo = new Set(prev);
      if (novo.has(produto)) {
        novo.delete(produto);
      } else {
        novo.add(produto);
      }
      return novo;
    });
  };

  const toggleProdutoCompleto = (produto: string) => {
    const grupo = itensAgrupados.find(g => g.produto === produto);
    if (!grupo) return;

    const todosItensDoProduto = grupo.itens.map(item => item.id);
    const todosSelecionados = todosItensDoProduto.every(id => configuracao.itensSelecionados.includes(id));

    if (todosSelecionados) {
      // Desselecionar todos os itens deste produto
      setConfiguracao(prev => ({
        ...prev,
        itensSelecionados: prev.itensSelecionados.filter(id => !todosItensDoProduto.includes(id))
      }));
    } else {
      // Selecionar todos os itens deste produto
      setConfiguracao(prev => ({
        ...prev,
        itensSelecionados: [...new Set([...prev.itensSelecionados, ...todosItensDoProduto])]
      }));
    }
  };

  const expandirTodosProdutos = () => {
    setProdutosExpandidos(new Set(itensAgrupados.map(g => g.produto)));
  };

  const recolherTodosProdutos = () => {
    setProdutosExpandidos(new Set());
  };

  const visualizarPorEscola = async () => {
    if (!configuracao.guiaId || configuracao.rotasSelecionadas.length === 0 || configuracao.itensSelecionados.length === 0) {
      setError('Configure a guia, rotas e itens antes de visualizar por escola');
      return;
    }

    try {
      setLoading(true);

      // Usar os itens já carregados e filtrar localmente
      const itensFiltrados = itensGuia.filter(item =>
        configuracao.itensSelecionados.includes(item.id)
      );

      if (itensFiltrados.length === 0) {
        setError('Nenhum item selecionado encontrado');
        return;
      }

      // Buscar informações das escolas das rotas selecionadas
      const escolasRotas = new Map<number, any>();

      for (const rotaId of configuracao.rotasSelecionadas) {
        try {
          const escolasRota = await rotaService.listarEscolasRota(rotaId);
          escolasRota.forEach(escolaRota => {
            escolasRotas.set(escolaRota.escola_id, {
              escola_id: escolaRota.escola_id,
              escola_nome: escolaRota.escola_nome,
              escola_endereco: escolaRota.escola_endereco || '',
              rota_id: rotaId
            });
          });
        } catch (err) {
          console.warn(`Erro ao carregar escolas da rota ${rotaId}:`, err);
        }
      }

      // Agrupar itens por escola, considerando apenas escolas das rotas selecionadas
      const escolasAgrupadas = new Map<string, any>();

      itensFiltrados.forEach(item => {
        // Verificar se a escola do item está nas rotas selecionadas
        const escolaInfo = escolasRotas.get(item.escola_id);
        if (!escolaInfo) {
          return; // Pular itens de escolas que não estão nas rotas selecionadas
        }

        const chaveEscola = `${item.escola_id}-${item.escola_nome}`;

        if (!escolasAgrupadas.has(chaveEscola)) {
          escolasAgrupadas.set(chaveEscola, {
            escola_id: item.escola_id,
            escola_nome: item.escola_nome,
            escola_endereco: escolaInfo.escola_endereco || '',
            rota_id: escolaInfo.rota_id,
            itens: [],
            total_itens: 0,
            produtos_unicos: new Set()
          });
        }

        const escola = escolasAgrupadas.get(chaveEscola)!;
        escola.itens.push(item);
        escola.total_itens++;
        escola.produtos_unicos.add(item.produto_nome);
      });

      // Converter para array e ordenar
      const escolasArray = Array.from(escolasAgrupadas.values()).map(escola => ({
        ...escola,
        produtos_unicos: escola.produtos_unicos.size
      })).sort((a, b) => a.escola_nome.localeCompare(b.escola_nome));

      setDadosEscolas(escolasArray);
      setModalVisualizacaoAberto(true);

    } catch (err) {
      console.error('Erro ao carregar dados por escola:', err);
      setError('Erro ao carregar dados por escola');
    } finally {
      setLoading(false);
    }
  };

  const gerarRomaneio = async () => {
    try {
      setModalRomaneioAberto(true);

      // Buscar rotas selecionadas
      const rotasSelecionadas = rotas.filter(r => configuracao.rotasSelecionadas.includes(r.id));

      // Buscar itens selecionados
      const itensSelecionados = itensGuia.filter(item => configuracao.itensSelecionados.includes(item.id));

      // Agrupar itens por produto
      const produtosMap = new Map<string, any>();

      for (const item of itensSelecionados) {
        const chave = `${item.produto_id}_${item.unidade}`;

        if (!produtosMap.has(chave)) {
          produtosMap.set(chave, {
            produto_nome: item.produto_nome,
            unidade: item.unidade,
            rotas: {}
          });
        }

        const produto = produtosMap.get(chave);

        // Buscar a rota da escola deste item
        for (const rota of rotasSelecionadas) {
          const escolasRota = await rotaService.listarEscolasRota(rota.id);
          const escolaNaRota = escolasRota.find(e => e.escola_id === item.escola_id);

          if (escolaNaRota) {
            if (!produto.rotas[rota.id]) {
              produto.rotas[rota.id] = {
                rota_nome: rota.nome,
                rota_cor: rota.cor,
                quantidade: 0
              };
            }
            produto.rotas[rota.id].quantidade += parseFloat(String(item.quantidade)) || 0;
            break;
          }
        }
      }

      // Converter para array
      const dadosRomaneio = Array.from(produtosMap.values()).map(produto => ({
        ...produto,
        rotasArray: rotasSelecionadas.map(rota => ({
          rota_id: rota.id,
          rota_nome: rota.nome,
          rota_cor: rota.cor,
          quantidade: produto.rotas[rota.id]?.quantidade || 0
        }))
      }));

      setDadosRomaneio(dadosRomaneio);

      // Inicializar configuração de unidades se não existir
      const novaConfigUnidades = { ...configUnidades };
      const novosInputValues = { ...inputValues };
      
      dadosRomaneio.forEach(produto => {
        if (!novaConfigUnidades[produto.produto_nome]) {
          novaConfigUnidades[produto.produto_nome] = {
            ativo: false, // Por padrão, conversão desativada
            pacote: 1,    // 1 pacote = 1 unidade do item (padrão)
            caixa: 10,    // 10 unidades = 1 caixa/fardo (padrão)
            tipoCaixa: 'caixa' // Padrão é caixa
          };
        }
        
        // Inicializar valores de input se não existirem
        if (!novosInputValues[produto.produto_nome]) {
          novosInputValues[produto.produto_nome] = {
            pacote: novaConfigUnidades[produto.produto_nome].pacote.toString(),
            caixa: novaConfigUnidades[produto.produto_nome].caixa.toString(),
            tipoCaixa: novaConfigUnidades[produto.produto_nome].tipoCaixa || 'caixa'
          };
        }
      });
      
      setConfigUnidades(novaConfigUnidades);
      setInputValues(novosInputValues);

    } catch (err) {
      console.error('Erro ao gerar romaneio:', err);
      setError('Erro ao gerar romaneio');
    }
  };

  const abrirConfigUnidades = () => {
    setModalConfigUnidadesAberto(true);
  };

  const salvarConfigUnidades = () => {
    setModalConfigUnidadesAberto(false);
  };

  const abrirModalEscolherRotas = async () => {
    try {
      // Carregar todas as rotas disponíveis
      const todasRotas = await rotaService.listarRotas();
      setRotasDisponiveis(todasRotas);
      
      // Carregar rotas já escolhidas
      const rotasJaEscolhidas = rotas.filter(rota => configuracao.rotasSelecionadas.includes(rota.id));
      setRotasEscolhidas(rotasJaEscolhidas);
      
      // Verificar conflitos de escolas
      await verificarConflitosEscolas(rotasJaEscolhidas);
      
      setModalEscolherRotasAberto(true);
    } catch (err) {
      console.error('Erro ao carregar rotas:', err);
      setError('Erro ao carregar rotas disponíveis');
    }
  };

  const verificarConflitosEscolas = async (rotasParaVerificar: RotaEntrega[]) => {
    const conflitos: {[key: number]: number[]} = {};
    const escolasPorRota: {[key: number]: number[]} = {};

    // Buscar escolas de cada rota
    for (const rota of rotasParaVerificar) {
      try {
        const escolasRota = await rotaService.listarEscolasRota(rota.id);
        escolasPorRota[rota.id] = escolasRota.map(e => e.escola_id);
      } catch (err) {
        console.warn(`Erro ao carregar escolas da rota ${rota.id}:`, err);
        escolasPorRota[rota.id] = [];
      }
    }

    // Verificar conflitos entre rotas
    const rotasIds = Object.keys(escolasPorRota).map(Number);
    for (let i = 0; i < rotasIds.length; i++) {
      for (let j = i + 1; j < rotasIds.length; j++) {
        const rotaA = rotasIds[i];
        const rotaB = rotasIds[j];
        const escolasA = escolasPorRota[rotaA];
        const escolasB = escolasPorRota[rotaB];
        
        // Encontrar escolas em comum
        const escolasComuns = escolasA.filter(escolaId => escolasB.includes(escolaId));
        
        if (escolasComuns.length > 0) {
          if (!conflitos[rotaA]) conflitos[rotaA] = [];
          if (!conflitos[rotaB]) conflitos[rotaB] = [];
          
          conflitos[rotaA].push(rotaB);
          conflitos[rotaB].push(rotaA);
        }
      }
    }

    setConflitosEscolas(conflitos);
  };

  const adicionarRota = async (rota: RotaEntrega) => {
    const novasRotasEscolhidas = [...rotasEscolhidas, rota];
    
    // Verificar se há conflitos
    await verificarConflitosEscolas(novasRotasEscolhidas);
    
    // Se há conflitos, mostrar aviso mas permitir adicionar
    if (conflitosEscolas[rota.id] && conflitosEscolas[rota.id].length > 0) {
      const rotasConflitantes = conflitosEscolas[rota.id].map(id => 
        rotasEscolhidas.find(r => r.id === id)?.nome
      ).join(', ');
      
      const confirmar = window.confirm(
        `A rota "${rota.nome}" possui escolas em comum com: ${rotasConflitantes}.\n\nDeseja adicionar mesmo assim?`
      );
      
      if (!confirmar) {
        return;
      }
    }
    
    setRotasEscolhidas(novasRotasEscolhidas);
  };

  const removerRota = async (rotaId: number) => {
    const novasRotasEscolhidas = rotasEscolhidas.filter(r => r.id !== rotaId);
    setRotasEscolhidas(novasRotasEscolhidas);
    await verificarConflitosEscolas(novasRotasEscolhidas);
  };

  const confirmarSelecaoRotas = () => {
    setConfiguracao(prev => ({
      ...prev,
      rotasSelecionadas: rotasEscolhidas.map(r => r.id)
    }));
    setModalEscolherRotasAberto(false);
  };

  const imprimirRomaneio = () => {
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Gerar HTML para impressão com conversões de unidades
    const htmlContent = gerarHTMLImpressao();

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const gerarHTMLImpressao = () => {
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Romaneio de Entrega</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1976d2; text-align: center; }
          h2 { color: #666; text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #1976d2; color: white; font-weight: bold; }
          .text-right { text-align: right; }
          .conversion { font-size: 0.8em; color: #666; font-style: italic; }
          .rota-conversion { font-size: 0.75em; color: #666; font-style: italic; display: block; margin-top: 2px; }
          .footer { margin-top: 30px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <h1>Romaneio de Entrega</h1>
        <h2>Data: ${dataAtual}</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>`;

    // Adicionar colunas das rotas
    if (dadosRomaneio[0]?.rotasArray) {
      dadosRomaneio[0].rotasArray.forEach((rota: any) => {
        html += `<th class="text-right">${rota.rota_nome}</th>`;
      });
    }

    html += `
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>`;

    // Adicionar linhas dos produtos
    dadosRomaneio.forEach(produto => {
      const total = produto.rotasArray.reduce((sum: number, rota: any) => sum + rota.quantidade, 0);
      const config = configUnidades[produto.produto_nome] || { ativo: false, pacote: 1, caixa: 10, tipoCaixa: 'caixa' };

      html += `
            <tr>
              <td><strong>${produto.produto_nome}</strong></td>`;

      // Adicionar quantidades por rota com conversões
      produto.rotasArray.forEach((rota: any) => {
        if (rota.quantidade > 0) {
          let conteudo = '';

          // Se conversão está ativa, mostrar apenas a conversão
          if (config.ativo) {
            const kgPorCaixa = config.pacote * config.caixa; // kg por caixa
            const caixas = Math.floor(rota.quantidade / kgPorCaixa);
            const restoKg = rota.quantidade % kgPorCaixa;
            const pacotes = Math.floor(restoKg / config.pacote);
            const kgAvulso = restoKg % config.pacote;

            let conversaoRota = '';
            if (caixas > 0) conversaoRota += `${caixas}${config.tipoCaixa === 'fardo' ? 'fd' : 'cx'} `;
            if (pacotes > 0) conversaoRota += `${pacotes}pc `;
            if (kgAvulso > 0) conversaoRota += `${kgAvulso.toLocaleString('pt-BR')} ${produto.unidade}`;

            conteudo = conversaoRota.trim() || `${rota.quantidade.toLocaleString('pt-BR')} ${produto.unidade}`;
          } else {
            // Se conversão não está ativa, mostrar valor original com unidade
            conteudo = `${rota.quantidade.toLocaleString('pt-BR')} ${produto.unidade}`;
          }

          html += `
                <td class="text-right">
                  <strong>${conteudo}</strong>
                </td>`;
        } else {
          html += `<td class="text-right">-</td>`;
        }
      });

      // Calcular conversão total (só se estiver ativo)
      let totalConteudo = '';
      if (config.ativo) {
        const kgPorCaixa = config.pacote * config.caixa; // kg por caixa
        const caixasTotal = Math.floor(total / kgPorCaixa);
        const restoKgTotal = total % kgPorCaixa;
        const pacotesTotal = Math.floor(restoKgTotal / config.pacote);
        const kgAvulsoTotal = restoKgTotal % config.pacote;

        let conversaoTotal = '';
        if (caixasTotal > 0) conversaoTotal += `${caixasTotal}${config.tipoCaixa === 'fardo' ? 'fd' : 'cx'} `;
        if (pacotesTotal > 0) conversaoTotal += `${pacotesTotal}pc `;
        if (kgAvulsoTotal > 0) conversaoTotal += `${kgAvulsoTotal.toLocaleString('pt-BR')} ${produto.unidade}`;
        
        totalConteudo = conversaoTotal.trim() || `${total.toLocaleString('pt-BR')} ${produto.unidade}`;
      } else {
        totalConteudo = `${total.toLocaleString('pt-BR')} ${produto.unidade}`;
      }

      html += `
              <td class="text-right">
                <strong>${totalConteudo}</strong>
              </td>
            </tr>`;
    });

    html += `
          </tbody>
        </table>
        
        <div style="margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
          <h3>Legenda:</h3>
          <p><strong>cx</strong> = Caixa/Fardo | <strong>pc</strong> = Pacote | Valores avulsos mostram a unidade original (kg, g, etc.)</p>
        </div>
        
        <div class="footer">
          <p>Sistema de Gestão Escolar - NutriEscola</p>
        </div>
      </body>
      </html>`;

    return html;
  };

  const salvarConfiguracao = async () => {
    try {
      setSalvando(true);
      setError(null);

      // Se não há guia selecionada, salvar configuração "limpa" (desativa configuração)
      if (!configuracao.guiaId) {
        const resultado = await rotaService.salvarConfiguracao({
          guiaId: 0,
          rotasSelecionadas: [],
          itensSelecionados: [],
          ativa: false // Desativa a configuração
        });

        setSuccess('Configuração limpa salva com sucesso! O mobile não terá filtros ativos.');
        setTimeout(() => setSuccess(null), 5000);
        return;
      }

      if (configuracao.rotasSelecionadas.length === 0) {
        setError('Selecione pelo menos uma rota');
        return;
      }

      if (configuracao.itensSelecionados.length === 0) {
        setError('Selecione pelo menos um item');
        return;
      }

      // Salvar configuração ativa na API
      const resultado = await rotaService.salvarConfiguracao({
        guiaId: configuracao.guiaId,
        rotasSelecionadas: configuracao.rotasSelecionadas,
        itensSelecionados: configuracao.itensSelecionados,
        ativa: true
      });

      setSuccess(resultado.message || 'Configuração de entrega salva com sucesso! O mobile agora mostrará apenas os itens selecionados.');

      // Limpar mensagem de sucesso após 5 segundos
      setTimeout(() => setSuccess(null), 5000);

    } catch (err: any) {
      console.error('Erro ao salvar configuração:', err);
      setError(`Erro ao salvar configuração: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Configuração de Entrega
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Configure quais rotas e itens serão exibidos no aplicativo mobile
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={() => navigate('/visualizacao-entregas')}
              disabled={!configuracao.guiaId || configuracao.rotasSelecionadas.length === 0 || configuracao.itensSelecionados.length === 0}
            >
              Visualizar Entregas
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={carregarDados}
              disabled={salvando}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={salvarConfiguracao}
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </Box>
        </Box>

        {/* Alertas */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Seção 1 e 2: Guia e Rotas - Card Compacto */}
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Grid container spacing={3} alignItems="center">
                  {/* Guia de Demanda */}
                  <Grid item xs={12} md={5}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <GuiaIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          1. Guia de Demanda
                        </Typography>
                      </Box>
                      {configuracao.guiaId > 0 && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => setConfiguracao(prev => ({
                            ...prev,
                            guiaId: 0,
                            itensSelecionados: []
                          }))}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          Limpar
                        </Button>
                      )}
                    </Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>Selecionar Guia</InputLabel>
                      <Select
                        value={configuracao.guiaId || ''}
                        onChange={(e) => setConfiguracao(prev => ({
                          ...prev,
                          guiaId: Number(e.target.value) || 0,
                          itensSelecionados: [] // Reset itens quando muda guia
                        }))}
                        label="Selecionar Guia"
                      >
                        <MenuItem value="">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              Nenhuma guia selecionada
                            </Typography>
                          </Box>
                        </MenuItem>
                        {guias.map((guia) => (
                          <MenuItem key={guia.id} value={guia.id}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <GuiaIcon fontSize="small" />
                              {guia.mes}/{guia.ano}
                              {guia.observacao && ` - ${guia.observacao}`}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Separador Visual */}
                  <Grid item xs={12} md={1}>
                    <Box display="flex" justifyContent="center">
                      <Box sx={{ width: 2, height: 40, bgcolor: 'divider', borderRadius: 1 }} />
                    </Box>
                  </Grid>

                  {/* Rotas */}
                  <Grid item xs={12} md={6}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <RouteIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          2. Rotas ({configuracao.rotasSelecionadas.length})
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<RouteIcon />}
                        onClick={abrirModalEscolherRotas}
                      >
                        Escolher
                      </Button>
                    </Box>

                    {configuracao.rotasSelecionadas.length === 0 ? (
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        <Typography variant="body2">
                          Clique em "Escolher" para selecionar rotas
                        </Typography>
                      </Alert>
                    ) : (
                      <Box sx={{ maxHeight: 120, overflow: 'auto' }}>
                        <Grid container spacing={0.5}>
                          {rotas.filter(rota => configuracao.rotasSelecionadas.includes(rota.id)).map((rota) => (
                            <Grid item xs={12} key={rota.id}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  p: 1,
                                  bgcolor: 'success.50',
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: 'success.200'
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: rota.cor,
                                    flexShrink: 0
                                  }}
                                />
                                <Typography variant="body2" fontWeight="medium" sx={{ flex: 1 }}>
                                  {rota.nome}
                                </Typography>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <SchoolIcon fontSize="small" color="action" sx={{ fontSize: 14 }} />
                                  <Typography variant="caption">
                                    {rota.total_escolas || 0}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Seção 3: Itens */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <InventoryIcon color="primary" />
                    <Typography variant="h6">
                      3. Selecionar Itens
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button size="small" onClick={selecionarTodosItens} sx={{ mr: 1 }}>
                      Todos
                    </Button>
                    <Button size="small" onClick={deselecionarTodosItens} sx={{ mr: 1 }}>
                      Nenhum
                    </Button>
                    <Button size="small" onClick={expandirTodosProdutos} sx={{ mr: 1 }}>
                      Expandir
                    </Button>
                    <Button size="small" onClick={recolherTodosProdutos}>
                      Recolher
                    </Button>
                  </Box>
                </Box>

                {configuracao.guiaId === 0 ? (
                  <Alert severity="info">
                    Selecione uma guia de demanda para ver os itens disponíveis
                  </Alert>
                ) : (
                  <>
                    <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                      {itensAgrupados.map((grupo) => {
                        const todosItensSelecionados = grupo.itens.every(item => configuracao.itensSelecionados.includes(item.id));
                        const algunsItensSelecionados = grupo.itens.some(item => configuracao.itensSelecionados.includes(item.id));
                        const expandido = produtosExpandidos.has(grupo.produto);

                        return (
                          <Card
                            key={grupo.produto}
                            sx={{
                              mb: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paper'
                            }}
                          >
                            {/* Cabeçalho do Produto */}
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Checkbox
                                  checked={todosItensSelecionados}
                                  indeterminate={algunsItensSelecionados && !todosItensSelecionados}
                                  onChange={() => toggleProdutoCompleto(grupo.produto)}
                                />

                                <IconButton
                                  size="small"
                                  onClick={() => toggleProdutoExpansao(grupo.produto)}
                                  sx={{ p: 0.5 }}
                                >
                                  {expandido ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                                </IconButton>

                                <Box flex={1} onClick={() => toggleProdutoExpansao(grupo.produto)} sx={{ cursor: 'pointer' }}>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    {grupo.produto}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {(Number(grupo.quantidadeTotal) || 0).toLocaleString('pt-BR', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 3
                                    })} {grupo.unidade} • {grupo.totalItens} escolas
                                  </Typography>
                                </Box>

                                <Badge
                                  badgeContent={grupo.itensSelecionados}
                                  color="primary"
                                  max={999}
                                  sx={{ mr: 1 }}
                                >
                                  <Chip
                                    label={`${grupo.itensSelecionados}/${grupo.totalItens}`}
                                    size="small"
                                    color={todosItensSelecionados ? 'success' : algunsItensSelecionados ? 'warning' : 'default'}
                                    variant="outlined"
                                    sx={{
                                      bgcolor: (theme) => theme.palette.mode === 'dark'
                                        ? 'background.paper'
                                        : 'background.default'
                                    }}
                                  />
                                </Badge>
                              </Box>
                            </CardContent>

                            {/* Detalhes dos Itens (Colapsável) */}
                            <Collapse in={expandido}>
                              <Divider />
                              <Box sx={{
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
                              }}>
                                <TableContainer>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow sx={{
                                        bgcolor: (theme) => theme.palette.mode === 'dark'
                                          ? 'rgba(255, 255, 255, 0.05)'
                                          : 'rgba(0, 0, 0, 0.02)'
                                      }}>
                                        <TableCell padding="checkbox" sx={{ width: 48 }}></TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Escola</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Qtd</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Lote</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {grupo.itens.map((item) => (
                                        <TableRow
                                          key={item.id}
                                          hover
                                          sx={{
                                            '&:hover': {
                                              bgcolor: (theme) => theme.palette.mode === 'dark'
                                                ? 'rgba(255, 255, 255, 0.08)'
                                                : 'action.hover'
                                            }
                                          }}
                                        >
                                          <TableCell padding="checkbox">
                                            <Checkbox
                                              size="small"
                                              checked={configuracao.itensSelecionados.includes(item.id)}
                                              onChange={() => toggleItem(item.id)}
                                            />
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2">
                                              {item.escola_nome}
                                            </Typography>
                                          </TableCell>
                                          <TableCell align="right">
                                            <Typography variant="body2" fontWeight="medium">
                                              {(Number(item.quantidade) || 0).toLocaleString('pt-BR', {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 3
                                              })}
                                            </Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Chip
                                              label={item.lote || 'S/L'}
                                              size="small"
                                              variant="outlined"
                                              sx={{
                                                fontSize: '0.7rem',
                                                height: 20,
                                                bgcolor: (theme) => theme.palette.mode === 'dark'
                                                  ? 'background.paper'
                                                  : 'background.default'
                                              }}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Box>
                            </Collapse>
                          </Card>
                        );
                      })}
                    </Box>

                    <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="primary">
                        {(() => {
                          // Contar apenas itens selecionados que existem na lista atual
                          const idsValidos = itensGuia.map(item => item.id);
                          const itensSelecionadosValidos = configuracao.itensSelecionados.filter(id => idsValidos.includes(id));
                          return `${itensSelecionadosValidos.length} de ${itensGuia.length} itens selecionados`;
                        })()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {itensAgrupados.length} produtos • {produtosExpandidos.size} expandidos
                      </Typography>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Resumo */}
        {(configuracao.guiaId > 0 || configuracao.rotasSelecionadas.length > 0 || configuracao.itensSelecionados.length > 0) && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Resumo da Configuração
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  onClick={gerarRomaneio}
                  disabled={configuracao.rotasSelecionadas.length === 0 || configuracao.itensSelecionados.length === 0}
                >
                  Exibir Romaneio
                </Button>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <GuiaIcon fontSize="small" color="primary" />
                    <Typography variant="body2">
                      <strong>Guia:</strong> {guias.find(g => g.id === configuracao.guiaId)?.mes}/{guias.find(g => g.id === configuracao.guiaId)?.ano || 'Não selecionada'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <RouteIcon fontSize="small" color="primary" />
                    <Typography variant="body2">
                      <strong>Rotas:</strong> {configuracao.rotasSelecionadas.length} selecionadas
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <InventoryIcon fontSize="small" color="primary" />
                    <Typography variant="body2">
                      <strong>Itens:</strong> {configuracao.itensSelecionados.length} selecionados
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Modal de Visualização por Escola */}
        <Dialog
          open={modalVisualizacaoAberto}
          onClose={() => setModalVisualizacaoAberto(false)}
          maxWidth="lg"
          fullWidth
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant="h6">
                Visualização por Escola
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dados filtrados conforme configuração atual
              </Typography>
            </Box>
            <IconButton onClick={() => setModalVisualizacaoAberto(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ p: 2, maxHeight: '70vh', overflow: 'auto' }}>
            {dadosEscolas.length === 0 ? (
              <Alert severity="info">
                Nenhuma escola encontrada com os filtros aplicados
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {dadosEscolas.map((escola) => (
                  <Grid item xs={12} md={6} key={escola.escola_id}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <SchoolIcon color="primary" />
                          <Box flex={1}>
                            <Typography variant="h6" fontWeight="bold">
                              {escola.escola_nome}
                            </Typography>
                            {escola.escola_endereco && (
                              <Typography variant="body2" color="text.secondary">
                                📍 {escola.escola_endereco}
                              </Typography>
                            )}
                            {escola.rota_id && (
                              <Typography variant="caption" color="text.secondary">
                                🚚 Rota: {rotas.find(r => r.id === escola.rota_id)?.nome || `ID ${escola.rota_id}`}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        <Box display="flex" gap={1} mb={2}>
                          <Chip
                            label={`${escola.total_itens} itens`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            label={`${escola.produtos_unicos} produtos`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" gutterBottom>
                          Itens para Entrega:
                        </Typography>

                        <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Produto</TableCell>
                                <TableCell align="right">Qtd</TableCell>
                                <TableCell>Lote</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {escola.itens.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight="medium">
                                      {item.produto_nome}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {(Number(item.quantidade) || 0).toFixed(3)} {item.unidade}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={item.lote || 'S/L'}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {dadosEscolas.length} escola(s) • {dadosEscolas.reduce((sum, e) => sum + e.total_itens, 0)} itens totais
            </Typography>
          </Box>
        </Dialog>

        {/* Modal de Escolher Rotas */}
        <Dialog
          open={modalEscolherRotasAberto}
          onClose={() => setModalEscolherRotasAberto(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Escolher Rotas</Typography>
              <IconButton onClick={() => setModalEscolherRotasAberto(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Grid container spacing={3}>
              {/* Rotas Disponíveis */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Rotas Disponíveis
                </Typography>
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {rotasDisponiveis.filter(rota => !rotasEscolhidas.find(r => r.id === rota.id)).map((rota) => (
                    <Card key={rota.id} sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              backgroundColor: rota.cor
                            }}
                          />
                          <Box flex={1}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {rota.nome}
                            </Typography>
                            {rota.descricao && (
                              <Typography variant="caption" color="text.secondary">
                                {rota.descricao}
                              </Typography>
                            )}
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5} mr={1}>
                            <SchoolIcon fontSize="small" color="action" />
                            <Typography variant="caption">
                              {rota.total_escolas || 0}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => adicionarRota(rota)}
                          >
                            Adicionar
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Grid>

              {/* Rotas Escolhidas */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Rotas Escolhidas ({rotasEscolhidas.length})
                </Typography>
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {rotasEscolhidas.length === 0 ? (
                    <Alert severity="info">
                      Nenhuma rota selecionada
                    </Alert>
                  ) : (
                    rotasEscolhidas.map((rota) => (
                      <Card 
                        key={rota.id} 
                        sx={{ 
                          mb: 1,
                          bgcolor: conflitosEscolas[rota.id] && conflitosEscolas[rota.id].length > 0 ? 'warning.50' : 'success.50',
                          border: conflitosEscolas[rota.id] && conflitosEscolas[rota.id].length > 0 ? '1px solid' : 'none',
                          borderColor: 'warning.main'
                        }}
                      >
                        <CardContent sx={{ py: 2 }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: rota.cor
                              }}
                            />
                            <Box flex={1}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {rota.nome}
                              </Typography>
                              {rota.descricao && (
                                <Typography variant="caption" color="text.secondary">
                                  {rota.descricao}
                                </Typography>
                              )}
                              {conflitosEscolas[rota.id] && conflitosEscolas[rota.id].length > 0 && (
                                <Typography variant="caption" color="warning.main" display="block">
                                  ⚠️ Conflito com outras rotas
                                </Typography>
                              )}
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5} mr={1}>
                              <SchoolIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {rota.total_escolas || 0}
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => removerRota(rota.id)}
                            >
                              Remover
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Box>
              </Grid>
            </Grid>

            {/* Aviso sobre conflitos */}
            {Object.keys(conflitosEscolas).length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Atenção: Conflitos de Escolas Detectados
                </Typography>
                <Typography variant="body2">
                  Algumas rotas selecionadas possuem escolas em comum. Isso pode causar problemas na entrega.
                  Verifique se isso é intencional antes de confirmar.
                </Typography>
              </Alert>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setModalEscolherRotasAberto(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={confirmarSelecaoRotas}
              disabled={rotasEscolhidas.length === 0}
            >
              Confirmar Seleção ({rotasEscolhidas.length} rotas)
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Romaneio */}
        <Dialog
          open={modalRomaneioAberto}
          onClose={() => setModalRomaneioAberto(false)}
          maxWidth="xl"
          fullWidth
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant="h6">
                Romaneio de Entrega
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quantidades por produto e rota
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ConfigIcon />}
                onClick={abrirConfigUnidades}
              >
                Configurar Unidades
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<PrintIcon />}
                onClick={imprimirRomaneio}
              >
                Imprimir
              </Button>
              <IconButton onClick={() => setModalRomaneioAberto(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ p: 3 }}>
            {dadosRomaneio.length === 0 ? (
              <Alert severity="info">
                Nenhum item selecionado para gerar romaneio
              </Alert>
            ) : (
              <TableContainer 
                component={Paper} 
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(224, 224, 224, 0.8)'
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ 
                      bgcolor: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                      '& .MuiTableCell-root': {
                        borderBottom: 'none'
                      }
                    }}>
                      <TableCell sx={{
                        color: '#ffffff !important',
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        bgcolor: 'rgba(25, 118, 210, 0.95) !important',
                        borderRight: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>
                        Item
                      </TableCell>

                      {dadosRomaneio[0]?.rotasArray.map((rota: any) => (
                        <TableCell
                          key={rota.rota_id}
                          align="center"
                          sx={{
                            color: '#ffffff !important',
                            fontWeight: 'bold',
                            bgcolor: 'rgba(25, 118, 210, 0.9) !important',
                            minWidth: 120,
                            fontSize: '0.9rem',
                            borderRight: '1px solid rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          {rota.rota_nome}
                        </TableCell>
                      ))}
                      <TableCell
                        align="center"
                        sx={{
                          color: '#ffffff !important',
                          fontWeight: 'bold',
                          bgcolor: 'rgba(21, 101, 192, 1) !important',
                          fontSize: '0.95rem',
                          borderLeft: '2px solid rgba(255, 255, 255, 0.3)'
                        }}
                      >
                        Total
                      </TableCell>

                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dadosRomaneio.map((produto, index) => {
                      const total = produto.rotasArray.reduce((sum: number, rota: any) => sum + rota.quantidade, 0);
                      const config = configUnidades[produto.produto_nome] || { ativo: false, pacote: 1, caixa: 10, tipoCaixa: 'caixa' };
                      
                      // Calcular conversão para visualização
                      let conversaoVisual = 'N/A';
                      if (config.ativo) {
                        const kgPorCaixa = config.pacote * config.caixa;
                        const caixasTotal = Math.floor(total / kgPorCaixa);
                        const restoKgTotal = total % kgPorCaixa;
                        const pacotesTotal = Math.floor(restoKgTotal / config.pacote);
                        const kgAvulsoTotal = restoKgTotal % config.pacote;

                        let conv = '';
                        if (caixasTotal > 0) conv += `${caixasTotal}${config.tipoCaixa === 'fardo' ? 'fd' : 'cx'} `;
                        if (pacotesTotal > 0) conv += `${pacotesTotal}pc `;
                        if (kgAvulsoTotal > 0) conv += `${kgAvulsoTotal.toLocaleString('pt-BR')} ${produto.unidade}`;
                        
                        conversaoVisual = conv.trim() || 'N/A';
                      }
                      
                      return (
                        <TableRow 
                          key={index} 
                          sx={{
                            '&:nth-of-type(odd)': {
                              bgcolor: 'rgba(0, 0, 0, 0.02)'
                            },
                            '&:hover': {
                              bgcolor: 'rgba(25, 118, 210, 0.04) !important'
                            }
                          }}
                        >
                          <TableCell sx={{
                            fontWeight: 'bold',
                            borderRight: '1px solid rgba(224, 224, 224, 1)',
                            bgcolor: 'rgba(25, 118, 210, 0.02)'
                          }}>
                            <Box>
                              <Typography variant="body2" component="div" fontWeight="bold" color="primary.main">
                                {produto.produto_nome}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" component="div">
                                {produto.unidade}
                              </Typography>
                            </Box>
                          </TableCell>
                          {produto.rotasArray.map((rota: any) => (
                            <TableCell
                              key={rota.rota_id}
                              align="right"
                              sx={{
                                bgcolor: rota.quantidade > 0 ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
                                borderRight: '1px solid rgba(224, 224, 224, 0.5)'
                              }}
                            >
                              {rota.quantidade > 0 ? (() => {
                                if (config.ativo) {
                                  const kgPorCaixa = config.pacote * config.caixa;
                                  const caixas = Math.floor(rota.quantidade / kgPorCaixa);
                                  const restoKg = rota.quantidade % kgPorCaixa;
                                  const pacotes = Math.floor(restoKg / config.pacote);
                                  const kgAvulso = restoKg % config.pacote;

                                  let conversaoRota = '';
                                  if (caixas > 0) conversaoRota += `${caixas}${config.tipoCaixa === 'fardo' ? 'fd' : 'cx'} `;
                                  if (pacotes > 0) conversaoRota += `${pacotes}pc `;
                                  if (kgAvulso > 0) conversaoRota += `${kgAvulso.toLocaleString('pt-BR')}${produto.unidade}`;

                                  const conversaoLimpa = conversaoRota.trim();
                                  const quantidadeOriginal = `${rota.quantidade.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 3
                                  })} ${produto.unidade}`;

                                  return (
                                    <Box sx={{ textAlign: 'right' }}>
                                      <Typography variant="body2" component="div" fontWeight="bold">
                                        {conversaoLimpa || quantidadeOriginal}
                                      </Typography>
                                      {conversaoLimpa && (
                                        <Typography variant="caption" color="text.secondary" component="div" sx={{ fontSize: '0.7rem' }}>
                                          ({quantidadeOriginal})
                                        </Typography>
                                      )}
                                    </Box>
                                  );
                                } else {
                                  return (
                                    <Typography variant="body2" component="div" fontWeight="bold">
                                      {rota.quantidade.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3
                                      })} {produto.unidade}
                                    </Typography>
                                  );
                                }
                              })() : '-'}
                            </TableCell>
                          ))}
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 'bold',
                              bgcolor: 'rgba(25, 118, 210, 0.1)',
                              borderLeft: '2px solid rgba(25, 118, 210, 0.3)'
                            }}
                          >
                            <Box sx={{ textAlign: 'right' }}>
                              {config.ativo && conversaoVisual !== 'N/A' ? (
                                <>
                                  <Typography variant="body2" component="div" fontWeight="bold">
                                    {conversaoVisual}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" component="div" sx={{ fontSize: '0.7rem' }}>
                                    ({total.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 3
                                    })} {produto.unidade})
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="body2" component="div" fontWeight="bold">
                                  {total.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 3
                                  })} {produto.unidade}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Dialog>

        {/* Modal de Configuração de Unidades */}
        <Dialog
          open={modalConfigUnidadesAberto}
          onClose={() => setModalConfigUnidadesAberto(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Configurar Unidades de Transporte
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure quantas unidades originais equivalem a cada unidade de transporte para facilitar o carregamento.
            </Typography>

            {dadosRomaneio.map((produto, index) => (
              <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    {produto.produto_nome} ({produto.unidade})
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={configUnidades[produto.produto_nome]?.ativo || false}
                        onChange={(e) => {
                          const novaConfig = { ...configUnidades };
                          if (!novaConfig[produto.produto_nome]) {
                            novaConfig[produto.produto_nome] = { ativo: false, pacote: 5, caixa: 20, tipoCaixa: 'caixa' };
                          }
                          novaConfig[produto.produto_nome].ativo = e.target.checked;
                          setConfigUnidades(novaConfig);
                        }}
                      />
                    }
                    label="Ativar conversão"
                  />
                </Box>

                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={3}>
                    <TextField
                      label={`${produto.unidade}/pacote`}
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ step: "0.1", min: "0.1" }}
                      disabled={!configUnidades[produto.produto_nome]?.ativo}
                      value={inputValues[produto.produto_nome]?.pacote || '1'}
                      onChange={(e) => {
                        const novosInputs = { ...inputValues };
                        if (!novosInputs[produto.produto_nome]) {
                          novosInputs[produto.produto_nome] = { pacote: '1', caixa: '10', tipoCaixa: 'caixa' };
                        }
                        novosInputs[produto.produto_nome].pacote = e.target.value;
                        setInputValues(novosInputs);
                      }}
                      onBlur={(e) => {
                        const novaConfig = { ...configUnidades };
                        const novosInputs = { ...inputValues };
                        
                        if (!novaConfig[produto.produto_nome]) {
                          novaConfig[produto.produto_nome] = { ativo: false, pacote: 1, caixa: 10, tipoCaixa: 'caixa' };
                        }
                        
                        const valor = parseFloat(e.target.value.replace(',', '.'));
                        if (isNaN(valor) || valor <= 0) {
                          novaConfig[produto.produto_nome].pacote = 1;
                          novosInputs[produto.produto_nome].pacote = '1';
                        } else {
                          novaConfig[produto.produto_nome].pacote = valor;
                          novosInputs[produto.produto_nome].pacote = valor.toString();
                        }
                        
                        setConfigUnidades(novaConfig);
                        setInputValues(novosInputs);
                      }}
                    />
                  </Grid>

                  <Grid item xs={2}>
                    <FormControl size="small" fullWidth disabled={!configUnidades[produto.produto_nome]?.ativo}>
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        value={inputValues[produto.produto_nome]?.tipoCaixa || 'caixa'}
                        onChange={(e) => {
                          const novosInputs = { ...inputValues };
                          const novaConfig = { ...configUnidades };
                          
                          if (!novosInputs[produto.produto_nome]) {
                            novosInputs[produto.produto_nome] = { pacote: '1', caixa: '10', tipoCaixa: 'caixa' };
                          }
                          if (!novaConfig[produto.produto_nome]) {
                            novaConfig[produto.produto_nome] = { ativo: false, pacote: 1, caixa: 10, tipoCaixa: 'caixa' };
                          }
                          
                          novosInputs[produto.produto_nome].tipoCaixa = e.target.value as 'caixa' | 'fardo';
                          novaConfig[produto.produto_nome].tipoCaixa = e.target.value as 'caixa' | 'fardo';
                          
                          setInputValues(novosInputs);
                          setConfigUnidades(novaConfig);
                        }}
                        label="Tipo"
                      >
                        <MenuItem value="caixa">Caixa</MenuItem>
                        <MenuItem value="fardo">Fardo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={3}>
                    <TextField
                      label={`Pacotes/${inputValues[produto.produto_nome]?.tipoCaixa || 'caixa'}`}
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ step: "1", min: "1" }}
                      disabled={!configUnidades[produto.produto_nome]?.ativo}
                      value={inputValues[produto.produto_nome]?.caixa || '10'}
                      onChange={(e) => {
                        const novosInputs = { ...inputValues };
                        if (!novosInputs[produto.produto_nome]) {
                          novosInputs[produto.produto_nome] = { pacote: '1', caixa: '10', tipoCaixa: 'caixa' };
                        }
                        novosInputs[produto.produto_nome].caixa = e.target.value;
                        setInputValues(novosInputs);
                      }}
                      onBlur={(e) => {
                        const novaConfig = { ...configUnidades };
                        const novosInputs = { ...inputValues };
                        
                        if (!novaConfig[produto.produto_nome]) {
                          novaConfig[produto.produto_nome] = { ativo: false, pacote: 1, caixa: 10, tipoCaixa: 'caixa' };
                        }
                        
                        const valor = parseFloat(e.target.value.replace(',', '.'));
                        if (isNaN(valor) || valor <= 0) {
                          novaConfig[produto.produto_nome].caixa = 10;
                          novosInputs[produto.produto_nome].caixa = '10';
                        } else {
                          novaConfig[produto.produto_nome].caixa = valor;
                          novosInputs[produto.produto_nome].caixa = valor.toString();
                        }
                        
                        setConfigUnidades(novaConfig);
                        setInputValues(novosInputs);
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      1 {configUnidades[produto.produto_nome]?.tipoCaixa || 'caixa'} = {((configUnidades[produto.produto_nome]?.caixa || 10) * (configUnidades[produto.produto_nome]?.pacote || 1))} {produto.unidade}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalConfigUnidadesAberto(false)}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={salvarConfigUnidades}>
              Salvar Configuração
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ConfiguracaoEntrega;