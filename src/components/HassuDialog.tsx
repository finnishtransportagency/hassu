import { Dialog, DialogProps } from "@mui/material";
import React, { ReactElement } from "react";

const HassuDialog = (props: DialogProps): ReactElement => {
  const { children, ...other } = props;

  return (
    <Dialog
      fullWidth={true}
      maxWidth={"md"}
      PaperProps={{
        sx: {
          padding: "1rem",
          borderTopWidth: "0.5rem",
          borderTopStyle: "solid",
          borderTopColor: "#49c2f1",
          borderRadius: "0",
        },
      }}
      {...other}
    >
      {children}
    </Dialog>
  );
};

export default HassuDialog;
