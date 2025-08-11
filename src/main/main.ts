import { app, BrowserWindow, ipcMain, dialog, Menu, MenuItemConstructorOptions } from "electron";
import * as path from "path";
import * as fs from "fs";
import Store from "electron-store";

const store = new Store({
  name: "panelify-config",
});
let mainWindow: BrowserWindow | null = null;

const MAX_RECENT_FILES = 5;

function updateRecentFiles(filePath: string) {
  const recentFiles = store.get("recentFiles", []) as string[];
  const filteredFiles = recentFiles.filter((existingPath) => existingPath !== filePath);
  filteredFiles.unshift(filePath);
  const limitedFiles = filteredFiles.slice(0, MAX_RECENT_FILES);
  store.set("recentFiles", limitedFiles);

  // メニューを更新
  updateApplicationMenu();
}

function getFileName(filePath: string): string {
  return path.basename(filePath, ".md");
}

function openRecentFile(filePath: string) {
  if (mainWindow && fs.existsSync(filePath)) {
    mainWindow.webContents.send("open-recent-file", filePath);
    updateRecentFiles(filePath);
  }
}

function closeDashboard() {
  if (mainWindow) {
    mainWindow.webContents.send("close-dashboard");
  }
}

function createRecentFilesSubmenu(): MenuItemConstructorOptions[] {
  const recentFiles = store.get("recentFiles", []) as string[];
  const existingFiles = recentFiles.filter((filePath) => fs.existsSync(filePath));

  if (existingFiles.length === 0) {
    return [{ label: "なし", enabled: false }];
  }

  return existingFiles.map((filePath) => ({
    label: getFileName(filePath),
    click: () => openRecentFile(filePath),
  }));
}

function createAppSubmenu(): MenuItemConstructorOptions {
  return {
    label: app.getName(),
    submenu: [
      { label: `${app.getName()}について`, role: "about" },
      { type: "separator" as const },
      { label: "サービス", role: "services", submenu: [] },
      { type: "separator" as const },
      { label: `${app.getName()}を隠す`, accelerator: "Command+H", role: "hide" },
      { label: "他を隠す", accelerator: "Command+Shift+H", role: "hideOthers" },
      { label: "すべて表示", role: "unhide" },
      { type: "separator" as const },
      { label: "終了", accelerator: "Command+Q", role: "quit" },
    ],
  };
}

function createFileSubmenu(): MenuItemConstructorOptions {
  const recentFilesSubmenu = createRecentFilesSubmenu();
  const quitMenuItem =
    process.platform === "darwin" ? [] : [{ label: "終了", accelerator: "Ctrl+Q", role: "quit" as const }];

  return {
    label: "ファイル",
    submenu: [
      {
        label: "Markdownファイルを開く...",
        accelerator: "CmdOrCtrl+O",
        click: async () => {
          const fileDialogResult = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [{ name: "Markdown", extensions: ["md"] }],
            defaultPath: "/Users/kyokomi/Obsidian/main",
          });

          if (!fileDialogResult.canceled && fileDialogResult.filePaths.length > 0) {
            const selectedFilePath = fileDialogResult.filePaths[0];
            openRecentFile(selectedFilePath);
          }
        },
      },
      { type: "separator" as const },
      {
        label: "最近開いたファイル",
        submenu: recentFilesSubmenu,
      },
      { type: "separator" as const },
      {
        label: "ダッシュボードを閉じる",
        accelerator: "CmdOrCtrl+Shift+W",
        click: () => closeDashboard(),
      },
      { type: "separator" as const },
      ...quitMenuItem,
    ],
  };
}

