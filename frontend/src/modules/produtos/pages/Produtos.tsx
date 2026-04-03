import React, { useState, useMemo, useCallback, useEffect } from "react";
import PageHeader from "../../../components/PageHeader";
import PageContainer from "../../../components/PageContainer";
import { deletarProduto } from "../../../services/produtos";
import api from "../../../services/api";
import { 
  useProdutos, 
  useCriarProduto, 
  useCategoriasProdutos 
} from "../../../hooks/queries";
import { useToast } from "../../../hooks/useToast";
import ImportacaoProdutos from "../../../components/ImportacaoProdutos";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Tooltip,
  Menu,
  Autocomplete,
  Chip,
  Popover,
  Divider,
  CircularProgress,
  Grid,
  SelectChangeEvent,
} from "@mui/material";
import {
  Visibility,
  Download,
  Upload,
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { gerarModeloExcelProdutos } from "../../../utils/produtoImportUtils";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { DataTable } from "../../../components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import * as XLSX from "xlsx";

interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  tipo_processamento?: string;
  categoria?: string;
  validade_minima?: number;
  imagem_url?: string;
  perecivel?: boolean;
  ativo: boolean;
  estoque_minimo?: number;
  fator_correcao?: number;
  tipo_fator_correcao?: string;
  unidade_distribuicao?: string;
  peso?: number;
  tem_composicao_nutricional?: boolean;
  tem_contrato?: boolean;
}

interface ProdutoForm {
  nome: string;
  descricao: string;
  tipo_processamento?: string;
  categoria: string;
  validade_minima?: number;
  imagem_url?: string;
  perecivel?: boolean;
  ativo: boolean;
  estoque_minimo?: number;
  fator_correcao?: number;
  tipo_fator_correcao?: string;
  unidade_distribuicao?: string;
  peso?: number;
}

const ProdutosPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // React Query hooks
  const { 
    data: produtos = [], 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useProdutos({ search: '', categoria: '' });
  
  const { data: categorias = [] } = useCategoriasProdutos();
  const criarProdutoMutation = useCriarProduto();
  
  // Estados de ações
  const [importExportMenuAnchor, setImportExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);

  // Estados do modal
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);
  
  // Estados de filtro
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState({
    status: 'todos',
    categoria: 'todos',
  });
  
  const [formData, setFormData] = useState<ProdutoForm>({
    nome: "",
    descricao: "",
    categoria: "",
    tipo_processamento: "",
    perecivel: false,
    ativo: true,
    estoque_minimo: 0,
    fator_correcao: 1.0,
    tipo_fator_correcao: "perda",
    unidade_distribuicao: "",
    peso: undefined,
  });
  
  // Estados de validação
  const [erroProduto, setErroProduto] = useState("");
  const [touched, setTouched] = useState<any>({});

  useEffect(() => {
    const state = location.state as { successMessage?: string } | undefined;
    if (state?.successMessage) {
      toast.success(state.successMessage);
      refetch();
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate, refetch, toast]);

  // Filtrar produtos
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((produto) => {
      // Filtro de status
      if (filters.status === 'ativo' && !produto.ativo) return false;
      if (filters.status === 'inativo' && produto.ativo) return false;
      
      // Filtro de categoria
      if (filters.categoria !== 'todos' && produto.categoria !== filters.categoria) {
        return false;
      }
      
      return true;
    });
  }, [produtos, filters]);

  const handleRowClick = useCallback((produto: Produto) => {
    navigate(`/produtos/${produto.id}`);
  }, [navigate]);

  const columns = useMemo<ColumnDef<Produto>[]>(() => [
    { 
      accessorKey: 'id', 
      header: 'ID',
      size: 80,
      enableSorting: true,
    },
    { 
      accessorKey: 'nome', 
      header: 'Nome do Produto',
      size: 300,
      enableSorting: true,
    },
    { 
      accessorKey: 'unidade_distribuicao', 
      header: 'Unidade',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        return (
          <Chip 
            label={value || '-'} 
            size="small" 
            variant="outlined"
            color={value ? 'default' : 'error'}
          />
        );
      },
    },
    { 
      accessorKey: 'categoria', 
      header: 'Categoria',
      size: 150,
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        return value || 'N/A';
      },
    },
    { 
      accessorKey: 'ativo', 
      header: 'Status',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Tooltip title={getValue() ? 'Ativo' : 'Inativo'}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: getValue() ? 'success.main' : 'error.main',
              display: 'inline-block',
            }}
          />
        </Tooltip>
      ),
    },
    { 
      accessorKey: 'tem_composicao_nutricional', 
      header: 'Composição',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => {
        const temComposicao = getValue() as boolean;
        return (
          <Tooltip title={temComposicao ? 'Possui composição nutricional cadastrada' : 'Sem composição nutricional'}>
            <Chip 
              label={temComposicao ? 'Sim' : 'Não'} 
              size="small" 
              color={temComposicao ? 'success' : 'default'}
              variant={temComposicao ? 'filled' : 'outlined'}
            />
          </Tooltip>
        );
      },
    },
    { 
      accessorKey: 'tem_contrato', 
      header: 'Contrato',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => {
        const temContrato = getValue() as boolean;
        return (
          <Tooltip title={temContrato ? 'Possui contrato ativo' : 'Sem contrato ativo'}>
            <Chip 
              label={temContrato ? 'Sim' : 'Não'} 
              size="small" 
              color={temContrato ? 'primary' : 'default'}
              variant={temContrato ? 'filled' : 'outlined'}
            />
          </Tooltip>
        );
      },
    },
    {
      id: 'actions',
      header: 'Ações',
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => navigate(`/produtos/${row.original.id}`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              onClick={() => openDeleteModal(row.original)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [navigate]);

  // Funções do modal
  const openModal = () => {
    setFormData({ 
      nome: "", 
      descricao: "", 
      categoria: "", 
      tipo_processamento: "",
      ativo: true, 
      perecivel: false,
      estoque_minimo: 0,
      fator_correcao: 1.0,
      tipo_fator_correcao: "perda",
      unidade_distribuicao: "",
      peso: undefined
    });
    setErroProduto("");
    setTouched({});
    setModalOpen(true);
  };
  
  const closeModal = () => {
    setModalOpen(false);
    setErroProduto("");
    setTouched({});
    setFormData({
      nome: "",
      descricao: "",
      categoria: "",
      tipo_processamento: "",
      perecivel: false,
      ativo: true,
      estoque_minimo: 0,
      fator_correcao: 1.0,
      tipo_fator_correcao: "perda",
      unidade_distribuicao: "",
      peso: undefined
    });
  };

  const openDeleteModal = (produto: Produto) => {
    setProdutoToDelete(produto);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setProdutoToDelete(null);
  };

  const handleDelete = async () => {
    if (!produtoToDelete) return;
    try {
      await deletarProduto(produtoToDelete.id);
      toast.success('Produto excluído com sucesso!');
      closeDeleteModal();
      refetch();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Erro ao excluir. O produto pode estar em uso.';
      toast.error(errorMessage);
    }
  };

  const handleSave = async () => {
    // Validação
    if (!formData.nome.trim()) {
      setErroProduto("Nome do produto é obrigatório.");
      setTouched({ ...touched, nome: true });
      return;
    }
    
    if (formData.fator_correcao && Number(formData.fator_correcao) < 0) {
      setErroProduto("Fator de correção deve ser maior ou igual a 0.");
      return;
    }
    
    try {
      const novoProduto = await criarProdutoMutation.mutateAsync(formData);
      toast.success('Produto criado com sucesso!');
      closeModal();
      navigate(`/produtos/${novoProduto.id}`);
    } catch (err: any) {
      console.error('Erro ao criar produto:', err);
      setErroProduto(err.message || 'Erro ao criar produto.');
    }
  };

  // Funções de Importação/Exportação
  const handleImportProdutos = async (produtosImportacao: Array<Record<string, unknown>>) => {
    try {
      setLoadingImport(true);
      setImportModalOpen(false);
      let insercoes = 0;
      let atualizacoes = 0;
      let erros = 0;

      // Importar produtos um por um
      for (const produto of produtosImportacao) {
        try {
          // Verificar se produto já existe pelo nome
          const produtoExistente = produtos?.find(
            p => p.nome.toLowerCase() === String(produto.nome).toLowerCase()
          );

          if (produtoExistente) {
            // Atualizar produto existente
            await api.put(`/produtos/${produtoExistente.id}`, produto);
            atualizacoes++;
          } else {
            // Criar novo produto
            await api.post('/produtos', produto);
            insercoes++;
          }
        } catch (err) {
          console.error(`Erro ao importar produto ${produto.nome}:`, err);
          erros++;
        }
      }

      toast.success(
        `Importação concluída: ${insercoes} inseridos, ${atualizacoes} atualizados${erros > 0 ? `, ${erros} erro(s)` : ''}`
      );
      refetch(); // Recarregar dados após importação
    } catch (err) {
      console.error('Erro ao importar produtos:', err);
      toast.error('Erro ao importar produtos. Verifique os dados e tente novamente.');
    } finally {
      setLoadingImport(false);
    }
  };

  const handleExportarProdutos = () => {
    try {
      setLoadingExport(true);
      // Preparar dados para exportação compatível com importação
      const dadosExportacao = produtosFiltrados.map(produto => ({
        nome: produto.nome,
        descricao: produto.descricao || '',
        tipo_processamento: produto.tipo_processamento || '',
        categoria: produto.categoria || '',
        validade_minima: produto.validade_minima || '',
        perecivel: produto.perecivel || false,
        ativo: produto.ativo,
        estoque_minimo: produto.estoque_minimo || 0,
        fator_correcao: produto.fator_correcao || 1.0,
        tipo_fator_correcao: produto.tipo_fator_correcao || 'perda',
        unidade_distribuicao: produto.unidade_distribuicao || '',
        peso: produto.peso || ''
      }));

      if (dadosExportacao.length === 0) {
        toast.error('Nenhum produto para exportar.');
        return;
      }

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 30 }, // nome
        { wch: 40 }, // descricao
        { wch: 25 }, // tipo_processamento
        { wch: 15 }, // categoria
        { wch: 15 }, // validade_minima
        { wch: 10 }, // perecivel
        { wch: 8 },  // ativo
        { wch: 15 }, // estoque_minimo
        { wch: 15 }, // fator_correcao
        { wch: 20 }, // tipo_fator_correcao
        { wch: 20 }, // unidade_distribuicao
        { wch: 12 }  // peso
      ];
      ws['!cols'] = colWidths;

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

      // Gerar nome do arquivo com data
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const nomeArquivo = `produtos_exportacao_${dataAtual}.xlsx`;

      // Fazer download do arquivo
      XLSX.writeFile(wb, nomeArquivo);

      toast.success("Exportação concluída com sucesso!");
      setImportExportMenuAnchor(null);
    } catch (error) {
      console.error('Erro ao exportar produtos:', error);
      toast.error('Erro ao exportar produtos para Excel.');
    } finally {
      setLoadingExport(false);
    }
  };

  const handleExportarModelo = () => {
    try {
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const nomeArquivo = `modelo_importacao_produtos_${dataAtual}.xlsx`;
      gerarModeloExcelProdutos(nomeArquivo);
      setImportExportMenuAnchor(null);
    } catch (error) {
      console.error('Erro ao exportar modelo:', error);
      toast.error('Erro ao exportar modelo de importação.');
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader title="Produtos" />

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            data={produtosFiltrados}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            searchPlaceholder="Buscar produtos..."
            onCreateClick={openModal}
            createButtonLabel="Novo Produto"
            onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
            onImportExportClick={(e) => setImportExportMenuAnchor(e.currentTarget)}
            initialPageSize={50}
          />
        </Box>
      </PageContainer>

      {/* Popover de Filtros - Renderização condicional para melhor performance */}
      {Boolean(filterAnchorEl) && (
        <Popover
          open={true}
          anchorEl={filterAnchorEl}
          onClose={() => setFilterAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Box sx={{ p: 2, minWidth: 280 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Filtros
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="ativo">Ativos</MenuItem>
                <MenuItem value="inativo">Inativos</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={filters.categoria}
                label="Categoria"
                onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
              >
                <MenuItem value="todos">Todas</MenuItem>
                {categorias.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setFilters({ status: 'todos', categoria: 'todos' });
                }}
              >
                Limpar
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => setFilterAnchorEl(null)}
              >
                Aplicar
              </Button>
            </Box>
            
            {/* Indicador de filtros ativos */}
            {(filters.status !== 'todos' || filters.categoria !== 'todos') && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Filtros ativos:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {filters.status !== 'todos' && (
                    <Chip
                      label={`Status: ${filters.status === 'ativo' ? 'Ativos' : 'Inativos'}`}
                      size="small"
                      onDelete={() => setFilters({ ...filters, status: 'todos' })}
                    />
                  )}
                  {filters.categoria !== 'todos' && (
                    <Chip
                      label={`Categoria: ${filters.categoria}`}
                      size="small"
                      onDelete={() => setFilters({ ...filters, categoria: 'todos' })}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Popover>
      )}

      {/* Modal de Criação */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Novo Produto
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Preencha os dados do produto
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {erroProduto && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {erroProduto}
              </Typography>
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            {/* Informações Básicas */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Informações Básicas
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField 
                    label="Nome do Produto" 
                    value={formData.nome} 
                    onChange={(e) => {
                      setFormData({ ...formData, nome: e.target.value });
                      if (erroProduto) setErroProduto("");
                    }}
                    onBlur={() => setTouched({ ...touched, nome: true })}
                    required 
                    fullWidth 
                    error={touched.nome && !formData.nome.trim()}
                    helperText={touched.nome && !formData.nome.trim() ? "Campo obrigatório" : ""}
                    placeholder="Ex: Arroz Branco Tipo 1"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    label="Descrição" 
                    value={formData.descricao} 
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
                    multiline 
                    rows={2} 
                    fullWidth
                    placeholder="Descrição detalhada do produto"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Classificação */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Classificação e Controle
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={[
                      'Quilograma', 'Grama', 'Miligrama', 'Tonelada',
                      'Litro', 'Mililitro',
                      'Unidade', 'Dúzia', 'Caixa', 'Pacote', 'Fardo', 'Saco',
                      'Lata', 'Galão', 'Bandeja', 'Maço', 'Pote',
                      'Vidro', 'Sachê', 'Balde'
                    ]}
                    value={formData.unidade_distribuicao || ''}
                    onChange={(event, newValue) => {
                      setFormData({ ...formData, unidade_distribuicao: newValue || '' });
                    }}
                    onInputChange={(event, newInputValue) => {
                      setFormData({ ...formData, unidade_distribuicao: newInputValue });
                    }}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Unidade de Distribuição" 
                        helperText="Ex: Quilograma, Litro, Unidade"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={categorias}
                    value={formData.categoria}
                    onChange={(event, newValue) => setFormData({ ...formData, categoria: newValue || '' })}
                    onInputChange={(event, newInputValue) => setFormData({ ...formData, categoria: newInputValue })}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Categoria"
                        placeholder="Ex: Cereais, Laticínios, Carnes"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Estoque Mínimo"
                    type="number"
                    value={formData.estoque_minimo || 0}
                    onChange={(e) => {
                      setFormData({ ...formData, estoque_minimo: Number(e.target.value) });
                    }}
                    helperText="Quantidade mínima em estoque"
                    inputProps={{ min: 0, step: 1 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Validade Mínima (dias)"
                    type="number"
                    value={formData.validade_minima || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, validade_minima: Number(e.target.value) });
                    }}
                    helperText="Dias mínimos de validade"
                    inputProps={{ min: 0, step: 1 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Peso (gramas)"
                    type="number"
                    value={formData.peso || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, peso: e.target.value ? Number(e.target.value) : undefined });
                    }}
                    helperText="Peso da embalagem em gramas"
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Fator de Correção"
                    type="number"
                    value={formData.fator_correcao || 1.0}
                    onChange={(e) => {
                      setFormData({ ...formData, fator_correcao: Number(e.target.value) });
                      if (erroProduto) setErroProduto("");
                    }}
                    helperText="Fator para cálculo de perdas"
                    inputProps={{ min: 0, step: 0.001 }}
                    fullWidth
                    error={formData.fator_correcao !== undefined && Number(formData.fator_correcao) < 0}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Fator</InputLabel>
                    <Select 
                      value={formData.tipo_fator_correcao || 'perda'} 
                      onChange={(e) => setFormData({ ...formData, tipo_fator_correcao: e.target.value })} 
                      label="Tipo de Fator"
                    >
                      <MenuItem value="perda">Perda</MenuItem>
                      <MenuItem value="rendimento">Rendimento</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Processamento</InputLabel>
                    <Select 
                      value={formData.tipo_processamento || ''} 
                      onChange={(e) => setFormData({ ...formData, tipo_processamento: e.target.value })} 
                      label="Tipo de Processamento"
                    >
                      <MenuItem value="">Nenhum</MenuItem>
                      <MenuItem value="in natura">In Natura</MenuItem>
                      <MenuItem value="minimamente processado">Minimamente Processado</MenuItem>
                      <MenuItem value="ingrediente culinário">Ingrediente Culinário</MenuItem>
                      <MenuItem value="processado">Processado</MenuItem>
                      <MenuItem value="ultraprocessado">Ultraprocessado</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Status */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={formData.perecivel || false} 
                        onChange={(e) => setFormData({ ...formData, perecivel: e.target.checked })} 
                        color="primary"
                      />
                    } 
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Produto Perecível
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Requer refrigeração ou tem validade curta
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={formData.ativo} 
                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} 
                        color="primary"
                      />
                    } 
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Produto Ativo
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Produtos ativos aparecem no sistema
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={closeModal} 
            variant="outlined" 
            disabled={criarProdutoMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={criarProdutoMutation.isPending || !formData.nome.trim()}
            startIcon={criarProdutoMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {criarProdutoMutation.isPending ? 'Salvando...' : 'Salvar Produto'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Importação */}
      <ImportacaoProdutos open={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImportProdutos} />

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o produto "{produtoToDelete?.nome}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteModal}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de Importar/Exportar - Renderização condicional para melhor performance */}
      {Boolean(importExportMenuAnchor) && (
        <Menu 
          anchorEl={importExportMenuAnchor} 
          open={true}
          onClose={() => setImportExportMenuAnchor(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem 
            onClick={() => { 
              setImportExportMenuAnchor(null); 
              setImportModalOpen(true); 
            }} 
            disabled={loadingImport}
          >
            <FileUploadIcon sx={{ mr: 1 }} /> 
            {loadingImport ? 'Importando...' : 'Importar Produtos'}
          </MenuItem>
          <MenuItem 
            onClick={() => { 
              setImportExportMenuAnchor(null); 
              handleExportarProdutos(); 
            }} 
            disabled={loadingExport}
          >
            <FileDownloadIcon sx={{ mr: 1 }} /> 
            {loadingExport ? 'Exportando...' : 'Exportar Excel'}
          </MenuItem>
          <MenuItem 
            onClick={() => { 
              setImportExportMenuAnchor(null); 
              handleExportarModelo(); 
            }}
          >
            <FileDownloadIcon sx={{ mr: 1 }} /> 
            Exportar Modelo
          </MenuItem>
        </Menu>
      )}

      <LoadingOverlay 
        open={criarProdutoMutation.isPending || loadingImport || loadingExport}
        message={
          criarProdutoMutation.isPending ? 'Salvando produto...' :
          loadingImport ? 'Importando produtos...' :
          loadingExport ? 'Exportando para Excel...' :
          'Processando...'
        }
      />
    </Box>
  );
};

export default ProdutosPage;
