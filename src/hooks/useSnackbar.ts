import { useState, useCallback } from "react";

interface SnackbarState {
  open: boolean;
  message: string;
}

export const useSnackbar = () => {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
  });

  const showMessage = useCallback((message: string) => {
    setSnackbar({ open: true, message });
  }, []);

  const hideMessage = useCallback(() => {
    setSnackbar({ open: false, message: "" });
  }, []);

  return {
    snackbar,
    showMessage,
    hideMessage,
  };
};
