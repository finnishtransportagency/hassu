import { IconButton, IconButtonProps } from "@mui/material";
import React, { ReactElement } from "react";
import CloseIcon from "@mui/icons-material/Close";

function WindowCloseButton({ onClick, ...otherProps }: IconButtonProps): ReactElement {
  return (
    <IconButton
      onClick={(e) => {
        onClick?.(e);
        e.preventDefault();
      }}
      sx={{ position: "absolute", right: "1rem", top: "2rem" }}
      {...otherProps}
    >
      <CloseIcon />
    </IconButton>
  );
}

export default React.forwardRef(WindowCloseButton);
