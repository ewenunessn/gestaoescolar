import { ReactNode, useMemo, useState } from "react";
import { AuthState, GoConfig } from "../api/client";
import { BellIcon, ChevronDownIcon, LogoutIcon, MoonIcon, SearchIcon, SettingsIcon, SidebarIcon, SunIcon } from "../components/icons";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { ThemeName } from "../theme/themes";
import { AppRoute, catalogListRoute, navItems } from "./routes";

type AppShellProps = {
  auth: AuthState;
  config: GoConfig;
  route: AppRoute;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
  children: ReactNode;
};

function isGroupActive(item: (typeof navItems)[number], route: AppRoute) {
  const listRoute = catalogListRoute(route);
  return item.route === listRoute || Boolean(item.children?.some((child) => child.route === listRoute));
}

export function AppShell({ auth, config, route, theme, onThemeChange, onNavigate, onLogout, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeTitle = useMemo(() => {
    for (const item of navItems) {
      const listRoute = catalogListRoute(route);
      if (item.route === listRoute) return item.label;
      const child = item.children?.find((entry) => entry.route === listRoute);
      if (child) return child.label;
    }
    return "Dashboard";
  }, [route]);

  function toggleGroup(label: string) {
    setOpenGroups((current) => (current.includes(label) ? current.filter((item) => item !== label) : [...current, label]));
  }

  const navButtonClass = (active: boolean) =>
    cn(
      "h-10 justify-start gap-3 rounded-xl px-2 text-xs font-bold uppercase text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-active)] hover:text-[var(--color-sidebar-active-text)]",
      active && "bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-active-text)]",
      collapsed && "mx-auto w-[58px] justify-center px-0",
    );

  return (
    <div className={cn("grid min-h-screen bg-background", collapsed ? "grid-cols-[80px_minmax(0,1fr)]" : "grid-cols-[300px_minmax(0,1fr)]")}>
      <aside className="sticky top-0 flex h-screen flex-col gap-6 overflow-hidden border-r border-[var(--color-border-soft)] bg-[var(--color-sidebar)] px-[18px] py-5 text-[var(--color-sidebar-text)]">
        <div className={cn("flex min-h-8 items-center gap-3", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && <strong className="text-base text-[var(--color-sidebar-active-text)]">NutriLog</strong>}
          <Button variant="ghost" size="icon" aria-label={collapsed ? "Expandir menu" : "Recolher menu"} onClick={() => setCollapsed(!collapsed)}>
            <SidebarIcon className="size-[18px]" />
          </Button>
        </div>

        <Button variant="ghost" className={navButtonClass(false)} title="Pesquisar">
          <SearchIcon className="size-[18px]" />
          {!collapsed && <span className="normal-case">Pesquisar</span>}
        </Button>

        <nav className="flex flex-col gap-1" aria-label="Menu principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isGroupActive(item, route);
            const isOpen = openGroups.includes(item.label);

            if (item.children) {
              return (
                <div className="flex flex-col gap-1" key={item.label}>
                  <Button className={navButtonClass(active)} variant="ghost" title={item.label} onClick={() => (collapsed ? onNavigate(item.children![0].route) : toggleGroup(item.label))}>
                    <Icon className="size-[18px]" />
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                        <ChevronDownIcon className={cn("size-4 text-[var(--color-sidebar-muted)] transition-transform", isOpen && "rotate-180")} />
                      </>
                    )}
                  </Button>
                  {!collapsed && isOpen && (
                    <div className="flex flex-col gap-1 pb-2 pl-10">
                      {item.children.map((child) => (
                        <Button
                          key={child.route}
                          variant="ghost"
                          className={cn(
                            "h-9 justify-start rounded-xl px-2 text-xs font-semibold text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-active)] hover:text-[var(--color-sidebar-active-text)]",
                            catalogListRoute(route) === child.route && "bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-active-text)]",
                          )}
                          onClick={() => onNavigate(child.route)}
                        >
                          {child.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Button
                key={item.label}
                className={cn(navButtonClass(active), !item.route && "cursor-default opacity-70 hover:bg-transparent")}
                variant="ghost"
                title={item.label}
                onClick={() => item.route && onNavigate(item.route)}
              >
                <Icon className="size-[18px]" />
                {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        <div className="relative mt-auto flex flex-col gap-2">
          <Button variant="ghost" className={navButtonClass(false)} title="Notificacoes">
            <BellIcon className="size-[18px]" />
            {!collapsed && <span className="normal-case">Notificacoes</span>}
          </Button>

          {settingsOpen && !collapsed && (
            <div className="absolute bottom-12 left-0 right-0 z-20 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 text-[var(--color-sidebar-text)] shadow-2xl shadow-black/40">
              <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground">
                <div className="grid size-6 place-items-center rounded-full border border-[var(--color-border)] text-[10px] font-bold">{auth.user.name.slice(0, 1).toUpperCase()}</div>
                <span className="min-w-0 truncate">{auth.user.email}</span>
              </div>

              <button type="button" className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-muted-foreground hover:bg-[var(--color-sidebar-active)]">
                <SettingsIcon className="size-4" />
                Conta pessoal
              </button>

              <div className="my-1 border-t border-[var(--color-border)]" />

              <div className="space-y-2 px-2 py-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <SettingsIcon className="size-4" />
                  Configuracoes
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => onThemeChange("light")}>
                    <SunIcon className="size-4" />
                    Claro
                  </Button>
                  <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => onThemeChange("dark")}>
                    <MoonIcon className="size-4" />
                    Escuro
                  </Button>
                </div>
              </div>

              <div className="my-1 border-t border-[var(--color-border)]" />

              <button type="button" className="flex h-9 w-full items-center justify-between rounded-lg px-2 text-left text-xs font-semibold text-foreground hover:bg-[var(--color-sidebar-active)]">
                <span>Limites de uso restantes</span>
                <ChevronDownIcon className="-rotate-90 size-4 text-muted-foreground" />
              </button>
              <button type="button" className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold text-foreground hover:bg-[var(--color-sidebar-active)]" onClick={onLogout}>
                <LogoutIcon className="size-4" />
                Sair
              </button>
            </div>
          )}

          <Button variant="ghost" className={navButtonClass(settingsOpen)} title="Configuracoes" onClick={() => setSettingsOpen(!settingsOpen)}>
            <SettingsIcon className="size-[18px]" />
            {!collapsed && <span className="normal-case">Configuracoes</span>}
          </Button>
        </div>
      </aside>

      <div className="min-w-0 p-[18px]">
        <header className="hidden">
          <span>{activeTitle}</span>
          <span>{config.baseUrl}</span>
        </header>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
