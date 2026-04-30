import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { guiaService } from "../../../services/guiaService";
import { produtoService } from "../../../services/produtoService";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import { useToast } from "../../../hooks/useToast";
import { formatarQuantidade } from "../../../utils/formatters";
import api from "../../../services/api";
import type { Produto } from "../../../types/produto";
import { getNextIdByDirection } from "../utils/keyboardNavigation";

interface EscolaOpcao {
  id: number;
  nome: string;
}

interface EscolaQuantidadeRowProps {
  escola: EscolaOpcao;
  quantidade: string;
  status: string;
  disabled: boolean;
  onQuantidadeChange: (escolaId: number, value: string) => void;
  onStatusChange: (escolaId: number, value: string) => void;
  onQuantidadeFocus: (escolaId: number) => void;
  onQuantidadeKeyDown: (escolaId: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  registerQuantidadeInput: (escolaId: number, element: HTMLInputElement | null) => void;
  focused: boolean;
}

const EscolaQuantidadeRow = memo(function EscolaQuantidadeRow({
  escola,
  quantidade,
  status,
  disabled,
  onQuantidadeChange,
  onStatusChange,
  onQuantidadeFocus,
  onQuantidadeKeyDown,
  registerQuantidadeInput,
  focused,
}: EscolaQuantidadeRowProps) {
  const inputRef = useCallback((element: HTMLInputElement | null) => {
    registerQuantidadeInput(escola.id, element);
  }, [escola.id, registerQuantidadeInput]);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1fr) 140px 180px' },
        gap: 1,
        alignItems: 'center',
        px: 1.25,
        py: 1,
        borderBottom: '1px solid',
        borderColor: focused ? 'primary.main' : 'divider',
        borderLeft: '3px solid',
        borderLeftColor: focused ? 'primary.main' : 'transparent',
        bgcolor: focused ? 'action.selected' : 'background.paper',
        transition: 'background-color 120ms ease, border-color 120ms ease',
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: focused ? 800 : 600,
          color: focused ? 'primary.main' : 'text.primary',
        }}
      >
        {escola.nome}
      </Typography>
      <TextField
        label="Quantidade"
        type="number"
        size="small"
        value={quantidade}
        inputRef={inputRef}
        onChange={event => onQuantidadeChange(escola.id, event.target.value)}
        onFocus={() => onQuantidadeFocus(escola.id)}
        onKeyDown={event => onQuantidadeKeyDown(escola.id, event as React.KeyboardEvent<HTMLInputElement>)}
        inputProps={{ min: 0, step: 0.001 }}
        disabled={disabled}
      />
      <FormControl size="small">
        <InputLabel>Status</InputLabel>
        <Select
          value={status}
          label="Status"
          disabled={disabled}
          onChange={event => onStatusChange(escola.id, event.target.value as string)}
        >
          <MenuItem value="pendente">Disponivel p/ Entrega</MenuItem>
          <MenuItem value="programada">Aguardando Estoque</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
});

