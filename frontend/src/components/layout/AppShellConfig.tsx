import React from "react";
import { alpha } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import {
  AppWindow,
  BarChart3,
  BellRing,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChefHat,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  ListChecks,
  Map,
  Package2,
  School,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Sprout,
  Store,
  Truck,
  UsersRound,
  Utensils,
  Warehouse,
} from "lucide-react";

import { ROUTE_PERMISSION_SLUGS } from "../../routes/permissionSlugs";

export const drawerWidth = 248;
export const collapsedDrawerWidth = 78;
export const desktopTitleBarHeight = 32;
export const navInset = 0.75;
export const navIconWidth = 30;
export const navItemPaddingX = 1.25;
export const sidebarFontFamily = '"Segoe UI Variable", "Segoe UI", "Inter", "Roboto", sans-serif';
export const iconProps = { size: 15, strokeWidth: 1.75 };
export const compactIconProps = { size: 14, strokeWidth: 1.75 };

export type LayoutTokens = {
  bgPrimary: string;
  bgSecondary: string;
  bgElevated: string;
  bgAccent: string;
  navActiveBg: string;
  navActiveBorder: string;
  navActiveText: string;
  borderSubtle: string;
  borderMedium: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  success: string;
  danger: string;
  primaryTint: string;
  successTint: string;
  dangerTint: string;
  shadow: string;
};

export type MenuItemConfig = {
  text: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
};

export const getLayoutTokens = (theme: Theme): LayoutTokens => ({
  bgPrimary: theme.palette.background.sidebar,
  bgSecondary: theme.palette.background.paper,
  bgElevated: theme.palette.mode === "light" ? "#e8ebef" : "#1d1d1d",
  bgAccent: theme.palette.mode === "light" ? "#eef1f4" : "#171717",
  navActiveBg: theme.palette.mode === "light" ? "#dfe4e9" : "#202020",
  navActiveBorder: "transparent",
  navActiveText: theme.palette.mode === "light" ? "#111827" : "#f5f5f5",
  borderSubtle: theme.palette.divider,
  borderMedium: alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.18 : 0.2),
  textPrimary: theme.palette.text.primary,
  textSecondary: theme.palette.text.secondary,
  textMuted: alpha(theme.palette.text.secondary, theme.palette.mode === "light" ? 0.92 : 0.8),
  primary: theme.palette.primary.main,
  success: theme.palette.success.main,
  danger: theme.palette.error.main,
  primaryTint: alpha(theme.palette.primary.main, 0.16),
  successTint: alpha(theme.palette.success.main, 0.18),
  dangerTint: alpha(theme.palette.error.main, 0.18),
  shadow: theme.palette.mode === "light" ? "0 12px 30px rgba(47,49,53,0.06)" : "0 10px 24px rgba(0,0,0,0.16)",
});

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Principal: <LayoutDashboard {...iconProps} />,
  Abastecimento: <AppWindow {...iconProps} />,
  Cadastros: <UsersRound {...iconProps} />,
  Cardapios: <Utensils {...iconProps} />,
  Compras: <ShoppingBasket {...iconProps} />,
  Entregas: <Truck {...iconProps} />,
  Estoque: <Package2 {...iconProps} />,
  Configuracoes: <Settings {...iconProps} />,
  "Portal Escola": <Building2 {...iconProps} />,
};

export const MENU_ESCOLA = [
  {
    category: "Portal Escola",
    items: [
      { text: "Minha Escola", icon: <Home {...iconProps} />, path: "/portal-escola" },
      { text: "Cardapio", icon: <Utensils {...iconProps} />, path: "/portal-escola/cardapio" },
      { text: "Solicitacoes", icon: <FileText {...iconProps} />, path: "/portal-escola/solicitacoes" },
      { text: "Comprovantes", icon: <ShieldCheck {...iconProps} />, path: "/portal-escola/comprovantes" },
      { text: "Alunos", icon: <UsersRound {...iconProps} />, path: "/portal-escola/alunos" },
    ],
  },
];

