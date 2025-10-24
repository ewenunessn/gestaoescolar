import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import { ArrowBack, Save, Business as BusinessIcon, Description as DescriptionIcon } from "@mui/icons-material";
import { listarFornecedores, buscarFornecedor } from "../services/fornecedores";
import { criarContrato } from "../services/contratos";
import PageBreadcrumbs from '../components/PageBreadcrumbs';

interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  ativo: boolean;
}

export default function NovoContrato() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fornecedorIdParam = searchParams.get("fornecedor_id");

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fornecedor_id: "",
    numero: "",
    data_inicio: "",
    data_fim: "",
  });

  useEffect(() => {
    carregarDados();
  }, [fornecedorIdParam]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar lista de fornecedores
      const fornecedoresData = await listarFornecedores();
      const fornecedoresAtivos = fornecedoresData.filter((f: Fornecedor) => f.ativo);
      setFornecedores(fornecedoresAtivos);

      // Se veio com fornecedor pré-selecionado
      if (fornecedorIdParam) {
        const fornecedorData = await buscarFornecedor(Number(fornecedorIdParam));
        setFornecedorSelecionado(fornecedorData);
        setFormData(prev => ({
          ...prev,
          fornecedor_id: fornecedorIdParam,
        }));
      }
    } catch (error: any) {
      setError(error.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFornecedorChange = async (fornecedorId: string) => {
    setFormData(prev => ({
      ...prev,
      fornecedor_id: fornecedorId,
    }));

    if (fornecedorId) {
      try {
        const fornecedorData = await buscarFornecedor(Number(fornecedorId));
        setFornecedorSelecionado(fornecedorData);
      } catch (error) {
        console.error("Erro ao buscar fornecedor:", error);
      }
    } else {
      setFornecedorSelecionado(null);
    }
  };

  const handleSave = async () => {
    try {
      // Validações
      if (!formData.fornecedor_id) {
        setError("Selecione um fornecedor");
        return;
      }
      if (!formData.numero.trim()) {
        setError("Número do contrato é obrigatório");
        return;
      }

      if (!formData.data_inicio) {
        setError("Data de início é obrigatória");
        return;
      }
      if (!formData.data_fim) {
        setError("Data de fim é obrigatória");
        return;
      }
      if (new Date(formData.data_fim) <= new Date(formData.data_inicio)) {
        setError("Data de fim deve ser posterior à data de início");
        return;
      }

      setSaving(true);
      setError(null);

      const novoContrato = await criarContrato({
        ...formData,
        fornecedor_id: Number(formData.fornecedor_id),
        ativo: true,
      });

      // Navegar para os detalhes do contrato criado
      navigate(`/contratos/${novoContrato.id}`);
    } catch (error: any) {
      setError(error.message || "Erro ao criar contrato");
    } finally {
      setSaving(false);
    }
  };

  const handleVoltar = () => {
    if (fornecedorIdParam) {
      navigate(`/fornecedores/${fornecedorIdParam}`);
    } else {
      navigate("/contratos");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageBreadcrumbs 
        items={[
          { label: fornecedorIdParam ? 'Fornecedores' : 'Contratos', 
            path: fornecedorIdParam ? '/fornecedores' : '/contratos', 
            icon: fornecedorIdParam ? <BusinessIcon fontSize="small" /> : <DescriptionIcon fontSize="small" /> },
          ...(fornecedorIdParam && fornecedorSelecionado ? 
            [{ label: fornecedorSelecionado.nome, path: `/fornecedores/${fornecedorIdParam}` }] : []),
          { label: 'Novo Contrato' }
        ]}
      />
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={handleVoltar}
        >
          {fornecedorIdParam ? "Voltar para Fornecedor" : "Voltar para Contratos"}
        </Button>
      </Box>

      {/* Formulário */}
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Novo Contrato
            {fornecedorSelecionado && (
              <Typography variant="subtitle1" color="text.secondary">
                para {fornecedorSelecionado.nome}
              </Typography>
            )}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Fornecedor *</InputLabel>
                <Select
                  value={formData.fornecedor_id}
                  label="Fornecedor *"
                  onChange={(e) => handleFornecedorChange(e.target.value)}
                  disabled={!!fornecedorIdParam} // Desabilitar se veio pré-selecionado
                >
                  {fornecedores.map((fornecedor) => (
                    <MenuItem key={fornecedor.id} value={fornecedor.id.toString()}>
                      {fornecedor.nome} - {fornecedor.cnpj}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Número do Contrato *"
                value={formData.numero}
                onChange={(e) => handleInputChange("numero", e.target.value)}
                fullWidth
                placeholder="Ex: 001/2024"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Data de Início *"
                type="date"
                value={formData.data_inicio}
                onChange={(e) => handleInputChange("data_inicio", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Data de Fim *"
                type="date"
                value={formData.data_fim}
                onChange={(e) => handleInputChange("data_fim", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              onClick={handleVoltar}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Criar Contrato"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}