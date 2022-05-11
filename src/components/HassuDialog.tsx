import { Dialog, DialogProps, DialogTitle, Stack } from "@mui/material";
import React, { ReactElement } from "react";
import WindowCloseButton from "./button/WindowCloseButton";
interface Props {
  title?: string;
  hideCloseButton?: boolean;
}

const HassuDialog = (props: DialogProps & Props): ReactElement => {
  const { children, title, hideCloseButton, PaperProps, ...dialogProps } = props;

  const { sx: paperSx, ...paperProps } = PaperProps || {};

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
            {!hideCloseButton && (
              <WindowCloseButton size="small" onClick={() => dialogProps.onClose?.({}, "escapeKeyDown")} />
            )}
          </Stack>
        </DialogTitle>
      )}
      {children}
    </Dialog>
  );
};

export default HassuDialog;
