import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { modalidadeService, Modalidade } from '../services/modalidades';
import { toNum } from '../utils/formatters';

interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  fator_correcao?: number;
  ativo: boolean;
}

interface PerCapitaPorModalidade {
  modalidade_id: number;
  per_capita: number;
}

interface AdicionarIngredienteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (
    produtoId: number,
    perCapitaGeral: number | null,
    tipoMedida: 'gramas' | 'mililitros' | 'unidades',
    perCapitaPorModalidade: PerCapitaPorModalidade[]
  ) => void;
  produtos: Produto[];
}

export default function AdicionarIngredienteDialog({
  open,
  onClose,
  onConfirm,
  produtos,
}: AdicionarIngredienteDialogProps) {
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [perCapitaGeral, setPerCapitaGeral] = useState<string>('100');
  const [tipoMedida, setTipoMedida] = useState<'gramas' | 'mililitros' | 'unidades'>('gramas');
  const [modoAvancado, setModoAvancado] = useState(false);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [perCapitaPorModalidade, setPerCapitaPorModalidade] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      carregarModalidades();
    }
  }, [open]);

  useEffect(() => {
    // Quando mudar para modo avançado, inicializar com o valor geral
    if (modoAvancado && modalidades.length > 0) {
      const inicial: Record<number, string> = {};
      modalidades.forEach(mod => {
        inicial[mod.id] = perCapitaGeral || '100';
      });
      setPerCapitaPorModalidade(inicial);
    }
  }, [modoAvancado, modalidades]);

  async function carregarModalidades() {
    setLoading(true);
    try {
      const mods = await modalidadeService.listar();
      const ativas = mods.filter(m => m.ativo);
      setModalidades(ativas);
      
      // Inicializar per capita por modalidade
      const inicial: Record<number, string> = {};
      ativas.forEach(mod => {
        inicial[mod.id] = perCapitaGeral || '100';
      });
      setPerCapitaPorModalidade(inicial);
    } catch (error) {
      console.error('Erro ao carregar modalidades:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!selectedProduto) return;

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

      onConfirm(selectedProduto.id, null, tipoMedida, perCapitaArray);
    } else {
      // Modo simples: usar per capita geral para todas modalidades
      const perCapitaArray: PerCapitaPorModalidade[] = modalidades.map(mod => ({
        modalidade_id: mod.id,
        per_capita: perCapitaNum,
      }));

      onConfirm(selectedProduto.id, perCapitaNum, tipoMedida, perCapitaArray);
    }

    handleClose();
  }

  function handleClose() {
    setSelectedProduto(null);
    setPerCapitaGeral('100');
    setTipoMedida('gramas');
    setModoAvancado(false);
    setPerCapitaPorModalidade({});
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Adicionar Ingrediente</Typography>
          <IconButton
            onClick={() => setModoAvancado(!modoAvancado)}
            color={modoAvancado ? 'primary' : 'default'}
            title={modoAvancado ? 'Modo Simples' : 'Modo Avançado (por modalidade)'}
          >
            <TuneIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Seleção de Produto */}
          <Autocomplete
            options={produtos}
            getOptionLabel={(option) => option.nome}
            value={selectedProduto}
            onChange={(_, newValue) => setSelectedProduto(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Produto"
                placeholder="Selecione um produto..."
                required
              />
            )}
            noOptionsText="Nenhum produto disponível"
          />

          {/* Tipo de Medida */}
          <FormControl fullWidth>
            <InputLabel>Unidade de Medida</InputLabel>
            <Select
              value={tipoMedida}
              onChange={(e) => setTipoMedida(e.target.value as 'gramas' | 'unidades')}
              label="Unidade de Medida"
            >
              <MenuItem value="gramas">Gramas (g)</MenuItem>
              <MenuItem value="mililitros">Mililitros (ml)</MenuItem>
              <MenuItem value="unidades">Unidades (un)</MenuItem>
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
                helperText="Quantidade que será efetivamente consumida (após preparo)"
              />
              
              {/* Mostrar Per Capita Bruto */}
              {selectedProduto && selectedProduto.fator_correcao && selectedProduto.fator_correcao > 1.0 && parseFloat(perCapitaGeral) > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Per Capita Bruto (compra):
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {(toNum(perCapitaGeral) * toNum(selectedProduto.fator_correcao)).toFixed(1)}{tipoMedida === 'gramas' ? 'g' : tipoMedida === 'mililitros' ? 'ml' : 'un'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fator de correção: {toNum(selectedProduto.fator_correcao).toFixed(3)} - Quantidade a comprar
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
                      label={`${mod.nome} - Per Capita Bruto`}
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
                    {/* Mostrar Per Capita Líquido */}
                    {selectedProduto && selectedProduto.fator_correcao && parseFloat(perCapitaPorModalidade[mod.id] || '0') > 0 && (
                      <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5, ml: 1 }}>
                        Líquido: {(toNum(perCapitaPorModalidade[mod.id]) / toNum(selectedProduto.fator_correcao, 1)).toFixed(1)}{tipoMedida === 'gramas' ? 'g' : tipoMedida === 'mililitros' ? 'ml' : 'un'}
                      </Typography>
                    )}
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Collapse>

          {/* Informação sobre modalidades */}
          {modalidades.length === 0 && !loading && (
            <Alert severity="warning">
              Nenhuma modalidade ativa encontrada. Cadastre modalidades antes de adicionar ingredientes.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedProduto || modalidades.length === 0}
        >
          Adicionar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
