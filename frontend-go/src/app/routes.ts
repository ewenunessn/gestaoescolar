import { BasketIcon, BoxIcon, BriefcaseIcon, DashboardIcon, MenuIcon, SettingsIcon, UsersIcon } from "../components/icons";

export type AppRoute =
  | "dashboard"
  | "schools"
  | "schoolDetail"
  | "schoolForm"
  | "modalities"
  | "modalityForm"
  | "products"
  | "productDetail"
  | "productForm"
  | "nutritionists"
  | "suppliers"
  | "supplierDetail"
  | "supplierForm"
  | "contracts"
  | "contractDetail"
  | "contractForm"
  | "preparations"
  | "preparationDetail"
  | "preparationForm"
  | "meals"
  | "mealDetail"
  | "mealForm"
  | "menus"
  | "menuAssembly"
  | "menuForm"
  | "demand"
  | "centralStock"
  | "schoolStock"
  | "users"
  | "saas";

export type NavItem = {
  label: string;
  icon: typeof DashboardIcon;
  route?: AppRoute;
  children?: Array<{ route: AppRoute; label: string }>;
};

export const routePaths: Record<AppRoute, string> = {
  dashboard: "/dashboard",
  schools: "/cadastros/escolas",
  schoolDetail: "/cadastros/escolas/detalhe",
  schoolForm: "/cadastros/escolas/novo",
  modalities: "/cadastros/modalidades",
  modalityForm: "/cadastros/modalidades/novo",
  products: "/cadastros/produtos",
  productDetail: "/cadastros/produtos/detalhe",
  productForm: "/cadastros/produtos/novo",
  nutritionists: "/cadastros/nutricionistas",
  suppliers: "/cadastros/fornecedores",
  supplierDetail: "/cadastros/fornecedores/detalhe",
  supplierForm: "/cadastros/fornecedores/novo",
  contracts: "/cadastros/contratos",
  contractDetail: "/cadastros/contratos/detalhe",
  contractForm: "/cadastros/contratos/novo",
  preparations: "/cardapios/preparacoes",
  preparationDetail: "/cardapios/preparacoes/detalhe",
  preparationForm: "/cardapios/preparacoes/novo",
  meals: "/cardapios/refeicoes",
  mealDetail: "/cardapios/refeicoes/detalhe",
  mealForm: "/cardapios/refeicoes/novo",
  menus: "/cardapios",
  menuAssembly: "/cardapios/montagem",
  menuForm: "/cardapios/novo",
  demand: "/necessidade",
  centralStock: "/abastecimento/almoxarifado-central",
  schoolStock: "/estoque/escolas",
  users: "/usuarios",
  saas: "/equipe-saas",
};

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: DashboardIcon,
    route: "dashboard",
  },
  {
    label: "Cadastros",
    icon: UsersIcon,
    children: [
      { route: "schools", label: "Escolas" },
      { route: "modalities", label: "Modalidades" },
      { route: "products", label: "Produtos" },
      { route: "nutritionists", label: "Nutricionistas" },
      { route: "suppliers", label: "Fornecedores" },
      { route: "contracts", label: "Contratos" },
    ],
  },
  {
    label: "Cardapios",
    icon: MenuIcon,
    children: [
      { route: "preparations", label: "Preparacoes" },
      { route: "meals", label: "Refeicoes" },
      { route: "menus", label: "Cardapios" },
      { route: "demand", label: "Necessidade" },
    ],
  },
  {
    label: "Compras",
    icon: BasketIcon,
  },
  {
    label: "Abastecimento",
    icon: BriefcaseIcon,
    children: [{ route: "centralStock", label: "Almoxarifado Central" }],
  },
  {
    label: "Estoque",
    icon: BoxIcon,
    children: [{ route: "schoolStock", label: "Estoque Escola" }],
  },
  {
    label: "Configuracoes",
    icon: SettingsIcon,
    children: [
      { route: "users", label: "Usuarios" },
      { route: "saas", label: "Equipe SaaS" },
    ],
  },
];

export function routeFromLocation(): AppRoute {
  const path = window.location.pathname;
  if (path === "/cadastros") return "schools";
  if (/^\/cadastros\/escolas\/\d+$/.test(path)) return "schoolDetail";
  if (path.startsWith("/cadastros/escolas/")) return "schoolForm";
  if (path.startsWith("/cadastros/modalidades/")) return "modalityForm";
  if (/^\/cadastros\/produtos\/\d+$/.test(path)) return "productDetail";
  if (path.startsWith("/cadastros/produtos/")) return "productForm";
  if (/^\/cadastros\/fornecedores\/\d+$/.test(path)) return "supplierDetail";
  if (path.startsWith("/cadastros/fornecedores/")) return "supplierForm";
  if (/^\/cadastros\/contratos\/\d+$/.test(path)) return "contractDetail";
  if (path.startsWith("/cadastros/contratos/")) return "contractForm";
  if (/^\/cardapios\/preparacoes\/\d+$/.test(path)) return "preparationDetail";
  if (path.startsWith("/cardapios/preparacoes/")) return "preparationForm";
  if (/^\/cardapios\/refeicoes\/\d+$/.test(path)) return "mealDetail";
  if (path.startsWith("/cardapios/refeicoes/")) return "mealForm";
  if (/^\/cardapios\/\d+\/montagem$/.test(path)) return "menuAssembly";
  if (path.startsWith("/abastecimento/")) return "centralStock";
  if (path.startsWith("/estoque/")) return "schoolStock";
  if (path.startsWith("/cardapios/novo") || path.endsWith("/editar")) return "menuForm";
  const entry = Object.entries(routePaths).find(([, value]) => value === path);
  return (entry?.[0] as AppRoute | undefined) || "dashboard";
}

export function catalogListRoute(route: AppRoute): AppRoute {
  if (route === "schoolForm") return "schools";
  if (route === "schoolDetail") return "schools";
  if (route === "modalityForm") return "modalities";
  if (route === "productDetail") return "products";
  if (route === "productForm") return "products";
  if (route === "supplierDetail") return "suppliers";
  if (route === "supplierForm") return "suppliers";
  if (route === "contractDetail") return "contracts";
  if (route === "contractForm") return "contracts";
  if (route === "preparationDetail") return "preparations";
  if (route === "preparationForm") return "preparations";
  if (route === "mealDetail") return "meals";
  if (route === "mealForm") return "meals";
  if (route === "menuAssembly") return "menus";
  if (route === "menuForm") return "menus";
  return route;
}

export function editPath(route: AppRoute, id: number) {
  const listRoute = catalogListRoute(route);
  return `${routePaths[listRoute]}/${id}/editar`;
}

export function detailPath(route: AppRoute, id: number) {
  const listRoute = catalogListRoute(route);
  return `${routePaths[listRoute]}/${id}`;
}

export function routeIdFromLocation() {
  const [, id] = window.location.pathname.match(/\/(\d+)(?:\/(?:editar|montagem))?$/) || [];
  return id ? Number(id) : null;
}
