import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // 前回開いていたファイルを自動で開く
    loadLastOpenedFile();
    
    // リサイズ監視
    const handleResize = () => {
      const mainElement = document.querySelector('.main') as HTMLElement;
      if (mainElement) {
        setContainerWidth(mainElement.clientWidth - 32); // パディング分を引く (1rem x 2)
      }
    };
    
    handleResize(); // 初期実行
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (!currentFile) return;
    
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
    }
  };

  const handleRecentFileSelect = async (filePath: string) => {
    try {
      const result = await window.electronAPI.readMarkdownFile(filePath);
      if (result.success && result.content) {
        console.log('Selected recent file:', filePath);
        const parsedSections = parseMarkdownSections(result.content);
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
      }
    } catch (error) {
      console.error('Error loading recent file:', error);
      setSnackbar({ open: true, message: 'ファイルの読み込みに失敗しました' });
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1 title={currentFile || 'ファイルが開かれていません'}>
          {currentFile ? 
            currentFile.split('/').pop()?.replace('.md', '') || 'Dashboard' 
            : 'Dashboard'}
        </h1>
        <div className="controls">
          <button onClick={loadMarkdownFile}>ファイルを開く</button>
          <RecentFilesMenu onFileSelect={handleRecentFileSelect} />
          {currentFile && <button onClick={reloadCurrentFile}>再読み込み</button>}
          <button onClick={toggleEditMode}>
            {isEditMode ? '閲覧モード' : '編集モード'}
          </button>
          {isEditMode && (
            <button 
              onClick={saveLayout}
              disabled={!hasLayoutChanges}
              className={hasLayoutChanges ? 'save-button-active' : 'save-button-disabled'}
            >
              レイアウト保存{hasLayoutChanges && ' *'}
            </button>
          )}
        </div>
      </header>
      <main className="main">
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