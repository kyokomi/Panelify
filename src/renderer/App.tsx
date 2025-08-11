import React, { useState, useEffect, useRef, useCallback } from "react";
import GridLayout from "react-grid-layout";
import { marked } from "marked";
import { MarkdownSection, LayoutItem } from "../types/global";
import { parseMarkdownSections } from "./utils/markdownParser";
import Snackbar from "./components/Snackbar";
import RecentFilesMenu from "./components/RecentFilesMenu";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const App: React.FC = () => {
  const [sections, setSections] = useState<MarkdownSection[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const [savedLayout, setSavedLayout] = useState<LayoutItem[]>([]);
  const [hasLayoutChanges, setHasLayoutChanges] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(1200);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState<boolean>(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  const createDefaultLayout = (sections: MarkdownSection[]): LayoutItem[] => {
    const COLUMNS_COUNT = 3;
    const CELL_WIDTH = 4;
    const CELL_HEIGHT = 6;
    const MIN_CELL_WIDTH = 3;
    const MIN_CELL_HEIGHT = 4;

    return sections.map((section, index) => ({
      i: section.id,
      x: (index % COLUMNS_COUNT) * CELL_WIDTH,
      y: Math.floor(index / COLUMNS_COUNT) * CELL_HEIGHT,
      w: CELL_WIDTH,
      h: CELL_HEIGHT,
      minW: MIN_CELL_WIDTH,
      minH: MIN_CELL_HEIGHT,
    }));
  };

  const setupFileContent = useCallback(async (filePath: string, fileContent: string) => {
    const parsedSections = parseMarkdownSections(fileContent);
    setSections(parsedSections);
    setCurrentFile(filePath);

    const savedLayoutConfig = await window.electronAPI.loadLayoutConfig(filePath);
    const layoutToUse =
      savedLayoutConfig && Array.isArray(savedLayoutConfig)
        ? (savedLayoutConfig as LayoutItem[])
        : createDefaultLayout(parsedSections);

    setLayout(layoutToUse);
    setSavedLayout(layoutToUse);
    setHasLayoutChanges(false);
  }, []);

  const loadFileFromPath = useCallback(
    async (filePath: string) => {
      try {
        const fileReadResult = await window.electronAPI.readMarkdownFile(filePath);
        if (fileReadResult.success && fileReadResult.content) {
          await setupFileContent(filePath, fileReadResult.content);
        } else {
          setSnackbar({ open: true, message: "ファイルの読み込みに失敗しました" });
        }
      } catch {
        setSnackbar({ open: true, message: "ファイルの読み込みに失敗しました" });
      }
    },
    [setupFileContent],
  );

  const loadLastOpenedFile = useCallback(async () => {
    try {
      const lastOpenedFilePath = await window.electronAPI.getLastOpenedFile();
      if (lastOpenedFilePath) {
        await loadFileFromPath(lastOpenedFilePath);
      }
    } catch {
      setSnackbar({ open: true, message: "前回のファイルの読み込みに失敗しました" });
    }
  }, [loadFileFromPath]);

  useEffect(() => {
    // 前回開いていたファイルを自動で開く
    loadLastOpenedFile();

    // メニューからのファイル選択を監視
    const handleOpenRecentFile = (event: unknown, filePath: string) => {
      loadFileFromPath(filePath);
    };

    // メニューからのダッシュボードを閉じる処理を監視
    const handleCloseDashboard = () => {
      closeDashboard();
    };

    window.electronAPI.onOpenRecentFile?.(handleOpenRecentFile);
    window.electronAPI.onCloseDashboard?.(handleCloseDashboard);

    // リサイズ監視
    const handleResize = () => {
      const mainElement = document.querySelector(".main") as HTMLElement;
      if (mainElement) {
        setContainerWidth(mainElement.clientWidth - 32); // パディング分を引く (1rem x 2)
      }
    };

    handleResize(); // 初期実行
    window.addEventListener("resize", handleResize);

    // モードドロップダウンのクリックアウトサイド処理
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
      // IPC リスナーのクリーンアップは通常必要ないが、念のため
    };
  }, [loadFileFromPath, loadLastOpenedFile]);

  const loadMarkdownFile = async () => {
    try {
      const fileSelectionResult = await window.electronAPI.selectMarkdownFile();
      if (fileSelectionResult && fileSelectionResult.content) {
        await setupFileContent(fileSelectionResult.filePath, fileSelectionResult.content);
      }
    } catch {
      setSnackbar({ open: true, message: "ファイル選択に失敗しました" });
    }
  };

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    setLayout(newLayout);
    const hasLayoutModifications = JSON.stringify(newLayout) !== JSON.stringify(savedLayout);
    setHasLayoutChanges(hasLayoutModifications);
  };

  const saveLayout = async () => {
    if (currentFile) {
      await window.electronAPI.saveLayoutConfig(currentFile, layout);
      setSavedLayout([...layout]);
      setHasLayoutChanges(false);
      setSnackbar({ open: true, message: "レイアウトを保存しました！" });
    }
  };

  const handleModeSelect = (mode: "view" | "edit") => {
    setIsEditMode(mode === "edit");
    setIsModeDropdownOpen(false);
  };

  const addNewSectionsToLayout = useCallback((newSections: MarkdownSection[], currentLayout: LayoutItem[]) => {
    if (newSections.length === 0) return currentLayout;

    const newSectionLayout = createDefaultLayout(newSections);
    const maxYPosition = Math.max(...currentLayout.map((item) => item.y + item.h), 0);
    const COLUMNS_COUNT = 3;
    const CELL_HEIGHT = 6;

    newSectionLayout.forEach((item, index) => {
      item.y = maxYPosition + Math.floor(index / COLUMNS_COUNT) * CELL_HEIGHT;
    });

    return [...currentLayout, ...newSectionLayout];
  }, []);

  const reloadCurrentFile = async () => {
    if (!currentFile || isReloading) {
      return;
    }

    setIsReloading(true);
    try {
      const fileReadResult = await window.electronAPI.readMarkdownFile(currentFile);
      if (!fileReadResult.success || !fileReadResult.content) {
        setSnackbar({ open: true, message: "ファイルの再読み込みに失敗しました" });
        return;
      }

      const updatedSections = parseMarkdownSections(fileReadResult.content);
      setSections(updatedSections);

      const existingItemIds = new Set(layout.map((item) => item.i));
      const newSections = updatedSections.filter((section) => !existingItemIds.has(section.id));

      const updatedLayout = addNewSectionsToLayout(newSections, layout);
      setLayout(updatedLayout);

      setSnackbar({ open: true, message: "ファイルを再読み込みしました！" });
    } catch {
      setSnackbar({ open: true, message: "ファイルの再読み込みに失敗しました" });
    } finally {
      setIsReloading(false);
    }
  };

  const handleRecentFileSelect = async (filePath: string) => {
    await loadFileFromPath(filePath);
  };

  const closeDashboard = () => {
    setSections([]);
    setLayout([]);
    setCurrentFile("");
    setSavedLayout([]);
    setHasLayoutChanges(false);
    setIsEditMode(false);
    setSnackbar({ open: true, message: "ダッシュボードを閉じました" });
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 title={currentFile || "ファイルが開かれていません"}>
            {currentFile ? currentFile.split("/").pop()?.replace(".md", "") || "Dashboard" : "Dashboard"}
          </h1>
          {currentFile && (
            <button
              className="reload-icon"
              onClick={reloadCurrentFile}
              disabled={isReloading}
              title="ファイルを再読み込み"
            >
              {isReloading ? "🔄" : "↻"}
            </button>
          )}
        </div>
        <div className="controls">
          {currentFile && (
            <>
              <div className="mode-selector" ref={modeDropdownRef}>
                <button
                  className={`mode-status ${isEditMode ? "edit-mode" : "view-mode"}`}
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                >
                  {isEditMode ? "✏️ 編集モード" : "👁️ 閲覧モード"} ▼
                </button>

                {isModeDropdownOpen && (
                  <div className="mode-dropdown">
                    <button
                      className={`mode-option ${!isEditMode ? "active" : ""}`}
                      onClick={() => handleModeSelect("view")}
                    >
                      👁️ 閲覧モード {!isEditMode && "✓"}
                    </button>
                    <button
                      className={`mode-option ${isEditMode ? "active" : ""}`}
                      onClick={() => handleModeSelect("edit")}
                    >
                      ✏️ 編集モード {isEditMode && "✓"}
                    </button>
                  </div>
                )}
              </div>

              {isEditMode && (
                <button
                  className={`btn-save ${hasLayoutChanges ? "save-button-active" : "save-button-disabled"}`}
                  onClick={saveLayout}
                  disabled={!hasLayoutChanges}
                >
                  💾 レイアウト保存{hasLayoutChanges && " *"}
                </button>
              )}
            </>
          )}
        </div>
      </header>
      <main className="main">
        {sections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-content">
              <div className="empty-state-icon">📊</div>
              <h2>ダッシュボードが空です</h2>
              <p>Markdownファイルを開いてダッシュボードを表示しましょう</p>
              <div className="empty-state-actions">
                <button className="btn-file empty-action-btn" onClick={loadMarkdownFile}>
                  📂 ファイルを開く
                </button>
                <RecentFilesMenu onFileSelect={handleRecentFileSelect} />
              </div>
            </div>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={60}
            width={containerWidth}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            onLayoutChange={handleLayoutChange}
          >
            {sections.map((section) => (
              <div key={section.id} className="grid-item">
                <h3>{section.title}</h3>
                <div className="content" dangerouslySetInnerHTML={{ __html: marked(section.content) }} />
              </div>
            ))}
          </GridLayout>
        )}
      </main>
      <Snackbar
        message={snackbar.message}
        isOpen={snackbar.open}
        onClose={() => setSnackbar({ open: false, message: "" })}
      />
    </div>
  );
};

export default App;
