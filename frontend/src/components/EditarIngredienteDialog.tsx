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
} from '@mui/material';
import {
  Tune as TuneIcon,
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
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">{produtoNome}</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <IconButton
          onClick={() => setModoAvancado(!modoAvancado)}
          color={modoAvancado ? 'primary' : 'default'}
          title={modoAvancado ? 'Modo Simples' : 'Modo Avançado (por modalidade)'}
        >
          <TuneIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Tipo de Medida */}
        <FormControl fullWidth>
          <InputLabel>Unidade de Medida</InputLabel>
          <Select
            value={tipoMedida}
            onChange={(e) => setTipoMedida(e.target.value as 'gramas' | 'mililitros' | 'unidades')}
            label="Unidade de Medida"
          >
            <MenuItem value="gramas">Gramas (g)</MenuItem>
            <MenuItem value="mililitros">Mililitros (ml)</MenuItem>
          </Select>
        </FormControl>

        {/* Modo Simples: Per Capita Geral */}
        <Collapse in={!modoAvancado}>
          <Box>
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
                endAdornment: <Typography variant="body2" color="text.secondary">{tipoMedida === 'gramas' ? 'g' : tipoMedida === 'mililitros' ? 'ml' : 'un'}</Typography>
              }}
              helperText="Este valor será aplicado para todas as modalidades"
            />

            {/* Mostrar Per Capita Bruto */}
            {produtoFatorCorrecao && produtoFatorCorrecao > 1.0 && parseFloat(perCapitaGeral) > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Per Capita Bruto (compra):
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {(toNum(perCapitaGeral) * toNum(produtoFatorCorrecao)).toFixed(1)}{tipoMedida === 'gramas' ? 'g' : tipoMedida === 'mililitros' ? 'ml' : 'un'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Fator de correção: {toNum(produtoFatorCorrecao).toFixed(3)}
                  </Typography>
                </Box>
              </Alert>
            )}
          </Box>
        </Collapse>

        {/* Modo Avançado: Per Capita por Modalidade */}
        <Collapse in={modoAvancado}>
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Defina o per capita específico para cada modalidade de ensino
              </Typography>
            </Alert>

            <Divider sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Per Capita por Modalidade
              </Typography>
            </Divider>

            <Grid container spacing={2}>
              {modalidades.map((mod) => (
                <Grid item xs={12} sm={6} key={mod.id}>
                  <TextField
                    label={`${mod.nome} - Per Capita Líquido`}
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
                      endAdornment: <Typography variant="body2" color="text.secondary">{tipoMedida === 'gramas' ? 'g' : tipoMedida === 'mililitros' ? 'ml' : 'un'}</Typography>
                    }}
                  />
                  {/* Mostrar Per Capita Bruto */}
                  {produtoFatorCorrecao && produtoFatorCorrecao > 1.0 && parseFloat(perCapitaPorModalidade[mod.id] || '0') > 0 && (
                    <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5, ml: 1 }}>
                      Bruto: {(toNum(perCapitaPorModalidade[mod.id]) * toNum(produtoFatorCorrecao, 1)).toFixed(1)}{tipoMedida === 'gramas' ? 'g' : tipoMedida === 'mililitros' ? 'ml' : 'un'}
                    </Typography>
                  )}
                </Grid>
              ))}
            </Grid>
          </Box>
        </Collapse>
      </Box>
    </FormDialog>
  );
}
