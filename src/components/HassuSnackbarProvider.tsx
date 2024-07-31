import React, { createContext, ReactNode, useCallback, useMemo, useState } from "react";
import Snackbar, { SnackbarProps } from "@mui/material/Snackbar";
import Alert, { AlertProps } from "@mui/material/Alert";
import { Check, InfoOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { styled } from "@mui/system";
import { useIsBelowBreakpoint } from "src/hooks/useIsSize";

export type ShowMessage = (message: string) => void;

type SnackbarContextValue = {
  showSuccessMessage: ShowMessage;
  showErrorMessage: ShowMessage;
  showInfoMessage: ShowMessage;
  mobileBottomOffset: number | undefined;
  setMobileBottomOffset: React.Dispatch<React.SetStateAction<number | undefined>>;
};

export const SnackbarContext = createContext<SnackbarContextValue>({
  showSuccessMessage: () => undefined,
  showErrorMessage: () => undefined,
  showInfoMessage: () => undefined,
  mobileBottomOffset: undefined,
  setMobileBottomOffset: () => undefined,
});

type Props = {
  children?: ReactNode;
};

function SnackbarProvider({ children }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState<SnackbarProps["autoHideDuration"]>(2000);
  const [severity, setSeverity] = useState<AlertProps["severity"]>("success");
  const [mobileBotOffset, setMobileBotOffset] = useState<number | undefined>(undefined);

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

    return {
      showMessage,
      showSuccessMessage,
      showErrorMessage,
      showInfoMessage,
      mobileBottomOffset: mobileBotOffset,
      setMobileBottomOffset: setMobileBotOffset,
    };
  }, [mobileBotOffset]);

  const handleSnackbarClose: NonNullable<SnackbarProps["onClose"]> = useCallback((_event, closeReason) => {
    if (closeReason === "clickaway") {
      return;
    }
    setOpen(false);
  }, []);

  const handleAlertClose: NonNullable<AlertProps["onClose"]> = useCallback(() => {
    setOpen(false);
  }, []);

  const isSmall = useIsBelowBreakpoint("sm");

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <HassuSnackbar
        anchorOrigin={{ horizontal: "center", vertical: isSmall ? "bottom" : "top" }}
        autoHideDuration={duration}
        mobileBottomOffset={mobileBotOffset}
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
      </HassuSnackbar>
    </SnackbarContext.Provider>
  );
}

type HassuSnackbarProps = SnackbarProps & { mobileBottomOffset: number | undefined };

const HassuSnackbar = styled(({ children, mobileBottomOffset, ...props }: HassuSnackbarProps) => (
  <Snackbar {...props}>{children}</Snackbar>
))<HassuSnackbarProps>(({ theme, mobileBottomOffset }) => ({
  alignItems: "center",
  justifyContent: "center",
  top: "24px",
  right: "auto",
  left: "50%",
  transform: "translateX(-50%)",
  bottom: "unset",
  [theme.breakpoints.down("sm")]: {
    bottom: mobileBottomOffset !== undefined ? `${mobileBottomOffset}px` : "8px",
    left: "8px",
    right: "8px",
    top: "unset",
    transform: "unset",
  },
}));

const StyledAlert = styled(Alert)(({ theme }) => ({
  margin: "15px 0px",
  minWidth: "100%",
  [theme.breakpoints.up("sm")]: {
    minWidth: "344px",
  },
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
    padding: "0px",
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
}));

export { SnackbarProvider };
