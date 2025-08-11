import React, { useState, useEffect, useRef, useCallback } from "react";
import GridLayout from "react-grid-layout";
import { marked } from "marked";
import Snackbar from "./components/Snackbar";
import RecentFilesMenu from "./components/RecentFilesMenu";
import { FileService } from "../services/FileService";
import { LayoutService } from "../services/LayoutService";
import { useFileManagement } from "../hooks/useFileManagement";
import { useSnackbar } from "../hooks/useSnackbar";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// サービス層のインスタンスを作成（依存性注入の原則）
const fileService = new FileService();
const layoutService = new LayoutService();

const App: React.FC = () => {
  const { snackbar, showMessage, hideMessage } = useSnackbar();
  const {
    sections,
    layout,
    currentFile,
    hasLayoutChanges,
    isReloading,
    loadFileFromPath,
    loadMarkdownFile,
    reloadCurrentFile,
    saveLayout,
    updateLayout,
    clearDashboard,
  } = useFileManagement(fileService, layoutService, showMessage);

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(1200);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState<boolean>(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  const loadLastOpenedFile = useCallback(async () => {
    try {
      const lastOpenedFilePath = await window.electronAPI.getLastOpenedFile();
      if (lastOpenedFilePath) {
        await loadFileFromPath(lastOpenedFilePath);
      }
    } catch {
      showMessage("前回のファイルの読み込みに失敗しました");
    }
  }, [loadFileFromPath, showMessage]);

  const handleLayoutSave = useCallback(async () => {
    await saveLayout();
    showMessage("レイアウトを保存しました！");
  }, [saveLayout, showMessage]);

  const handleModeSelect = useCallback((mode: "view" | "edit") => {
    setIsEditMode(mode === "edit");
    setIsModeDropdownOpen(false);
  }, []);

  const handleRecentFileSelect = useCallback(
    async (filePath: string) => {
      await loadFileFromPath(filePath);
    },
    [loadFileFromPath],
  );

  const handleReloadWithMessage = useCallback(async () => {
    await reloadCurrentFile();
    showMessage("ファイルを再読み込みしました！");
  }, [reloadCurrentFile, showMessage]);

  const handleCloseDashboard = useCallback(() => {
    clearDashboard();
    setIsEditMode(false);
    showMessage("ダッシュボードを閉じました");
  }, [clearDashboard, showMessage]);

  useEffect(() => {
    loadLastOpenedFile();

    const handleOpenRecentFile = (event: unknown, filePath: string) => {
      loadFileFromPath(filePath);
    };

    const handleCloseDashboardEvent = () => {
      handleCloseDashboard();
    };

    window.electronAPI.onOpenRecentFile?.(handleOpenRecentFile);
    window.electronAPI.onCloseDashboard?.(handleCloseDashboardEvent);

    const handleResize = () => {
      const mainElement = document.querySelector(".main") as HTMLElement;
      if (mainElement) {
        setContainerWidth(mainElement.clientWidth - 32);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [loadFileFromPath, handleCloseDashboard, loadLastOpenedFile]);

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
              onClick={handleReloadWithMessage}
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
                  onClick={handleLayoutSave}
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
            onLayoutChange={updateLayout}
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
      <Snackbar message={snackbar.message} isOpen={snackbar.open} onClose={hideMessage} />
    </div>
  );
};

export default App;
