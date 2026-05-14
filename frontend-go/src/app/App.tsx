import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AuthState, GoApi, GoConfig, loadAuth, loadConfig, saveAuth, saveConfig } from "../api/client";
import { loadWorkspaceLists } from "../api/resources";
import { OnboardingPage } from "../features/auth/OnboardingPage";
import { Toaster, ToastMessage, ToastVariant } from "../components/ui/toast";
import { CatalogPlaceholderPage } from "../features/catalog/CatalogPlaceholderPage";
import { ContractFormPage, ModalityFormPage, ProductFormPage, SchoolFormPage, SupplierFormPage } from "../features/catalog/CatalogForms";
import { ContractDetailPage } from "../features/catalog/ContractDetailPage";
import { ContractsPage } from "../features/catalog/ContractsPage";
import { ModalitiesPage } from "../features/catalog/ModalitiesPage";
import { ProductsPage } from "../features/catalog/ProductsPage";
import { ProductDetailPage } from "../features/catalog/ProductDetailPage";
import { SchoolDetailPage } from "../features/catalog/SchoolDetailPage";
import { SchoolsPage } from "../features/catalog/SchoolsPage";
import { SupplierDetailPage } from "../features/catalog/SupplierDetailPage";
import { SuppliersPage } from "../features/catalog/SuppliersPage";
import { DemandPage } from "../features/demands/DemandPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { MealDetailPage, MealFormPage, MealsPage } from "../features/menus/MealPages";
import { MenuAssemblyPage, MenuFormPage, MenusPage } from "../features/menus/MenuPages";
import { PreparationDetailPage, PreparationFormPage, PreparationsPage } from "../features/menus/PreparationPages";
import { SaasOrganizationPage } from "../features/saas/SaasOrganizationPage";
import { CentralStockPage, SchoolStockPage } from "../features/stock/StockPages";
import { UsersPage } from "../features/users/UsersPage";
import { applyTheme, loadThemeName, saveThemeName, ThemeName } from "../theme/themes";
import { Contract, DemandResponse, EducationModality, Meal, Menu, MenuPreparation, Preparation, PreparationProduct, Product, School, Supplier } from "../types/domain";
import { AppShell } from "./AppShell";
import { AppRoute, detailPath, editPath, routeFromLocation, routeIdFromLocation, routePaths } from "./routes";

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

