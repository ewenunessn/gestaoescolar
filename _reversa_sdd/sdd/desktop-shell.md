# Desktop Shell

## Visao Geral

- 🟢 O componente Desktop Shell empacota o sistema web em Electron e inicializa um backend local quando a aplicacao esta empacotada.
- 🟢 O renderer roda isolado, com `preload` expondo apenas uma API desktop controlada.
- 🟢 Em caso de falha do backend local, o shell renderiza uma tela de erro no proprio BrowserWindow.
- 🟡 Em desenvolvimento, o shell usa o renderer Vite e backend externo/dev sem bloquear a abertura da janela.

## Responsabilidades

- 🟢 Criar `BrowserWindow` com isolamento de contexto e preload.
- 🟢 Resolver entry do renderer para modo dev ou empacotado.
- 🟢 Configurar URLs de API e health para o renderer.
- 🟢 Inicializar backend local empacotado em porta `3131` por padrao.
- 🟢 Carregar arquivos `.env` especificos do desktop.
- 🟢 Aguardar health check do backend local antes de sinalizar prontidao operacional.
- 🟢 Expor IPC para salvar arquivo gerado, abrir logs, reload, devtools e dialogo About.
- 🟢 Redirecionar links externos para o browser do sistema.
- 🟢 Encerrar o backend filho ao fechar a aplicacao.
- 🟢 Gerenciar downloads via dialog de salvar.

## Interface

### API exposta no preload

| Nome | Tipo | Descricao | Confianca |
| --- | --- | --- | --- |
| `desktopShell.isDesktop` | boolean | Indica ambiente Electron. | 🟢 |
| `desktopShell.isDev` | boolean | Indica modo desenvolvimento. | 🟢 |
| `desktopShell.platform` | string | Plataforma do host. | 🟢 |
| `desktopShell.apiBaseURL` | string | Base URL da API usada pelo renderer. | 🟢 |
| `desktopShell.healthURL` | string | URL do health check. | 🟢 |
| `desktopShell.openExternal(url)` | funcao | Abre link externo no SO. | 🟢 |
| `desktopShell.showItemInFolder(filePath)` | funcao | Revela arquivo no explorador. | 🟢 |
| `desktopShell.openLogsFolder()` | Promise | Abre pasta de logs. | 🟢 |
| `desktopShell.reloadApp()` | evento IPC | Recarrega janela. | 🟢 |
| `desktopShell.toggleDevTools()` | evento IPC | Alterna devtools em dev. | 🟢 |
| `desktopShell.showAboutDialog()` | Promise | Exibe dialogo About. | 🟢 |
| `desktopShell.saveGeneratedFile(payload)` | Promise | Salva arquivo gerado com dialog. | 🟢 |
| `desktopShell.onDownloadComplete(cb)` | listener | Assina conclusao de download. | 🟢 |

### Estruturas principais

```ts
type BackendUrls = {
  baseURL: string;
  healthURL: string;
};

type SaveGeneratedFilePayload = {
  suggestedName?: string;
  mimeType?: string;
  data: string | ArrayBuffer;
};
```

## Regras de Negocio

- 🟢 Nome da app e `NutriLog`.
- 🟢 Em modo empacotado, o backend local sobe por `process.execPath` com `ELECTRON_RUN_AS_NODE=1`.
- 🟢 Em desenvolvimento, o renderer entra por `http://127.0.0.1:5173`.
- 🟢 Em desenvolvimento, a API padrao vem de `VITE_API_URL`/`VITE_HEALTH_URL` ou `http://localhost:3000`.
- 🟢 Em producao, a porta padrao do backend local e `3131`, sobrescrevivel por `DESKTOP_BACKEND_PORT`.
- 🟢 O BrowserWindow usa `contextIsolation: true` e `nodeIntegration: false`.
- 🟢 O backend local le arquivos `nutrilog.env` do diretorio do executavel e do `userData`.
- 🟢 O health check do backend pode esperar ate 90 segundos.
- 🟢 Falha de startup do backend nao encerra automaticamente a app; ela mostra tela HTML de erro.
- 🟢 `setWindowOpenHandler` bloqueia nova janela interna e abre a URL externamente.
- 🟢 No `before-quit`, o processo filho do backend e encerrado.
- 🟢 [Revisao Reviewer] `shouldBlockRendererForBackend()` atualmente retorna `false`, entao o renderer pode aparecer antes do backend estar pronto. Evidencia: `desktop/backend-service.cjs:31-33`.

## Fluxo Principal

1. 🟢 `app.whenReady()` registra o dialog de download.
2. 🟢 O shell cria a `BrowserWindow`.
3. 🟢 O shell resolve URLs do backend para o renderer.
4. 🟢 Em producao, `startBackendWarmup` sobe o backend local.
5. 🟢 O renderer e carregado por `loadURL` ou `loadFile`.
6. 🟢 A janela e revelada quando pronta.
7. 🟢 O preload expõe `desktopShell` para o frontend.
8. 🟢 Ao fechar a app, o backend local e encerrado.

