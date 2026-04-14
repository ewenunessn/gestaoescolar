import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box, Typography, InputBase, Paper, List, ListItemButton,
  ListItemIcon, ListItemText, Divider, Chip, CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon, Dashboard, School, Category, Inventory, Restaurant,
  MenuBook, Business, Assignment, LocalShipping, ListAlt, RequestPage,
  Print, Settings, Description, Agriculture, Calculate, CalendarToday,
  HomeWork, AdminPanelSettings, NotificationsActive, Schedule, ArrowForward,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

// ─── Tipos ───
interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  category: string;
  path: string;
  icon: React.ReactNode;
  type: "page" | "record";
}

// ─── Índice de páginas (navegação) ───
const PAGE_INDEX: SearchResult[] = [
  { id: "p-dashboard",    label: "Dashboard",              category: "Página", path: "/dashboard",                       icon: <Dashboard fontSize="small" />,          type: "page" },
  { id: "p-escolas",      label: "Escolas",                category: "Página", path: "/escolas",                         icon: <School fontSize="small" />,             type: "page" },
  { id: "p-produtos",     label: "Produtos",               category: "Página", path: "/produtos",                        icon: <Inventory fontSize="small" />,          type: "page" },
  { id: "p-preparacoes",  label: "Preparações",            category: "Página", path: "/preparacoes",                     icon: <Restaurant fontSize="small" />,         type: "page" },
  { id: "p-cardapios",    label: "Cardápios",              category: "Página", path: "/cardapios",                       icon: <MenuBook fontSize="small" />,           type: "page" },
  { id: "p-fornecedores", label: "Fornecedores",           category: "Página", path: "/fornecedores",                    icon: <Business fontSize="small" />,           type: "page" },
  { id: "p-contratos",    label: "Contratos",              category: "Página", path: "/contratos",                       icon: <Assignment fontSize="small" />,         type: "page" },
  { id: "p-pedidos",      label: "Pedidos",                category: "Página", path: "/compras",                         icon: <RequestPage fontSize="small" />,        type: "page" },
  { id: "p-demandas",     label: "Guias de Demanda",       category: "Página", path: "/guias-demanda",                   icon: <ListAlt fontSize="small" />,            type: "page" },
  { id: "p-entregas",     label: "Entregas",               category: "Página", path: "/entregas",                        icon: <LocalShipping fontSize="small" />,      type: "page" },
  { id: "p-rotas",        label: "Gestão de Rotas",        category: "Página", path: "/gestao-rotas",                    icon: <Business fontSize="small" />,           type: "page" },
  { id: "p-romaneio",     label: "Romaneio",               category: "Página", path: "/romaneio",                        icon: <Print fontSize="small" />,              type: "page" },
  { id: "p-estoque",      label: "Estoque Central",        category: "Página", path: "/estoque-central",                 icon: <Inventory fontSize="small" />,          type: "page" },
  { id: "p-estoque-esc",  label: "Estoque Escolar",        category: "Página", path: "/estoque-escolar",                 icon: <School fontSize="small" />,             type: "page" },
  { id: "p-modalidades",  label: "Modalidades",            category: "Página", path: "/modalidades",                     icon: <Category fontSize="small" />,           type: "page" },
  { id: "p-nutricionistas", label: "Nutricionistas",       category: "Página", path: "/nutricionistas",                  icon: <Restaurant fontSize="small" />,         type: "page" },
  { id: "p-planejamento", label: "Planejamento de Compras",category: "Página", path: "/compras/planejamento",            icon: <Calculate fontSize="small" />,          type: "page" },
  { id: "p-pnae",         label: "Dashboard PNAE",         category: "Página", path: "/pnae/dashboard",                  icon: <Agriculture fontSize="small" />,        type: "page" },
  { id: "p-calendario",   label: "Calendário Letivo",      category: "Página", path: "/calendario-letivo",               icon: <CalendarToday fontSize="small" />,      type: "page" },
  { id: "p-config",       label: "Configurações",          category: "Página", path: "/configuracao-instituicao",        icon: <Settings fontSize="small" />,           type: "page" },
  { id: "p-usuarios",     label: "Usuários",               category: "Página", path: "/gerenciamento-usuarios",          icon: <AdminPanelSettings fontSize="small" />, type: "page" },
];

