import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';

const store = new Store({
  name: 'panelify-config'
});
let mainWindow: BrowserWindow | null = null;

const MAX_RECENT_FILES = 5;

function updateRecentFiles(filePath: string) {
  const recentFiles = store.get('recentFiles', []) as string[];
  // 既存のエントリを削除
  const filtered = recentFiles.filter(f => f !== filePath);
  // 先頭に追加
  filtered.unshift(filePath);
  // 最大数に制限
  const limited = filtered.slice(0, MAX_RECENT_FILES);
  store.set('recentFiles', limited);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Panelify',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const htmlPath = path.join(__dirname, 'renderer/index.html');
  console.log('Loading HTML file from:', htmlPath);
  console.log('File exists:', fs.existsSync(htmlPath));

  const isDev = process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadFile(htmlPath);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(htmlPath);
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('select-markdown-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md'] }
    ],
    defaultPath: '/Users/kyokomi/Obsidian/main'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    // 最近開いたファイルリストを更新
    updateRecentFiles(filePath);
    return { filePath, content };
  }
  return null;
});

ipcMain.handle('read-markdown-file', async (event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('save-layout-config', async (event, filePath: string, layoutConfig: any) => {
  const configKey = `layout-${filePath}`;
  store.set(configKey, layoutConfig);
  // 最後に開いたファイルも保存
  store.set('lastOpenedFile', filePath);
  // 最近開いたファイルリストを更新
  updateRecentFiles(filePath);
  return { success: true };
});

ipcMain.handle('load-layout-config', async (event, filePath: string) => {
  const configKey = `layout-${filePath}`;
  const config = store.get(configKey);
  return config || null;
});

ipcMain.handle('get-last-opened-file', async () => {
  const lastFile = store.get('lastOpenedFile') as string;
  if (lastFile && fs.existsSync(lastFile)) {
    return lastFile;
  }
  return null;
});

ipcMain.handle('get-recent-files', async () => {
  const recentFiles = store.get('recentFiles', []) as string[];
  // 存在するファイルのみフィルタ
  const existing = recentFiles.filter(f => fs.existsSync(f));
  // リストが変わった場合は更新
  if (existing.length !== recentFiles.length) {
    store.set('recentFiles', existing);
  }
  return existing;
});