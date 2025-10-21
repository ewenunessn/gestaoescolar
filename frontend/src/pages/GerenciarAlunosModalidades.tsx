import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, CircularProgress, Alert, IconButton,
  Card, Tooltip, TablePagination, InputAdornment
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { listarEscolas, listarEscolaModalidades, adicionarEscolaModalidade, editarEscolaModalidade, removerEscolaModalidade } from '../services/escolas';
import { listarModalidades } from '../services/modalidades';
import BackButton from '../components/BackButton';

interface Escola {
  id: number;
  nome: string;
}

interface Modalidade {
  id: number;
  nome: string;
}

interface EscolaModalidade {
  escola_id: number;
  modalidade_id: number;
  quantidade_alunos: number;
  id?: number;
}

const InputCell = React.memo(({ 
  escolaId, 
  modalidadeId, 
  initialValue, 
  isSaving, 
  onSave 
}: { 
  escolaId: number; 
  modalidadeId: number; 
  initialValue: number; 
  isSaving: boolean; 
  onSave: (escolaId: number, modalidadeId: number, valor: string) => void; 
}) => {
  const [localValue, setLocalValue] = React.useState(initialValue.toString());
  
  React.useEffect(() => {
    setLocalValue(initialValue.toString());
  }, [initialValue]);

  const handleBlur = () => {
    if (localValue !== initialValue.toString()) {
      onSave(escolaId, modalidadeId, localValue);
    }
  };

  return (
    <TableCell align="center">
      <Tooltip title={isSaving ? 'Salvando...' : 'Digite a quantidade de alunos'}>
        <TextField
          type="number"
          size="small"
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          disabled={isSaving}
          inputProps={{ min: 0, style: { textAlign: 'center' } }}
          sx={{ width: 100 }}
        />
      </Tooltip>
    </TableCell>
  );
});

InputCell.displayName = 'InputCell';

const GerenciarAlunosModalidades: React.FC = () => {
  const navigate = useNavigate();
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [escolaModalidades, setEscolaModalidades] = useState<{ [key: string]: EscolaModalidade }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [escolasData, modalidadesData, escolaModalidadesData] = await Promise.all([
        listarEscolas(),
        listarModalidades(),
        listarEscolaModalidades()
      ]);
      
      setEscolas(Array.isArray(escolasData) ? escolasData : []);
      setModalidades(Array.isArray(modalidadesData) ? modalidadesData.filter((m: any) => m.ativo) : []);
      
      // Criar mapa de escola_modalidades
      const escolaModalidadesMap: { [key: string]: EscolaModalidade } = {};
      
      if (Array.isArray(escolaModalidadesData)) {
        escolaModalidadesData.forEach((em: any) => {
          const key = `${em.escola_id}-${em.modalidade_id}`;
          escolaModalidadesMap[key] = {
            escola_id: em.escola_id,
            modalidade_id: em.modalidade_id,
            quantidade_alunos: em.quantidade_alunos || 0,
            id: em.id
          };
        });
      }
      
      setEscolaModalidades(escolaModalidadesMap);
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = useCallback(async (escolaId: number, modalidadeId: number, valor: string) => {
    const key = `${escolaId}-${modalidadeId}`;
    const quantidade = parseInt(valor) || 0;
    
    // Não salvar se for 0 ou vazio
    if (quantidade === 0 || valor === '') {
      // Se já existe um registro, remover
      const existing = escolaModalidades[key];
      if (existing && existing.id) {
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
          await removerEscolaModalidade(existing.id);
          const newEscolaModalidades = { ...escolaModalidades };
          delete newEscolaModalidades[key];
          setEscolaModalidades(newEscolaModalidades);
        } catch (err) {
          setError('Erro ao remover registro');
        } finally {
          setSaving(prev => ({ ...prev, [key]: false }));
        }
      }
      return;
    }

    // Salvar
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const existing = escolaModalidades[key];
      
      if (existing && existing.id) {
        // Atualizar
        await editarEscolaModalidade(existing.id, { quantidade_alunos: quantidade });
        setEscolaModalidades(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            quantidade_alunos: quantidade
          }
        }));
      } else {
        // Criar
        const response = await adicionarEscolaModalidade(escolaId, modalidadeId, quantidade);
        setEscolaModalidades(prev => ({
          ...prev,
          [key]: {
            escola_id: escolaId,
            modalidade_id: modalidadeId,
            quantidade_alunos: quantidade,
            id: response.id
          }
        }));
      }
    } catch (err) {
      setError('Erro ao salvar quantidade de alunos');
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  }, [escolaModalidades]);

  const getQuantidade = useCallback((escolaId: number, modalidadeId: number): number => {
    const key = `${escolaId}-${modalidadeId}`;
    return escolaModalidades[key]?.quantidade_alunos || 0;
  }, [escolaModalidades]);

  const isSaving = useCallback((escolaId: number, modalidadeId: number): boolean => {
    const key = `${escolaId}-${modalidadeId}`;
    return saving[key] || false;
  }, [saving]);

  const escolasFiltradas = useMemo(() => {
    if (!searchTerm) return escolas;
    return escolas.filter(escola => 
      escola.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [escolas, searchTerm]);

  const escolasPaginadas = useMemo(() => {
    const start = page * rowsPerPage;
    return escolasFiltradas.slice(start, start + rowsPerPage);
  }, [escolasFiltradas, page, rowsPerPage]);

  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Header */}
        <BackButton to="/modalidades" label="Gerenciar Alunos por Modalidade" />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, mt: -2 }}>
          Digite a quantidade de alunos de cada modalidade em cada escola. O salvamento é automático.
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Busca */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Buscar escola..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 400 }}
          />
        </Box>

        {/* Tabela */}
        <Card sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 250px)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', minWidth: 200, position: 'sticky', left: 0, zIndex: 3 }}>
                    Escola
                  </TableCell>
                  {modalidades.map((modalidade) => (
                    <TableCell key={modalidade.id} align="center" sx={{ fontWeight: 600, bgcolor: 'grey.100', minWidth: 150 }}>
                      {modalidade.nome}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {escolasPaginadas.map((escola) => (
                  <TableRow key={escola.id} hover>
                    <TableCell sx={{ fontWeight: 500, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                      {escola.nome}
                    </TableCell>
                    {modalidades.map((modalidade) => (
                      <InputCell
                        key={modalidade.id}
                        escolaId={escola.id}
                        modalidadeId={modalidade.id}
                        initialValue={getQuantidade(escola.id, modalidade.id)}
                        isSaving={isSaving(escola.id, modalidade.id)}
                        onSave={handleSave}
                      />
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={escolasFiltradas.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage="Escolas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </Card>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          * Valores 0 ou vazios não são salvos no banco de dados
        </Typography>
      </Box>
    </Box>
  );
};

export default GerenciarAlunosModalidades;