// ─── Ícones por categoria de registro ───
const RECORD_ICONS: Record<string, React.ReactNode> = {
  "Escola":       <School fontSize="small" />,
  "Produto":      <Inventory fontSize="small" />,
  "Preparação":   <Restaurant fontSize="small" />,
  "Cardápio":     <MenuBook fontSize="small" />,
  "Fornecedor":   <Business fontSize="small" />,
  "Contrato":     <Assignment fontSize="small" />,
  "Pedido":       <RequestPage fontSize="small" />,
};

const DT = {
  bg: { primary: "#161b22", secondary: "#21262d", elevated: "#2d333b" },
  border: { subtle: "#21262d", medium: "#30363d" },
  text: { primary: "#e6edf3", secondary: "#8b949e", muted: "#6e7681" },
  accent: { primary: "#58a6ff", success: "#3fb950" },
};

function normalize(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── Busca nas APIs ───
async function searchAPIs(query: string): Promise<SearchResult[]> {
  const q = normalize(query);
  const results: SearchResult[] = [];

  const requests = [
    api.get("/escolas").then(({ data }) => {
      const items: any[] = data.data || [];
      items.filter(i => normalize(i.nome).includes(q)).slice(0, 3).forEach(i =>
        results.push({ id: `escola-${i.id}`, label: i.nome, sublabel: i.endereco || "Escola", category: "Escola", path: `/escolas/${i.id}`, icon: RECORD_ICONS["Escola"], type: "record" })
      );
    }).catch(() => {}),

    api.get("/produtos").then(({ data }) => {
      const items: any[] = data.data || [];
      items.filter(i => normalize(i.nome).includes(q)).slice(0, 3).forEach(i =>
        results.push({ id: `produto-${i.id}`, label: i.nome, sublabel: i.categoria || "Produto", category: "Produto", path: `/produtos/${i.id}`, icon: RECORD_ICONS["Produto"], type: "record" })
      );
    }).catch(() => {}),

    api.get("/refeicoes").then(({ data }) => {
      const items: any[] = data.data || [];
      items.filter(i => normalize(i.nome).includes(q)).slice(0, 3).forEach(i =>
        results.push({ id: `prep-${i.id}`, label: i.nome, sublabel: i.tipo_refeicao || "Preparação", category: "Preparação", path: `/preparacoes/${i.id}`, icon: RECORD_ICONS["Preparação"], type: "record" })
      );
    }).catch(() => {}),

    api.get("/cardapios").then(({ data }) => {
      const items: any[] = data.data || [];
      items.filter(i => normalize(i.nome).includes(q)).slice(0, 3).forEach(i =>
        results.push({ id: `cardapio-${i.id}`, label: i.nome, sublabel: `${i.mes}/${i.ano}`, category: "Cardápio", path: `/cardapios`, icon: RECORD_ICONS["Cardápio"], type: "record" })
      );
    }).catch(() => {}),

    api.get("/fornecedores").then(({ data }) => {
      const items: any[] = data.data || [];
      items.filter(i => normalize(i.nome).includes(q) || normalize(i.cnpj || "").includes(q)).slice(0, 3).forEach(i =>
        results.push({ id: `forn-${i.id}`, label: i.nome, sublabel: i.cnpj || "Fornecedor", category: "Fornecedor", path: `/fornecedores/${i.id}`, icon: RECORD_ICONS["Fornecedor"], type: "record" })
      );
    }).catch(() => {}),

    api.get("/contratos").then(({ data }) => {
      const items: any[] = data.data || [];
      items.filter(i => normalize(i.numero || i.nome || "").includes(q) || normalize(i.fornecedor_nome || "").includes(q)).slice(0, 3).forEach(i =>
        results.push({ id: `contrato-${i.id}`, label: i.numero || i.nome || `Contrato #${i.id}`, sublabel: i.fornecedor_nome || "Contrato", category: "Contrato", path: `/contratos/${i.id}`, icon: RECORD_ICONS["Contrato"], type: "record" })
      );
    }).catch(() => {}),

    api.get("/compras").then(({ data }) => {
      const items: any[] = data.data || data.pedidos || [];
      items.filter(i => normalize(String(i.numero || i.id)).includes(q) || normalize(i.status || "").includes(q)).slice(0, 3).forEach(i =>
        results.push({ id: `pedido-${i.id}`, label: `Pedido #${i.numero || i.id}`, sublabel: i.status || "Pedido", category: "Pedido", path: `/compras/${i.id}`, icon: RECORD_ICONS["Pedido"], type: "record" })
      );
    }).catch(() => {}),
  ];

  await Promise.all(requests);
  return results;
}

// ─── Dropdown de resultados ───
export const GlobalSearchDropdown: React.FC<{
  query: string;
  loading: boolean;
  results: SearchResult[];
  onNavigate: (path: string) => void;
  onClose: () => void;
}> = ({ query, loading, results, onNavigate, onClose }) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => { setSelected(0); }, [results]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) { onNavigate(results[selected].path); onClose(); }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [results, selected, onNavigate, onClose]);

  // Agrupar por categoria
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  const flatResults = Object.values(grouped).flat();

  return (
    <Paper elevation={0} sx={{
      position: "absolute",
      top: "calc(100% + 8px)",
      left: 0, right: 0,
      bgcolor: DT.bg.elevated,
      border: `1px solid ${DT.border.medium}`,
      borderRadius: "12px",
      overflow: "hidden",
      zIndex: 9999,
      boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
      maxHeight: 480,
      overflowY: "auto",
    }}>
      {loading ? (
        <Box sx={{ py: 3, display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5 }}>
          <CircularProgress size={18} sx={{ color: DT.accent.primary }} />
          <Typography sx={{ color: DT.text.muted, fontSize: "0.875rem" }}>Buscando...</Typography>
        </Box>
      ) : results.length === 0 ? (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography sx={{ color: DT.text.muted, fontSize: "0.875rem" }}>
            Nenhum resultado para "{query}"
          </Typography>
        </Box>
      ) : (
        <List dense disablePadding>
          {Object.entries(grouped).map(([category, items], gi) => (
            <React.Fragment key={category}>
              {gi > 0 && <Divider sx={{ borderColor: DT.border.subtle, mx: 1.5 }} />}
              {/* Label da categoria */}
              <Box sx={{ px: 2, pt: gi === 0 ? 1.5 : 1, pb: 0.5 }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: DT.text.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  {category}
                </Typography>
              </Box>
              {items.map(item => {
                const globalIdx = flatResults.findIndex(r => r.id === item.id);
                const isSelected = globalIdx === selected;
                return (
                  <ListItemButton
                    key={item.id}
                    onClick={() => { onNavigate(item.path); onClose(); }}
                    sx={{
                      px: 2, py: 1,
                      mx: 1, mb: 0.25,
                      borderRadius: "8px",
                      bgcolor: isSelected ? `${DT.accent.primary}15` : "transparent",
                      "&:hover": { bgcolor: `${DT.accent.primary}10` },
                    }}
                  >
                    <ListItemIcon sx={{ color: isSelected ? DT.accent.primary : DT.text.muted, minWidth: 34 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.sublabel}
                      primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: isSelected ? 500 : 400, color: DT.text.primary }}
                      secondaryTypographyProps={{ fontSize: "0.75rem", color: DT.text.muted }}
                    />
                    {isSelected && <ArrowForward sx={{ fontSize: 14, color: DT.accent.primary, opacity: 0.7 }} />}
                  </ListItemButton>
                );
              })}
            </React.Fragment>
          ))}

          {/* Rodapé com atalhos */}
          <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${DT.border.subtle}`, display: "flex", gap: 2, mt: 0.5 }}>
            {[["↑↓", "navegar"], ["Enter", "abrir"], ["Esc", "fechar"]].map(([key, label]) => (
              <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Chip label={key} size="small" sx={{
                  height: 20, fontSize: "0.7rem", fontWeight: 600,
                  bgcolor: DT.bg.secondary, color: DT.text.secondary,
                  border: `1px solid ${DT.border.medium}`, borderRadius: "4px",
                }} />
                <Typography sx={{ fontSize: "0.7rem", color: DT.text.muted }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </List>
      )}
    </Paper>
  );
};

// ─── Hook principal ───
export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atalho Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Busca com debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      // Busca rápida nas páginas sem API
      if (query.trim().length > 0) {
        const q = normalize(query);
        const pageResults = PAGE_INDEX.filter(p => normalize(p.label).includes(q)).slice(0, 5);
        setResults(pageResults);
      } else {
        setResults([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      const q = normalize(query);

      // Páginas que batem
      const pageResults = PAGE_INDEX.filter(p => normalize(p.label).includes(q));

      // Registros das APIs
      const apiResults = await searchAPIs(query);

      setResults([...pageResults, ...apiResults].slice(0, 20));
      setLoading(false);
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setQuery("");
    setOpen(false);
    setResults([]);
    inputRef.current?.blur();
  }, [navigate]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    inputRef.current?.blur();
  }, []);

  return { query, setQuery, open, setOpen, loading, results, inputRef, handleNavigate, handleClose };
}
