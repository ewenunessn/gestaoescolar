import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  buscarProduto,
  editarProduto,
  deletarProduto,
  buscarComposicaoNutricional,
  salvarComposicaoNutricional,
} from "../services/produtos";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  FormControlLabel,
  Switch,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack,
  Edit,
  Delete,
  Save,
  Close,
  Inventory,
  Category,
  CheckCircle,
  Cancel,
  Science,
  QrCode,
  Scale,
  Schedule,
  Image,
} from "@mui/icons-material";

const composicaoVazia = {
  valor_energetico_kcal: "",
  carboidratos_g: "",
  acucares_totais_g: "",
  acucares_adicionados_g: "",
  proteinas_g: "",
  gorduras_totais_g: "",
  gorduras_saturadas_g: "",
  gorduras_trans_g: "",
  fibra_alimentar_g: "",
  sodio_mg: "",
};

export default function ProdutoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estados principais
  const [produto, setProduto] = useState<any>(null);
  const [composicao, setComposicao] = useState<any>(composicaoVazia);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados de edição
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<any>({});
  const [salvando, setSalvando] = useState(false);

  // Estados do modal de exclusão
  const [openExcluir, setOpenExcluir] = useState(false);

  // Estados da composição nutricional
  const [salvandoComp, setSalvandoComp] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const prod = await buscarProduto(Number(id));
        setProduto(prod);
        setForm(prod);
        try {
          const comp = await buscarComposicaoNutricional(Number(id));
          setComposicao({ ...composicaoVazia, ...comp });
        } catch {
          setComposicao(composicaoVazia);
        }
      } catch {
        setError("Produto não encontrado");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line
  }, [id]);

  async function salvarEdicao() {
    setSalvando(true);
    try {
      // Preparar dados para envio, convertendo campos numéricos
      const dadosParaEnvio = {
        ...form,
        fator_divisao: form.fator_divisao === "" ? null : Number(form.fator_divisao),
        peso: form.peso === "" ? null : Number(form.peso),
        validade_minima: form.validade_minima === "" ? null : Number(form.validade_minima),
        estoque_minimo: form.estoque_minimo === "" ? 10 : Number(form.estoque_minimo),
      };

      const atualizado = await editarProduto(Number(id), dadosParaEnvio);
      setProduto(atualizado);
      setEditando(false);
      setSuccessMessage('Produto atualizado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError("Erro ao salvar alterações");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarComposicao() {
    setSalvandoComp(true);
    try {
      await salvarComposicaoNutricional(Number(id), {
        ...Object.fromEntries(
          Object.entries(composicao).map(([k, v]) => [
            k,
            v === "" ? null : Number(v),
          ])
        ),
      });
      setSuccessMessage('Composição nutricional salva com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError("Erro ao salvar composição nutricional");
    } finally {
      setSalvandoComp(false);
    }
  }

  async function excluirProduto() {
    try {
      await deletarProduto(Number(id));
      navigate("/produtos");
    } catch {
      setError("Erro ao excluir produto");
    }
  }

  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f9fafb'
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error && !produto) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb', p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!produto) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box sx={{
        bgcolor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <Box sx={{
          maxWidth: '1280px',
          mx: 'auto',
          px: { xs: 2, sm: 3, lg: 4 }
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
            gap: 2,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/produtos')}
                sx={{
                  color: '#6b7280',
                  textTransform: 'none',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  '&:hover': { color: '#374151' }
                }}
              >
                Voltar aos Produtos
              </Button>
            </Box>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 'bold',
                color: '#1f2937',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              Detalhes do Produto
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {!editando ? (
                <>
                  <Button
                    startIcon={<Edit />}
                    onClick={() => setEditando(true)}
                    sx={{
                      bgcolor: '#4f46e5',
                      color: 'white',
                      textTransform: 'none',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      '&:hover': { bgcolor: '#4338ca' },
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    startIcon={<Delete />}
                    onClick={() => setOpenExcluir(true)}
                    sx={{
                      bgcolor: '#dc2626',
                      color: 'white',
                      textTransform: 'none',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      '&:hover': { bgcolor: '#b91c1c' },
                    }}
                  >
                    Excluir
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    startIcon={<Save />}
                    onClick={salvarEdicao}
                    disabled={salvando}
                    sx={{
                      bgcolor: '#059669',
                      color: 'white',
                      textTransform: 'none',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      '&:hover': { bgcolor: '#047857' },
                    }}
                  >
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button
                    startIcon={<Close />}
                    onClick={() => {
                      setEditando(false);
                      setForm(produto);
                    }}
                    sx={{
                      color: '#6b7280',
                      textTransform: 'none',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

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

      {/* Erro */}
      {error && (
        <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, pt: 2 }}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4 }}>
          {/* Informações do Produto */}
          <Card
            sx={{
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Barra colorida superior */}
            <Box
              sx={{
                height: '4px',
                background: 'linear-gradient(90deg, #f87171, #14b8a6, #3b82f6)',
              }}
            />

            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
                {/* Ícone do produto */}
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Inventory sx={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.8)' }} />
                </Box>

                <Box sx={{ flex: 1 }}>
                  {!editando ? (
                    <>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 'bold',
                          color: '#1f2937',
                          mb: 1,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        }}
                      >
                        {produto.nome}
                      </Typography>
                      <Chip
                        icon={produto.ativo ? <CheckCircle sx={{ fontSize: '16px !important' }} /> : <Cancel sx={{ fontSize: '16px !important' }} />}
                        label={produto.ativo ? 'Ativo' : 'Inativo'}
                        sx={{
                          bgcolor: produto.ativo ? '#dcfce7' : '#fee2e2',
                          color: produto.ativo ? '#059669' : '#dc2626',
                          fontWeight: 600,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        }}
                      />
                    </>
                  ) : (
                    <TextField
                      label="Nome do Produto"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      fullWidth
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                        },
                      }}
                    />
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {editando ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                  <TextField
                    label="Categoria"
                    value={form.categoria || ""}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    fullWidth
                    placeholder="cereais, carnes, laticínios, etc."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                  <TextField
                    label="Marca"
                    value={form.marca || ""}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                  <TextField
                    label="Código de Barras"
                    value={form.codigo_barras || ""}
                    onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
                    fullWidth
                    placeholder="EAN/UPC"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                  <TextField
                    label="Unidade"
                    value={form.unidade || ""}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                  <TextField
                    label="Peso (gramas)"
                    value={form.peso ?? ""}
                    onChange={(e) => setForm({ ...form, peso: e.target.value })}
                    fullWidth
                    type="number"
                    placeholder="Peso em gramas"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                  <TextField
                    label="Validade Mínima (dias)"
                    value={form.validade_minima ?? ""}
                    onChange={(e) => setForm({ ...form, validade_minima: e.target.value })}
                    fullWidth
                    type="number"
                    placeholder="Dias de validade mínima"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                  <TextField
                    label="Fator de Divisão"
                    value={form.fator_divisao ?? ""}
                    onChange={(e) => setForm({ ...form, fator_divisao: e.target.value })}
                    fullWidth
                    type="number"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                  <TextField
                    label="Estoque Mínimo"
                    value={form.estoque_minimo ?? "10"}
                    onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
                    fullWidth
                    type="number"
                    helperText="Quantidade mínima para alertas de estoque baixo"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                  <TextField
                    label="Tipo de Processamento"
                    value={form.tipo_processamento || ""}
                    onChange={(e) => setForm({ ...form, tipo_processamento: e.target.value })}
                    fullWidth
                    placeholder="in natura, minimamente processado, processado, ultraprocessado"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Informações básicas */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Categoria
                      </Typography>
                      {produto.categoria ? (
                        <Chip
                          icon={<Category sx={{ fontSize: '16px !important' }} />}
                          label={produto.categoria}
                          sx={{ bgcolor: '#dcfce7', color: '#059669', fontWeight: 600 }}
                        />
                      ) : (
                        <Typography sx={{ color: '#9ca3af', fontStyle: 'italic' }}>
                          Não informado
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Marca
                      </Typography>
                      <Typography sx={{ color: '#6b7280' }}>
                        {produto.marca || 'Não informado'}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Código de Barras
                      </Typography>
                      {produto.codigo_barras ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <QrCode sx={{ fontSize: 20, color: '#6b7280' }} />
                          <Typography sx={{ color: '#6b7280' }}>
                            {produto.codigo_barras}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ color: '#9ca3af', fontStyle: 'italic' }}>
                          Não informado
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Unidade
                      </Typography>
                      <Typography sx={{ color: '#6b7280' }}>
                        {produto.unidade || 'Não informado'}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Peso
                      </Typography>
                      {produto.peso ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Scale sx={{ fontSize: 20, color: '#6b7280' }} />
                          <Typography sx={{ color: '#6b7280' }}>
                            {produto.peso}g
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ color: '#9ca3af', fontStyle: 'italic' }}>
                          Não informado
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Validade Mínima
                      </Typography>
                      {produto.validade_minima ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Schedule sx={{ fontSize: 20, color: '#6b7280' }} />
                          <Typography sx={{ color: '#6b7280' }}>
                            {produto.validade_minima} dias
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ color: '#9ca3af', fontStyle: 'italic' }}>
                          Não informado
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Descrição */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                      Descrição
                    </Typography>
                    <Typography sx={{ color: '#6b7280' }}>
                      {produto.descricao || 'Não informado'}
                    </Typography>
                  </Box>

                  {/* Tipo de Processamento */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                      Tipo de Processamento
                    </Typography>
                    <Typography sx={{ color: '#6b7280' }}>
                      {produto.tipo_processamento || 'Não informado'}
                    </Typography>
                  </Box>

                  {/* Fator de Divisão */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                      Fator de Divisão
                    </Typography>
                    <Typography sx={{ color: '#6b7280' }}>
                      {produto.fator_divisao || 'Não informado'}
                    </Typography>
                  </Box>

                  {/* Estoque Mínimo */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                      Estoque Mínimo
                    </Typography>
                    <Typography sx={{ color: '#6b7280' }}>
                      {produto.estoque_minimo || '10'} unidades
                    </Typography>
                  </Box>
                </Box>
              )}

              {editando && (
                <Box sx={{ mt: 3 }}>
                  <TextField
                    label="Descrição"
                    value={form.descricao || ""}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' }, mb: 2 }}
                  />
                  <TextField
                    label="URL da Imagem"
                    value={form.imagem_url || ""}
                    onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
                    fullWidth
                    placeholder="https://exemplo.com/imagem.jpg"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' }, mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.ativo}
                        onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                        color="primary"
                      />
                    }
                    label="Produto Ativo"
                  />
                </Box>
              )}

              {/* Imagem do produto */}
              {produto.imagem_url && !editando && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 2 }}>
                    Imagem do Produto
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 2,
                      border: '2px dashed #e5e7eb',
                      borderRadius: '8px',
                      bgcolor: '#f9fafb',
                    }}
                  >
                    <img
                      src={produto.imagem_url}
                      alt={produto.nome}
                      style={{
                        maxWidth: '200px',
                        maxHeight: '200px',
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Sidebar com informações adicionais */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Status Card */}
            <Card
              sx={{
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                background: produto.ativo
                  ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                  : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                {produto.ativo ? (
                  <CheckCircle sx={{ fontSize: '3rem', mb: 2, opacity: 0.8 }} />
                ) : (
                  <Cancel sx={{ fontSize: '3rem', mb: 2, opacity: 0.8 }} />
                )}
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {produto.ativo ? 'Produto Ativo' : 'Produto Inativo'}
                </Typography>
                <Typography sx={{ opacity: 0.9, fontSize: '0.875rem' }}>
                  {produto.ativo ? 'Disponível para uso' : 'Não disponível'}
                </Typography>
              </CardContent>
            </Card>

            {/* Informações técnicas */}
            <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
                  Informações Técnicas
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>ID:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{produto.id}</Typography>
                  </Box>
                  {produto.peso && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>Peso:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{produto.peso}g</Typography>
                    </Box>
                  )}
                  {produto.validade_minima && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>Validade:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{produto.validade_minima} dias</Typography>
                    </Box>
                  )}
                  {produto.fator_divisao && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>Fator:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{produto.fator_divisao}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Estoque Mín:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{produto.estoque_minimo || '10'} un</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Composição Nutricional */}
        <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', mt: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#1f2937',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                Composição Nutricional
              </Typography>
              <Science sx={{ fontSize: 32, color: '#4f46e5' }} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
              {Object.entries(composicaoVazia).map(([campo, _]) => (
                <TextField
                  key={campo}
                  label={campo
                    .replace(/_/g, " ")
                    .replace("g", "(g)")
                    .replace("mg", "(mg)")
                    .replace("kcal", "(kcal)")
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                  value={composicao[campo] ?? ""}
                  onChange={(e) =>
                    setComposicao({ ...composicao, [campo]: e.target.value })
                  }
                  type="number"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                  }}
                />
              ))}
            </Box>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                onClick={salvarComposicao}
                variant="contained"
                disabled={salvandoComp}
                startIcon={salvandoComp ? <CircularProgress size={16} color="inherit" /> : <Science />}
                sx={{
                  bgcolor: '#059669',
                  textTransform: 'none',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  '&:hover': { bgcolor: '#047857' },
                }}
              >
                {salvandoComp ? 'Salvando...' : 'Salvar Composição Nutricional'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Modal de confirmação de exclusão */}
      <Dialog
        open={openExcluir}
        onClose={() => setOpenExcluir(false)}
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
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              color: '#6b7280',
            }}
          >
            Tem certeza que deseja excluir o produto "{produto.nome}"? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => setOpenExcluir(false)}
            sx={{
              color: '#6b7280',
              textTransform: 'none',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={excluirProduto}
            variant="contained"
            sx={{
              bgcolor: '#dc2626',
              textTransform: 'none',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              '&:hover': { bgcolor: '#b91c1c' },
            }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}