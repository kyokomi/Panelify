import { MarkdownSection } from "../types/global";
import { parseMarkdownSections } from "../renderer/utils/markdownParser";

export interface IFileService {
  selectMarkdownFile(): Promise<{ filePath: string; content: string } | null>;
  readMarkdownFile(filePath: string): Promise<{ success: boolean; content?: string; error?: string }>;
  parseFileContent(content: string): MarkdownSection[];
}

export class FileService implements IFileService {
  async selectMarkdownFile(): Promise<{ filePath: string; content: string } | null> {
    const fileSelectionResult = await window.electronAPI.selectMarkdownFile();
    return fileSelectionResult;
  }

  async readMarkdownFile(filePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
    const fileReadResult = await window.electronAPI.readMarkdownFile(filePath);
    return fileReadResult;
  }

  parseFileContent(content: string): MarkdownSection[] {
    return parseMarkdownSections(content);
  }
}
