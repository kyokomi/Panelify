import React, { useState, useEffect, useCallback } from "react";
import GridLayout from "react-grid-layout";
import Snackbar from "./components/Snackbar";
import RecentFilesMenu from "./components/RecentFilesMenu";
import Button from "./components/Button";
import Dropdown from "./components/Dropdown";
import SaveButton from "./components/SaveButton";
import EmptyState from "./components/EmptyState";
import MarkdownContent from "./components/MarkdownContent";
import { extractFileNameFromPath } from "./utils/fileUtils";
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

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [loadFileFromPath, handleCloseDashboard, loadLastOpenedFile]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 title={currentFile || "ファイルが開かれていません"}>
            {currentFile ? extractFileNameFromPath(currentFile) || "Dashboard" : "Dashboard"}
          </h1>
          {currentFile && (
            <Button
              variant="icon"
              onClick={handleReloadWithMessage}
              disabled={isReloading}
              title="ファイルを再読み込み"
              className="reload-icon"
            >
              {isReloading ? "🔄" : "↻"}
            </Button>
          )}
        </div>
        <div className="controls">
          {currentFile && (
            <>
              <Dropdown
                className="mode-selector"
                dropdownClassName="mode-dropdown"
                isControlled={true}
                isOpen={isModeDropdownOpen}
                onToggle={setIsModeDropdownOpen}
                trigger={
                  <button className={`mode-status ${isEditMode ? "edit-mode" : "view-mode"}`}>
                    {isEditMode ? "✏️ 編集モード" : "👁️ 閲覧モード"} ▼
                  </button>
                }
              >
                <Button variant="menu-item" active={!isEditMode} onClick={() => handleModeSelect("view")}>
                  👁️ 閲覧モード {!isEditMode && "✓"}
                </Button>
                <Button variant="menu-item" active={isEditMode} onClick={() => handleModeSelect("edit")}>
                  ✏️ 編集モード {isEditMode && "✓"}
                </Button>
              </Dropdown>

              {isEditMode && <SaveButton onClick={handleLayoutSave} hasChanges={hasLayoutChanges} />}
            </>
          )}
        </div>
      </header>
      <main className="main">
        {sections.length === 0 ? (
          <EmptyState
            icon="📊"
            title="ダッシュボードが空です"
            description="Markdownファイルを開いてダッシュボードを表示しましょう"
          >
            <Button variant="file" onClick={loadMarkdownFile} className="empty-action-btn">
              📂 ファイルを開く
            </Button>
            <RecentFilesMenu onFileSelect={handleRecentFileSelect} />
          </EmptyState>
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
                <MarkdownContent content={section.content} className="content" />
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
