const TITLE_BAR_HEIGHT = 32;

const TITLE_BAR_THEMES = {
  dark: {
    color: '#090a0c',
    symbolColor: '#f3f4f6',
  },
  light: {
    color: '#ece4d5',
    symbolColor: '#1f2430',
  },
};

function normalizeThemeMode(mode) {
  return mode === 'light' ? 'light' : 'dark';
}

function getTitleBarOverlayOptions(mode = 'dark') {
  const theme = TITLE_BAR_THEMES[normalizeThemeMode(mode)];

  return {
    color: theme.color,
    symbolColor: theme.symbolColor,
    height: TITLE_BAR_HEIGHT,
  };
}

function supportsTitleBarOverlay(platform = process.platform) {
  return platform === 'win32' || platform === 'linux';
}

function getBrowserWindowAppearanceOptions(platform = process.platform, mode = 'dark') {
  const overlay = getTitleBarOverlayOptions(mode);

  if (platform === 'darwin') {
    return {
      backgroundColor: overlay.color,
      titleBarStyle: 'hiddenInset',
    };
  }

  if (supportsTitleBarOverlay(platform)) {
    return {
      backgroundColor: overlay.color,
      titleBarStyle: 'hidden',
      titleBarOverlay: overlay,
    };
  }

  return {
    backgroundColor: overlay.color,
    titleBarStyle: 'default',
  };
}

function applyTitleBarTheme(window, mode = 'dark', platform = process.platform) {
  if (!window || window.isDestroyed?.()) return;

  const overlay = getTitleBarOverlayOptions(mode);

  if (typeof window.setBackgroundColor === 'function') {
    window.setBackgroundColor(overlay.color);
  }

  if (supportsTitleBarOverlay(platform) && typeof window.setTitleBarOverlay === 'function') {
    window.setTitleBarOverlay(overlay);
  }
}

module.exports = {
  TITLE_BAR_HEIGHT,
  TITLE_BAR_THEMES,
  applyTitleBarTheme,
  getBrowserWindowAppearanceOptions,
  getTitleBarOverlayOptions,
  normalizeThemeMode,
  supportsTitleBarOverlay,
};