## Fluxos Alternativos

- 🟢 **Falha no health do backend:** tela de startup error e renderizada.
- 🟢 **Sem janela em macOS activate:** o shell recria a janela.
- 🟢 **App minimizada/invisivel:** `restoreVisibleWindow` restaura tamanho e foco.
- 🟢 [Revisao Reviewer] **Backend ainda nao pronto em dev:** renderer pode abrir antes do health passar, porque o shell nao bloqueia o renderer aguardando readiness do backend. Evidencia: `desktop/backend-service.cjs:31-33`, `desktop/main.cjs:173-182`, `desktop/main.cjs:227`.

## Cenarios de Borda

- 🟢 **Janela com bounds invalidos:** o shell recentraliza ou redimensiona a janela.
- 🟢 **Link externo disparado pelo renderer:** o Electron impede nova janela e delega ao browser do sistema.
- 🟡 **Env file ausente em producao:** o backend local pode subir sem configuracao minima e falhar no health.
- 🟡 **Startup longa do backend:** a app tolera ate 90 segundos antes de exibir erro.

## Dependencias

- 🟢 `desktop/main.cjs`
- 🟢 `desktop/backend-service.cjs`
- 🟢 `desktop/preload.cjs`
- 🟢 `desktop/downloads.cjs`
- 🟢 `desktop/window-actions.cjs`
- 🟢 `desktop/window-appearance.cjs`
- 🟢 `desktop/backend-service.test.cjs`
- 🟢 `desktop/downloads.test.cjs`
- 🟢 `desktop/window-actions.test.cjs`
- 🟢 `desktop/window-appearance.test.cjs`
- 🟡 `_reversa_sdd/flowcharts/desktop-startup.md`
- 🟡 `_reversa_sdd/flowcharts/desktop-downloads-ipc.md`
- 🟡 `_reversa_sdd/flowcharts/desktop-preload-window.md`

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Renderer roda com `contextIsolation` e sem `nodeIntegration`. | `desktop/main.cjs` | 🟢 |
| Seguranca | Preload expõe apenas API controlada via `contextBridge`. | `desktop/preload.cjs` | 🟢 |
| Disponibilidade | Backend local tem retry por health check de ate 90s. | `desktop/main.cjs` / `desktop/backend-service.cjs` | 🟢 |
| Observabilidade | Logs do backend sao gravados em arquivos separados. | `desktop/backend-service.cjs` | 🟢 |
| UX | Em erro de startup o usuario recebe uma tela HTML explicita. | `desktop/main.cjs` | 🟢 |

## Criterios de Aceitacao

```gherkin
Cenario: Abrir app desktop empacotada
Dado a aplicacao desktop em modo empacotado
Quando o usuario inicia o executavel
Entao o shell deve criar a janela, subir o backend local e expor `desktopShell` ao renderer

Cenario: Exibir erro de startup do backend
Dado uma falha de health no backend local
Quando o timeout de warmup expirar
Entao a janela deve renderizar a tela HTML de erro de inicializacao

Cenario: Salvar arquivo gerado via IPC
Dado o renderer chamando `desktopShell.saveGeneratedFile`
Quando o usuario escolhe um destino valido
Entao o shell deve salvar o arquivo e retornar o resultado para o renderer

Cenario: Abrir link externo
Dado uma URL externa aberta pelo renderer
Quando o BrowserWindow tentar abrir nova janela
Entao o shell deve negar a nova janela e abrir a URL no browser do sistema
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Inicializacao da janela | Must | Sem ela o desktop nao existe. | 🟢 |
| Warmup do backend local | Must | Necessario em distribuicao empacotada. | 🟢 |
| Preload com API segura | Must | Base de seguranca da integracao renderer/main. | 🟢 |
| Download e save dialog | Should | Importante para artefatos gerados e UX desktop. | 🟢 |
| Devtools/reload/about | Could | Conveniencias operacionais. | 🟢 |

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `desktop/main.cjs` | Bootstrap Electron, BrowserWindow e IPC | 🟢 |
| `desktop/backend-service.cjs` | Spawn, env, health check e stop do backend | 🟢 |
| `desktop/preload.cjs` | API `desktopShell` | 🟢 |
| `_reversa_sdd/flowcharts/desktop-startup.md` | Startup | 🟡 |
| `_reversa_sdd/flowcharts/desktop-downloads-ipc.md` | Downloads e save | 🟡 |
| `_reversa_sdd/flowcharts/desktop-preload-window.md` | Preload e janela | 🟡 |
