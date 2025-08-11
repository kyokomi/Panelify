import React, { useEffect } from "react";

interface SnackbarProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

const Snackbar: React.FC<SnackbarProps> = ({ message, isOpen, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(autoCloseTimer);
  }, [isOpen, onClose, duration]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="snackbar">
      <span>{message}</span>
    </div>
  );
};

export default Snackbar;