export const getMenuConfig = (_cfg: unknown) => [
  {
    standalone: true,
    item: { text: "Dashboard", icon: <LayoutDashboard {...iconProps} />, path: "/dashboard" },
  },
  {
    category: "Cadastros",
    items: [
      { text: "Escolas", icon: <School {...iconProps} />, path: "/escolas" },
      { text: "Modalidades", icon: <SlidersHorizontal {...iconProps} />, path: "/modalidades" },
      { text: "Produtos", icon: <Package2 {...iconProps} />, path: "/produtos" },
      { text: "Nutricionistas", icon: <Utensils {...iconProps} />, path: "/nutricionistas" },
      { text: "Fornecedores", icon: <Store {...iconProps} />, path: "/fornecedores" },
      { text: "Contratos", icon: <ClipboardList {...iconProps} />, path: "/contratos" },
    ],
  },
  {
    category: "Cardapios",
    items: [
      { text: "Preparacoes", icon: <ChefHat {...iconProps} />, path: "/preparacoes" },
      { text: "Cardapios", icon: <BookOpen {...iconProps} />, path: "/cardapios" },
      { text: "Tipos de Refeicao", icon: <CalendarDays {...iconProps} />, path: "/tipos-refeicao" },
    ],
  },
  {
    category: "Compras",
    items: [
      { text: "Saldos de Contratos", icon: <BriefcaseBusiness {...iconProps} />, path: "/saldos-contratos-modalidades" },
      { text: "Dashboard PNAE", icon: <Sprout {...iconProps} />, path: "/pnae/dashboard" },
    ],
  },
  {
    category: "Abastecimento",
    items: [
      { text: "Visao Geral", icon: <BarChart3 {...iconProps} />, path: "/abastecimento" },
      { text: "Guias de Demanda", icon: <ListChecks {...iconProps} />, path: "/guias-demanda" },
      { text: "Compras / Pedidos", icon: <ShoppingBasket {...iconProps} />, path: "/compras" },
      { text: "Entregas", icon: <Truck {...iconProps} />, path: "/entregas" },
      { text: "Comprovantes", icon: <ClipboardCheck {...iconProps} />, path: "/comprovantes-entrega" },
      { text: "Rotas", icon: <Map {...iconProps} />, path: "/gestao-rotas" },
    ],
  },
  {
    category: "Estoque",
    items: [
      { text: "Estoque Central", icon: <Warehouse {...iconProps} />, path: "/estoque-central" },
      { text: "Estoque Escolar", icon: <Boxes {...iconProps} />, path: "/estoque-escolar" },
      { text: "Solicitacoes Recebidas", icon: <CalendarCheck {...iconProps} />, path: "/solicitacoes-alimentos" },
    ],
  },
];

export const SETTINGS_MENU_ITEMS: MenuItemConfig[] = [
  { text: "Instituicao", icon: <Building2 {...iconProps} />, path: "/configuracao-instituicao" },
  { text: "Calendario Letivo", icon: <CalendarDays {...iconProps} />, path: "/calendario-letivo" },
  { text: "Periodos", icon: <CalendarCheck {...iconProps} />, path: "/periodos", adminOnly: true },
  { text: "Usuarios", icon: <ShieldCheck {...iconProps} />, path: "/gerenciamento-usuarios", adminOnly: true },
  { text: "Disparos", icon: <BellRing {...iconProps} />, path: "/disparos-notificacao", adminOnly: true },
];

export const MODULO_SLUGS: Record<string, string> = {
  Dashboard: "dashboard",
  "Visao Geral": "planejamento_compras",
  "Compras / Pedidos": ROUTE_PERMISSION_SLUGS.compras,
  Rotas: "rotas",
  Escolas: "escolas",
  Modalidades: "modalidades",
  Produtos: "produtos",
  Nutricionistas: "nutricionistas",
  Fornecedores: "fornecedores",
  Contratos: "contratos",
  Preparacoes: ROUTE_PERMISSION_SLUGS.preparacoes,
  Cardapios: "cardapios",
  "Tipos de Refeicao": "tipos_refeicao",
  "Guias de Demanda": ROUTE_PERMISSION_SLUGS.guiasDemanda,
  Pedidos: ROUTE_PERMISSION_SLUGS.compras,
  "Saldos de Contratos": "saldo_contratos",
  "Dashboard PNAE": "pnae",
  "Gestao de Rotas": "rotas",
  Romaneio: "romaneio",
  Entregas: "entregas",
  Comprovantes: "comprovantes",
  "Estoque Central": "estoque",
  "Estoque Escolar": "estoque",
  "Solicitacoes Recebidas": "solicitacoes",
  Instituicao: "configuracoes",
  "Calendario Letivo": "calendario",
  Periodos: "periodos",
  Usuarios: "usuarios",
  Disparos: "notificacoes",
};
