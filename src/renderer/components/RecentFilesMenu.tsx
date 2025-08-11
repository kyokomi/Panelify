import React, { useState, useEffect, useRef } from 'react';

interface RecentFilesMenuProps {
  onFileSelect: (filePath: string) => void;
}

const RecentFilesMenu: React.FC<RecentFilesMenuProps> = ({ onFileSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadRecentFiles = async () => {
      const files = await window.electronAPI.getRecentFiles();
      setRecentFiles(files);
    };

    if (isOpen) {
      loadRecentFiles();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileSelect = (filePath: string) => {
    onFileSelect(filePath);
    setIsOpen(false);
  };

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop()?.replace('.md', '') || 'Unknown';
  };

  return (
    <div className="recent-files-menu" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="recent-files-button btn-file"
      >
        🕒 最近開いたファイル {isOpen ? '▲' : '▼'}
      </button>

      {isOpen && (
        <div className="recent-files-dropdown">
          {recentFiles.length === 0 ? (
            <div className="no-recent-files">最近開いたファイルがありません</div>
          ) : (
            recentFiles.map((filePath, index) => (
              <button
                key={index}
                onClick={() => handleFileSelect(filePath)}
                className="recent-file-item"
                title={filePath}
              >
                {getFileName(filePath)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RecentFilesMenu;
