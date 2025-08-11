import React from "react";

interface SaveButtonProps {
  onClick: () => void;
  hasChanges: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const SaveButton: React.FC<SaveButtonProps> = ({
  onClick,
  hasChanges,
  disabled = false,
  className = "",
  children = "💾 レイアウト保存",
}) => {
  const buttonClass = ["btn-save", hasChanges ? "save-button-active" : "save-button-disabled", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={buttonClass} onClick={onClick} disabled={disabled || !hasChanges}>
      {children}
      {hasChanges && " *"}
    </button>
  );
};

export default SaveButton;