export default function App() {
  const [config, setConfig] = useState<GoConfig>(() => loadConfig());
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuth());
  const [route, setRoute] = useState<AppRoute>(() => routeFromLocation());
  const [theme, setTheme] = useState<ThemeName>(() => loadThemeName());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(() => Boolean(auth));
  const [createdOrg, setCreatedOrg] = useState<{ tenantId: string; tenantSlug: string; invitationToken: string } | null>(null);
  const api = useMemo(() => new GoApi(() => config, () => auth), [config, auth]);

  const [org, setOrg] = useState({
    organizationName: "Prefeitura Demo",
    organizationSlug: "prefeitura-demo",
    adminName: "Administrador",
    adminEmail: "admin@demo.local",
  });
  const [accept, setAccept] = useState({ token: "", name: "Administrador", password: "SenhaMuitoForte123" });
  const [login, setLogin] = useState({ tenantSlug: "prefeitura-demo", email: "admin@demo.local", password: "SenhaMuitoForte123" });
  const [invite, setInvite] = useState({ name: "Diretor Escola", email: "diretor@demo.local", role: "member", schoolIds: "" });

  const [schools, setSchools] = useState<School[]>([]);
  const [modalities, setModalities] = useState<EducationModality[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [preparationProducts, setPreparationProducts] = useState<PreparationProduct[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menuPreparations, setMenuPreparations] = useState<MenuPreparation[]>([]);
  const [demand, setDemand] = useState<DemandResponse | null>(null);

  const [schoolForm, setSchoolForm] = useState<Record<string, string>>({
    name: "Escola Central",
    code: `ESC-${Date.now()}`,
    address: "",
    city: "Cidade",
    mapsAddress: "",
    phone: "",
    email: "",
    managerName: "",
    administrationType: "municipal",
    active: "true",
  });
  const [modalityForm, setModalityForm] = useState<Record<string, string>>({ name: "Ensino Fundamental", description: "Modalidade pedagogica", active: "true" });
  const [schoolModality, setSchoolModality] = useState({ schoolId: "", educationModalityId: "", studentCount: "100" });
  const [productForm, setProductForm] = useState<Record<string, string>>({ name: "Arroz", description: "", unit: "kg", category: "Cereais", correctionFactor: "1.10", active: "true" });
  const [supplierForm, setSupplierForm] = useState<Record<string, string>>({
    name: "Fornecedor Demo",
    document: "00000000000100",
    supplierType: "conventional",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    contactName: "",
    phone: "",
    email: "",
    active: "true",
  });
  const [contractForm, setContractForm] = useState<Record<string, string>>({
    number: "",
    supplierId: "",
    startDate: `${currentYear}-${currentMonth}-01`,
    endDate: `${currentYear}-12-31`,
    status: "active",
    contractType: "supply",
    notes: "",
    active: "true",
  });
  const [preparationForm, setPreparationForm] = useState<Record<string, string>>({ name: "Almoco base", description: "", preparationType: "meal", active: "true" });
  const [prepProduct, setPrepProduct] = useState({ preparationId: "", productId: "", educationModalityId: "", perCapitaAmount: "100", perCapitaUnit: "g" });
  const [mealForm, setMealForm] = useState<Record<string, string>>({ name: "Almoco", code: "ALMOCO", sortOrder: "1", active: "true" });
  const [menuForm, setMenuForm] = useState<Record<string, string>>({
    name: "Cardapio do mes",
    description: "",
    year: String(currentYear),
    month: currentMonth,
    startDate: `${currentYear}-${currentMonth}-01`,
    endDate: `${currentYear}-${currentMonth}-28`,
    educationModalityIds: "",
    active: "true",
  });
  const [menuPrep, setMenuPrep] = useState({ menuId: "", day: "1", mealId: "", preparationId: "" });
  const [demandForm, setDemandForm] = useState({
    competencia: `${currentYear}-${currentMonth}`,
    data_inicio: `${currentYear}-${currentMonth}-01`,
    data_fim: `${currentYear}-${currentMonth}-28`,
    escola_ids: "",
    cardapio_ids: "",
  });

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    saveThemeName(theme);
  }, [theme]);

  useEffect(() => {
    if (auth && window.location.pathname === "/") {
      window.history.replaceState({}, "", routePaths.dashboard);
      setRoute("dashboard");
    }
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    let cancelled = false;

    async function loadInitialLists() {
      setWorkspaceLoading(true);
      try {
        const lists = await loadWorkspaceLists(api);
        if (cancelled) return;
        setSchools(lists.schools);
        setModalities(lists.modalities);
        setProducts(lists.products);
        setSuppliers(lists.suppliers);
        setContracts(lists.contracts);
        setPreparations(lists.preparations);
        setMeals(lists.meals);
        setMenus(lists.menus);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Nao foi possivel carregar os dados iniciais.";
        toast({ variant: "error", title: "Erro ao carregar dados", description: message });
      } finally {
        if (!cancelled) setWorkspaceLoading(false);
      }
    }

    void loadInitialLists();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken, config.baseUrl, config.tenantId]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  function toast({ variant, title, description }: { variant: ToastVariant; title: string; description?: string }) {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), variant, title, description }].slice(-4));
  }

  async function run(work: () => Promise<string | void>) {
    try {
      const message = await work();
      if (message) toast({ variant: "success", title: message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      toast({ variant: "error", title: "Nao foi possivel concluir", description: message });
    }
  }

  function submit(event: FormEvent, work: () => Promise<string | void>) {
    event.preventDefault();
    void run(work);
  }

  function updateAuth(next: AuthState | null) {
    setAuth(next);
    saveAuth(next);
    if (!next) {
      setSchools([]);
      setModalities([]);
      setProducts([]);
      setSuppliers([]);
      setContracts([]);
      setPreparations([]);
      setMeals([]);
      setMenus([]);
      setPreparationProducts([]);
      setMenuPreparations([]);
      setDemand(null);
      return;
    }
    if (next?.tenant.id) {
      const nextConfig = { ...config, tenantId: next.tenant.id };
      setConfig(nextConfig);
      saveConfig(nextConfig);
    }
  }

  function navigate(next: AppRoute) {
    setRoute(next);
    window.history.pushState({}, "", routePaths[next]);
  }

  function navigatePath(next: AppRoute, path: string) {
    setRoute(next);
    window.history.pushState({}, "", path);
  }

  function goDashboard() {
    setRoute("dashboard");
    window.history.pushState({}, "", routePaths.dashboard);
  }

  async function refreshLists() {
    const lists = await loadWorkspaceLists(api);
    setSchools(lists.schools);
    setModalities(lists.modalities);
    setProducts(lists.products);
    setSuppliers(lists.suppliers);
    setContracts(lists.contracts);
    setPreparations(lists.preparations);
    setMeals(lists.meals);
    setMenus(lists.menus);
  }

  const editingId = routeIdFromLocation();

  if (!auth) {
    return (
      <>
        <OnboardingPage
          api={api}
          config={config}
          setConfig={setConfig}
          org={org}
          setOrg={setOrg}
          accept={accept}
          setAccept={setAccept}
          login={login}
          setLogin={setLogin}
          createdOrg={createdOrg}
          setCreatedOrg={setCreatedOrg}
          toast={toast}
          submit={submit}
          updateAuth={updateAuth}
          goDashboard={goDashboard}
        />
        <Toaster toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <AppShell auth={auth} config={config} route={route} theme={theme} onThemeChange={setTheme} onNavigate={navigate} onLogout={() => updateAuth(null)}>
      {route === "dashboard" && <DashboardPage auth={auth} config={config} setConfig={setConfig} toast={toast} refreshLists={refreshLists} run={run} />}

      {route === "saas" && (
        <SaasOrganizationPage
          api={api}
          config={config}
          setConfig={setConfig}
          org={org}
          setOrg={setOrg}
          accept={accept}
          setAccept={setAccept}
          login={login}
          setLogin={setLogin}
          toast={toast}
          submit={submit}
        />
      )}

      {route === "schools" && (
        <SchoolsPage
          api={api}
          schools={schools}
          modalities={modalities}
          loading={workspaceLoading}
          onCreate={() => {
            setSchoolForm({ name: "", code: `ESC-${Date.now()}`, address: "", city: "", mapsAddress: "", phone: "", email: "", managerName: "", administrationType: "municipal", active: "true" });
            navigate("schoolForm");
          }}
          onView={(school) => navigatePath("schoolDetail", detailPath("schools", school.id))}
          onEdit={(school) => navigatePath("schoolForm", editPath("schools", school.id))}
          onDelete={(school) =>
            void run(async () => {
              await api.delete(`/schools/${school.id}`);
              await refreshLists();
              return "Escola excluida.";
            })
          }
        />
      )}

      {route === "schoolDetail" && (
        <SchoolDetailPage
          api={api}
          school={editingId ? schools.find((item) => item.id === editingId) : undefined}
          modalities={modalities}
          loading={workspaceLoading}
          submit={submit}
          run={run}
          refreshLists={refreshLists}
          onEdit={(school) => navigatePath("schoolForm", editPath("schools", school.id))}
        />
      )}

      {route === "schoolForm" && (
        <SchoolFormPage
          api={api}
          item={editingId ? schools.find((item) => item.id === editingId) : undefined}
          form={schoolForm}
          setForm={setSchoolForm}
          refreshLists={refreshLists}
          submit={submit}
          onBack={() => navigate("schools")}
        />
      )}

      {route === "modalities" && (
        <ModalitiesPage
          api={api}
          modalities={modalities}
          loading={workspaceLoading}
          onCreate={() => {
            setModalityForm({ name: "", description: "", active: "true" });
            navigate("modalityForm");
          }}
          onEdit={(modality) => navigatePath("modalityForm", editPath("modalities", modality.id))}
          onDelete={(modality) =>
            void run(async () => {
              await api.delete(`/education-modalities/${modality.id}`);
              await refreshLists();
              return "Modalidade excluida.";
            })
          }
        />
      )}

      {route === "modalityForm" && (
        <ModalityFormPage
          api={api}
          item={editingId ? modalities.find((item) => item.id === editingId) : undefined}
          form={modalityForm}
          setForm={setModalityForm}
          refreshLists={refreshLists}
          submit={submit}
          onBack={() => navigate("modalities")}
        />
      )}

      {route === "products" && (
        <ProductsPage
          api={api}
          products={products}
          loading={workspaceLoading}
          onCreate={() => {
            setProductForm({ name: "", description: "", unit: "kg", category: "", correctionFactor: "1", active: "true" });
            navigate("productForm");
          }}
          onView={(product) => navigatePath("productDetail", detailPath("products", product.id))}
          onEdit={(product) => navigatePath("productForm", editPath("products", product.id))}
          onDelete={(product) =>
            void run(async () => {
              await api.delete(`/products/${product.id}`);
              await refreshLists();
              return "Produto excluido.";
            })
          }
        />
      )}

      {route === "productDetail" && (
        <ProductDetailPage
          product={editingId ? products.find((item) => item.id === editingId) : undefined}
          loading={workspaceLoading}
          onEdit={(product) => navigatePath("productForm", editPath("products", product.id))}
        />
      )}

      {route === "productForm" && (
        <ProductFormPage
          api={api}
          item={editingId ? products.find((item) => item.id === editingId) : undefined}
          form={productForm}
          setForm={setProductForm}
          refreshLists={refreshLists}
          submit={submit}
          onBack={() => navigate("products")}
        />
      )}

      {route === "nutritionists" && <CatalogPlaceholderPage title="Nutricionistas" />}

      {route === "suppliers" && (
        <SuppliersPage
          api={api}
          suppliers={suppliers}
          loading={workspaceLoading}
          onCreate={() => {
            setSupplierForm({ name: "", document: "", supplierType: "conventional", address: "", city: "", state: "", postalCode: "", contactName: "", phone: "", email: "", active: "true" });
            navigate("supplierForm");
          }}
          onView={(supplier) => navigatePath("supplierDetail", detailPath("suppliers", supplier.id))}
          onEdit={(supplier) => navigatePath("supplierForm", editPath("suppliers", supplier.id))}
          onDelete={(supplier) =>
            void run(async () => {
              await api.delete(`/suppliers/${supplier.id}`);
              await refreshLists();
              return "Fornecedor excluido.";
            })
          }
        />
      )}

      {route === "supplierDetail" && (
        <SupplierDetailPage
          api={api}
          supplier={editingId ? suppliers.find((item) => item.id === editingId) : undefined}
          loading={workspaceLoading}
          run={run}
          refreshLists={refreshLists}
          onCreateContract={(supplier) => {
            setContractForm({
              number: "",
              supplierId: String(supplier.id),
              startDate: `${currentYear}-${currentMonth}-01`,
              endDate: `${currentYear}-12-31`,
              status: "active",
              contractType: "supply",
              notes: "",
              active: "true",
            });
            navigate("contractForm");
          }}
          onEditSupplier={(supplier) => navigatePath("supplierForm", editPath("suppliers", supplier.id))}
          onViewContract={(contract) => navigatePath("contractDetail", detailPath("contracts", contract.id))}
          onEditContract={(contract) => navigatePath("contractForm", editPath("contracts", contract.id))}
        />
      )}

      {route === "supplierForm" && (
        <SupplierFormPage
          api={api}
          item={editingId ? suppliers.find((item) => item.id === editingId) : undefined}
          form={supplierForm}
          setForm={setSupplierForm}
          refreshLists={refreshLists}
          submit={submit}
          onBack={() => navigate("suppliers")}
        />
      )}

      {route === "contracts" && (
        <ContractsPage
          api={api}
          contracts={contracts}
          loading={workspaceLoading}
          onCreate={() => {
            setContractForm({
              number: "",
              supplierId: "",
              startDate: `${currentYear}-${currentMonth}-01`,
              endDate: `${currentYear}-12-31`,
              status: "active",
              contractType: "supply",
              notes: "",
              active: "true",
            });
            navigate("contractForm");
          }}
          onView={(contract) => navigatePath("contractDetail", detailPath("contracts", contract.id))}
          onEdit={(contract) => navigatePath("contractForm", editPath("contracts", contract.id))}
          onDelete={(contract) =>
            void run(async () => {
              await api.delete(`/contracts/${contract.id}`);
              await refreshLists();
              return "Contrato excluido.";
            })
          }
        />
      )}

      {route === "contractDetail" && (
        <ContractDetailPage
          api={api}
          contract={editingId ? contracts.find((item) => item.id === editingId) : undefined}
          loading={workspaceLoading}
          products={products}
          submit={submit}
          run={run}
          refreshLists={refreshLists}
          onEdit={(contract) => navigatePath("contractForm", editPath("contracts", contract.id))}
        />
      )}

      {route === "contractForm" && (
        <ContractFormPage
          api={api}
          item={editingId ? contracts.find((item) => item.id === editingId) : undefined}
          suppliers={suppliers}
          form={contractForm}
          setForm={setContractForm}
          refreshLists={refreshLists}
          submit={submit}
          onBack={() => navigate("contracts")}
        />
      )}

      {route === "preparations" && (
        <PreparationsPage
          preparations={preparations}
          loading={workspaceLoading}
          onCreate={() => {
            setPreparationForm({ name: "", description: "", preparationType: "meal", active: "true" });
            navigate("preparationForm");
          }}
          onView={(preparation) => navigatePath("preparationDetail", detailPath("preparations", preparation.id))}
          onEdit={(preparation) => navigatePath("preparationForm", editPath("preparations", preparation.id))}
          onDelete={(preparation) =>
            void run(async () => {
              await api.delete(`/preparations/${preparation.id}`);
              await refreshLists();
              return "Preparacao excluida.";
            })
          }
        />
      )}

      {route === "preparationDetail" && (
        <PreparationDetailPage
          api={api}
          preparation={editingId ? preparations.find((item) => item.id === editingId) : undefined}
          loading={workspaceLoading}
          products={products}
          modalities={modalities}
          submit={submit}
          run={run}
          onEdit={(preparation) => navigatePath("preparationForm", editPath("preparations", preparation.id))}
        />
      )}

      {route === "preparationForm" && (
        <PreparationFormPage
          api={api}
          item={editingId ? preparations.find((item) => item.id === editingId) : undefined}
          form={preparationForm}
          setForm={setPreparationForm}
          refreshLists={refreshLists}
          submit={submit}
          onBack={() => navigate("preparations")}
        />
      )}

      {route === "meals" && (
        <MealsPage
          meals={meals}
          loading={workspaceLoading}
          onCreate={() => {
            setMealForm({ name: "", code: "", sortOrder: "1", active: "true" });
            navigate("mealForm");
          }}
          onView={(meal) => navigatePath("mealDetail", detailPath("meals", meal.id))}
          onEdit={(meal) => navigatePath("mealForm", editPath("meals", meal.id))}
          onDelete={(meal) =>
            void run(async () => {
              await api.delete(`/meals/${meal.id}`);
              await refreshLists();
              return "Refeicao excluida.";
            })
          }
        />
      )}

      {route === "mealDetail" && <MealDetailPage meal={editingId ? meals.find((item) => item.id === editingId) : undefined} loading={workspaceLoading} onEdit={(meal) => navigatePath("mealForm", editPath("meals", meal.id))} />}

      {route === "mealForm" && (
        <MealFormPage
          api={api}
          item={editingId ? meals.find((item) => item.id === editingId) : undefined}
          form={mealForm}
          setForm={setMealForm}
          refreshLists={refreshLists}
          submit={submit}
          onBack={() => navigate("meals")}
        />
      )}

      {route === "menus" && (
        <MenusPage
          menus={menus}
          loading={workspaceLoading}
          onCreate={() => {
            setMenuForm({
              name: "",
              description: "",
              year: String(currentYear),
              month: currentMonth,
              startDate: `${currentYear}-${currentMonth}-01`,
              endDate: `${currentYear}-${currentMonth}-28`,
              educationModalityIds: "",
              active: "true",
            });
            navigate("menuForm");
          }}
          onView={(menu) => navigatePath("menuAssembly", `${detailPath("menus", menu.id)}/montagem`)}
          onEdit={(menu) => navigatePath("menuForm", editPath("menus", menu.id))}
          onDelete={(menu) =>
            void run(async () => {
              await api.delete(`/menus/${menu.id}`);
              await refreshLists();
              return "Cardapio excluido.";
            })
          }
        />
      )}

      {route === "menuForm" && (
        <MenuFormPage
          api={api}
          modalities={modalities}
          item={editingId ? menus.find((item) => item.id === editingId) : undefined}
          form={menuForm}
          setForm={setMenuForm}
          refreshLists={refreshLists}
          submit={submit}
          onBack={() => navigate("menus")}
        />
      )}

      {route === "menuAssembly" && (
        <MenuAssemblyPage
          api={api}
          menu={editingId ? menus.find((item) => item.id === editingId) : undefined}
          loading={workspaceLoading}
          meals={meals}
          preparations={preparations}
          modalities={modalities}
          submit={submit}
          run={run}
          refreshLists={refreshLists}
          onEdit={(menu) => navigatePath("menuForm", editPath("menus", menu.id))}
        />
      )}

      {route === "demand" && <DemandPage api={api} demand={demand} setDemand={setDemand} demandForm={demandForm} setDemandForm={setDemandForm} submit={submit} />}

      {route === "centralStock" && <CentralStockPage api={api} products={products} schools={schools} submit={submit} run={run} />}

      {route === "schoolStock" && <SchoolStockPage api={api} products={products} schools={schools} submit={submit} run={run} />}

      {route === "users" && <UsersPage api={api} auth={auth} invite={invite} setInvite={setInvite} accept={accept} setAccept={setAccept} submit={submit} />}
      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </AppShell>
  );
}