export default function GuiaDemandaAdicionarProduto() {
  const navigate = useNavigate();
  const { guiaId } = useParams<{ guiaId: string }>();
  const toast = useToast();
  const { setPageTitle, setBackPath } = usePageTitle();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [guia, setGuia] = useState<any>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [escolas, setEscolas] = useState<EscolaOpcao[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().split('T')[0]);
  const [quantidades, setQuantidades] = useState<Record<number, string>>({});
  const [statusPorEscola, setStatusPorEscola] = useState<Record<number, string>>({});
  const [focusedEscolaId, setFocusedEscolaId] = useState<number | null>(null);
  const quantidadeRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const backPath = `/guias-demanda/${guiaId}`;

  useEffect(() => {
    setPageTitle('Adicionar Produto na Guia');
    setBackPath(backPath);
    return () => setBackPath(null);
  }, [backPath, setBackPath, setPageTitle]);

  useEffect(() => {
    if (guiaId) {
      carregar();
    }
  }, [guiaId]);

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const guiaData = await guiaService.buscarGuia(Number(guiaId));
      const [produtosData, escolasData] = await Promise.all([
        produtoService.listar(),
        guiaService.listarStatusEscolas(guiaData.mes, guiaData.ano, Number(guiaId)),
      ]);

      setGuia(guiaData);
      setProdutos(produtosData);
      setEscolas((escolasData || [])
        .map((escola: any) => ({ id: Number(escola.id), nome: escola.nome || '' }))
        .sort((a: EscolaOpcao, b: EscolaOpcao) => a.nome.localeCompare(b.nome)));
    } catch (error) {
      console.error('Erro ao carregar tela de adicionar produto:', error);
      setErro('Nao foi possivel carregar os dados para adicionar produto.');
    } finally {
      setLoading(false);
    }
  }

  const unidade = produtoSelecionado?.unidade || 'Kg';

  const itensComQuantidade = useMemo(() => {
    return escolas
      .map(escola => ({
        escola,
        quantidade: Number(quantidades[escola.id] || 0),
        status: statusPorEscola[escola.id] || 'pendente',
      }))
      .filter(item => item.quantidade > 0);
  }, [escolas, quantidades, statusPorEscola]);

  const totalQuantidade = itensComQuantidade.reduce((sum, item) => sum + item.quantidade, 0);

  const handleQuantidadeChange = useCallback((escolaId: number, value: string) => {
    setQuantidades(prev => prev[escolaId] === value ? prev : { ...prev, [escolaId]: value });
  }, []);

  const handleStatusChange = useCallback((escolaId: number, value: string) => {
    setStatusPorEscola(prev => prev[escolaId] === value ? prev : { ...prev, [escolaId]: value });
  }, []);

  const handleQuantidadeFocus = useCallback((escolaId: number) => {
    setFocusedEscolaId(prev => prev === escolaId ? prev : escolaId);
  }, []);

  const registerQuantidadeInput = useCallback((escolaId: number, element: HTMLInputElement | null) => {
    quantidadeRefs.current[escolaId] = element;
  }, []);

  const handleQuantidadeKeyDown = useCallback((escolaId: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Tab' && event.key !== 'Enter') return;

    event.preventDefault();
    const ids = escolas.map(escola => escola.id);
    const nextId = getNextIdByDirection(ids, escolaId, event.shiftKey ? -1 : 1);
    setFocusedEscolaId(nextId);
    window.requestAnimationFrame(() => {
      quantidadeRefs.current[nextId]?.focus();
      quantidadeRefs.current[nextId]?.select();
    });
  }, [escolas]);

  async function salvar() {
    if (!guia || !produtoSelecionado || !dataEntrega || itensComQuantidade.length === 0) return;

    setSaving(true);
    try {
      for (const { escola, quantidade, status } of itensComQuantidade) {
        await api.post(`/guias/escola/${escola.id}/produtos`, {
          produtoId: produtoSelecionado.id,
          quantidade,
          unidade,
          data_entrega: dataEntrega,
          mes_competencia: guia.mes,
          ano_competencia: guia.ano,
          status,
        });
      }

      toast.success(`${itensComQuantidade.length} escola(s) adicionada(s) com sucesso.`);
      navigate(backPath);
    } catch (error) {
      console.error('Erro ao adicionar produto na guia:', error);
      toast.error('Nao foi possivel adicionar o produto.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <PageContainer fullHeight>
      <PageHeader
        title="Adicionar Produto na Guia"
        subtitle={guia ? `Guia de Demanda - ${guia.mes}/${guia.ano}` : undefined}
        onBack={() => navigate(backPath)}
        breadcrumbs={[
          { label: 'Guias de Demanda', path: '/guias-demanda' },
          { label: 'Guia', path: backPath },
          { label: 'Adicionar Produto' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress color="inherit" size={16} /> : <SaveIcon />}
            onClick={salvar}
            disabled={saving || !produtoSelecionado || !dataEntrega || itensComQuantidade.length === 0}
          >
            Salvar
          </Button>
        }
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip icon={<AddIcon />} label={`${itensComQuantidade.length} escola(s) com quantidade`} size="small" />
          <Chip label={`Total: ${formatarQuantidade(totalQuantidade)} ${unidade}`} size="small" variant="outlined" />
        </Box>
      </PageHeader>

      {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}
      {saving && <LinearProgress sx={{ mb: 1 }} />}

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          mb: 1.5,
          p: 1.5,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1fr) 180px' },
          gap: 1.5,
        }}
      >
        <Autocomplete
          size="small"
          options={produtos}
          disabled={saving}
          value={produtoSelecionado}
          getOptionLabel={(option) => option?.nome ?? ''}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, produto) => {
            setProdutoSelecionado(produto);
            setQuantidades({});
            setStatusPorEscola({});
            setFocusedEscolaId(null);
          }}
          renderInput={(params) => (
            <TextField {...params} label="Produto" placeholder="Buscar produto..." />
          )}
        />
        <TextField
          label="Data de Entrega"
          type="date"
          size="small"
          value={dataEntrega}
          onChange={event => setDataEntrega(event.target.value)}
          InputLabelProps={{ shrink: true }}
          disabled={saving}
        />
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1fr) 140px 180px' },
            gap: 1,
            px: 1.25,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Escola</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Quantidade</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Status</Typography>
        </Box>
        {escolas.map(escola => (
          <EscolaQuantidadeRow
            key={escola.id}
            escola={escola}
            quantidade={quantidades[escola.id] || ''}
            status={statusPorEscola[escola.id] || 'pendente'}
            disabled={saving || !produtoSelecionado}
            onQuantidadeChange={handleQuantidadeChange}
            onStatusChange={handleStatusChange}
            onQuantidadeFocus={handleQuantidadeFocus}
            onQuantidadeKeyDown={handleQuantidadeKeyDown}
            registerQuantidadeInput={registerQuantidadeInput}
            focused={focusedEscolaId === escola.id}
          />
        ))}
      </Box>
    </PageContainer>
  );
}
