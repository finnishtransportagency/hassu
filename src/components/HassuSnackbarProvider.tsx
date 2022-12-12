import React, { createContext, ReactNode, useState } from "react";
import Snackbar, { SnackbarProps } from "@mui/material/Snackbar";
import Alert, { AlertColor, AlertProps } from "@mui/material/Alert";

type ShowMessage = (message: string, msgSeverity: AlertProps["severity"], msgDuration: SnackbarProps["autoHideDuration"]) => void;
type ShowSuccessMessage = (message: string) => void;
type ShowErrorMessage = (message: string) => void;
type ShowInfoMessage = (message: string) => void;
export const SnackbarContext = createContext<{
  showMessage: ShowMessage;
  showSuccessMessage: ShowSuccessMessage;
  showErrorMessage: ShowErrorMessage;
  showInfoMessage: ShowInfoMessage;
}>({
  showMessage: () => undefined,
  showSuccessMessage: () => undefined,
  showErrorMessage: () => undefined,
  showInfoMessage: () => undefined,
});

interface Props {
  children?: ReactNode;
}

function SnackbarProvider({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState<SnackbarProps["autoHideDuration"]>(2000);
  const [severity, setSeverity] = useState<AlertProps["severity"]>("success");

  const showMessage = (
    msg = "",
    msgSeverity: AlertProps["severity"] = "success",
    msgDuration: SnackbarProps["autoHideDuration"] = 2000
  ) => {
    setMessage(msg);
    setSeverity(msgSeverity);
    setDuration(msgDuration);
    setOpen(true);
  };

  const showSuccessMessage = (msg: string) => {
    showMessage(msg, "success", 2000);
  };

  const showErrorMessage = (msg: string) => {
    showMessage(msg, "error", null);
  };

  const showInfoMessage = (msg: string) => {
    showMessage(msg, "info", 3000);
  };

  const handleSnackbarClose: SnackbarProps["onClose"] = (_event, closeReason) => {
    if (closeReason === "clickaway") {
      return;
    }
    setOpen(false);
  };

  const handleAlertClose: AlertProps["onClose"] = () => {
    setOpen(false);
  };

  const value = { showMessage, showSuccessMessage, showErrorMessage, showInfoMessage };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        autoHideDuration={duration}
        open={open}
        onClose={handleSnackbarClose}
      >
        <Alert
          sx={{ marginTop: "15px", width: "100%" }}
          variant="filled"
          elevation={6}
          onClose={handleAlertClose}
          severity={severity as AlertColor}
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export { SnackbarProvider };
