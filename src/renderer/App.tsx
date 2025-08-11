import React, { useState, useEffect, useRef } from 'react';
import GridLayout from 'react-grid-layout';
import { marked } from 'marked';
import { MarkdownSection, LayoutItem } from '../types/global';
import { parseMarkdownSections } from './utils/markdownParser';
import Snackbar from './components/Snackbar';
import RecentFilesMenu from './components/RecentFilesMenu';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const App: React.FC = () => {
  const [sections, setSections] = useState<MarkdownSection[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [savedLayout, setSavedLayout] = useState<LayoutItem[]>([]);
  const [hasLayoutChanges, setHasLayoutChanges] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(1200);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState<boolean>(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 前回開いていたファイルを自動で開く
    loadLastOpenedFile();

    // メニューからのファイル選択を監視
    const handleOpenRecentFile = (event: any, filePath: string) => {
      loadFileFromPath(filePath);
    };

    // メニューからのダッシュボードを閉じる処理を監視
    const handleCloseDashboard = (event: any) => {
      closeDashboard();
    };

    window.electronAPI.onOpenRecentFile?.(handleOpenRecentFile);
    window.electronAPI.onCloseDashboard?.(handleCloseDashboard);

    // リサイズ監視
    const handleResize = () => {
      const mainElement = document.querySelector('.main') as HTMLElement;
      if (mainElement) {
        setContainerWidth(mainElement.clientWidth - 32); // パディング分を引く (1rem x 2)
      }
    };

    handleResize(); // 初期実行
    window.addEventListener('resize', handleResize);

    // モードドロップダウンのクリックアウトサイド処理
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
      // IPC リスナーのクリーンアップは通常必要ないが、念のため
    };
  }, []);

  const loadFileFromPath = async (filePath: string) => {
    try {
      const result = await window.electronAPI.readMarkdownFile(filePath);
      if (result.success && result.content) {
        console.log('Loading file:', filePath);
        console.log('File content length:', result.content.length);

        const parsedSections = parseMarkdownSections(result.content);
        console.log('Parsed sections:', parsedSections);

        setSections(parsedSections);
        setCurrentFile(filePath);

        const savedLayoutConfig = await window.electronAPI.loadLayoutConfig(filePath);
        if (savedLayoutConfig) {
          setLayout(savedLayoutConfig);
          setSavedLayout(savedLayoutConfig);
        } else {
          const defaultLayout = createDefaultLayout(parsedSections);
          setLayout(defaultLayout);
          setSavedLayout(defaultLayout);
        }
        setHasLayoutChanges(false);
      } else {
        console.log('Failed to load file:', result.error);
        setSnackbar({ open: true, message: 'ファイルの読み込みに失敗しました' });
      }
    } catch (error) {
      console.error('Error loading markdown file:', error);
      setSnackbar({ open: true, message: 'ファイルの読み込みに失敗しました' });
    }
  };

  const loadMarkdownFile = async () => {
    try {
      const result = await window.electronAPI.selectMarkdownFile();
      if (result && result.content) {
        console.log('Selected file:', result.filePath);
        console.log('File content length:', result.content.length);

        const parsedSections = parseMarkdownSections(result.content);
        console.log('Parsed sections:', parsedSections);

        setSections(parsedSections);
        setCurrentFile(result.filePath);

        const savedLayoutConfig = await window.electronAPI.loadLayoutConfig(result.filePath);
        if (savedLayoutConfig) {
          setLayout(savedLayoutConfig);
          setSavedLayout(savedLayoutConfig);
        } else {
          const defaultLayout = createDefaultLayout(parsedSections);
          setLayout(defaultLayout);
          setSavedLayout(defaultLayout);
        }
        setHasLayoutChanges(false);
      } else {
        console.log('No file selected or empty content');
      }
    } catch (error) {
      console.error('Error loading markdown file:', error);
    }
  };

  const createDefaultLayout = (sections: MarkdownSection[]): LayoutItem[] => {
    return sections.map((section, index) => ({
      i: section.id,
      x: (index % 3) * 4,  // 3列に配置
      y: Math.floor(index / 3) * 6,  // 行の高さを6に
      w: 4,  // 幅4（12グリッドの1/3）
      h: 6,  // 高さ6（見やすいサイズ）
      minW: 3,
      minH: 4
    }));
  };

  const handleLayoutChange = (newLayout: any[]) => {
    setLayout(newLayout);
    // レイアウトが変更されたかチェック
    const hasChanges = JSON.stringify(newLayout) !== JSON.stringify(savedLayout);
    setHasLayoutChanges(hasChanges);
  };

  const saveLayout = async () => {
    if (currentFile) {
      await window.electronAPI.saveLayoutConfig(currentFile, layout);
      setSavedLayout([...layout]);
      setHasLayoutChanges(false);
      setSnackbar({ open: true, message: 'レイアウトを保存しました！' });
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const handleModeSelect = (mode: 'view' | 'edit') => {
    setIsEditMode(mode === 'edit');
    setIsModeDropdownOpen(false);
  };

  const loadLastOpenedFile = async () => {
    try {
      const lastFile = await window.electronAPI.getLastOpenedFile();
      if (lastFile) {
        const result = await window.electronAPI.readMarkdownFile(lastFile);
        if (result.success && result.content) {
          console.log('Loading last opened file:', lastFile);
          const parsedSections = parseMarkdownSections(result.content);
          setSections(parsedSections);
          setCurrentFile(lastFile);

          const savedLayoutConfig = await window.electronAPI.loadLayoutConfig(lastFile);
          if (savedLayoutConfig) {
            setLayout(savedLayoutConfig);
            setSavedLayout(savedLayoutConfig);
          } else {
            const defaultLayout = createDefaultLayout(parsedSections);
            setLayout(defaultLayout);
            setSavedLayout(defaultLayout);
          }
          setHasLayoutChanges(false);
        }
      }
    } catch (error) {
      console.error('Error loading last opened file:', error);
    }
  };

  const reloadCurrentFile = async () => {
    if (!currentFile || isReloading) return;

    setIsReloading(true);
    try {
      const result = await window.electronAPI.readMarkdownFile(currentFile);
      if (result.success && result.content) {
        console.log('Reloading file:', currentFile);
        const parsedSections = parseMarkdownSections(result.content);
        setSections(parsedSections);

        // 現在のレイアウトを保持（新しいセクションがある場合は追加）
        const existingLayout = layout;
        const existingIds = new Set(existingLayout.map(item => item.i));
        const newSections = parsedSections.filter(section => !existingIds.has(section.id));

        if (newSections.length > 0) {
          // 新しいセクションのデフォルトレイアウトを作成
          const newLayout = createDefaultLayout(newSections);
          // 既存のレイアウトの最下部に配置
          const maxY = Math.max(...existingLayout.map(item => item.y + item.h), 0);
          newLayout.forEach((item, index) => {
            item.y = maxY + Math.floor(index / 3) * 6;
          });
          setLayout([...existingLayout, ...newLayout]);
        }

        setSnackbar({ open: true, message: 'ファイルを再読み込みしました！' });
      }
    } catch (error) {
      console.error('Error reloading file:', error);
      setSnackbar({ open: true, message: 'ファイルの再読み込みに失敗しました' });
    } finally {
      setIsReloading(false);
    }
  };

  const handleRecentFileSelect = async (filePath: string) => {
    await loadFileFromPath(filePath);
  };

  const closeDashboard = () => {
    // ダッシュボードの状態をクリア
    setSections([]);
    setLayout([]);
    setCurrentFile('');
    setSavedLayout([]);
    setHasLayoutChanges(false);
    setIsEditMode(false);

    setSnackbar({ open: true, message: 'ダッシュボードを閉じました' });
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 title={currentFile || 'ファイルが開かれていません'}>
            {currentFile ?
              currentFile.split('/').pop()?.replace('.md', '') || 'Dashboard'
              : 'Dashboard'}
          </h1>
          {currentFile && (
            <button
              className="reload-icon"
              onClick={reloadCurrentFile}
              disabled={isReloading}
              title="ファイルを再読み込み"
            >
              {isReloading ? '🔄' : '↻'}
            </button>
          )}
        </div>
        <div className="controls">
          {currentFile && (
            <>
              <div className="mode-selector" ref={modeDropdownRef}>
                <button
                  className={`mode-status ${isEditMode ? 'edit-mode' : 'view-mode'}`}
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                >
                  {isEditMode ? '✏️ 編集モード' : '👁️ 閲覧モード'} ▼
                </button>

                {isModeDropdownOpen && (
                  <div className="mode-dropdown">
                    <button
                      className={`mode-option ${!isEditMode ? 'active' : ''}`}
                      onClick={() => handleModeSelect('view')}
                    >
                      👁️ 閲覧モード {!isEditMode && '✓'}
                    </button>
                    <button
                      className={`mode-option ${isEditMode ? 'active' : ''}`}
                      onClick={() => handleModeSelect('edit')}
                    >
                      ✏️ 編集モード {isEditMode && '✓'}
                    </button>
                  </div>
                )}
              </div>

              {isEditMode && (
                <button
                  className={`btn-save ${hasLayoutChanges ? 'save-button-active' : 'save-button-disabled'}`}
                  onClick={saveLayout}
                  disabled={!hasLayoutChanges}
                >
                  💾 レイアウト保存{hasLayoutChanges && ' *'}
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
                <div
                  className="content"
                  dangerouslySetInnerHTML={{ __html: marked(section.content) }}
                />
              </div>
            ))}
          </GridLayout>
        )}
      </main>
      <Snackbar
        message={snackbar.message}
        isOpen={snackbar.open}
        onClose={() => setSnackbar({ open: false, message: '' })}
      />
    </div>
  );
};

export default App;
