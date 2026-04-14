import { useState, useEffect } from 'react';
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Collapse,
  Alert,
  Grid,
  Divider,
  Chip,
} from '@mui/material';
import {
  Tune as TuneIcon,
  InfoOutlined as InfoOutlinedIcon,
  Restaurant as RestaurantIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { modalidadeService, Modalidade } from '../services/modalidades';
import { toNum } from '../utils/formatters';
import { FormDialog } from './BaseDialog';

interface PerCapitaPorModalidade {
  modalidade_id: number;
  per_capita: number;
}

interface EditarIngredienteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (
    perCapitaGeral: number | null,
    tipoMedida: 'gramas' | 'mililitros' | 'unidades',
    perCapitaPorModalidade: PerCapitaPorModalidade[]
  ) => void;
  produtoNome: string;
  produtoFatorCorrecao?: number;
  perCapitaAtual: number;
  tipoMedidaAtual: 'gramas' | 'mililitros' | 'unidades';
  perCapitaPorModalidadeAtual?: Array<{modalidade_id: number, modalidade_nome: string, per_capita: number}>;
}

export default function EditarIngredienteDialog({
  open,
  onClose,
  onConfirm,
  produtoNome,
  produtoFatorCorrecao,
  perCapitaAtual,
  tipoMedidaAtual,
  perCapitaPorModalidadeAtual,
}: EditarIngredienteDialogProps) {
  const [perCapitaGeral, setPerCapitaGeral] = useState<string>(String(perCapitaAtual));
  const [tipoMedida, setTipoMedida] = useState<'gramas' | 'mililitros' | 'unidades'>(tipoMedidaAtual);
  const [modoAvancado, setModoAvancado] = useState(false);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [perCapitaPorModalidade, setPerCapitaPorModalidade] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      carregarModalidades();
      setPerCapitaGeral(String(perCapitaAtual));
      setTipoMedida(tipoMedidaAtual);

      // Se já tem ajustes por modalidade, ativar modo avançado
      if (perCapitaPorModalidadeAtual && perCapitaPorModalidadeAtual.length > 0) {
        setModoAvancado(true);
        const inicial: Record<number, string> = {};
        perCapitaPorModalidadeAtual.forEach(ajuste => {
          inicial[ajuste.modalidade_id] = String(ajuste.per_capita);
        });
        setPerCapitaPorModalidade(inicial);
      }
    }
  }, [open, perCapitaAtual, tipoMedidaAtual, perCapitaPorModalidadeAtual]);

  async function carregarModalidades() {
    setLoading(true);
    try {
      const mods = await modalidadeService.listar();
      const ativas = mods.filter(m => m.ativo);
      setModalidades(ativas);

      // Se não tem ajustes, inicializar com valor geral
      if (!perCapitaPorModalidadeAtual || perCapitaPorModalidadeAtual.length === 0) {
        const inicial: Record<number, string> = {};
        ativas.forEach(mod => {
          inicial[mod.id] = String(perCapitaAtual);
        });
        setPerCapitaPorModalidade(inicial);
      }
    } catch (error) {
      console.error('Erro ao carregar modalidades:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    const perCapitaNum = parseFloat(perCapitaGeral);
    if (isNaN(perCapitaNum) || perCapitaNum <= 0) {
      alert('Per capita deve ser um número maior que zero');
      return;
    }

    if (modoAvancado) {
      // Validar todos os per capita por modalidade
      const perCapitaArray: PerCapitaPorModalidade[] = [];
      let valido = true;

      for (const mod of modalidades) {
        const valor = parseFloat(perCapitaPorModalidade[mod.id] || '0');
        if (isNaN(valor) || valor <= 0) {
          alert(`Per capita para ${mod.nome} deve ser um número maior que zero`);
          valido = false;
          break;
        }
        perCapitaArray.push({
          modalidade_id: mod.id,
          per_capita: valor,
        });
      }

      if (!valido) return;

      onConfirm(null, tipoMedida, perCapitaArray);
    } else {
      // Modo simples: usar per capita geral para todas modalidades
      const perCapitaArray: PerCapitaPorModalidade[] = modalidades.map(mod => ({
        modalidade_id: mod.id,
        per_capita: perCapitaNum,
      }));

      onConfirm(perCapitaNum, tipoMedida, perCapitaArray);
    }

    handleClose();
  }

  function handleClose() {
    setModoAvancado(false);
    onClose();
  }

  function handlePerCapitaGeralChange(value: string) {
    setPerCapitaGeral(value);

    // Se estiver em modo avançado, atualizar todos os campos
    if (modoAvancado) {
      const atualizado: Record<number, string> = {};
      modalidades.forEach(mod => {
        atualizado[mod.id] = value;
      });
      setPerCapitaPorModalidade(atualizado);
    }
  }

  const unidadeMedida = tipoMedida === 'gramas' ? 'g' : tipoMedida === 'mililitros' ? 'ml' : 'un';

  return (
    <FormDialog
      open={open}
      onClose={handleClose}
      title="Editar Ingrediente"
      onSave={handleConfirm}
      loading={false}
      disableSave={loading || modalidades.length === 0}
      maxWidth="md"
    >
      {/* Header com nome do produto */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5, 
        mb: 2,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ 
          width: 40, 
          height: 40, 
          borderRadius: '50%',
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <RestaurantIcon sx={{ fontSize: 20, color: 'primary.contrastText' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Produto
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {produtoNome}
          </Typography>
        </Box>
        {produtoFatorCorrecao && produtoFatorCorrecao > 1.0 && (
          <Chip 
            label={`FC: ${produtoFatorCorrecao.toFixed(3)}`}
            size="small"
            sx={{ 
              bgcolor: 'warning.lighter',
              color: 'warning.dark',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          />
        )}
      </Box>

      {/* Toggle Modo Avançado */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2,
        p: 1.5,
        bgcolor: modoAvancado ? 'primary.50' : 'action.hover',
        borderRadius: 2,
        border: '1px solid',
        borderColor: modoAvancado ? 'primary.main' : 'divider',
        transition: 'all 0.2s'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneIcon sx={{ 
            fontSize: 20, 
            color: modoAvancado ? 'primary.main' : 'text.secondary'
          }} />
          <Box>
            <Typography variant="body2" sx={{ 
              fontWeight: 600,
              color: modoAvancado ? 'primary.main' : 'text.primary'
            }}>
              {modoAvancado ? 'Modo Avançado' : 'Modo Simples'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {modoAvancado ? 'Per capita por modalidade' : 'Mesmo valor para todos'}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={() => setModoAvancado(!modoAvancado)}
          color={modoAvancado ? 'primary' : 'default'}
          sx={{
            bgcolor: modoAvancado ? 'primary.main' : 'action.selected',
            color: modoAvancado ? 'primary.contrastText' : 'text.secondary',
            '&:hover': {
              bgcolor: modoAvancado ? 'primary.dark' : 'action.focus'
            }
          }}
        >
          <TuneIcon sx={{ 
            transform: modoAvancado ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s'
          }} />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Tipo de Medida */}
        <Box>
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 700, 
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75
          }}>
            <Box sx={{ 
              width: 3, 
              height: 16, 
              borderRadius: 1.5,
              bgcolor: 'primary.main'
            }} />
            Unidade de Medida
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Selecione a unidade</InputLabel>
            <Select
              value={tipoMedida}
              onChange={(e) => setTipoMedida(e.target.value as 'gramas' | 'mililitros' | 'unidades')}
              label="Unidade de Medida"
              sx={{
                fontWeight: 600,
                '& .MuiSelect-select': {
                  py: 1.5
                }
              }}
            >
              <MenuItem value="gramas">Gramas (g)</MenuItem>
              <MenuItem value="mililitros">Mililitros (ml)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        {/* Modo Simples: Per Capita Geral */}
        <Collapse in={!modoAvancado}>
          <Box>
            <Typography variant="subtitle2" sx={{ 
              fontWeight: 700, 
              mb: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75
            }}>
              <Box sx={{ 
                width: 3, 
                height: 16, 
                borderRadius: 1.5,
                bgcolor: 'success.main'
              }} />
              Per Capita Geral (todas as modalidades)
            </Typography>
            
            <TextField
              label="Per Capita Líquido (consumo)"
              type="number"
              fullWidth
              value={perCapitaGeral}
              onChange={(e) => handlePerCapitaGeralChange(e.target.value)}
              InputProps={{
                inputProps: {
                  min: 0,
                  max: tipoMedida === 'unidades' ? 100 : 1000,
                  step: tipoMedida === 'unidades' ? 1 : 0.1,
                },
                sx: {
                  fontWeight: 600,
                  fontSize: '1rem'
                },
                endAdornment: (
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    color: 'primary.main',
                    mr: 1
                  }}>
                    {unidadeMedida}
                  </Typography>
                )
              }}
              helperText="Este valor será aplicado automaticamente para todas as modalidades de ensino"
              sx={{
                '& .MuiInputLabel-root': {
                  fontWeight: 600,
                  fontSize: '0.9375rem'
                }
              }}
            />

            {/* Mostrar Per Capita Bruto */}
            {produtoFatorCorrecao && produtoFatorCorrecao > 1.0 && parseFloat(perCapitaGeral) > 0 && (
              <Alert 
                icon={<InfoOutlinedIcon sx={{ fontSize: 20 }} />}
                severity="info" 
                sx={{ 
                  mt: 2,
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    fontWeight: 500
                  }
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Per Capita Bruto (compra):
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 800, 
                    color: 'primary.main',
                    lineHeight: 1.2
                  }}>
                    {(toNum(perCapitaGeral) * toNum(produtoFatorCorrecao)).toFixed(1)}
                    <Typography component="span" variant="h6" sx={{ 
                      fontWeight: 600, 
                      ml: 0.5,
                      color: 'text.secondary'
                    }}>
                      {unidadeMedida}
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Fator de correção aplicado: {toNum(produtoFatorCorrecao).toFixed(3)}
                  </Typography>
                </Box>
              </Alert>
            )}
          </Box>
        </Collapse>

        {/* Modo Avançado: Per Capita por Modalidade */}
        <Collapse in={modoAvancado}>
          <Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              mb: 2,
              p: 1.5,
              bgcolor: 'info.50',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'info.light'
            }}>
              <SchoolIcon sx={{ color: 'info.main', fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.dark' }}>
                Defina o per capita específico para cada modalidade de ensino
              </Typography>
            </Box>

            <Typography variant="subtitle2" sx={{ 
              fontWeight: 700, 
              mb: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75
            }}>
              <Box sx={{ 
                width: 3, 
                height: 16, 
                borderRadius: 1.5,
                bgcolor: 'info.main'
              }} />
              Per Capita por Modalidade
            </Typography>

            <Grid container spacing={2}>
              {modalidades.map((mod) => (
                <Grid item xs={12} sm={6} key={mod.id}>
                  <Box sx={{ 
                    p: 1.5,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'info.main',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                      <SchoolIcon sx={{ fontSize: 16, color: 'info.main' }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {mod.nome}
                      </Typography>
                    </Box>
                    <TextField
                      label="Per Capita Líquido"
                      type="number"
                      fullWidth
                      size="small"
                      value={perCapitaPorModalidade[mod.id] || ''}
                      onChange={(e) => {
                        setPerCapitaPorModalidade({
                          ...perCapitaPorModalidade,
                          [mod.id]: e.target.value,
                        });
                      }}
                      InputProps={{
                        inputProps: {
                          min: 0,
                          max: tipoMedida === 'unidades' ? 100 : 1000,
                          step: tipoMedida === 'unidades' ? 1 : 0.1,
                        },
                        sx: {
                          fontWeight: 600
                        },
                        endAdornment: (
                          <Typography variant="body2" sx={{ 
                            fontWeight: 700, 
                            color: 'info.main',
                            mr: 1
                          }}>
                            {unidadeMedida}
                          </Typography>
                        )
                      }}
                      sx={{
                        '& .MuiInputLabel-root': {
                          fontWeight: 600,
                          fontSize: '0.8125rem'
                        }
                      }}
                    />
                    {/* Mostrar Per Capita Bruto */}
                    {produtoFatorCorrecao && produtoFatorCorrecao > 1.0 && parseFloat(perCapitaPorModalidade[mod.id] || '0') > 0 && (
                      <Typography variant="body2" sx={{ 
                        mt: 1, 
                        fontWeight: 600,
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}>
                        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                        Bruto: {(toNum(perCapitaPorModalidade[mod.id]) * toNum(produtoFatorCorrecao, 1)).toFixed(1)}{unidadeMedida}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Collapse>
      </Box>
    </FormDialog>
  );
}
