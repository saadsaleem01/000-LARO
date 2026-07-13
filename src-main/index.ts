import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { IPC_CHANNELS, Platform, ScanConfig, AgentConfig } from '../shared/types';
import { initDatabase as initAgentDb, closeDatabase as closeAgentDb, createScan, getScanFiles } from './database';
import { FileScanner } from './scanner';
import { FileUploader } from './uploader';
import { initAutoUpdater } from './autoUpdater';
// NOTE: server/index.ts reads `.env` (dotenv) at import time, so it is imported
// lazily in startApp() AFTER we pin NODE_ENV from app.isPackaged. This guarantees
// a packaged build runs the server in production mode even if the bundled .env
// (or DOTENV secret) mistakenly contains NODE_ENV=development.

const PORT = 3000;
const LARO_URL = `http://localhost:${PORT}`;
const isDev = process.env.NODE_ENV === 'development';

/**
 * Phase 006/007 — per-install secret bootstrap.
 *
 * Generates strong random secrets on first run and persists them to the user's
 * private app-data directory (never committed, never shipped). This makes the
 * desktop app secure-by-default: sessions are signed with a per-install
 * JWT_SECRET (so tokens cannot be forged with the old shared default), and the
 * desktop scanner authenticates with a per-install LOCAL_AGENT_TOKEN instead of
 * the well-known "local-default" string.
 *
 * Only fills a value if it is not already provided by the environment (a real
 * deployment can still inject its own secrets).
 */
function bootstrapSecrets(userDataPath: string) {
  const crypto = require('crypto') as typeof import('crypto');
  const secretsPath = path.join(userDataPath, 'laro-secrets.json');
  let store: { jwtSecret?: string; cookieSecret?: string; localAgentToken?: string } = {};
  try {
    if (fs.existsSync(secretsPath)) {
      store = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    }
  } catch (e) {
    console.warn('[Electron] Could not read secrets file; regenerating:', e);
    store = {};
  }

  const gen = () => crypto.randomBytes(32).toString('hex');
  let changed = false;
  if (!store.jwtSecret) { store.jwtSecret = gen(); changed = true; }
  if (!store.cookieSecret) { store.cookieSecret = gen(); changed = true; }
  if (!store.localAgentToken) { store.localAgentToken = gen(); changed = true; }

  if (changed) {
    try {
      fs.writeFileSync(secretsPath, JSON.stringify(store, null, 2), { mode: 0o600 });
      console.log('[Electron] Generated per-install secrets at:', secretsPath);
    } catch (e) {
      console.warn('[Electron] Could not persist secrets file (using in-memory values):', e);
    }
  }

  // Only set if not already provided by a real .env / deployment.
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = store.jwtSecret;
  if (!process.env.COOKIE_SECRET) process.env.COOKIE_SECRET = store.cookieSecret;
  if (!process.env.LOCAL_AGENT_TOKEN) process.env.LOCAL_AGENT_TOKEN = store.localAgentToken;
}

// ─── Error Handling ─────────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[Electron] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Electron] Unhandled Rejection:', reason);
});

let mainWindow: BrowserWindow | null = null;
let scanPanel: BrowserWindow | null = null;
let currentScanner: FileScanner | null = null;
let currentUploader: FileUploader | null = null;

let agentConfig: AgentConfig = {
  caseId: null,
  apiUrl: LARO_URL,
  token: null,
  deviceId: null,
  deviceName: os.hostname(),
  userId: null,
};

