import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Icon
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import permissoesService, { Modulo, NivelPermissao } from '../services/permissoesService';

interface PermissoesUsuarioProps {
  usuarioId: number;
  onSave?: () => void;
}

interface PermissaoModulo {
  modulo_id: number;
  nivel_permissao_id: number;
}

export default function PermissoesUsuario({ usuarioId, onSave }: PermissoesUsuarioProps) {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [niveis, setNiveis] = useState<NivelPermissao[]>([]);
  const [permissoes, setPermissoes] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    carregarDados();
  }, [usuarioId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setErro('');

      const [modulosData, niveisData, permissoesData] = await Promise.all([
        permissoesService.listarModulos(),
        permissoesService.listarNiveis(),
        permissoesService.obterPermissoesUsuario(usuarioId)
      ]);

      setModulos(modulosData);
      setNiveis(niveisData);

      // Criar mapa de permissões (modulo_id -> nivel_permissao_id)
      const permissoesMap = new Map<number, number>();
      permissoesData.forEach(p => {
        permissoesMap.set(p.modulo_id, p.nivel_permissao_id);
      });

      // Para módulos sem permissão, definir como "Nenhum" (id 1)
      modulosData.forEach(m => {
        if (!permissoesMap.has(m.id)) {
          permissoesMap.set(m.id, 1); // 1 = Nenhum
        }
      });

      setPermissoes(permissoesMap);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setErro(error.message || 'Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePermissao = (moduloId: number, nivelId: number) => {
    const novasPermissoes = new Map(permissoes);
    novasPermissoes.set(moduloId, nivelId);
    setPermissoes(novasPermissoes);
    setSucesso('');
    setErro('');
  };

  const handleSalvar = async () => {
    try {
      setSaving(true);
      setErro('');
      setSucesso('');

      // Converter mapa para array
      const permissoesArray: PermissaoModulo[] = Array.from(permissoes.entries()).map(
        ([modulo_id, nivel_permissao_id]) => ({
          modulo_id,
          nivel_permissao_id
        })
      );

      await permissoesService.definirPermissoesUsuario(usuarioId, permissoesArray);

      setSucesso('Permissões salvas com sucesso!');
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      console.error('Erro ao salvar permissões:', error);
      setErro(error.message || 'Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const getNivelColor = (nivelId: number) => {
    const nivel = niveis.find(n => n.id === nivelId);
    if (!nivel) return 'default';
    
    switch (nivel.nivel) {
      case 0: return 'default';
      case 1: return 'info';
      case 2: return 'warning';
      case 3: return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">
            Permissões por Módulo
          </Typography>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSalvar}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Permissões'}
          </Button>
        </Box>

        {erro && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>
            {erro}
          </Alert>
        )}

        {sucesso && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSucesso('')}>
            {sucesso}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" mb={2}>
          Defina o nível de acesso do usuário para cada módulo do sistema.
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width="50"></TableCell>
                <TableCell>Módulo</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell width="200">Nível de Acesso</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modulos.map((modulo) => {
                const nivelAtual = permissoes.get(modulo.id) || 1;

                return (
                  <TableRow key={modulo.id}>
                    <TableCell>
                      <Icon color="action">{modulo.icone}</Icon>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {modulo.nome}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {modulo.descricao}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={nivelAtual}
                          onChange={(e: any) => handleChangePermissao(modulo.id, Number(e.target.value))}
                        >
                          {niveis.map((n) => (
                            <MenuItem key={n.id} value={n.id}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Chip
                                  label={n.nome}
                                  size="small"
                                  color={getNivelColor(n.id) as any}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {n.descricao}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={3}>
          <Typography variant="caption" color="text.secondary">
            <strong>Níveis de Acesso:</strong>
          </Typography>
          <Box display="flex" gap={2} mt={1} flexWrap="wrap">
            {niveis.map((n) => (
              <Chip
                key={n.id}
                label={`${n.nome} - ${n.descricao}`}
                size="small"
                color={getNivelColor(n.id) as any}
              />
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
