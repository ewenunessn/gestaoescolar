const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const { spawn } = require('child_process');

// Configurar logs
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Variáveis globais
let mainWindow;
let backendProcess;
const isDev = process.env.NODE_ENV === 'development';
const BACKEND_PORT = 3000;

// Configurar auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// ============================================================================
// FUNÇÕES DE BACKEND
// ============================================================================

function startBackend() {
  return new Promise((resolve, reject) => {
    log.info('Iniciando backend...');
    
    const backendPath = isDev
      ? path.join(__dirname, '..', 'backend')
      : path.join(process.resourcesPath, 'backend');
    
    log.info('Backend path:', backendPath);
    
    // Em produção, não tentar iniciar o backend
    // O usuário deve rodar o backend separadamente
    if (!isDev) {
      log.info('Modo produção: backend deve ser iniciado separadamente');
      resolve();
      return;
    }
    
    const nodePath = 'node';
    const scriptPath = path.join(backendPath, 'src', 'index.ts');
    
    // Iniciar processo do backend
    backendProcess = spawn(
      'npm',
      ['start'],
      {
        cwd: backendPath,
        env: {
          ...process.env,
          PORT: BACKEND_PORT,
          NODE_ENV: 'development'
        },
        shell: true
      }
    );
    
    backendProcess.stdout.on('data', (data) => {
      log.info(`Backend: ${data}`);
      if (data.toString().includes('Servidor rodando')) {
        resolve();
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      log.error(`Backend Error: ${data}`);
    });
    
    backendProcess.on('error', (error) => {
      log.error('Erro ao iniciar backend:', error);
      reject(error);
    });
    
    backendProcess.on('close', (code) => {
      log.info(`Backend encerrado com código ${code}`);
    });
    
    // Timeout de 30 segundos
    setTimeout(() => {
      resolve(); // Continua mesmo se não detectar a mensagem
    }, 30000);
  });
}

function stopBackend() {
  if (backendProcess) {
    log.info('Encerrando backend...');
    backendProcess.kill();
    backendProcess = null;
  }
}

// ============================================================================
// FUNÇÕES DE JANELA
// ============================================================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false, // Não mostrar até estar pronto
    backgroundColor: '#ffffff',
    title: 'Sistema de Gestão Escolar'
  });
  
  // Remover menu padrão
  Menu.setApplicationMenu(null);
  
  // Carregar aplicação
  if (isDev) {
    const startUrl = 'http://localhost:5173';
    log.info('Loading URL (dev):', startUrl);
    mainWindow.loadURL(startUrl);
  } else {
    // Em produção, o frontend está empacotado dentro do app
    const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
    log.info('Loading file (prod):', indexPath);
    mainWindow.loadFile(indexPath);
  }
  
  // Mostrar quando estiver pronto
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
  
  // Limpar referência quando fechar
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Prevenir navegação externa
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedProtocols = ['file:', 'http://localhost'];
    const isAllowed = allowedProtocols.some(protocol => url.startsWith(protocol));
    if (!isAllowed) {
      event.preventDefault();
      log.warn('Navegação bloqueada:', url);
    }
  });
}

// ============================================================================
// AUTO-UPDATER
// ============================================================================

function setupAutoUpdater() {
  // Verificar atualizações ao iniciar
  autoUpdater.checkForUpdates();
  
  // Verificar a cada 4 horas
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);
  
  // Quando encontrar atualização
  autoUpdater.on('update-available', (info) => {
    log.info('Atualização disponível:', info.version);
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização Disponível',
      message: `Uma nova versão (${info.version}) está disponível!`,
      detail: 'Deseja baixar e instalar agora?',
      buttons: ['Sim', 'Depois'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
        
        // Mostrar progresso
        mainWindow.webContents.send('update-downloading');
      }
    });
  });
  
  // Quando não houver atualização
  autoUpdater.on('update-not-available', () => {
    log.info('Sistema está atualizado');
  });
  
  // Progresso do download
  autoUpdater.on('download-progress', (progressObj) => {
    const message = `Baixando: ${Math.round(progressObj.percent)}%`;
    log.info(message);
    mainWindow.webContents.send('update-progress', progressObj.percent);
  });
  
  // Quando download terminar
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Atualização baixada:', info.version);
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização Pronta',
      message: 'A atualização foi baixada com sucesso!',
      detail: 'O sistema será reiniciado para aplicar a atualização.',
      buttons: ['Reiniciar Agora', 'Reiniciar Depois'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        // Fechar backend antes de reiniciar
        stopBackend();
        setTimeout(() => {
          autoUpdater.quitAndInstall(false, true);
        }, 1000);
      }
    });
  });
  
  // Erro ao atualizar
  autoUpdater.on('error', (error) => {
    log.error('Erro ao atualizar:', error);
    dialog.showErrorBox(
      'Erro na Atualização',
      'Não foi possível verificar atualizações. Tente novamente mais tarde.'
    );
  });
}

// ============================================================================
// IPC HANDLERS
// ============================================================================

ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result;
  } catch (error) {
    log.error('Erro ao verificar atualizações:', error);
    return null;
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// ============================================================================
// CICLO DE VIDA DO APP
// ============================================================================

app.whenReady().then(async () => {
  log.info('Aplicação iniciando...');
  log.info('Versão:', app.getVersion());
  log.info('Modo:', isDev ? 'Desenvolvimento' : 'Produção');
  
  try {
    // Iniciar backend
    await startBackend();
    log.info('Backend iniciado com sucesso');
    
    // Criar janela
    createWindow();
    
  } catch (error) {
    log.error('Erro ao iniciar aplicação:', error);
    dialog.showErrorBox(
      'Erro ao Iniciar',
      'Não foi possível iniciar o sistema. Verifique os logs para mais detalhes.'
    );
    app.quit();
  }
});

// Recriar janela no macOS
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Encerrar quando todas as janelas forem fechadas
app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Encerrar backend ao sair
app.on('before-quit', () => {
  stopBackend();
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  log.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Promise rejeitada:', reason);
});
