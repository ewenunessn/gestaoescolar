import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
} from "@mui/material";
import {
  validarDocumento,
  formatarDocumento,
  aplicarMascaraDocumento,
  detectarTipoDocumento
} from '../utils/validacaoDocumento';
import { 
  Add, 
  Edit, 
  Delete, 
  Assignment, 
  Visibility, 
  Business, 
  FileDownload 
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  listarFornecedores,
  criarFornecedor,
  editarFornecedor,
  removerFornecedor,
  importarFornecedoresLote,
  verificarRelacionamentosFornecedor,
} from "../services/fornecedores";
import ImportacaoFornecedores from '../components/ImportacaoFornecedores';
import ConfirmacaoExclusaoFornecedor from '../components/ConfirmacaoExclusaoFornecedor';
import * as XLSX from 'xlsx';

interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  ativo: boolean;
}

const Fornecedores: React.FC = () => {
  const navigate = useNavigate();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    observacoes: "",
    ativo: true,
  });
  const [documentoErro, setDocumentoErro] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [fornecedorParaExcluir, setFornecedorParaExcluir] = useState<Fornecedor | null>(null);

  useEffect(() => {
    carregarFornecedores();
  }, []);

  const carregarFornecedores = async () => {
    try {
      setLoading(true);
      const data = await listarFornecedores();
      setFornecedores(data);
    } catch (error) {
      setError("Erro ao carregar fornecedores");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setFormData({
        nome: fornecedor.nome,
        cnpj: fornecedor.cnpj || "",
  
        email: fornecedor.email || "",
        telefone: fornecedor.telefone || "",
        endereco: fornecedor.endereco || "",
        cidade: fornecedor.cidade || "",
        estado: fornecedor.estado || "",
        cep: fornecedor.cep || "",
        observacoes: fornecedor.observacoes || "",
        ativo: fornecedor.ativo,
      });
    } else {
      setEditingFornecedor(null);
      setFormData({
        nome: "",
        cnpj: "",
  
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        observacoes: "",
        ativo: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingFornecedor(null);
    setError(null);
    setDocumentoErro(null);
  };

  // Função para lidar com mudanças no campo de documento
  const handleDocumentoChange = (valor: string) => {
    // Aplicar máscara automaticamente
    const valorFormatado = aplicarMascaraDocumento(valor);
    setFormData({ ...formData, cnpj: valorFormatado });
    
    // Validar em tempo real apenas se o campo não estiver vazio
    if (valor.trim() !== '') {
      const validacao = validarDocumento(valor);
      setDocumentoErro(validacao.valido ? null : validacao.mensagem);
    } else {
      setDocumentoErro(null);
    }
  };

  const handleSave = async () => {
    try {
      // Validações básicas
      if (!formData.nome.trim()) {
        setError("Nome é obrigatório");
        return;
      }
      
      if (!formData.cnpj.trim()) {
        setError("CPF/CNPJ é obrigatório");
        return;
      }

      // Validação do documento (CPF ou CNPJ)
      const validacaoDocumento = validarDocumento(formData.cnpj);
      if (!validacaoDocumento.valido) {
        setError(validacaoDocumento.mensagem);
        setDocumentoErro(validacaoDocumento.mensagem);
        return;
      }

      if (editingFornecedor) {
        await editarFornecedor(editingFornecedor.id, formData);
      } else {
        await criarFornecedor(formData);
      }

      await carregarFornecedores();
      handleCloseDialog();
    } catch (error: any) {
      const mensagemErro = error.response?.data?.message || "Erro ao salvar fornecedor";
      setError(mensagemErro);
    }
  };

  const handleDelete = async (fornecedor: Fornecedor) => {
    setFornecedorParaExcluir(fornecedor);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fornecedorParaExcluir) return;
    
    try {
      await removerFornecedor(fornecedorParaExcluir.id);
      await carregarFornecedores();
      setSuccessMessage("Fornecedor removido com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || "Erro ao remover fornecedor");
      setTimeout(() => setError(null), 5000);
    } finally {
      setConfirmDeleteOpen(false);
      setFornecedorParaExcluir(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
    setFornecedorParaExcluir(null);
  };

  const handleVerContratos = (fornecedor: Fornecedor) => {
    navigate(`/contratos?fornecedor_id=${fornecedor.id}`);
  };

  const handleVerDetalhes = (fornecedor: Fornecedor) => {
    navigate(`/fornecedores/${fornecedor.id}`);
  };

  // Função para importação em lote
  const handleImportFornecedores = async (fornecedoresImportacao: any[]) => {
    try {
      setLoading(true);

      const resultado = await importarFornecedoresLote(fornecedoresImportacao);

      const { insercoes = 0, atualizacoes = 0 } = resultado.resultados;
      let mensagemSucesso = '';
      
      if (insercoes > 0 && atualizacoes > 0) {
        mensagemSucesso = `${insercoes} fornecedores inseridos e ${atualizacoes} atualizados com sucesso!`;
      } else if (insercoes > 0) {
        mensagemSucesso = `${insercoes} fornecedores inseridos com sucesso!`;
      } else if (atualizacoes > 0) {
        mensagemSucesso = `${atualizacoes} fornecedores atualizados com sucesso!`;
      } else {
        mensagemSucesso = 'Importação concluída!';
      }

      if (resultado.resultados.sucesso > 0) {
        setSuccessMessage(mensagemSucesso);
        await carregarFornecedores();
      }

      if (resultado.resultados.erros > 0) {
        setError(`${resultado.resultados.erros} fornecedores não puderam ser importados. Verifique os dados.`);
      }

      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    } catch (err: any) {
      console.error('Erro na importação em lote:', err);
      setError('Erro ao importar fornecedores. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para exportar fornecedores para Excel
  const handleExportarFornecedores = async () => {
    if (fornecedores.length === 0) {
      setError('Nenhum fornecedor disponível para exportação.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setLoading(true);
      
      // Preparar dados para exportação no formato correto para importação
      const dadosExportacao = fornecedores.map((fornecedor) => ({
        nome: fornecedor.nome || '',
        cnpj: fornecedor.cnpj || '',
        email: fornecedor.email || '',
        telefone: fornecedor.telefone || '',
        endereco: fornecedor.endereco || '',
        cidade: '', // Campo não disponível na interface atual
        estado: '', // Campo não disponível na interface atual
        cep: '', // Campo não disponível na interface atual
  
        observacoes: '', // Campo não disponível na interface atual
        ativo: fornecedor.ativo ? 'true' : 'false'
      }));

      // Criar planilha principal
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      
      // Definir largura das colunas
      ws['!cols'] = [
        { wch: 30 }, // nome
        { wch: 18 }, // cnpj
        { wch: 25 }, // email
        { wch: 15 }, // telefone
        { wch: 30 }, // endereco
        { wch: 15 }, // cidade
        { wch: 8 },  // estado
        { wch: 12 }, // cep
  
        { wch: 35 }, // observacoes
        { wch: 8 }   // ativo
      ];

      // Criar workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fornecedores');

      // Gerar nome do arquivo com data/hora
      const agora = new Date();
      const dataFormatada = agora.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const horaFormatada = agora.toLocaleTimeString('pt-BR').replace(/:/g, '-');
      const nomeArquivo = `fornecedores_${dataFormatada}_${horaFormatada}.xlsx`;

      // Fazer download
      XLSX.writeFile(wb, nomeArquivo);

      setSuccessMessage(`${fornecedores.length} fornecedores exportados com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Erro na exportação:', error);
      setError('Erro ao exportar fornecedores. Tente novamente.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Fornecedores
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Novo Fornecedor (CNPJ)
          </Button>

          <Button
            startIcon={<Business />}
            onClick={() => setImportModalOpen(true)}
            variant="outlined"
            sx={{
              borderColor: '#4f46e5',
              color: '#4f46e5',
              '&:hover': {
                borderColor: '#4338ca',
                color: '#4338ca',
                bgcolor: '#f8fafc'
              },
            }}
          >
            Importar em Lote
          </Button>
          <Button
            startIcon={<FileDownload />}
            onClick={handleExportarFornecedores}
            variant="outlined"
            sx={{
              borderColor: '#059669',
              color: '#059669',
              '&:hover': {
                borderColor: '#047857',
                color: '#047857',
                bgcolor: '#f0fdf4'
              },
            }}
          >
            Exportar Excel
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>CPF/CNPJ</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fornecedores.map((fornecedor) => (
              <TableRow key={fornecedor.id}>
                <TableCell>{fornecedor.nome}</TableCell>
                <TableCell>
                  {fornecedor.cnpj ? (
                    <Box>
                      <Typography variant="body2">
                        {formatarDocumento(fornecedor.cnpj)}
                      </Typography>
                      <Chip 
                        label={detectarTipoDocumento(fornecedor.cnpj)} 
                        size="small" 
                        color={detectarTipoDocumento(fornecedor.cnpj) === 'CPF' ? 'primary' : 'secondary'}
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                      />
                    </Box>
                  ) : "-"}
                </TableCell>
                <TableCell>{fornecedor.email || "-"}</TableCell>
                <TableCell>{fornecedor.telefone || "-"}</TableCell>
                <TableCell>
                  <Chip 
                    label={fornecedor.ativo ? "Ativo" : "Inativo"}
                    color={fornecedor.ativo ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleVerDetalhes(fornecedor)}
                    title="Ver Detalhes"
                    color="primary"
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleVerContratos(fornecedor)}
                    title="Ver Contratos"
                  >
                    <Assignment />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(fornecedor)}
                    title="Editar"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(fornecedor)}
                    title="Excluir"
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Nome *"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              fullWidth
            />
            <TextField
              label={`${detectarTipoDocumento(formData.cnpj) !== 'INVALIDO' ? detectarTipoDocumento(formData.cnpj) : 'CPF/CNPJ'} *`}
              value={formData.cnpj}
              onChange={(e) => handleDocumentoChange(e.target.value)}
              error={!!documentoErro}
              helperText={documentoErro || (formData.cnpj && detectarTipoDocumento(formData.cnpj) !== 'INVALIDO' ? `${detectarTipoDocumento(formData.cnpj)} detectado` : 'Digite CPF (11 dígitos) ou CNPJ (14 dígitos)')}
              fullWidth
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
            />

            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Endereço"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Cidade"
              value={formData.cidade}
              onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
              fullWidth
            />
            <TextField
              label="Estado"
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              fullWidth
            />
            <TextField
              label="CEP"
              value={formData.cep}
              onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
              fullWidth
            />
            <TextField
              label="Observações"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                />
              }
              label="Ativo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Importação */}
      <ImportacaoFornecedores
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportFornecedores}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmacaoExclusaoFornecedor
        open={confirmDeleteOpen}
        fornecedor={fornecedorParaExcluir}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />


    </Box>
  );
};

export default Fornecedores;