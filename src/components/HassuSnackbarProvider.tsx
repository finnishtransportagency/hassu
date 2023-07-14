import React, { createContext, ReactNode, useCallback, useMemo, useState } from "react";
import Snackbar, { SnackbarProps } from "@mui/material/Snackbar";
import Alert, { AlertProps } from "@mui/material/Alert";
import { Check, InfoOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { useMediaQuery } from "@mui/material";
import { breakpoints } from "./layout/HassuMuiThemeProvider";
import { experimental_sx as sx, styled } from "@mui/system";

type ShowSuccessMessage = (message: string) => void;
type ShowErrorMessage = (message: string) => void;
type ShowInfoMessage = (message: string) => void;

type SnackbarContextValue = {
  showSuccessMessage: ShowSuccessMessage;
  showErrorMessage: ShowErrorMessage;
  showInfoMessage: ShowInfoMessage;
};

export const SnackbarContext = createContext<SnackbarContextValue>({
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

  const value: SnackbarContextValue = useMemo(() => {
    const showMessage = (
      msg = "",
      msgSeverity: AlertProps["severity"] = "success",
      msgDuration: SnackbarProps["autoHideDuration"] = 4000
    ) => {
      setMessage(msg);
      setSeverity(msgSeverity);
      setDuration(msgDuration);
      setOpen(true);
    };

    const showSuccessMessage = (msg: string) => {
      showMessage(msg, "success", 4000);
    };

    const showErrorMessage = (msg: string) => {
      showMessage(msg, "error", 10000);
    };

    const showInfoMessage = (msg: string) => {
      showMessage(msg, "info", 4000);
    };

    return { showMessage, showSuccessMessage, showErrorMessage, showInfoMessage };
  }, []);

  const handleSnackbarClose: SnackbarProps["onClose"] = useCallback((_event, closeReason) => {
    if (closeReason === "clickaway") {
      return;
    }
    setOpen(false);
  }, []);

  const handleAlertClose: AlertProps["onClose"] = useCallback(() => {
    setOpen(false);
  }, []);

  const isMedium = useMediaQuery(`(min-width: ${breakpoints.values?.md}px)`);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        anchorOrigin={{
          vertical: isMedium ? "top" : "bottom",
          horizontal: "center",
        }}
        autoHideDuration={duration}
        open={open}
        onClose={handleSnackbarClose}
      >
        <StyledAlert
          variant="filled"
          elevation={6}
          iconMapping={{ success: <Check />, info: <InfoOutlined />, error: <WarningAmberOutlined /> }}
          onClose={handleAlertClose}
          severity={severity}
        >
          {message}
        </StyledAlert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

const StyledAlert = styled(Alert)(
  sx({
    margin: "15px 0px",
    minWidth: "344px",
    minHeight: "48px",
    borderRadius: "0px",
    padding: "9px 15px",
    width: "100%",
    "& .MuiAlert-message": {
      padding: "5px 0px",
    },
    "& .MuiAlert-icon": {
      padding: "3px 0px",
      marginRight: "15px",
    },
    "& .MuiAlert-action": {
      padding: 0,
      marginRight: "-8px",
      paddingLeft: "15px",
    },
    "&.MuiAlert-filledError": {
      backgroundColor: "#C73F00",
    },
    "&.MuiAlert-filledInfo": {
      backgroundColor: "#0064AF",
    },
    "&.MuiAlert-filledSuccess": {
      backgroundColor: "#207A43",
    },
  })
);

export { SnackbarProvider };
