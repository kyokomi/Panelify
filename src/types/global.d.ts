export interface IElectronAPI {
  selectMarkdownFile: () => Promise<{ filePath: string; content: string } | null>;
  readMarkdownFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  saveLayoutConfig: (filePath: string, layoutConfig: any) => Promise<{ success: boolean }>;
  loadLayoutConfig: (filePath: string) => Promise<any>;
  getLastOpenedFile: () => Promise<string | null>;
  getRecentFiles: () => Promise<string[]>;
  onOpenRecentFile?: (callback: (event: any, filePath: string) => void) => void;
  onCloseDashboard?: (callback: (event: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export interface MarkdownSection {
  id: string;
  title: string;
  content: string;
  level: number;
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}
