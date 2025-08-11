import React, { useState, useEffect } from "react";
import Button from "./Button";
import Dropdown from "./Dropdown";

interface RecentFilesMenuProps {
  onFileSelect: (filePath: string) => void;
}

const RecentFilesMenu: React.FC<RecentFilesMenuProps> = ({ onFileSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  useEffect(() => {
    const loadRecentFiles = async () => {
      const recentFilesList = await window.electronAPI.getRecentFiles();
      setRecentFiles(recentFilesList);
    };

    if (isOpen) {
      loadRecentFiles();
    }
  }, [isOpen]);

  const handleFileSelect = (filePath: string) => {
    onFileSelect(filePath);
    setIsOpen(false);
  };

  const extractFileNameFromPath = (filePath: string) => {
    return filePath.split("/").pop()?.replace(".md", "") || "Unknown";
  };

  return (
    <Dropdown
      className="recent-files-menu"
      dropdownClassName="recent-files-dropdown"
      isControlled={true}
      isOpen={isOpen}
      onToggle={setIsOpen}
      trigger={
        <Button variant="file" className="recent-files-button">
          🕒 最近開いたファイル {isOpen ? "▲" : "▼"}
        </Button>
      }
    >
      {recentFiles.length === 0 ? (
        <div className="no-recent-files">最近開いたファイルがありません</div>
      ) : (
        recentFiles.map((filePath, index) => (
          <Button
            key={index}
            variant="menu-item"
            onClick={() => handleFileSelect(filePath)}
            title={filePath}
            className="recent-file-item"
          >
            {extractFileNameFromPath(filePath)}
          </Button>
        ))
      )}
    </Dropdown>
  );
};

export default RecentFilesMenu;
