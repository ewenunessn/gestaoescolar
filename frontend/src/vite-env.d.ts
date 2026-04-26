/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_HEALTH_URL: string
  readonly VITE_DEBUG: string
  readonly VITE_VERCEL: string
  readonly VITE_NODE_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface DesktopShell {
  readonly isDesktop: boolean
  readonly isDev?: boolean
  readonly platform: string
  readonly apiBaseURL: string
  readonly healthURL: string
  openExternal: (url: string) => Promise<void>
  showItemInFolder?: (filePath: string) => void
  openLogsFolder?: () => Promise<string>
  reloadApp?: () => void
  toggleDevTools?: () => void
  showAboutDialog?: () => Promise<unknown>
  saveGeneratedFile?: (payload: {
    fileName: string
    mimeType: string
    data: string
    encoding: 'base64'
  }) => Promise<{ canceled: boolean; fileName: string; filePath?: string }>
  onDownloadComplete?: (callback: (payload: { fileName: string; filePath: string }) => void) => () => void
  onDownloadCancelled?: (callback: (payload: { fileName: string }) => void) => () => void
  onDownloadFailed?: (callback: (payload: { fileName: string; state?: string }) => void) => () => void
  setTitleBarTheme?: (mode: 'light' | 'dark') => void
}

interface Window {
  readonly desktopShell?: DesktopShell
}
