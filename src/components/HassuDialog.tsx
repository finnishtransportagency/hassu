import { Dialog, DialogProps, Stack } from "@mui/material";
import React, { ReactElement } from "react";
import WindowCloseButton from "./button/WindowCloseButton";
import { styled, experimental_sx as sx } from "@mui/material";

interface Props {
  title?: string;
  showCloseButton?: boolean;
}

const HassuDialog = (props: DialogProps & Props): ReactElement => {
  const { children, title, showCloseButton, ...dialogProps } = props;

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
        },
      }}
      {...dialogProps}
    >
      {(title || showCloseButton) && (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Title className="vayla-dialog-title">{title}</Title>
          {showCloseButton && (
            <WindowCloseButton size="small" onClick={() => dialogProps.onClose?.({}, "backdropClick")} />
          )}
        </Stack>
      )}
      {children}
    </Dialog>
  );
};

const Title = styled("div")(
  sx({
    marginBottom: 7,
  })
);

export default HassuDialog;
