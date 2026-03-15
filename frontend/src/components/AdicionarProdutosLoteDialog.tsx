import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  IconButton,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  FileDownload as ExportIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface Produto {
  id: number;
  nome: string;
  unidade: string;
  categoria?: string;
  peso?: number;
}

interface ProdutoSelecionado extends Produto {
  preco_unitario?: number;
  quantidade_contratada?: number;
  marca?: string;
  peso?: number;
}

interface AdicionarProdutosLoteDialogProps {
  open: boolean;
  onClose: () => void;
  produtosDisponiveis: Produto[];
  produtosJaAdicionados: number[]; // IDs dos produtos já no contrato
  onAdicionar: (produtos: ProdutoSelecionado[]) => void;
  contratoId: number;
}

const AdicionarProdutosLoteDialog: React.FC<AdicionarProdutosLoteDialogProps> = ({
  open,
  onClose,
  produtosDisponiveis,
  produtosJaAdicionados,
  onAdicionar,
  contratoId
}) => {
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [dadosProdutos, setDadosProdutos] = useState<Record<number, Partial<ProdutoSelecionado>>>({});
  const [erroImportacao, setErroImportacao] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filtrar produtos que ainda não estão no contrato
  const produtosNaoAdicionados = useMemo(() => {
    return produtosDisponiveis.filter(p => !produtosJaAdicionados.includes(p.id));
  }, [produtosDisponiveis, produtosJaAdicionados]);

  // Filtrar por busca
  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return produtosNaoAdicionados;
    const termo = busca.toLowerCase();
    return produtosNaoAdicionados.filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      p.categoria?.toLowerCase().includes(termo)
    );
  }, [produtosNaoAdicionados, busca]);

  const handleToggleSelecionado = (id: number) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelecionarTodos = () => {
    if (selecionados.length === produtosFiltrados.length) {
      setSelecionados([]);
    } else {
      setSelecionados(produtosFiltrados.map(p => p.id));
    }
  };

  const handleExportarExcel = () => {
    const produtosSelecionadosData = produtosNaoAdicionados
      .filter(p => selecionados.includes(p.id))
      .map(p => ({
        produto_id: p.id,
        nome: p.nome,
        unidade: p.unidade,
        categoria: p.categoria || '',
        quantidade_contratada: '',
        marca: '',
        peso: p.peso || '',
        preco_unitario: ''
      }));

    const ws = XLSX.utils.json_to_sheet(produtosSelecionadosData);
    
    // Definir largura das colunas
    ws['!cols'] = [
      { wch: 10 }, // produto_id
      { wch: 40 }, // nome
      { wch: 10 }, // unidade
      { wch: 20 }, // categoria
      { wch: 20 }, // quantidade_contratada
      { wch: 20 }, // marca
      { wch: 15 }, // peso
      { wch: 15 }  // preco_unitario
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

    // Adicionar aba de instruções
    const instrucoes = [
      ['INSTRUÇÕES PARA PREENCHIMENTO'],
      [''],
      ['Campo', 'Descrição', 'Obrigatório'],
      ['produto_id', 'ID do produto (não alterar)', 'SIM'],
      ['nome', 'Nome do produto (não alterar)', 'SIM'],
      ['unidade', 'Unidade (não alterar)', 'SIM'],
      ['categoria', 'Categoria (não alterar)', 'NÃO'],
      ['quantidade_contratada', 'Quantidade contratada', 'SIM'],
      ['marca', 'Marca do produto', 'NÃO'],
      ['peso', 'Peso em gramas (já preenchido se o produto tiver)', 'NÃO'],
      ['preco_unitario', 'Preço unitário do produto', 'SIM'],
      [''],
      ['NOTAS:'],
      ['- Não altere as colunas produto_id, nome, unidade e categoria'],
      ['- Preencha quantidade_contratada e preco_unitario com valores numéricos'],
      ['- Peso já vem preenchido se o produto tiver, mas pode ser alterado'],
      ['- Peso deve ser em gramas (ex: 1000 para 1kg)'],
      ['- Após preencher, importe o arquivo de volta no sistema']
    ];

    const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes);
    wsInstrucoes['!cols'] = [{ wch: 25 }, { wch: 50 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'Instruções');

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `produtos_contrato_${contratoId}_${timestamp}.xlsx`);
  };

  const handleAvancarParaFormulario = () => {
    // Inicializar dados dos produtos selecionados
    const dados: Record<number, Partial<ProdutoSelecionado>> = {};
    selecionados.forEach(id => {
      const produto = produtosNaoAdicionados.find(p => p.id === id);
      dados[id] = {
        quantidade_contratada: undefined,
        marca: '',
        peso: produto?.peso || undefined,
        preco_unitario: undefined
      };
    });
    setDadosProdutos(dados);
    setMostrarFormulario(true);
  };

  const handleVoltarParaSelecao = () => {
    setMostrarFormulario(false);
  };

  const handleChangeDadosProduto = (id: number, campo: string, valor: any) => {
    setDadosProdutos(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor
      }
    }));
  };

  const handleConfirmarAdicao = () => {
    const produtosParaAdicionar: ProdutoSelecionado[] = selecionados.map(id => {
      const produto = produtosNaoAdicionados.find(p => p.id === id)!;
      const dados = dadosProdutos[id] || {};
      return {
        ...produto,
        ...dados
      };
    });

    onAdicionar(produtosParaAdicionar);
    handleFechar();
  };

  const handleImportarExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErroImportacao('');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          setErroImportacao('O arquivo está vazio.');
          return;
        }

        console.log('📊 Total de linhas no Excel:', jsonData.length);
        console.log('📋 Dados do Excel:', jsonData);

        // Validar e processar dados
        const novosIds: number[] = [];
        const novosDados: Record<number, Partial<ProdutoSelecionado>> = {};
        const erros: string[] = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const linha = i + 2; // +2 porque linha 1 é cabeçalho e array começa em 0
          
          const produtoId = Number(row.produto_id);
          
          if (!produtoId || isNaN(produtoId)) {
            erros.push(`Linha ${linha}: produto_id ausente ou inválido`);
            continue;
          }

          const produto = produtosNaoAdicionados.find(p => p.id === produtoId);
          if (!produto) {
            erros.push(`Linha ${linha}: Produto ID ${produtoId} não encontrado ou já adicionado`);
            continue;
          }

          const quantidadeContratada = Number(row.quantidade_contratada);
          if (!quantidadeContratada || isNaN(quantidadeContratada) || quantidadeContratada <= 0) {
            erros.push(`Linha ${linha} (${produto.nome}): Quantidade contratada inválida`);
            continue;
          }

          const precoUnitario = Number(row.preco_unitario);
          if (!precoUnitario || isNaN(precoUnitario) || precoUnitario <= 0) {
            erros.push(`Linha ${linha} (${produto.nome}): Preço unitário inválido`);
            continue;
          }

          // Produto válido, adicionar
          novosIds.push(produtoId);
          novosDados[produtoId] = {
            quantidade_contratada: quantidadeContratada,
            marca: row.marca || '',
            peso: row.peso ? Number(row.peso) : undefined,
            preco_unitario: precoUnitario
          };
        }

        console.log('✅ Produtos válidos:', novosIds.length);
        console.log('❌ Erros encontrados:', erros.length);

        if (novosIds.length === 0) {
          setErroImportacao(`Nenhum produto válido encontrado no arquivo.\n${erros.join('\n')}`);
          return;
        }

        // Mostrar aviso se houver erros, mas continuar com os válidos
        if (erros.length > 0) {
          console.warn('⚠️ Erros na importação:', erros);
          setErroImportacao(`${novosIds.length} produtos válidos encontrados. ${erros.length} linhas com erro foram ignoradas.`);
        }

        // Atualizar estado
        setSelecionados(novosIds);
        setDadosProdutos(novosDados);
        setMostrarFormulario(true);
        
      } catch (error) {
        console.error('Erro ao importar Excel:', error);
        setErroImportacao('Erro ao processar o arquivo. Verifique se o formato está correto.');
      }
    };

    reader.readAsArrayBuffer(file);
    
    // Limpar input para permitir reimportar o mesmo arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFechar = () => {
    setBusca('');
    setSelecionados([]);
    setMostrarFormulario(false);
    setDadosProdutos({});
    setErroImportacao('');
    onClose();
  };

  const todosPreenchidos = useMemo(() => {
    return selecionados.every(id => {
      const dados = dadosProdutos[id];
      return dados?.quantidade_contratada && dados.quantidade_contratada > 0 &&
             dados?.preco_unitario && dados.preco_unitario > 0;
    });
  }, [selecionados, dadosProdutos]);

  return (
    <Dialog open={open} onClose={handleFechar} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {mostrarFormulario ? 'Preencher Dados dos Produtos' : 'Adicionar Produtos em Lote'}
          </Typography>
          <IconButton size="small" onClick={handleFechar}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {erroImportacao && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErroImportacao('')}>
            {erroImportacao}
          </Alert>
        )}
        
        {!mostrarFormulario ? (
          <>
            {/* Etapa 1: Seleção de Produtos */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar produtos..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Box>

            {produtosNaoAdicionados.length === 0 ? (
              <Alert severity="info">
                Todos os produtos disponíveis já foram adicionados a este contrato.
              </Alert>
            ) : (
              <>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    size="small"
                    onClick={handleSelecionarTodos}
                    disabled={produtosFiltrados.length === 0}
                  >
                    {selecionados.length === produtosFiltrados.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {selecionados.length} produto(s) selecionado(s)
                  </Typography>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" sx={{ width: 50 }}>
                          <Checkbox
                            checked={produtosFiltrados.length > 0 && selecionados.length === produtosFiltrados.length}
                            indeterminate={selecionados.length > 0 && selecionados.length < produtosFiltrados.length}
                            onChange={handleSelecionarTodos}
                          />
                        </TableCell>
                        <TableCell>Produto</TableCell>
                        <TableCell>Unidade</TableCell>
                        <TableCell>Categoria</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {produtosFiltrados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            Nenhum produto encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        produtosFiltrados.map(produto => (
                          <TableRow
                            key={produto.id}
                            hover
                            onClick={() => handleToggleSelecionado(produto.id)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox checked={selecionados.includes(produto.id)} />
                            </TableCell>
                            <TableCell>{produto.nome}</TableCell>
                            <TableCell>{produto.unidade}</TableCell>
                            <TableCell>
                              {produto.categoria ? (
                                <Chip label={produto.categoria} size="small" variant="outlined" />
                              ) : (
                                <Typography variant="body2" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        ) : (
          <>
            {/* Etapa 2: Preenchimento de Dados */}
            <Alert severity="info" sx={{ mb: 2 }}>
              Preencha os dados para cada produto selecionado. Quantidade contratada e preço unitário são obrigatórios.
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selecionados.map(id => {
                const produto = produtosNaoAdicionados.find(p => p.id === id)!;
                const dados = dadosProdutos[id] || {};

                return (
                  <Paper key={id} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      {produto.nome} ({produto.unidade})
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                      <TextField
                        label="Quantidade Contratada *"
                        type="number"
                        size="small"
                        value={dados.quantidade_contratada || ''}
                        onChange={(e) => handleChangeDadosProduto(id, 'quantidade_contratada', parseFloat(e.target.value))}
                        required
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                      <TextField
                        label="Preço Unitário *"
                        type="number"
                        size="small"
                        value={dados.preco_unitario || ''}
                        onChange={(e) => handleChangeDadosProduto(id, 'preco_unitario', parseFloat(e.target.value))}
                        InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography> }}
                        required
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                      <TextField
                        label="Marca"
                        size="small"
                        value={dados.marca || ''}
                        onChange={(e) => handleChangeDadosProduto(id, 'marca', e.target.value)}
                        placeholder="Ex: Tio João, Camil"
                      />
                      <TextField
                        label="Peso (gramas)"
                        type="number"
                        size="small"
                        value={dados.peso || ''}
                        onChange={(e) => handleChangeDadosProduto(id, 'peso', parseFloat(e.target.value))}
                        placeholder="Ex: 1000 para 1kg"
                        inputProps={{ min: 0 }}
                      />
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        {!mostrarFormulario ? (
          <>
            <Button onClick={handleFechar}>Cancelar</Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleImportarExcel}
            />
            <Button
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              Importar Excel
            </Button>
            <Button
              startIcon={<ExportIcon />}
              onClick={handleExportarExcel}
              disabled={selecionados.length === 0}
            >
              Exportar para Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAvancarParaFormulario}
              disabled={selecionados.length === 0}
            >
              Avançar ({selecionados.length})
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleVoltarParaSelecao}>Voltar</Button>
            <Button
              variant="contained"
              onClick={handleConfirmarAdicao}
              disabled={!todosPreenchidos}
            >
              Adicionar Produtos
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AdicionarProdutosLoteDialog;
