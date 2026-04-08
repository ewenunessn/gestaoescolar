import React, { useState, useMemo } from "react";
import {
  Box, Chip,
} from "@mui/material";
import ViewTabs from "../../../components/ViewTabs";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { useToast } from "../../../hooks/useToast";
import { listarTodasSolicitacoes, Solicitacao } from "../../../services/solicitacoesAlimentos";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../../../components/DataTable";
import { ColumnDef } from "@tanstack/react-table";

interface EscolaAgrupada {
  escola_id: number;
  escola_nome: string;
  total_solicitacoes: number;
  pendentes: number;
  ultima_solicitacao: string;
  status: 'pendente' | 'concluida';
}

function agruparPorEscola(rows: Solicitacao[]): EscolaAgrupada[] {
  const map = new Map<number, { escola_id: number; escola_nome: string; solicitacoes: Solicitacao[] }>();
  for (const s of rows) {
    if (!map.has(s.escola_id)) {
      map.set(s.escola_id, { escola_id: s.escola_id, escola_nome: s.escola_nome ?? `Escola ${s.escola_id}`, solicitacoes: [] });
    }
    map.get(s.escola_id)!.solicitacoes.push(s);
  }
  
  return Array.from(map.values()).map(g => {
    const pendentes = g.solicitacoes.filter(s => s.status === 'pendente' || s.status === 'parcial');
    const maisAntiga = g.solicitacoes.length > 0
      ? g.solicitacoes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      : null;
    
    return {
      escola_id: g.escola_id,
      escola_nome: g.escola_nome,
      total_solicitacoes: g.solicitacoes.length,
      pendentes: pendentes.length,
      ultima_solicitacao: maisAntiga ? maisAntiga.created_at : '',
      status: pendentes.length > 0 ? 'pendente' : 'concluida',
    };
  });
}

export default function SolicitacoesAlimentos() {
  const toast = useToast();
  const navigate = useNavigate();
  const [aba, setAba] = useState(0);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-alimentos'],
    queryFn: () => listarTodasSolicitacoes(),
    onError: () => toast.error('Erro ao carregar solicitações'),
  } as any);

  const escolas = useMemo(() => agruparPorEscola(rows as Solicitacao[]), [rows]);
  
  const escolasFiltradas = useMemo(() => {
    if (aba === 0) {
      return escolas.filter(e => e.status === 'pendente').sort((a, b) => 
        new Date(a.ultima_solicitacao).getTime() - new Date(b.ultima_solicitacao).getTime()
      );
    }
    return escolas.filter(e => e.status === 'concluida');
  }, [escolas, aba]);

  const columns: ColumnDef<EscolaAgrupada>[] = useMemo(() => [
    {
      accessorKey: 'escola_nome',
      header: 'Escola',
      size: 300,
    },
    {
      accessorKey: 'total_solicitacoes',
      header: 'Total',
      size: 100,
      cell: ({ getValue }) => getValue() as number,
    },
    {
      accessorKey: 'pendentes',
      header: 'Pendentes',
      size: 120,
      cell: ({ getValue }) => {
        const pendentes = getValue() as number;
        if (pendentes === 0) return '-';
        return (
          <Chip
            label={`${pendentes} pendente${pendentes > 1 ? 's' : ''}`}
            color="warning"
            size="small"
          />
        );
      },
    },
    {
      accessorKey: 'ultima_solicitacao',
      header: 'Última Solicitação',
      size: 150,
      cell: ({ getValue }) => {
        const data = getValue() as string;
        if (!data) return '-';
        return new Date(data).toLocaleDateString('pt-BR');
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 120,
      cell: ({ getValue }) => {
        const status = getValue() as string;
        return (
          <Chip
            label={status === 'pendente' ? 'Pendente' : 'Concluída'}
            color={status === 'pendente' ? 'warning' : 'success'}
            size="small"
          />
        );
      },
    },
  ], []);

  const comPendencia = escolas.filter(e => e.status === 'pendente');
  const semPendencia = escolas.filter(e => e.status === 'concluida');

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: 'background.default', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageContainer fullHeight>
        <PageHeader
          title="Solicitações de Alimentos"
          subtitle="Solicitações enviadas pelas escolas"
          breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Solicitações' }]}
        />

        <Box sx={{ mb: 2 }}>
          <ViewTabs
            value={aba}
            onChange={setAba}
            tabs={[
              { value: 0, label: 'Pendentes', badge: comPendencia.length },
              { value: 1, label: 'Concluídas', badge: semPendencia.length },
            ]}
          />
        </Box>

        {/* DataTable com altura fixa para scroll */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
            title={aba === 0 ? "Escolas com Pendências" : "Escolas Concluídas"}
            data={escolasFiltradas}
            columns={columns}
            loading={isLoading}
            onRowClick={(row) => navigate(`/solicitacoes-alimentos/${row.escola_id}`)}
            searchPlaceholder="Buscar escola..."
            initialPageSize={50}
          />
        </Box>
      </PageContainer>
    </Box>
  );
}
