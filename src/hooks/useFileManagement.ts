import { useState, useCallback } from "react";
import { MarkdownSection, LayoutItem } from "../types/global";
import { IFileService } from "../services/FileService";
import { ILayoutService } from "../services/LayoutService";

interface FileManagementState {
  sections: MarkdownSection[];
  currentFile: string;
  layout: LayoutItem[];
  savedLayout: LayoutItem[];
  hasLayoutChanges: boolean;
  isReloading: boolean;
}

export const useFileManagement = (
  fileService: IFileService,
  layoutService: ILayoutService,
  onError: (message: string) => void,
) => {
  const [state, setState] = useState<FileManagementState>({
    sections: [],
    currentFile: "",
    layout: [],
    savedLayout: [],
    hasLayoutChanges: false,
    isReloading: false,
  });

  const setupFileContent = useCallback(
    async (filePath: string, fileContent: string) => {
      const parsedSections = fileService.parseFileContent(fileContent);
      const savedLayout = await layoutService.loadLayoutConfig(filePath);
      const layoutToUse = savedLayout || layoutService.createDefaultLayout(parsedSections);

      setState((prev) => ({
        ...prev,
        sections: parsedSections,
        currentFile: filePath,
        layout: layoutToUse,
        savedLayout: layoutToUse,
        hasLayoutChanges: false,
      }));
    },
    [fileService, layoutService],
  );

  const loadFileFromPath = useCallback(
    async (filePath: string) => {
      try {
        const fileReadResult = await fileService.readMarkdownFile(filePath);
        if (fileReadResult.success && fileReadResult.content) {
          await setupFileContent(filePath, fileReadResult.content);
        } else {
          onError("ファイルの読み込みに失敗しました");
        }
      } catch {
        onError("ファイルの読み込みに失敗しました");
      }
    },
    [fileService, setupFileContent, onError],
  );

  const loadMarkdownFile = useCallback(async () => {
    try {
      const fileSelectionResult = await fileService.selectMarkdownFile();
      if (fileSelectionResult && fileSelectionResult.content) {
        await setupFileContent(fileSelectionResult.filePath, fileSelectionResult.content);
      }
    } catch {
      onError("ファイル選択に失敗しました");
    }
  }, [fileService, setupFileContent, onError]);

  const reloadCurrentFile = useCallback(async () => {
    if (!state.currentFile || state.isReloading) {
      return;
    }

    setState((prev) => ({ ...prev, isReloading: true }));

    try {
      const fileReadResult = await fileService.readMarkdownFile(state.currentFile);
      if (!fileReadResult.success || !fileReadResult.content) {
        onError("ファイルの再読み込みに失敗しました");
        return;
      }

      const updatedSections = fileService.parseFileContent(fileReadResult.content);
      const existingItemIds = new Set(state.layout.map((item) => item.i));
      const newSections = updatedSections.filter((section) => !existingItemIds.has(section.id));
      const updatedLayout = layoutService.addNewSectionsToLayout(newSections, state.layout);

      setState((prev) => ({
        ...prev,
        sections: updatedSections,
        layout: updatedLayout,
      }));
    } catch {
      onError("ファイルの再読み込みに失敗しました");
    } finally {
      setState((prev) => ({ ...prev, isReloading: false }));
    }
  }, [state.currentFile, state.isReloading, state.layout, fileService, layoutService, onError]);

  const saveLayout = useCallback(async () => {
    if (state.currentFile) {
      await layoutService.saveLayoutConfig(state.currentFile, state.layout);
      setState((prev) => ({
        ...prev,
        savedLayout: [...prev.layout],
        hasLayoutChanges: false,
      }));
    }
  }, [state.currentFile, state.layout, layoutService]);

  const updateLayout = useCallback(
    (newLayout: LayoutItem[]) => {
      const hasLayoutModifications = JSON.stringify(newLayout) !== JSON.stringify(state.savedLayout);
      setState((prev) => ({
        ...prev,
        layout: newLayout,
        hasLayoutChanges: hasLayoutModifications,
      }));
    },
    [state.savedLayout],
  );

  const clearDashboard = useCallback(() => {
    setState({
      sections: [],
      currentFile: "",
      layout: [],
      savedLayout: [],
      hasLayoutChanges: false,
      isReloading: false,
    });
  }, []);

  return {
    ...state,
    loadFileFromPath,
    loadMarkdownFile,
    reloadCurrentFile,
    saveLayout,
    updateLayout,
    clearDashboard,
  };
};
