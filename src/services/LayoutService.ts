import { LayoutItem, MarkdownSection } from "../types/global";

export interface ILayoutService {
  createDefaultLayout(sections: MarkdownSection[]): LayoutItem[];
  saveLayoutConfig(filePath: string, layout: LayoutItem[]): Promise<{ success: boolean }>;
  loadLayoutConfig(filePath: string): Promise<LayoutItem[] | null>;
  addNewSectionsToLayout(newSections: MarkdownSection[], currentLayout: LayoutItem[]): LayoutItem[];
}

export class LayoutService implements ILayoutService {
  private readonly COLUMNS_COUNT = 3;
  private readonly CELL_WIDTH = 4;
  private readonly CELL_HEIGHT = 6;
  private readonly MIN_CELL_WIDTH = 3;
  private readonly MIN_CELL_HEIGHT = 4;

  createDefaultLayout(sections: MarkdownSection[]): LayoutItem[] {
    return sections.map((section, index) => ({
      i: section.id,
      x: (index % this.COLUMNS_COUNT) * this.CELL_WIDTH,
      y: Math.floor(index / this.COLUMNS_COUNT) * this.CELL_HEIGHT,
      w: this.CELL_WIDTH,
      h: this.CELL_HEIGHT,
      minW: this.MIN_CELL_WIDTH,
      minH: this.MIN_CELL_HEIGHT,
    }));
  }

  async saveLayoutConfig(filePath: string, layout: LayoutItem[]): Promise<{ success: boolean }> {
    return await window.electronAPI.saveLayoutConfig(filePath, layout);
  }

  async loadLayoutConfig(filePath: string): Promise<LayoutItem[] | null> {
    const savedLayoutConfig = await window.electronAPI.loadLayoutConfig(filePath);
    return savedLayoutConfig && Array.isArray(savedLayoutConfig) ? (savedLayoutConfig as LayoutItem[]) : null;
  }

  addNewSectionsToLayout(newSections: MarkdownSection[], currentLayout: LayoutItem[]): LayoutItem[] {
    if (newSections.length === 0) {
      return currentLayout;
    }

    const newSectionLayout = this.createDefaultLayout(newSections);
    const maxYPosition = Math.max(...currentLayout.map((item) => item.y + item.h), 0);

    newSectionLayout.forEach((item, index) => {
      item.y = maxYPosition + Math.floor(index / this.COLUMNS_COUNT) * this.CELL_HEIGHT;
    });

    return [...currentLayout, ...newSectionLayout];
  }
}
