import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  InputAdornment,
  Chip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Tooltip,
  Menu,
  Collapse,
  Divider,
  Fade,
  Slide,
  ListItemIcon,
  ListItemText,
  Grid,
  TablePagination,
  Checkbox,
  OutlinedInput,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Info,
  School,
  CheckCircle,
  Cancel,
  Clear,
  Route,
  Download,
  MoreVert,
  Upload,
  TuneRounded,
  ExpandMore,
  ExpandLess,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { listarEscolas, criarEscola, importarEscolasLote } from '../services/escolas';
import ImportacaoEscolas from '../components/ImportacaoEscolas';
import LocationSelector from '../components/LocationSelector';
import * as XLSX from 'xlsx';

interface Escola {
  id: number;
  nome: string;
  codigo?: string;
  codigo_acesso: string;
  endereco?: string;
  municipio?: string;
  endereco_maps?: string;
  telefone?: string;
  email?: string;
  nome_gestor?: string;
  administracao?: 'municipal' | 'estadual' | 'federal' | 'particular';
  ativo: boolean;
  total_alunos?: number;
  modalidades?: string;
}

interface ErroImportacao {
  escola: string;
  erro: string;
  sucesso: boolean;
}

const EscolasPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  // Estados principais
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados para exibir detalhes dos erros de importação
  const [errosImportacao, setErrosImportacao] = useState<ErroImportacao[]>([]);
  const [mostrarErros, setMostrarErros] = useState(false);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estados do modal (apenas para criação)
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    codigo_acesso: '',
    endereco: '',
    municipio: '',
    endereco_maps: '',
    telefone: '',
    email: '',
    nome_gestor: '',
    administracao: '' as 'municipal' | 'estadual' | 'federal' | 'particular' | '',
    ativo: true,
  });

  // Carregar escolas
  const loadEscolas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listarEscolas();
      // Ensure data is always an array
      setEscolas(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Erro ao carregar escolas:', err);
      setError('Erro ao carregar escolas. Tente novamente.');
      setEscolas([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEscolas();
  }, []);

  // Detectar filtros ativos
  useEffect(() => {
    const hasFilters = selectedMunicipio || selectedStatus || searchTerm || selectedModalidades.length > 0;
    setHasActiveFilters(!!hasFilters);
  }, [selectedMunicipio, selectedStatus, searchTerm, selectedModalidades]);

  // Extrair dados únicos para filtros
  const municipios = [...new Set(escolas.map(e => e.municipio).filter(Boolean))];
  const modalidades = [...new Set(
    escolas
      .map(e => e.modalidades)
      .filter(Boolean)
      .flatMap(m => m.split(',').map(mod => mod.trim()))
  )].sort();

  // Filtrar e ordenar escolas
  const filteredEscolas = useMemo(() => {
    return escolas.filter(escola => {
      const matchesSearch = escola.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        escola.endereco?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        escola.municipio?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMunicipio = !selectedMunicipio || escola.municipio === selectedMunicipio;
      const matchesStatus = !selectedStatus ||
        (selectedStatus === 'ativo' && escola.ativo) ||
        (selectedStatus === 'inativo' && !escola.ativo);
      const matchesModalidades = selectedModalidades.length === 0 || 
        (escola.modalidades && selectedModalidades.some(modalidade => 
          escola.modalidades!.split(',').map(m => m.trim()).includes(modalidade)
        ));
      return matchesSearch && matchesMunicipio && matchesStatus && matchesModalidades;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nome.localeCompare(b.nome);
        case 'municipio':
          return (a.municipio || '').localeCompare(b.municipio || '');
        case 'status':
          return Number(b.ativo) - Number(a.ativo);

        default:
          return a.nome.localeCompare(b.nome);
      }
    });
  }, [escolas, searchTerm, selectedMunicipio, selectedStatus, selectedModalidades, sortBy]);

  // Escolas paginadas
  const paginatedEscolas = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredEscolas.slice(startIndex, endIndex);
  }, [filteredEscolas, page, rowsPerPage]);

  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedMunicipio, selectedStatus, selectedModalidades, sortBy]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedMunicipio('');
    setSelectedStatus('');
    setSelectedModalidades([]);
    setSortBy('name');
    setPage(0);
  }, []);

  const toggleFilters = useCallback(() => {
    setFiltersExpanded(!filtersExpanded);
  }, [filtersExpanded]);

  // Componente de conteúdo dos filtros
  const FiltersContent = () => (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '16px',
        p: 3,
        border: '1px solid rgba(148, 163, 184, 0.1)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(79, 70, 229, 0.3), transparent)',
        },
      }}
    >
      {/* Header dos filtros */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TuneRounded sx={{ color: '#4f46e5', fontSize: 20 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              Filtros Avançados
            </Typography>
          </Box>
          {hasActiveFilters && (
            <Chip
              label="Ativo"
              size="small"
              sx={{
                bgcolor: '#4f46e5',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          )}
        </Box>
        {hasActiveFilters && (
          <Button
            size="small"
            onClick={clearFilters}
            sx={{
              color: '#64748b',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { bgcolor: 'rgba(100, 116, 139, 0.1)' },
            }}
          >
            Limpar Tudo
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 3, borderColor: 'rgba(148, 163, 184, 0.2)' }} />

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Município</InputLabel>
          <Select
            value={selectedMunicipio}
            onChange={(e) => setSelectedMunicipio(e.target.value)}
            label="Município"
            sx={{
              borderRadius: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4f46e5',
              },
            }}
          >
            <MenuItem value="">Todos os municípios</MenuItem>
            {municipios.map(municipio => (
              <MenuItem key={municipio} value={municipio}>{municipio}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            label="Status"
            sx={{
              borderRadius: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4f46e5',
              },
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ativo">Ativas</MenuItem>
            <MenuItem value="inativo">Inativas</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Ordenar por</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label="Ordenar por"
            sx={{
              borderRadius: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4f46e5',
              },
            }}
          >
            <MenuItem value="name">Nome</MenuItem>
            <MenuItem value="municipio">Município</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Modalidades</InputLabel>
          <Select
            multiple
            value={selectedModalidades}
            onChange={(e) => setSelectedModalidades(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
            input={<OutlinedInput label="Modalidades" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
            sx={{
              borderRadius: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4f46e5',
              },
            }}
          >
            {modalidades.map((modalidade) => (
              <MenuItem key={modalidade} value={modalidade}>
                <Checkbox checked={selectedModalidades.indexOf(modalidade) > -1} />
                {modalidade}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Chips de filtros ativos */}
      {hasActiveFilters && (
        <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {selectedMunicipio && (
            <Chip
              label={`Município: ${selectedMunicipio}`}
              onDelete={() => setSelectedMunicipio('')}
              size="small"
              sx={{
                bgcolor: 'rgba(79, 70, 229, 0.1)',
                color: '#4f46e5',
                '& .MuiChip-deleteIcon': { color: '#4f46e5' },
              }}
            />
          )}
          {selectedStatus && (
            <Chip
              label={`Status: ${selectedStatus === 'ativo' ? 'Ativas' : 'Inativas'}`}
              onDelete={() => setSelectedStatus('')}
              size="small"
              sx={{
                bgcolor: 'rgba(79, 70, 229, 0.1)',
                color: '#4f46e5',
                '& .MuiChip-deleteIcon': { color: '#4f46e5' },
              }}
            />
          )}
          {searchTerm && (
            <Chip
              label={`Busca: ${searchTerm}`}
              onDelete={() => setSearchTerm('')}
              size="small"
              sx={{
                bgcolor: 'rgba(79, 70, 229, 0.1)',
                color: '#4f46e5',
                '& .MuiChip-deleteIcon': { color: '#4f46e5' },
              }}
            />
          )}
          {selectedModalidades.map((modalidade) => (
            <Chip
              key={modalidade}
              label={`Modalidade: ${modalidade}`}
              onDelete={() => setSelectedModalidades(prev => prev.filter(m => m !== modalidade))}
              size="small"
              sx={{
                bgcolor: 'rgba(79, 70, 229, 0.1)',
                color: '#4f46e5',
                '& .MuiChip-deleteIcon': { color: '#4f46e5' },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );

  // Funções do modal (apenas para criação)
  const openModal = () => {
    setFormData({
      nome: '',
      codigo: '',
      codigo_acesso: '',
      endereco: '',
      municipio: '',
      endereco_maps: '',
      telefone: '',
      email: '',
      nome_gestor: '',
      administracao: '',
      ativo: true,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      nome: '',
      codigo: '',
      codigo_acesso: '',
      endereco: '',
      municipio: '',
      endereco_maps: '',
      telefone: '',
      email: '',
      nome_gestor: '',
      administracao: '',
      ativo: true,
    });
  };

  const handleSave = async () => {
    try {
      // Preparar dados para envio, convertendo string vazia para null
      const dadosParaEnvio = {
        ...formData,
        administracao: formData.administracao === '' ? null : formData.administracao,

      };

      await criarEscola(dadosParaEnvio);
      setSuccessMessage('Escola criada com sucesso!');

      closeModal();
      await loadEscolas();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar escola:', err);
      setError('Erro ao salvar escola. Tente novamente.');
    }
  };

  const handleViewDetails = (escola: Escola) => {
    navigate(`/escolas/${escola.id}`);
  };

  // Função para importação em lote
  const handleImportEscolas = async (escolasImportacao: any[]) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      console.log(`📥 Iniciando importação de ${escolasImportacao.length} escolas...`);

      // Usar o endpoint otimizado de importação em lote
      const resultado = await importarEscolasLote(escolasImportacao);

      const { insercoes = 0, atualizacoes = 0 } = resultado.resultados;
      let mensagemSucesso = '';

      if (insercoes > 0 && atualizacoes > 0) {
        mensagemSucesso = `${insercoes} escolas inseridas e ${atualizacoes} atualizadas com sucesso!`;
      } else if (insercoes > 0) {
        mensagemSucesso = `${insercoes} escolas inseridas com sucesso!`;
      } else if (atualizacoes > 0) {
        mensagemSucesso = `${atualizacoes} escolas atualizadas com sucesso!`;
      } else {
        mensagemSucesso = 'Importação concluída!';
      }

      if (resultado.resultados.sucesso > 0) {
        setSuccessMessage(mensagemSucesso);
        await loadEscolas();
      }

      if (resultado.resultados.erros > 0) {
        const errosDetalhados = resultado.resultados.detalhes.filter((d: ErroImportacao) => !d.sucesso);
        setErrosImportacao(errosDetalhados);

        // Mostrar detalhes dos primeiros erros
        const primeirosErros = errosDetalhados
          .slice(0, 3)
          .map((d: ErroImportacao) => `${d.escola}: ${d.erro}`)
          .join('; ');

        setError(`${resultado.resultados.erros} escolas não puderam ser importadas. Primeiros erros: ${primeirosErros}`);

        // Log completo dos erros para debug
        console.log('🔍 Detalhes completos dos erros:', errosDetalhados);

        // Agrupar erros por tipo para melhor análise
        const errosPorTipo: { [key: string]: string[] } = {};
        errosDetalhados.forEach((erro: ErroImportacao) => {
          const tipoErro = erro.erro || 'Erro desconhecido';
          if (!errosPorTipo[tipoErro]) {
            errosPorTipo[tipoErro] = [];
          }
          errosPorTipo[tipoErro].push(erro.escola);
        });

        console.log('📊 Erros agrupados por tipo:');
        Object.entries(errosPorTipo).forEach(([tipo, escolas]) => {
          console.log(`   ${tipo}: ${escolas.length} escolas`);
          console.log(`     Exemplos: ${escolas.slice(0, 3).join(', ')}`);
        });
      }

      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    } catch (err: any) {
      console.error('Erro na importação em lote:', err);
      setError('Erro ao importar escolas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para exportar escolas em Excel
  const handleExportarEscolas = async () => {
    try {
      setLoading(true);

      // Usar escolas filtradas
      let escolasParaExportar = filteredEscolas;

      if (escolasParaExportar.length === 0) {
        setError('Nenhuma escola encontrada para exportar.');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Preparar dados para exportação
      const dadosExportacao = escolasParaExportar
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(escola => ({
          'nome': escola.nome,
          'codigo': escola.codigo || '',
          'codigo_acesso': escola.codigo_acesso,
          'endereco': escola.endereco || '',
          'municipio': escola.municipio || '',
          'endereco_maps': escola.endereco_maps || '',
          'telefone': escola.telefone || '',
          'email': escola.email || '',
          'nome_gestor': escola.nome_gestor || '',
          'administracao': escola.administracao || '',
          'ativo': escola.ativo ? 'true' : 'false'
        }));

      // Criar workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);

      // Configurar largura das colunas
      const colWidths = [
        { wch: 35 },  // nome
        { wch: 15 },  // codigo
        { wch: 15 },  // codigo_acesso
        { wch: 45 },  // endereco
        { wch: 20 },  // municipio
        { wch: 50 },  // endereco_maps
        { wch: 15 },  // telefone
        { wch: 25 },  // email
        { wch: 25 },  // nome_gestor
        { wch: 15 },  // administracao
        { wch: 10 }   // ativo
      ];
      ws['!cols'] = colWidths;

      // Adicionar worksheet ao workbook
      const nomeSheet = 'Escolas';
      XLSX.utils.book_append_sheet(wb, ws, nomeSheet);

      // Gerar nome do arquivo com data/hora
      const agora = new Date();
      const dataHora = agora.toISOString().slice(0, 19).replace(/[T:]/g, '_').replace(/-/g, '');
      const nomeArquivo = `exportacao_escolas_${dataHora}.xlsx`;

      // Fazer download
      XLSX.writeFile(wb, nomeArquivo);

      const mensagem = `${dadosExportacao.length} escolas exportadas!`;

      setSuccessMessage(mensagem);
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err: any) {
      console.error('Erro ao exportar escolas:', err);
      setError('Erro ao exportar escolas. Tente novamente.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>


      {/* Mensagem de Sucesso */}
      {successMessage && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 9999,
          }}
        >
          <Alert
            severity="success"
            onClose={() => setSuccessMessage(null)}
            sx={{
              minWidth: 300,
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {successMessage}
          </Alert>
        </Box>
      )}

      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Controles */}
        <Card
          sx={{
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            p: 3,
            mb: 3,
          }}
        >
          {/* Primeira linha: Busca e botões de ação */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            {/* Barra de busca */}
            <TextField
              placeholder="Buscar escolas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: 'rgba(248, 250, 252, 0.8)',
                  '& fieldset': {
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: '#4f46e5',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4f46e5',
                    boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#64748b' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerm('')}
                    sx={{ color: '#64748b' }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              }}
            />

            {/* Botões */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'}
                startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />}
                onClick={toggleFilters}
                sx={{
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  ...(filtersExpanded || hasActiveFilters ? {
                    bgcolor: '#4f46e5',
                    '&:hover': { bgcolor: '#4338ca' },
                  } : {
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                    color: '#64748b',
                    '&:hover': {
                      borderColor: '#4f46e5',
                      bgcolor: 'rgba(79, 70, 229, 0.05)',
                    },
                  }),
                }}
              >
                Filtros
                {hasActiveFilters && !filtersExpanded && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#ef4444',
                    }}
                  />
                )}
              </Button>

              <Button
                 startIcon={<AddIcon />}
                 onClick={() => openModal()}
                 sx={{
                   bgcolor: '#059669',
                   color: 'white',
                   textTransform: 'none',
                   borderRadius: '12px',
                   fontWeight: 600,
                   fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                   '&:hover': { bgcolor: '#047857' },
                 }}
               >
                 Nova Escola
               </Button>

              <IconButton
                onClick={(e) => setActionsMenuAnchor(e.currentTarget)}
                sx={{
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  color: '#6b7280',
                  '&:hover': {
                    bgcolor: '#f9fafb',
                    borderColor: '#9ca3af',
                  },
                }}
              >
                <MoreVert />
              </IconButton>
            </Box>
          </Box>

          {/* Filtros colapsáveis */}
          <Collapse in={filtersExpanded} timeout={400}>
            <Box sx={{ mb: 3 }}>
              <FiltersContent />
            </Box>
          </Collapse>

          {/* Contador de escolas */}
          <Typography 
            variant="body2" 
            sx={{ 
              mb: 2, 
              color: '#64748b',
              fontWeight: 500,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {filteredEscolas.length > 0 
              ? `Mostrando ${Math.min((page * rowsPerPage) + 1, filteredEscolas.length)}-${Math.min((page + 1) * rowsPerPage, filteredEscolas.length)} de ${filteredEscolas.length} escolas${filteredEscolas.length !== escolas.length ? ` (${escolas.length} total)` : ''}`
              : `0 de ${escolas.length} escolas`
            }
          </Typography>
        </Card>

        {/* Tabela de Escolas */}
        {loading ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                Carregando escolas...
              </Typography>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
                {errosImportacao.length > 0 && (
                  <Button
                    size="small"
                    onClick={() => setMostrarErros(true)}
                    sx={{ ml: 2, textTransform: 'none' }}
                  >
                    Ver Detalhes dos Erros
                  </Button>
                )}
              </Alert>
              <Button
                variant="contained"
                onClick={loadEscolas}
                sx={{
                  bgcolor: '#4f46e5',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#4338ca' },
                }}
              >
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        ) : filteredEscolas.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <School sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                Nenhuma escola encontrada
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Tente ajustar os filtros ou buscar por outros termos
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome da Escola</TableCell>
                  <TableCell>Modalidades</TableCell>
                  <TableCell>Município</TableCell>
                  <TableCell align="center">Alunos</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedEscolas.map((escola) => (
                  <TableRow key={escola.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {escola.nome}
                      </Typography>
                      {escola.endereco && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {escola.endereco}
                        </Typography>
                      )}
                      {escola.codigo && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
                          Código: {escola.codigo}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {escola.modalidades || 'Nenhuma modalidade'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {escola.municipio || 'Não informado'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {escola.total_alunos || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={escola.ativo ? 'Ativa' : 'Inativa'}
                        size="small"
                        color={escola.ativo ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver Detalhes">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(escola)}
                          color="primary"
                        >
                          <Info fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredEscolas.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                '& .MuiTablePagination-toolbar': {
                  paddingLeft: 2,
                  paddingRight: 2,
                },
              }}
            />
          </TableContainer>
        )}
      </Box>

      {/* Modal de Criação/Edição */}
      <Dialog
        open={modalOpen}
        onClose={closeModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontWeight: 600,
            color: '#1f2937',
          }}
        >
          Nova Escola
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Nome da Escola"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Código da Escola"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
                placeholder="Ex: ESC001"
                helperText="Código interno da escola (opcional)"
              />
              <TextField
                label="Código de Acesso"
                value={formData.codigo_acesso}
                onChange={(e) => setFormData({ ...formData, codigo_acesso: e.target.value })}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
                placeholder="123456"
                helperText="6 dígitos para acesso do gestor"
                inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
              />
            </Box>
            <TextField
              label="Endereço"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              fullWidth
              multiline
              rows={2}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Município"
              value={formData.municipio}
              onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <LocationSelector
              label="Localização no Mapa"
              value={formData.endereco_maps}
              onChange={(location, coordinates) => {
                setFormData({
                  ...formData,
                  endereco_maps: location
                });
              }}
              placeholder="Cole uma URL do Google Maps, pesquise um endereço ou clique no mapa"
              helperText="Selecione a localização da escola para facilitar a entrega"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
                placeholder="(11) 99999-9999"
              />
              <TextField
                label="E-mail"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
                placeholder="escola@exemplo.com"
                type="email"
              />
            </Box>
            <TextField
              label="Nome do Gestor(a)"
              value={formData.nome_gestor}
              onChange={(e) => setFormData({ ...formData, nome_gestor: e.target.value })}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Administração</InputLabel>
              <Select
                value={formData.administracao}
                onChange={(e) => setFormData({ ...formData, administracao: e.target.value as 'municipal' | 'estadual' | 'federal' | 'particular' })}
                label="Administração"
                sx={{
                  borderRadius: '8px',
                }}
              >
                <MenuItem value="">Selecione...</MenuItem>
                <MenuItem value="municipal">Municipal</MenuItem>
                <MenuItem value="estadual">Estadual</MenuItem>
                <MenuItem value="federal">Federal</MenuItem>
                <MenuItem value="particular">Particular</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  color="primary"
                />
              }
              label="Escola Ativa"
              sx={{
                '& .MuiFormControlLabel-label': {
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={closeModal}
            sx={{
              color: '#6b7280',
              textTransform: 'none',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.nome.trim()}
            sx={{
              bgcolor: '#4f46e5',
              textTransform: 'none',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              '&:hover': { bgcolor: '#4338ca' },
            }}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Importação em Lote */}
      <ImportacaoEscolas
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportEscolas}
      />

      {/* Menu de Ações */}
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={() => setActionsMenuAnchor(null)}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            mt: 1,
            minWidth: 200,
          }
        }}
      >
        <MenuItem
          onClick={() => {
            setActionsMenuAnchor(null);
            setImportModalOpen(true);
          }}
          sx={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            py: 1.5,
            px: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Upload sx={{ fontSize: 18, color: '#4f46e5' }} />
            <Typography>Importar em Lote</Typography>
          </Box>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setActionsMenuAnchor(null);
            handleExportarEscolas();
          }}
          sx={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            py: 1.5,
            px: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Download sx={{ fontSize: 18, color: '#059669' }} />
            <Typography>Exportar Excel</Typography>
          </Box>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default EscolasPage;