import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  AutoFixHigh as AutoFixHighIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  TableChart as ExcelIcon,
  Assessment as AssessmentIcon
} from "@mui/icons-material";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import pedidosService from "../../../services/pedidos";
import { modalidadeService } from "../../../services/modalidades";
import { criarFaturamento, atualizarFaturamento, ItemFaturamento as ItemFaturamentoAPI, listarFaturamentosPedido } from "../../../services/faturamentos";
import { PedidoDetalhado } from "../../../types/pedido";
import { formatarMoeda } from "../../../utils/dateUtils";

interface Modalidade {
  id: number;
  nome: string;
  descricao?: string;
  valor_repasse: number;
}

interface ItemFaturamento {
  pedido_item_ids: number[]; // Array de IDs dos pedido_itens agrupados
  contrato_produto_id: number; // Chave de agrupamento
  produto_nome: string;
  unidade: string;
  quantidade_pedido: number; // Soma de todas as quantidades dos itens agrupados
  quantidade_alocada: number;
  preco_unitario: number;
}

interface ModalidadeFaturamento {
  modalidade_id: number;
  modalidade_nome: string;
  modalidade_valor_repasse: number;
  itens: ItemFaturamento[];
}

export default function FaturamentoModalidades() {
  const { id, faturamentoId } = useParams<{ id: string; faturamentoId: string }>();
  const navigate = useNavigate();
  
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [faturamentos, setFaturamentos] = useState<ModalidadeFaturamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [itemEditando, setItemEditando] = useState<{modalidadeId: number, itemId: number} | null>(null);
  
  // Dialog para adicionar itens
  const [dialogAberto, setDialogAberto] = useState(false);
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState<number | null>(null);
  const [itensSelecionados, setItensSelecionados] = useState<{[key: number]: number}>({});

  // Dialog para alocamento automático
  const [dialogAutomaticoAberto, setDialogAutomaticoAberto] = useState(false);
  const [etapaAutomatico, setEtapaAutomatico] = useState<1 | 2>(1);
  const [itensAutomaticoSelecionados, setItensAutomaticoSelecionados] = useState<number[]>([]);
  const [modalidadesAutomaticoSelecionadas, setModalidadesAutomaticoSelecionadas] = useState<number[]>([]);

  useEffect(() => {
    carregarDados();
  }, [id, faturamentoId]);

  useEffect(() => {
    if (pedido && faturamentoId) {
      carregarFaturamentosExistentes();
    }
  }, [pedido, faturamentoId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [pedidoData, modalidadesData] = await Promise.all([
        pedidosService.buscarPorId(Number(id)),
        modalidadeService.listar()
      ]);
      
      setPedido(pedidoData);
      setModalidades(modalidadesData);
      
      // Inicializar faturamentos vazios para cada modalidade
      setFaturamentos(modalidadesData.map(mod => ({
        modalidade_id: mod.id,
        modalidade_nome: mod.nome,
        modalidade_valor_repasse: mod.valor_repasse,
        itens: []
      })));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setErro('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const carregarFaturamentosExistentes = async () => {
    if (!faturamentoId) return;
    
    try {
      const faturamentosExistentes = await listarFaturamentosPedido(Number(id));
      
      // Filtrar apenas o faturamento específico
      const faturamentosDoId = faturamentosExistentes.filter(
        fat => fat.faturamento_id === Number(faturamentoId)
      );
      
      if (faturamentosDoId.length > 0) {
        
        // Agrupar por modalidade e depois por contrato_produto_id
        const faturamentosPorModalidade = new Map<number, ItemFaturamento[]>();
        
        faturamentosDoId.forEach(fat => {
          if (!faturamentosPorModalidade.has(fat.modalidade_id)) {
            faturamentosPorModalidade.set(fat.modalidade_id, []);
          }
          
          const itens = faturamentosPorModalidade.get(fat.modalidade_id)!;
          
          // Buscar o contrato_produto_id do pedido_item
          const pedidoItem = pedido?.itens.find(i => i.id === fat.pedido_item_id);
          const contratoId = pedidoItem?.contrato_produto_id;
          
          if (!contratoId) {
            return;
          }
          
          // Verificar se já existe um item agrupado para este contrato_produto_id
          const itemExistente = itens.find(i => i.contrato_produto_id === contratoId);
          
          // Garantir que todos os valores sejam números válidos
          const quantidadeAlocada = Number(fat.quantidade_alocada) || 0;
          const quantidadePedido = Number(fat.quantidade_pedido) || 0;
          const precoUnitario = Number(fat.preco_unitario) || 0;
          
          if (itemExistente) {
            // Somar quantidades e adicionar o pedido_item_id ao array
            itemExistente.quantidade_alocada = Number(itemExistente.quantidade_alocada) + quantidadeAlocada;
            itemExistente.quantidade_pedido = Number(itemExistente.quantidade_pedido) + quantidadePedido;
            if (!itemExistente.pedido_item_ids.includes(fat.pedido_item_id)) {
              itemExistente.pedido_item_ids.push(fat.pedido_item_id);
            }
          } else {
            // Criar novo item agrupado
            itens.push({
              pedido_item_ids: [fat.pedido_item_id],
              contrato_produto_id: contratoId,
              produto_nome: fat.produto_nome,
              unidade: fat.unidade || 'UN',
              quantidade_pedido: quantidadePedido,
              quantidade_alocada: quantidadeAlocada,
              preco_unitario: precoUnitario
            });
          }
        });
        
        // Atualizar faturamentos com dados existentes
        setFaturamentos(prev => prev.map(fat => {
          const itensExistentes = faturamentosPorModalidade.get(fat.modalidade_id);
          if (itensExistentes) {
            return {
              ...fat,
              itens: itensExistentes
            };
          }
          return fat;
        }));
        
        setSucesso('Faturamento carregado! Você pode editar e salvar as alterações.');
        setTimeout(() => setSucesso(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao carregar faturamento:', error);
      // Não mostrar erro se não houver faturamentos (é esperado para novos)
    }
  };

  const abrirDialogAdicionar = (modalidadeId: number) => {
    setModalidadeSelecionada(modalidadeId);
    setItensSelecionados({});
    setDialogAberto(true);
  };

  const adicionarItens = () => {
    if (!modalidadeSelecionada || !pedido) return;


    const novosFaturamentos = faturamentos.map(fat => {
      if (fat.modalidade_id === modalidadeSelecionada) {
        const novosItens = [...fat.itens];
        
        // Adicionar itens selecionados, agrupando por contrato_produto_id
        Object.entries(itensSelecionados).forEach(([itemId, quantidade]) => {
          if (quantidade > 0) {
            const pedidoItem = pedido.itens.find(i => i.id === Number(itemId));
            if (pedidoItem) {
              // Verificar se já existe um item agrupado para este contrato_produto_id
              const itemExistenteIndex = novosItens.findIndex(
                i => i.contrato_produto_id === pedidoItem.contrato_produto_id
              );

              if (itemExistenteIndex !== -1) {
                // Atualizar item existente (somar quantidades e adicionar pedido_item_id)
                const itemExistente = novosItens[itemExistenteIndex];
                novosItens[itemExistenteIndex] = {
                  ...itemExistente,
                  quantidade_alocada: Number(itemExistente.quantidade_alocada) + Number(quantidade),
                  quantidade_pedido: Number(itemExistente.quantidade_pedido) + Number(pedidoItem.quantidade),
                  pedido_item_ids: [...itemExistente.pedido_item_ids, Number(itemId)]
                };
              } else {
                // Adicionar novo item agrupado
                const novoItem = {
                  pedido_item_ids: [Number(itemId)],
                  contrato_produto_id: pedidoItem.contrato_produto_id,
                  produto_nome: pedidoItem.produto_nome,
                  unidade: pedidoItem.unidade || 'UN',
                  quantidade_pedido: Number(pedidoItem.quantidade),
                  quantidade_alocada: Number(quantidade),
                  preco_unitario: Number(pedidoItem.preco_unitario)
                };
                novosItens.push(novoItem);
              }
            }
          }
        });

        return {
          ...fat,
          itens: novosItens
        };
      }
      return fat;
    });

    setFaturamentos(novosFaturamentos);
    setDialogAberto(false);
    setModalidadeSelecionada(null);
    setItensSelecionados({});
  };

  const removerItem = (modalidadeId: number, contratoProdutoId: number) => {
    const novosFaturamentos = faturamentos.map(fat => {
      if (fat.modalidade_id === modalidadeId) {
        return {
          ...fat,
          itens: fat.itens.filter(item => item.contrato_produto_id !== contratoProdutoId)
        };
      }
      return fat;
    });
    setFaturamentos(novosFaturamentos);
  };

  const atualizarQuantidade = (modalidadeId: number, contratoProdutoId: number, valor: string) => {
    // Permitir campo vazio temporariamente durante digitação
    const novaQuantidade = valor === '' ? 0 : Number(valor);
    
    // Validar se é um número válido
    if (isNaN(novaQuantidade) || novaQuantidade < 0) {
      return;
    }
    
      modalidadeId,
      contratoProdutoId,
      valor,
      novaQuantidade
    });
    
    const novosFaturamentos = faturamentos.map(fat => {
      if (fat.modalidade_id === modalidadeId) {
        return {
          ...fat,
          itens: fat.itens.map(item => {
            if (item.contrato_produto_id === contratoProdutoId) {
                antes: item.quantidade_alocada,
                depois: novaQuantidade
              });
              return { ...item, quantidade_alocada: novaQuantidade };
            }
            return item;
          })
        };
      }
      return fat;
    });
    
    setFaturamentos(novosFaturamentos);
  };

  const calcularTotalAlocado = (contratoProdutoId: number): number => {
    return faturamentos.reduce((total, fat) => {
      const item = fat.itens.find(i => i.contrato_produto_id === contratoProdutoId);
      return total + (item?.quantidade_alocada || 0);
    }, 0);
  };

  // Calcular total alocado para todos os itens do pedido que têm o mesmo contrato_produto_id
  const calcularTotalAlocadoPorPedidoItem = (pedidoItemId: number): number => {
    if (!pedido) return 0;
    
    // Encontrar o contrato_produto_id deste pedido_item
    const pedidoItem = pedido.itens.find(i => i.id === pedidoItemId);
    if (!pedidoItem) return 0;
    
    // Calcular total alocado para este contrato_produto_id
    return calcularTotalAlocado(pedidoItem.contrato_produto_id);
  };

  // Calcular quantidade total do pedido para um contrato_produto_id (soma de todos os itens)
  const calcularQuantidadeTotalPedido = (contratoProdutoId: number): number => {
    if (!pedido) return 0;
    
    return pedido.itens
      .filter(i => i.contrato_produto_id === contratoProdutoId)
      .reduce((total, item) => total + Number(item.quantidade), 0);
  };

  const calcularValorTotalModalidade = (modalidadeId: number): number => {
    const faturamento = faturamentos.find(f => f.modalidade_id === modalidadeId);
    if (!faturamento) return 0;
    
    return faturamento.itens.reduce((total, item) => {
      return total + (Number(item.quantidade_alocada) * Number(item.preco_unitario));
    }, 0);
  };

  const abrirDialogAutomatico = () => {
    setItensAutomaticoSelecionados([]);
    setModalidadesAutomaticoSelecionadas([]);
    setEtapaAutomatico(1);
    setDialogAutomaticoAberto(true);
  };

  const avancarParaEtapa2 = () => {
    
    if (itensAutomaticoSelecionados.length === 0) {
      setErro('Selecione pelo menos um item');
      return;
    }
    setEtapaAutomatico(2);
  };

  const voltarParaEtapa1 = () => {
    setEtapaAutomatico(1);
  };

  const confirmarAlocamentoAutomatico = () => {
    if (modalidadesAutomaticoSelecionadas.length === 0) {
      setErro('Selecione pelo menos uma modalidade');
      return;
    }

    if (!pedido) return;


    // Calcular soma total dos repasses das modalidades selecionadas
    const modalidadesSelecionadasData = modalidades.filter(m => 
      modalidadesAutomaticoSelecionadas.includes(m.id)
    );
    
    
    const somaRepasses = modalidadesSelecionadasData.reduce((sum, m) => sum + Number(m.valor_repasse), 0);

    if (somaRepasses === 0) {
      setErro('A soma dos repasses não pode ser zero');
      return;
    }

    const novosFaturamentos = [...faturamentos];

    // Agrupar itens selecionados por contrato_produto_id
    const itensAgrupados = new Map<number, {
      contrato_produto_id: number;
      produto_nome: string;
      unidade: string;
      preco_unitario: number;
      pedido_item_ids: number[];
      quantidade_total: number;
      quantidade_disponivel: number;
    }>();

    itensAutomaticoSelecionados.forEach(itemId => {
      const pedidoItem = pedido.itens.find(i => i.id === itemId);
      if (!pedidoItem) return;

      const contratoId = pedidoItem.contrato_produto_id;
      
      if (!itensAgrupados.has(contratoId)) {
        itensAgrupados.set(contratoId, {
          contrato_produto_id: contratoId,
          produto_nome: pedidoItem.produto_nome,
          unidade: pedidoItem.unidade || 'UN',
          preco_unitario: Number(pedidoItem.preco_unitario),
          pedido_item_ids: [],
          quantidade_total: 0,
          quantidade_disponivel: 0
        });
      }

      const grupo = itensAgrupados.get(contratoId)!;
      grupo.pedido_item_ids.push(itemId);
      grupo.quantidade_total += Number(pedidoItem.quantidade);
      
      const quantidadeDisponivel = Number(pedidoItem.quantidade) - calcularTotalAlocadoPorPedidoItem(itemId);
      grupo.quantidade_disponivel += quantidadeDisponivel;
    });

    // Para cada grupo de itens (por contrato_produto_id)
    itensAgrupados.forEach((grupo) => {
      
      if (grupo.quantidade_disponivel <= 0) {
        return;
      }

      // Distribuir proporcionalmente entre as modalidades
      let quantidadeRestante = grupo.quantidade_disponivel;
      
      modalidadesSelecionadasData.forEach((modalidade, index) => {
        const faturamentoIndex = novosFaturamentos.findIndex(f => f.modalidade_id === modalidade.id);
        if (faturamentoIndex === -1) {
          return;
        }

        let quantidadeModalidade;
        
        // Para a última modalidade, alocar todo o restante
        if (index === modalidadesSelecionadasData.length - 1) {
          quantidadeModalidade = quantidadeRestante;
        } else {
          // Para as outras, calcular proporção e arredondar para baixo
          const proporcao = Number(modalidade.valor_repasse) / somaRepasses;
          quantidadeModalidade = Math.floor(grupo.quantidade_disponivel * proporcao);
          quantidadeRestante -= quantidadeModalidade;
        }


        if (quantidadeModalidade > 0) {
          // Verificar se o item já existe (agrupar por contrato_produto_id)
          const itemExistenteIndex = novosFaturamentos[faturamentoIndex].itens.findIndex(
            i => i.contrato_produto_id === grupo.contrato_produto_id
          );

          if (itemExistenteIndex !== -1) {
            const itemExistente = novosFaturamentos[faturamentoIndex].itens[itemExistenteIndex];
            novosFaturamentos[faturamentoIndex].itens[itemExistenteIndex] = {
              ...itemExistente,
              quantidade_alocada: Number(itemExistente.quantidade_alocada) + Number(quantidadeModalidade),
              quantidade_pedido: Number(itemExistente.quantidade_pedido) + grupo.quantidade_total,
              pedido_item_ids: [...new Set([...itemExistente.pedido_item_ids, ...grupo.pedido_item_ids])]
            };
          } else {
            novosFaturamentos[faturamentoIndex].itens.push({
              pedido_item_ids: grupo.pedido_item_ids,
              contrato_produto_id: grupo.contrato_produto_id,
              produto_nome: grupo.produto_nome,
              unidade: grupo.unidade,
              quantidade_pedido: grupo.quantidade_total,
              quantidade_alocada: Number(quantidadeModalidade),
              preco_unitario: grupo.preco_unitario
            });
          }
        }
      });
    });

    setFaturamentos(novosFaturamentos);
    setDialogAutomaticoAberto(false);
    setSucesso('Itens alocados automaticamente com sucesso!');
    setTimeout(() => setSucesso(''), 3000);
  };

  const toggleItemAutomatico = (itemId: number) => {
    if (itensAutomaticoSelecionados.includes(itemId)) {
      setItensAutomaticoSelecionados(itensAutomaticoSelecionados.filter(id => id !== itemId));
    } else {
      setItensAutomaticoSelecionados([...itensAutomaticoSelecionados, itemId]);
    }
  };

  const toggleModalidadeAutomatico = (modalidadeId: number) => {
    if (modalidadesAutomaticoSelecionadas.includes(modalidadeId)) {
      setModalidadesAutomaticoSelecionadas(modalidadesAutomaticoSelecionadas.filter(id => id !== modalidadeId));
    } else {
      setModalidadesAutomaticoSelecionadas([...modalidadesAutomaticoSelecionadas, modalidadeId]);
    }
  };

  const validarQuantidades = (): boolean => {
    if (!pedido) return false;

    // Agrupar itens por contrato_produto_id e validar o total
    const itensPorContrato = new Map<number, { nome: string; quantidadeTotal: number; alocadoTotal: number }>();
    
    pedido.itens.forEach(item => {
      if (!itensPorContrato.has(item.contrato_produto_id)) {
        itensPorContrato.set(item.contrato_produto_id, {
          nome: item.produto_nome,
          quantidadeTotal: 0,
          alocadoTotal: 0
        });
      }
      
      const grupo = itensPorContrato.get(item.contrato_produto_id)!;
      grupo.quantidadeTotal += Number(item.quantidade);
    });
    
    // Calcular total alocado por contrato_produto_id
    for (const [contratoId, grupo] of itensPorContrato.entries()) {
      const totalAlocado = calcularTotalAlocado(contratoId);
      
      if (totalAlocado > grupo.quantidadeTotal) {
        setErro(`O item "${grupo.nome}" tem ${totalAlocado} alocado, mas o pedido tem apenas ${grupo.quantidadeTotal}`);
        return false;
      }
    }
    
    return true;
  };

  const salvarFaturamento = async () => {
    if (!validarQuantidades()) return;

    if (!pedido || !faturamentoId) return;

    try {
      setLoading(true);

      // Preparar itens para envio
      // Cada item agrupado pode ter múltiplos pedido_item_ids
      // Precisamos distribuir a quantidade_alocada proporcionalmente
      const itensParaEnviar: ItemFaturamentoAPI[] = [];
      
      faturamentos.forEach(fat => {
        fat.itens.forEach(item => {
          // Distribuir quantidade_alocada proporcionalmente baseado na quantidade de cada pedido_item
          if (!pedido) return;
          
          // Buscar as quantidades de cada pedido_item_id
          const quantidadesPorItem = item.pedido_item_ids.map(id => {
            const pedidoItem = pedido.itens.find(pi => pi.id === id);
            return {
              id,
              quantidade: pedidoItem ? Number(pedidoItem.quantidade) : 0
            };
          });
          
          const quantidadeTotal = quantidadesPorItem.reduce((sum, item) => sum + item.quantidade, 0);
          
          // Distribuir proporcionalmente
          let quantidadeRestante = item.quantidade_alocada;
          
          quantidadesPorItem.forEach((qItem, index) => {
            let quantidadeParaEsteItem;
            
            if (index === quantidadesPorItem.length - 1) {
              // Último item recebe o restante para evitar erros de arredondamento
              quantidadeParaEsteItem = quantidadeRestante;
            } else {
              // Calcular proporcionalmente
              const proporcao = qItem.quantidade / quantidadeTotal;
              quantidadeParaEsteItem = item.quantidade_alocada * proporcao;
              quantidadeRestante -= quantidadeParaEsteItem;
            }
            
            itensParaEnviar.push({
              pedido_item_id: qItem.id,
              modalidade_id: fat.modalidade_id,
              quantidade_alocada: quantidadeParaEsteItem,
              preco_unitario: item.preco_unitario
            });
          });
        });
      });

      await atualizarFaturamento(Number(faturamentoId), {
        itens: itensParaEnviar
      });
      setSucesso('Faturamento salvo com sucesso!');
      setItemEditando(null); // Limpar item em edição
      
      // Não redirecionar, apenas mostrar mensagem
      setTimeout(() => setSucesso(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setErro('Erro ao salvar faturamento');
    } finally {
      setLoading(false);
    }
  };

  const gerarExcel = async () => {
    if (!pedido) return;

    // Agrupar itens por fornecedor e modalidade
    const dadosPorFornecedor = new Map<string, {
      fornecedorNome: string;
      fornecedorCNPJ: string;
      modalidades: Map<string, {
        modalidadeNome: string;
        modalidadeRepasse: number;
        contratos: Map<string, typeof faturamentos[0]['itens']>;
      }>;
    }>();

    faturamentos.forEach((faturamento) => {
      if (faturamento.itens.length === 0) return;

      faturamento.itens.forEach(item => {
        // Pegar o primeiro pedido_item_id para buscar informações do fornecedor/contrato
        const pedidoItem = pedido.itens.find(pi => pi.contrato_produto_id === item.contrato_produto_id);
        if (!pedidoItem) return;

        const fornecedorNome = pedidoItem.fornecedor_nome;
        const fornecedorCNPJ = pedidoItem.fornecedor_cnpj || '';
        const contratoNumero = pedidoItem.contrato_numero;

        if (!dadosPorFornecedor.has(fornecedorNome)) {
          dadosPorFornecedor.set(fornecedorNome, {
            fornecedorNome,
            fornecedorCNPJ,
            modalidades: new Map()
          });
        }

        const fornecedor = dadosPorFornecedor.get(fornecedorNome)!;

        if (!fornecedor.modalidades.has(faturamento.modalidade_nome)) {
          fornecedor.modalidades.set(faturamento.modalidade_nome, {
            modalidadeNome: faturamento.modalidade_nome,
            modalidadeRepasse: faturamento.modalidade_valor_repasse,
            contratos: new Map()
          });
        }

        const modalidade = fornecedor.modalidades.get(faturamento.modalidade_nome)!;

        if (!modalidade.contratos.has(contratoNumero)) {
          modalidade.contratos.set(contratoNumero, []);
        }

        modalidade.contratos.get(contratoNumero)!.push(item);
      });
    });

    // Criar um arquivo Excel por fornecedor
    for (const [fornecedorNome, fornecedor] of dadosPorFornecedor) {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema de Gestão Escolar';
      workbook.created = new Date();

      // Criar uma aba para cada modalidade
      for (const [modalidadeNome, modalidade] of fornecedor.modalidades) {
        const worksheet = workbook.addWorksheet(modalidadeNome.substring(0, 31)); // Excel limita a 31 caracteres

        // Linha 1: Cabeçalho do Contrato
        const primeiroContrato = Array.from(modalidade.contratos.keys())[0];
        const contratoTexto = `Contrato Nº ${primeiroContrato} - FATURAMENTO - ${fornecedor.fornecedorCNPJ ? `CASP C.N.P.J ${fornecedor.fornecedorCNPJ}` : fornecedor.fornecedorNome} - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}`;
        
        worksheet.mergeCells('A1:F1');
        const headerRow = worksheet.getCell('A1');
        headerRow.value = contratoTexto;
        headerRow.font = { bold: true, size: 11 };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFADD8E6' } // Azul claro
        };
        headerRow.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        worksheet.getRow(1).height = 25;

        // Linha 2: Nome da Modalidade
        worksheet.mergeCells('A2:F2');
        const modalidadeRow = worksheet.getCell('A2');
        modalidadeRow.value = modalidadeNome.toUpperCase();
        modalidadeRow.font = { bold: true, size: 11 };
        modalidadeRow.alignment = { horizontal: 'center', vertical: 'middle' };
        modalidadeRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFADD8E6' } // Azul claro
        };
        modalidadeRow.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        worksheet.getRow(2).height = 20;

        // Linha 3: Cabeçalho da Tabela
        const headerTableRow = worksheet.getRow(3);
        headerTableRow.values = ['Nº', 'ITEM', 'UNIDADE DE MEDIDA', 'QUANTIDADE', 'PREÇO UNITÁRIO', 'CUSTO POR ITEM'];
        headerTableRow.font = { bold: true, size: 10 };
        headerTableRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerTableRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC896' } // Laranja claro
        };
        headerTableRow.height = 20;
        
        // Bordas do cabeçalho
        for (let col = 1; col <= 6; col++) {
          const cell = worksheet.getCell(3, col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }

        // Larguras das colunas
        worksheet.getColumn(1).width = 8;   // Nº
        worksheet.getColumn(2).width = 45;  // ITEM
        worksheet.getColumn(3).width = 18;  // UNIDADE
        worksheet.getColumn(4).width = 15;  // QUANTIDADE
        worksheet.getColumn(5).width = 18;  // PREÇO UNITÁRIO
        worksheet.getColumn(6).width = 18;  // CUSTO POR ITEM

        let currentRow = 4;
        let itemNumero = 1;
        let totalModalidade = 0;

        // Adicionar itens de todos os contratos
        for (const [contratoNumero, itens] of modalidade.contratos) {
          itens.forEach(item => {
            const valorTotal = Number(item.quantidade_alocada) * Number(item.preco_unitario);
            totalModalidade += valorTotal;

            const row = worksheet.getRow(currentRow);
            row.values = [
              itemNumero,
              item.produto_nome,
              item.unidade,
              Number(item.quantidade_alocada),
              Number(item.preco_unitario),
              valorTotal
            ];

            // Formatação
            row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
            row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(4).numFmt = '#,##0';
            row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(5).numFmt = 'R$ #,##0.00';
            row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(6).numFmt = 'R$ #,##0.00';
            row.height = 18;

            // Bordas
            for (let col = 1; col <= 6; col++) {
              const cell = row.getCell(col);
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
            }

            currentRow++;
            itemNumero++;
          });
        }

        // Linha de Total
        const totalRow = worksheet.getRow(currentRow);
        totalRow.values = ['', '', '', '', 'TOTAL GERAL', totalModalidade];
        totalRow.font = { bold: true, size: 11 };
        totalRow.alignment = { horizontal: 'center', vertical: 'middle' };
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFADD8E6' } // Azul claro
        };
        totalRow.getCell(6).numFmt = 'R$ #,##0.00';
        totalRow.height = 22;

        // Bordas do total
        for (let col = 1; col <= 6; col++) {
          const cell = totalRow.getCell(col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      }

      // Salvar arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const nomeArquivo = `Faturamento_${fornecedorNome.replace(/[^a-zA-Z0-9]/g, '_')}_${pedido.numero}.xlsx`;
      saveAs(blob, nomeArquivo);
    }
  };

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Carregando...</Typography></Box>;
  }

  if (!pedido) {
    return <Box sx={{ p: 3 }}><Alert severity="error">Pedido não encontrado</Alert></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs 
        items={[
          { label: 'Compras', path: '/compras', icon: <ShoppingCartIcon fontSize="small" /> },
          { label: `Compra ${pedido.numero}`, path: `/compras/${id}` },
          { label: 'Faturamentos', path: `/compras/${id}/faturamentos` },
          { label: `Faturamento #${faturamentoId}` }
        ]}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Faturamento por Modalidades
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="info"
            startIcon={<AssessmentIcon />}
            onClick={() => navigate(`/compras/${id}/faturamento/${faturamentoId}/relatorio-tipo`)}
          >
            Relatório por Tipo
          </Button>
          <Button
            variant="contained" color="add"
            startIcon={<ExcelIcon />}
            onClick={gerarExcel}
            disabled={faturamentos.every(f => f.itens.length === 0)}
          >
            Gerar Excel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AutoFixHighIcon />}
            onClick={abrirDialogAutomatico}
          >
            Alocamento Automático
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/compras/${id}/faturamentos`)}
          >
            Voltar
          </Button>
        </Box>
      </Box>

      {erro && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>{erro}</Alert>}
      {sucesso && <Alert severity="success" sx={{ mb: 3 }}>{sucesso}</Alert>}

      <Grid container spacing={3}>
        {faturamentos.map((faturamento) => (
          <Grid item xs={12} key={faturamento.modalidade_id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">{faturamento.modalidade_nome}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                        Repasse: {formatarMoeda(faturamento.modalidade_valor_repasse)}
                      </Typography>
                      <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                        Total: {formatarMoeda(calcularValorTotalModalidade(faturamento.modalidade_id))}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => abrirDialogAdicionar(faturamento.modalidade_id)}
                  >
                    Adicionar Itens
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {faturamento.itens.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Nenhum item adicionado
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Clique em "Adicionar Itens" acima para começar
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small" sx={{ minWidth: 650 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: '35%' }}>Produto</TableCell>
                          <TableCell align="center" sx={{ width: '8%' }}>Unidade</TableCell>
                          <TableCell align="center" sx={{ width: '10%' }}>Qtd. Pedido</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Qtd. Alocada</TableCell>
                          <TableCell align="center" sx={{ width: '12%' }}>Preço Unit.</TableCell>
                          <TableCell align="center" sx={{ width: '13%' }}>Valor Total</TableCell>
                          <TableCell align="center" sx={{ width: '10%' }}>Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {faturamento.itens.map((item) => {
                          const totalAlocado = calcularTotalAlocado(item.contrato_produto_id);
                          const excedeu = totalAlocado > Number(item.quantidade_pedido);
                          const quantidadeAlocada = Number(item.quantidade_alocada) || 0;
                          const precoUnitario = Number(item.preco_unitario) || 0;
                          const valorTotal = quantidadeAlocada * precoUnitario;
                          const estaEditando = itemEditando?.modalidadeId === faturamento.modalidade_id && 
                                               itemEditando?.itemId === item.contrato_produto_id;
                          
                          return (
                            <TableRow key={item.contrato_produto_id} hover>
                              <TableCell sx={{ py: 1.5 }}>{item.produto_nome}</TableCell>
                              <TableCell align="center" sx={{ py: 1.5 }}>{item.unidade}</TableCell>
                              <TableCell align="center" sx={{ py: 1.5 }}>{Number(item.quantidade_pedido).toFixed(0)}</TableCell>
                              <TableCell align="center" sx={{ py: 1.5 }}>
                                {estaEditando ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TextField
                                      type="number"
                                      size="small"
                                      value={quantidadeAlocada}
                                      onChange={(e) => atualizarQuantidade(
                                        faturamento.modalidade_id,
                                        item.contrato_produto_id,
                                        e.target.value
                                      )}
                                      error={excedeu}
                                      sx={{ width: 90 }}
                                      inputProps={{ min: 0, step: 0.01 }}
                                      autoFocus
                                    />
                                    {excedeu && (
                                      <Chip 
                                        label="Excedeu!" 
                                        color="error" 
                                        size="small"
                                      />
                                    )}
                                  </Box>
                                ) : (
                                  <Typography variant="body2">{quantidadeAlocada.toFixed(0)}</Typography>
                                )}
                              </TableCell>
                              <TableCell align="center" sx={{ py: 1.5 }}>
                                <Typography variant="body2">{formatarMoeda(precoUnitario)}</Typography>
                              </TableCell>
                              <TableCell align="center" sx={{ py: 1.5 }}>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  {formatarMoeda(valorTotal)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center" sx={{ py: 1.5 }}>
                                {estaEditando ? (
                                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                    <IconButton
                                      size="small"
                                      color="add"
                                      onClick={salvarFaturamento}
                                      title="Salvar"
                                    >
                                      <SaveIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setItemEditando(null);
                                        carregarFaturamentosExistentes();
                                      }}
                                      title="Cancelar"
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ) : (
                                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => setItemEditando({
                                        modalidadeId: faturamento.modalidade_id,
                                        itemId: item.contrato_produto_id
                                      })}
                                      title="Editar"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="delete"
                                      onClick={() => removerItem(faturamento.modalidade_id, item.contrato_produto_id)}
                                      title="Excluir"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Botão Salvar sempre visível no rodapé */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={salvarFaturamento}
              disabled={loading}
              size="large"
            >
              {loading ? 'Salvando...' : 'Salvar Faturamento'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Dialog para adicionar itens */}
      <Dialog open={dialogAberto} onClose={() => setDialogAberto(false)} maxWidth="md" fullWidth>
        <DialogTitle>Adicionar Itens</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell align="center">Unidade</TableCell>
                  <TableCell align="center">Qtd. Pedido</TableCell>
                  <TableCell align="center">Já Alocado</TableCell>
                  <TableCell align="center">Disponível</TableCell>
                  <TableCell align="center">Preço Unit.</TableCell>
                  <TableCell align="center">Quantidade</TableCell>
                  <TableCell align="center">Valor Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pedido?.itens
                  // Agrupar itens por contrato_produto_id
                  .reduce((acc: any[], item) => {
                    const existente = acc.find(i => i.contrato_produto_id === item.contrato_produto_id);
                    if (existente) {
                      existente.quantidade = Number(existente.quantidade) + Number(item.quantidade);
                      existente.ids.push(item.id);
                    } else {
                      acc.push({
                        ...item,
                        ids: [item.id],
                        quantidade: Number(item.quantidade)
                      });
                    }
                    return acc;
                  }, [])
                  .map((itemAgrupado: any) => {
                  const totalAlocado = calcularTotalAlocado(itemAgrupado.contrato_produto_id);
                  const disponivel = Number(itemAgrupado.quantidade) - totalAlocado;
                  // Somar quantidades selecionadas de todos os IDs do grupo
                  const quantidadeSelecionada = itemAgrupado.ids.reduce((sum: number, id: number) => 
                    sum + (itensSelecionados[id] || 0), 0
                  );
                  const valorTotal = quantidadeSelecionada * Number(itemAgrupado.preco_unitario);
                  
                  return (
                    <TableRow key={itemAgrupado.contrato_produto_id}>
                      <TableCell>{itemAgrupado.produto_nome}</TableCell>
                      <TableCell align="center">{itemAgrupado.unidade || 'UN'}</TableCell>
                      <TableCell align="center">{itemAgrupado.quantidade}</TableCell>
                      <TableCell align="center">{totalAlocado}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={disponivel} 
                          color={disponivel > 0 ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">{formatarMoeda(itemAgrupado.preco_unitario)}</TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={quantidadeSelecionada}
                          onChange={(e) => {
                            // Atualizar apenas o primeiro ID do grupo (será agrupado depois)
                            const primeiroId = itemAgrupado.ids[0];
                            setItensSelecionados({
                              ...itensSelecionados,
                              [primeiroId]: Number(e.target.value)
                            });
                          }}
                          sx={{ width: 100 }}
                          inputProps={{ min: 0, max: disponivel, step: 0.01 }}
                          disabled={disponivel <= 0}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          fontWeight="bold" 
                          color={quantidadeSelecionada > 0 ? 'success.main' : 'text.secondary'}
                        >
                          {formatarMoeda(valorTotal)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAberto(false)}>Cancelar</Button>
          <Button onClick={adicionarItens} variant="contained">
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Alocamento Automático */}
      <Dialog 
        open={dialogAutomaticoAberto} 
        onClose={() => setDialogAutomaticoAberto(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Alocamento Automático
          <Stepper activeStep={etapaAutomatico - 1} sx={{ mt: 2 }}>
            <Step>
              <StepLabel>Selecionar Itens</StepLabel>
            </Step>
            <Step>
              <StepLabel>Selecionar Modalidades</StepLabel>
            </Step>
          </Stepper>
        </DialogTitle>
        <DialogContent>
          {etapaAutomatico === 1 ? (
            // Etapa 1: Selecionar Itens
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 2 }}>
                Selecione os itens que deseja alocar automaticamente:
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"></TableCell>
                      <TableCell>Produto</TableCell>
                      <TableCell align="center">Qtd. Pedido</TableCell>
                      <TableCell align="center">Já Alocado</TableCell>
                      <TableCell align="center">Disponível</TableCell>
                      <TableCell align="center">Preço Unit.</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pedido?.itens
                      // Agrupar itens por contrato_produto_id
                      .reduce((acc: any[], item) => {
                        const existente = acc.find(i => i.contrato_produto_id === item.contrato_produto_id);
                        if (existente) {
                          existente.quantidade = Number(existente.quantidade) + Number(item.quantidade);
                          existente.ids.push(item.id);
                        } else {
                          acc.push({
                            ...item,
                            ids: [item.id],
                            quantidade: Number(item.quantidade)
                          });
                        }
                        return acc;
                      }, [])
                      .map((itemAgrupado: any) => {
                      const totalAlocado = calcularTotalAlocado(itemAgrupado.contrato_produto_id);
                      const disponivel = Number(itemAgrupado.quantidade) - totalAlocado;
                      const isDisabled = disponivel <= 0;
                      
                      return (
                        <TableRow key={itemAgrupado.contrato_produto_id}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={itemAgrupado.ids.some((id: number) => itensAutomaticoSelecionados.includes(id))}
                              onChange={() => {
                                // Adicionar/remover todos os IDs do grupo
                                const primeiroId = itemAgrupado.ids[0];
                                if (itensAutomaticoSelecionados.includes(primeiroId)) {
                                  // Remover todos os IDs do grupo
                                  setItensAutomaticoSelecionados(prev => 
                                    prev.filter(id => !itemAgrupado.ids.includes(id))
                                  );
                                } else {
                                  // Adicionar todos os IDs do grupo
                                  setItensAutomaticoSelecionados(prev => [...prev, ...itemAgrupado.ids]);
                                }
                              }}
                              disabled={isDisabled}
                            />
                          </TableCell>
                          <TableCell>{itemAgrupado.produto_nome}</TableCell>
                          <TableCell align="center">{itemAgrupado.quantidade}</TableCell>
                          <TableCell align="center">{totalAlocado}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={disponivel} 
                              color={disponivel > 0 ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">{formatarMoeda(itemAgrupado.preco_unitario)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            // Etapa 2: Selecionar Modalidades
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 2 }}>
                Selecione as modalidades para distribuir os itens proporcionalmente ao repasse:
              </Typography>
              <Grid container spacing={2}>
                {modalidades.map((modalidade) => (
                  <Grid item xs={12} sm={6} key={modalidade.id}>
                    <Card 
                      variant="outlined"
                      sx={{ 
                        cursor: 'pointer',
                        border: modalidadesAutomaticoSelecionadas.includes(modalidade.id) ? 2 : 1,
                        borderColor: modalidadesAutomaticoSelecionadas.includes(modalidade.id) ? 'primary.main' : 'divider'
                      }}
                      onClick={() => toggleModalidadeAutomatico(modalidade.id)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Checkbox
                            checked={modalidadesAutomaticoSelecionadas.includes(modalidade.id)}
                            onChange={() => toggleModalidadeAutomatico(modalidade.id)}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {modalidade.nome}
                            </Typography>
                            <Typography variant="body2" color="primary">
                              Repasse: {formatarMoeda(modalidade.valor_repasse)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              {modalidadesAutomaticoSelecionadas.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Os itens serão distribuídos proporcionalmente ao valor do repasse de cada modalidade selecionada.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAutomaticoAberto(false)}>Cancelar</Button>
          {etapaAutomatico === 1 ? (
            <Button onClick={avancarParaEtapa2} variant="contained">
              Próximo
            </Button>
          ) : (
            <>
              <Button onClick={voltarParaEtapa1}>Voltar</Button>
              <Button onClick={confirmarAlocamentoAutomatico} variant="contained">
                Confirmar Alocamento
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
