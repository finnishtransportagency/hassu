import { Dialog, DialogProps, DialogTitle, Stack } from "@mui/material";
import React, { ReactElement, ReactNode } from "react";
import WindowCloseButton from "./button/WindowCloseButton";

export type HassuDialogProps = {
  title?: string;
  hideCloseButton?: boolean;
  contentAsideTitle?: ReactNode;
} & DialogProps;

const HassuDialog = (props: HassuDialogProps): ReactElement => {
  const { children, title, hideCloseButton, PaperProps, contentAsideTitle, ...dialogProps } = props;

  const { sx: paperSx, ...paperProps } = PaperProps ?? {};

  return (
    <Dialog
      fullWidth={true}
      maxWidth="md"
      PaperProps={{
        sx: {
          borderTopWidth: "10px",
          borderTopStyle: "solid",
          borderImage: "linear-gradient(117deg, #009ae0, #49c2f1) 1",
          borderRadius: "0",
          padding: 7,
          ...paperSx,
          "*::-webkit-scrollbar": {
            width: "0.55em",
          },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: "gray",
            borderRadius: "8pt",
          },
          "*::-webkit-scrollbar-track": {
            marginBottom: "-1.2em",
          },
          ".MuiDialogContent-root": {
            paddingRight: "1em",
          },
          ".MuiTypography-root": {
            paddingRight: "1em",
          },
        },
        ...paperProps,
      }}
      {...dialogProps}
    >
      {title && (
        <DialogTitle>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <h4 style={{ margin: 0 }} className="vayla-dialog-title">
              {title}
            </h4>
            {contentAsideTitle}
            {!hideCloseButton && <WindowCloseButton size="small" onClick={() => dialogProps.onClose?.({}, "escapeKeyDown")} />}
          </Stack>
        </DialogTitle>
      )}
      {children}
    </Dialog>
  );
};

export default HassuDialog;
