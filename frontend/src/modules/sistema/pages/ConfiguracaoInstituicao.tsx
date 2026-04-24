import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  PictureAsPdf as PdfIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { useToast } from "../../../hooks/useToast";
import {
  Instituicao,
  InstituicaoForm,
  arquivoParaBase64,
  atualizarInstituicao,
  buscarInstituicao,
  uploadLogoBase64,
} from "../../../services/instituicao";

const sectionTitleSx = {
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0,
  color: "text.secondary",
};

const SectionTitle = ({ label }: { label: string }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2.5 }}>
    <Box sx={{ width: 18, height: 3, borderRadius: 1, bgcolor: "text.secondary" }} />
    <Typography sx={sectionTitleSx}>{label}</Typography>
  </Box>
);

const emptyForm: InstituicaoForm = {
  nome: "",
  cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
  site: "",
  secretario_nome: "",
  secretario_cargo: "Secretario(a) de Educacao",
  departamento: "",
};

const ConfiguracaoInstituicaoPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<InstituicaoForm>(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await buscarInstituicao();
      setInstituicao(data);
      setFormData({
        nome: data.nome || "",
        cnpj: data.cnpj || "",
        endereco: data.endereco || "",
        telefone: data.telefone || "",
        email: data.email || "",
        site: data.site || "",
        secretario_nome: data.secretario_nome || "",
        secretario_cargo: data.secretario_cargo || emptyForm.secretario_cargo,
        departamento: data.departamento || "",
      });
      setLogoPreview(data.logo_url || null);
    } catch (err) {
      toast.toast.error("Erro ao carregar configuracoes da instituicao");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InstituicaoForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.toast.error("Apenas imagens sao permitidas (JPEG, PNG, GIF, SVG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.toast.error("A imagem deve ter no maximo 5MB");
      return;
    }

    try {
      const base64 = await arquivoParaBase64(file);
      setLogoFile(file);
      setLogoPreview(base64);
    } catch (err) {
      toast.toast.error("Erro ao processar imagem");
      console.error(err);
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.nome.trim()) {
      toast.toast.error("Nome da instituicao e obrigatorio");
      return;
    }

    try {
      setSaving(true);
      const dadosResponse = await atualizarInstituicao(formData);
      let instituicaoAtualizada = dadosResponse.instituicao;

      if (logoFile && logoPreview) {
        const logoResponse = await uploadLogoBase64(logoPreview);
        instituicaoAtualizada = logoResponse.instituicao;
        setLogoPreview(logoResponse.instituicao.logo_url || logoPreview);
      }

      setInstituicao(instituicaoAtualizada);
      setLogoFile(null);
      toast.toast.success(dadosResponse.message || "Configuracoes salvas");
    } catch (err: any) {
      toast.toast.error(err.response?.data?.message || "Erro ao salvar configuracoes");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Sistema", path: "/sistema" },
          { label: "Configuracoes da Instituicao" },
        ]}
        title="Configuracoes da Instituicao"
        subtitle="Dados institucionais usados em documentos, relatorios e templates PDF."
        action={
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={() => navigate("/editor-templates-pdf")}
          >
            Editor de Templates PDF
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <SectionTitle label="Logo da Instituicao" />

                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <Avatar
                    src={logoPreview || undefined}
                    sx={{
                      width: 128,
                      height: 128,
                      bgcolor: "action.hover",
                      border: "1px dashed",
                      borderColor: "divider",
                    }}
                  >
                    {!logoPreview && <PhotoCameraIcon sx={{ fontSize: 40, color: "text.secondary" }} />}
                  </Avatar>

                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
                    <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />} size="small">
                      Escolher logo
                      <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
                    </Button>
                    {logoPreview && (
                      <Tooltip title="Remover logo">
                        <IconButton size="small" color="delete" onClick={handleRemoveLogo}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    JPEG, PNG, GIF ou SVG. Tamanho maximo: 5MB.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <SectionTitle label="Informacoes Basicas" />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Nome da Instituicao"
                      fullWidth
                      required
                      value={formData.nome}
                      onChange={handleInputChange("nome")}
                      placeholder="Ex: Secretaria Municipal de Educacao"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="CNPJ" fullWidth value={formData.cnpj} onChange={handleInputChange("cnpj")} placeholder="00.000.000/0000-00" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Telefone" fullWidth value={formData.telefone} onChange={handleInputChange("telefone")} placeholder="(00) 0000-0000" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Endereco" fullWidth multiline rows={2} value={formData.endereco} onChange={handleInputChange("endereco")} placeholder="Endereco completo da instituicao" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="E-mail" fullWidth type="email" value={formData.email} onChange={handleInputChange("email")} placeholder="contato@secretaria.gov.br" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Site" fullWidth value={formData.site} onChange={handleInputChange("site")} placeholder="https://www.secretaria.gov.br" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Departamento / Setor"
                      fullWidth
                      value={formData.departamento}
                      onChange={handleInputChange("departamento")}
                      placeholder="Ex: Departamento de Alimentacao Escolar"
                      helperText="Aparece abaixo do nome da instituicao nos documentos PDF"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <SectionTitle label="Responsavel pela Secretaria" />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Informacoes do responsavel usadas na assinatura de documentos oficiais.
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <TextField label="Nome do Secretario(a)" fullWidth value={formData.secretario_nome} onChange={handleInputChange("secretario_nome")} placeholder="Nome completo" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Cargo" fullWidth value={formData.secretario_cargo} onChange={handleInputChange("secretario_cargo")} placeholder="Secretario(a) de Educacao" />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
              <Button
                type="submit"
                variant="contained"
                color="add"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar Configuracoes"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      <Alert severity="info" sx={{ mt: 3 }}>
        Essas informacoes alimentam cabecalhos de relatorios PDF, identificacao institucional,
        assinatura de documentos oficiais e dados de contato.
      </Alert>
    </PageContainer>
  );
};

export default ConfiguracaoInstituicaoPage;