function getPlatform(): Platform {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'macos';
  return 'linux';
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'LARO Desktop',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    scanPanel?.close();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    // Force OAuth flows to open in external browser to avoid Google's "disallowed_useragent" error
    if (url.includes('/api/oauth/')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    if (url.startsWith(LARO_URL)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  console.log(`[Electron] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[Electron] isDev: ${isDev}`);

  if (isDev) {
    const devUrl = 'http://localhost:5173';
    console.log(`[Electron] Attempting to load Vite Dev Server: ${devUrl}`);
    try {
      await mainWindow.loadURL(devUrl);
      console.log('[Electron] Vite Dev Server loaded successfully');
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } catch (err) {
      console.error('[Electron] Failed to load Vite Dev Server. Is it running? Error:', err);
      // Fallback to production URL if Vite fails in dev
      await mainWindow.loadURL(LARO_URL);
    }
  } else {
    console.log(`[Electron] Loading Production URL: ${LARO_URL}`);
    try {
      await mainWindow.loadURL(LARO_URL);
    } catch (err) {
      console.error('[Electron] Failed to load Production URL. Did you run npm run build? Error:', err);
    }
    if (process.env.DEBUG) mainWindow.webContents.openDevTools();
  }
}

function createScanPanel(): void {
  if (scanPanel) {
    scanPanel.focus();
    return;
  }
  scanPanel = new BrowserWindow({
    width: 520,
    height: 700,
    minWidth: 480,
    title: 'LARO Evidence Scanner',
    backgroundColor: '#0f172a',
    parent: mainWindow ?? undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    scanPanel.loadURL('http://localhost:5173/?mode=scanner');
  } else {
    scanPanel.loadURL(`${LARO_URL}/?mode=scanner`);
  }
  scanPanel.on('closed', () => {
    scanPanel = null;
  });
}

function buildMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'LARO',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.loadURL(LARO_URL) },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Evidence',
      submenu: [
        { label: 'Scan Local Files', accelerator: 'CmdOrCtrl+Shift+S', click: createScanPanel },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]));
}

