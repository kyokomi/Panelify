import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  selectMarkdownFile: () => ipcRenderer.invoke("select-markdown-file"),
  readMarkdownFile: (filePath: string) => ipcRenderer.invoke("read-markdown-file", filePath),
  saveLayoutConfig: (filePath: string, layoutConfig: any) =>
    ipcRenderer.invoke("save-layout-config", filePath, layoutConfig),
  loadLayoutConfig: (filePath: string) => ipcRenderer.invoke("load-layout-config", filePath),
  getLastOpenedFile: () => ipcRenderer.invoke("get-last-opened-file"),
  getRecentFiles: () => ipcRenderer.invoke("get-recent-files"),
  onOpenRecentFile: (callback: (event: any, filePath: string) => void) => ipcRenderer.on("open-recent-file", callback),
  onCloseDashboard: (callback: (event: any) => void) => ipcRenderer.on("close-dashboard", callback),
});
