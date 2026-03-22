import React, { useState } from 'react';
import {
  Box, Tabs, Tab, CircularProgress, Typography, List, ListItemButton,
  ListItemText, ListItemSecondaryAction, Chip, TextField, InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import { useToast } from '../hooks/useToast';
import { listarTodasSolicitacoes, Solicitacao } from '../services/solicitacoesAlimentos';
import { useQuery } from '@tanstack/react-query';

function agruparPorEscola(rows: Solicitacao[]) {
  const map = new Map<number, { escola_id: number; escola_nome: string; solicitacoes: Solicitacao[] }>();
  for (const s of rows) {
    if (!map.has(s.escola_id)) {
      map.set(s.escola_id, { escola_id: s.escola_id, escola_nome: s.escola_nome ?? `Escola ${s.escola_id}`, solicitacoes: [] });
    }
    map.get(s.escola_id)!.solicitacoes.push(s);
  }
  return Array.from(map.values());
}

function temPendencia(solicitacoes: Solicitacao[]) {
  return solicitacoes.some(s => s.status === 'pendente' || s.status === 'parcial');
}

export default function SolicitacoesAlimentos() {
  const toast = useToast();
  const navigate = useNavigate();
  const [aba, setAba] = useState(0);
  const [busca, setBusca] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-alimentos'],
    queryFn: () => listarTodasSolicitacoes(),
    onError: () => toast.error('Erro ao carregar solicitações'),
  } as any);

  const grupos = agruparPorEscola(rows as Solicitacao[]);
  const comPendencia = grupos.filter(g => temPendencia(g.solicitacoes));
  const semPendencia = grupos.filter(g => !temPendencia(g.solicitacoes));

  const lista = (aba === 0 ? comPendencia : semPendencia).filter(g =>
    !busca || g.escola_nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Ordena pendentes por data da solicitação mais antiga pendente
  if (aba === 0) {
    lista.sort((a, b) => {
      const dataA = a.solicitacoes.filter(s => s.status === 'pendente' || s.status === 'parcial')
        .map(s => new Date(s.created_at).getTime()).sort()[0] ?? 0;
      const dataB = b.solicitacoes.filter(s => s.status === 'pendente' || s.status === 'parcial')
        .map(s => new Date(s.created_at).getTime()).sort()[0] ?? 0;
      return dataA - dataB;
    });
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageContainer>
        <PageHeader title="Solicitações de Alimentos" subtitle="Solicitações enviadas pelas escolas" />

        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <TextField
            size="small"
            placeholder="Buscar escola..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ width: 260 }}
          />
        </Box>

        <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Pendentes (${comPendencia.length})`} />
          <Tab label={`Concluídas (${semPendencia.length})`} />
        </Tabs>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : lista.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Nenhuma escola encontrada
          </Typography>
        ) : (
          <List disablePadding>
            {lista.map(g => {
              const pendentes = g.solicitacoes.filter(s => s.status === 'pendente' || s.status === 'parcial');
              const maisAntiga = pendentes.length > 0
                ? pendentes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
                : g.solicitacoes[0];
              return (
                <ListItemButton
                  key={g.escola_id}
                  divider
                  onClick={() => navigate(`/solicitacoes-alimentos/${g.escola_id}`)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={g.escola_nome}
                    secondary={
                      maisAntiga
                        ? `Última solicitação: ${new Date(maisAntiga.created_at).toLocaleDateString('pt-BR')}`
                        : undefined
                    }
                  />
                  <ListItemSecondaryAction>
                    {pendentes.length > 0 && (
                      <Chip
                        label={`${pendentes.length} pendente${pendentes.length > 1 ? 's' : ''}`}
                        color="warning"
                        size="small"
                      />
                    )}
                  </ListItemSecondaryAction>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </PageContainer>
    </Box>
  );
}