app.whenReady().then(async () => {
  // Initialize App Data Directory for SQLite
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  // Set database path for the server (better-sqlite3)
  const serverDbPath = path.join(userDataPath, 'laro-server.sqlite');
  process.env.DATABASE_URL = serverDbPath;
  console.log('[Electron] Server DB Path:', serverDbPath);

  // Phase 015: local evidence storage lives under userData when S3 is not
  // configured, so file uploads are actually persisted (not dropped).
  if (!process.env.LOCAL_STORAGE_DIR) {
    process.env.LOCAL_STORAGE_DIR = path.join(userDataPath, 'uploads');
  }

  // Initialize Agent DB (scanning state)
  initAgentDb();

  // Start the integrated backend server.
  // Pin NODE_ENV from the packaging state BEFORE importing the server (whose
  // module-level dotenv.config() must not be able to override it — dotenv leaves
  // already-set env vars untouched). This is what keeps a packaged build serving
  // the renderer (otherwise NODE_ENV=development disables static serving -> 404).
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
  } else if (app.isPackaged && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[Electron] Overriding NODE_ENV="${process.env.NODE_ENV}" -> "production" in packaged build`
    );
    process.env.NODE_ENV = 'production';
  }

  // Phase 006/007: generate/load per-install secrets and set them in the
  // environment BEFORE importing the server, so env.ts reads real secrets and
  // the production security guard passes with strong, non-forgeable values.
  bootstrapSecrets(userDataPath);
  // Default the desktop scanner's token to the per-install agent token so it
  // authenticates without the well-known "local-default" string.
  if (process.env.LOCAL_AGENT_TOKEN) {
    agentConfig.token = agentConfig.token ?? process.env.LOCAL_AGENT_TOKEN;
  }

  try {
    const { startServer } = await import('../server/index');
    await startServer(PORT);
    console.log('[Electron] Integrated server started on port', PORT);
  } catch (err) {
    console.error('[Electron] Failed to start integrated server:', err);
    dialog.showErrorBox('Server Error', 'Failed to start the integrated backend server.');
    app.quit();
    return;
  }

  buildMenu();
  setupIPC();
  await createMainWindow();

  console.log('[Electron] Application ready and window created');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  currentScanner?.stop();
  currentUploader?.stop();
  closeAgentDb();
});

function setupIPC(): void {
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, () => ({ ...agentConfig }));
  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, (_: any, c: Partial<AgentConfig>) => {
    agentConfig = { ...agentConfig, ...c };
    return { ...agentConfig };
  });
  ipcMain.handle(IPC_CHANNELS.SYSTEM_INFO, () => ({
    platform: getPlatform(),
    arch: process.arch,
    hostname: os.hostname(),
    username: os.userInfo().username,
    homeDir: os.homedir(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus().length,
    version: app.getVersion(),
  }));
  ipcMain.handle(IPC_CHANNELS.APP_VERSION, () => app.getVersion());
  // Phase 007: hand the renderer the per-install agent token so the scanner UI
  // authenticates with it instead of the well-known "local-default" string.
  ipcMain.handle('agent:token', () => process.env.LOCAL_AGENT_TOKEN || null);
  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, (_: any, url: string) => shell.openExternal(url));
  ipcMain.handle(IPC_CHANNELS.SCAN_OPEN_PANEL, () => createScanPanel());
  ipcMain.handle(IPC_CHANNELS.FOLDER_SELECT, async () => {
    const parent = scanPanel ?? mainWindow;
    if (!parent) return null;
    const result = await dialog.showOpenDialog(parent, {
      properties: ['openDirectory', 'multiSelections'],
      title: 'Select folders to scan',
    });
    return result.canceled ? null : result.filePaths;
  });
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, () => ({ currentVersion: app.getVersion(), updateAvailable: false }));
  
  ipcMain.handle(IPC_CHANNELS.SCAN_START, async (_: any, config: ScanConfig) => {
    if (currentScanner) throw new Error('Scan already in progress');
    const scanId = nanoid();
    createScan(scanId, config.caseId, config.caseName, config.autoUpload, config.excludedFolders);
    currentScanner = new FileScanner({ scanId, config, platform: getPlatform() });
    currentScanner.on('progress', (p) => scanPanel?.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, p));
    currentScanner.on('completed', async (result) => {
      scanPanel?.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
        scanId,
        status: config.autoUpload ? 'uploading' : 'review',
        ...result,
      });
      mainWindow?.webContents.executeJavaScript(
        `window.dispatchEvent(new CustomEvent('laro:evidence-updated',{detail:{scanId:'${scanId}'}}))`
      ).catch(() => {});
      if (config.autoUpload && agentConfig.token) await startUpload(scanId).catch(console.error);
      currentScanner = null;
    });
    currentScanner.on('cancelled', () => {
      scanPanel?.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, { scanId, status: 'cancelled' });
      currentScanner = null;
    });
    currentScanner.on('error', (e: Error) => {
      scanPanel?.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, { scanId, status: 'failed', errorMessage: e.message });
      currentScanner = null;
    });
    currentScanner.start().catch(console.error);
    return { scanId };
  });

  ipcMain.handle(IPC_CHANNELS.SCAN_STOP, () => { currentScanner?.stop(); return { success: true }; });
  ipcMain.handle(IPC_CHANNELS.SCAN_PAUSE, () => { currentScanner?.pause(); return { success: true }; });
  ipcMain.handle(IPC_CHANNELS.SCAN_RESUME, () => { currentScanner?.resume(); return { success: true }; });
  ipcMain.handle(IPC_CHANNELS.SCAN_FILES_GET, (_: any, id: string) => ({ files: getScanFiles(id) }));
  ipcMain.handle(IPC_CHANNELS.UPLOAD_START, (_: any, id: string) => startUpload(id));
  ipcMain.handle(IPC_CHANNELS.UPLOAD_PAUSE, () => { currentUploader?.pause(); return { success: true }; });
  ipcMain.handle(IPC_CHANNELS.UPLOAD_RESUME, () => { currentUploader?.resume(); return { success: true }; });
}

async function startUpload(scanId: string): Promise<{ success: boolean }> {
  if (currentUploader) throw new Error('Upload in progress');
  if (!agentConfig.token) throw new Error('Not authenticated');
  currentUploader = new FileUploader({
    scanId,
    apiUrl: agentConfig.apiUrl,
    token: agentConfig.token,
    concurrency: 3,
    maxRetries: 3,
  });
  currentUploader.on('progress', (p) => scanPanel?.webContents.send(IPC_CHANNELS.UPLOAD_PROGRESS, { scanId, ...p }));
  currentUploader.on('completed', (r) => {
    scanPanel?.webContents.send(IPC_CHANNELS.UPLOAD_PROGRESS, { scanId, done: true, ...r });
    mainWindow?.webContents.executeJavaScript(
      `window.dispatchEvent(new CustomEvent('laro:evidence-updated',{detail:{scanId:'${scanId}'}}))`
    ).catch(() => {});
    currentUploader = null;
  });
  currentUploader.on('cancelled', () => { currentUploader = null; });
  currentUploader.on('error', () => { currentUploader = null; });
  currentUploader.start().catch(console.error);
  return { success: true };
}
