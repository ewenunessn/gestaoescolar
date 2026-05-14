export type ThemeName = "light" | "dark";

type ThemeTokens = Record<string, string>;

export type AppTheme = {
  name: ThemeName;
  label: string;
  tokens: ThemeTokens;
};

export const themes: Record<ThemeName, AppTheme> = {
  light: {
    name: "light",
    label: "Claro",
    tokens: {
      "app-bg": "#f4f6f8",
      "app-surface": "#ffffff",
      "app-surface-soft": "#f6f8fb",
      "app-surface-raised": "#ffffff",
      "app-text": "#172033",
      "app-muted": "#64748b",
      "app-subtle": "#7a8796",
      "app-border": "#dfe5ed",
      "app-border-soft": "#edf0f4",
      "app-primary": "#246bfe",
      "app-primary-contrast": "#ffffff",
      "app-sidebar": "#ffffff",
      "app-sidebar-text": "#334155",
      "app-sidebar-muted": "#64748b",
      "app-sidebar-active": "#e4e9ef",
      "app-sidebar-active-text": "#172033",
      "app-input": "#ffffff",
      "app-table-head": "#f8fafc",
      "app-hover": "#eef2f7",
      "app-hover-text": "#172033",
      "app-selected": "#e4e9ef",
      "app-selected-text": "#172033",
      "shadow-soft": "0 12px 30px rgba(30, 39, 52, 0.05)",
    },
  },
  dark: {
    name: "dark",
    label: "Escuro",
    tokens: {
      "app-bg": "#121212",
      "app-surface": "#1a1a1a",
      "app-surface-soft": "#202020",
      "app-surface-raised": "#171717",
      "app-text": "#f5f7fb",
      "app-muted": "#a6adbb",
      "app-subtle": "#858c99",
      "app-border": "#303030",
      "app-border-soft": "#262626",
      "app-primary": "#2dd4bf",
      "app-primary-contrast": "#06221e",
      "app-sidebar": "#000000",
      "app-sidebar-text": "#d7dce5",
      "app-sidebar-muted": "#9aa2af",
      "app-sidebar-active": "#222222",
      "app-sidebar-active-text": "#ffffff",
      "app-input": "#141414",
      "app-table-head": "#202020",
      "app-hover": "#252525",
      "app-hover-text": "#ffffff",
      "app-selected": "#303642",
      "app-selected-text": "#ffffff",
      "shadow-soft": "0 16px 36px rgba(0, 0, 0, 0.28)",
    },
  },
};

const storageKey = "gestaoescolar:theme";

export function loadThemeName(): ThemeName {
  const stored = window.localStorage.getItem(storageKey);
  return stored === "dark" || stored === "light" ? stored : "dark";
}

export function saveThemeName(theme: ThemeName) {
  window.localStorage.setItem(storageKey, theme);
}

export function applyTheme(theme: ThemeName) {
  const selected = themes[theme];
  document.documentElement.dataset.theme = selected.name;
  Object.entries(selected.tokens).forEach(([token, value]) => {
    document.documentElement.style.setProperty(`--${token}`, value);
  });
  document.documentElement.style.setProperty("--color-bg", selected.tokens["app-bg"]);
  document.documentElement.style.setProperty("--color-surface", selected.tokens["app-surface"]);
  document.documentElement.style.setProperty("--color-surface-soft", selected.tokens["app-surface-soft"]);
  document.documentElement.style.setProperty("--color-surface-raised", selected.tokens["app-surface-raised"]);
  document.documentElement.style.setProperty("--color-text", selected.tokens["app-text"]);
  document.documentElement.style.setProperty("--color-muted", selected.tokens["app-muted"]);
  document.documentElement.style.setProperty("--color-subtle", selected.tokens["app-subtle"]);
  document.documentElement.style.setProperty("--color-border", selected.tokens["app-border"]);
  document.documentElement.style.setProperty("--color-border-soft", selected.tokens["app-border-soft"]);
  document.documentElement.style.setProperty("--color-primary", selected.tokens["app-primary"]);
  document.documentElement.style.setProperty("--color-primary-contrast", selected.tokens["app-primary-contrast"]);
  document.documentElement.style.setProperty("--color-sidebar", selected.tokens["app-sidebar"]);
  document.documentElement.style.setProperty("--color-sidebar-text", selected.tokens["app-sidebar-text"]);
  document.documentElement.style.setProperty("--color-sidebar-muted", selected.tokens["app-sidebar-muted"]);
  document.documentElement.style.setProperty("--color-sidebar-active", selected.tokens["app-sidebar-active"]);
  document.documentElement.style.setProperty("--color-sidebar-active-text", selected.tokens["app-sidebar-active-text"]);
  document.documentElement.style.setProperty("--color-input", selected.tokens["app-input"]);
  document.documentElement.style.setProperty("--color-table-head", selected.tokens["app-table-head"]);
  document.documentElement.style.setProperty("--color-hover", selected.tokens["app-hover"]);
  document.documentElement.style.setProperty("--color-hover-text", selected.tokens["app-hover-text"]);
  document.documentElement.style.setProperty("--color-selected", selected.tokens["app-selected"]);
  document.documentElement.style.setProperty("--color-selected-text", selected.tokens["app-selected-text"]);
}