function createViewSubmenu(): MenuItemConstructorOptions {
  const devToolsAccelerator = process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I";
  const fullscreenAccelerator = process.platform === "darwin" ? "Ctrl+Command+F" : "F11";

  return {
    label: "表示",
    submenu: [
      { label: "再読み込み", accelerator: "CmdOrCtrl+R", role: "reload" },
      { label: "強制再読み込み", accelerator: "CmdOrCtrl+Shift+R", role: "forceReload" },
      {
        label: "開発者ツールを切り替え",
        accelerator: devToolsAccelerator,
        role: "toggleDevTools",
      },
      { type: "separator" as const },
      { label: "実際のサイズ", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
      { label: "拡大", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
      { label: "縮小", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
      { type: "separator" as const },
      {
        label: "全画面表示の切り替え",
        accelerator: fullscreenAccelerator,
        role: "togglefullscreen",
      },
    ],
  };
}

function createWindowSubmenu(): MenuItemConstructorOptions {
  const macOSSpecificItems =
    process.platform === "darwin"
      ? [
          { type: "separator" as const },
          { label: "前面に表示", role: "front" as const },
          { type: "separator" as const },
          { label: "Window", role: "window" as const },
        ]
      : [];

  return {
    label: "ウィンドウ",
    submenu: [
      { label: "最小化", accelerator: "CmdOrCtrl+M", role: "minimize" },
      { label: "閉じる", accelerator: "CmdOrCtrl+W", role: "close" },
      ...macOSSpecificItems,
    ],
  };
}

function createHelpSubmenu(): MenuItemConstructorOptions {
  return {
    label: "ヘルプ",
    submenu: [
      {
        label: "Panelifyについて",
        click: async () => {
          const { shell } = require("electron");
          await shell.openExternal("https://github.com/kyokomi/Panelify");
        },
      },
    ],
  };
}

function updateApplicationMenu() {
  const menuTemplate: MenuItemConstructorOptions[] = [];

  if (process.platform === "darwin") {
    menuTemplate.push(createAppSubmenu());
  }

  menuTemplate.push(createFileSubmenu(), createViewSubmenu(), createWindowSubmenu(), createHelpSubmenu());

  const applicationMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(applicationMenu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Panelify",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const htmlPath = path.join(__dirname, "renderer/index.html");
  const isDev = process.argv.includes("--dev");

  if (isDev) {
    // eslint-disable-next-line no-console
    console.log("Loading HTML file from:", htmlPath);
    // eslint-disable-next-line no-console
    console.log("File exists:", fs.existsSync(htmlPath));
  }
  if (isDev) {
    mainWindow.loadFile(htmlPath);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(htmlPath);
  }

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    // eslint-disable-next-line no-console
    console.error("Failed to load:", errorCode, errorDescription, validatedURL);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // メニューを初期化
  updateApplicationMenu();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle("select-markdown-file", async () => {
  const fileDialogResult = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Markdown", extensions: ["md"] }],
    defaultPath: "/Users/kyokomi/Obsidian/main",
  });

  if (!fileDialogResult.canceled && fileDialogResult.filePaths.length > 0) {
    const selectedFilePath = fileDialogResult.filePaths[0];
    const fileContent = fs.readFileSync(selectedFilePath, "utf-8");
    updateRecentFiles(selectedFilePath);
    return { filePath: selectedFilePath, content: fileContent };
  }
  return null;
});

ipcMain.handle("read-markdown-file", async (event, filePath: string) => {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return { success: true, content: fileContent };
  } catch (readError) {
    return { success: false, error: readError instanceof Error ? readError.message : String(readError) };
  }
});

ipcMain.handle("save-layout-config", async (event, filePath: string, layoutConfig: unknown) => {
  const configKey = `layout-${filePath}`;
  store.set(configKey, layoutConfig);
  // 最後に開いたファイルも保存
  store.set("lastOpenedFile", filePath);
  // 最近開いたファイルリストを更新
  updateRecentFiles(filePath);
  return { success: true };
});

ipcMain.handle("load-layout-config", async (event, filePath: string) => {
  const layoutConfigKey = `layout-${filePath}`;
  const savedLayoutConfig = store.get(layoutConfigKey);
  return savedLayoutConfig || null;
});

ipcMain.handle("get-last-opened-file", async () => {
  const lastFile = store.get("lastOpenedFile") as string;
  if (lastFile && fs.existsSync(lastFile)) {
    return lastFile;
  }
  return null;
});

ipcMain.handle("get-recent-files", async () => {
  const recentFiles = store.get("recentFiles", []) as string[];
  const existingFiles = recentFiles.filter((filePath) => fs.existsSync(filePath));
  if (existingFiles.length !== recentFiles.length) {
    store.set("recentFiles", existingFiles);
  }
  return existingFiles;
});
