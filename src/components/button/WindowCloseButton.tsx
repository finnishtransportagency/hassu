import { IconButton, IconButtonProps } from "@mui/material";
import React, { ReactElement } from "react";
import CloseIcon from "@mui/icons-material/Close";

function WindowCloseButton(
  { onClick, ...otherProps }: IconButtonProps,
  ref: React.ForwardedRef<HTMLButtonElement>
): ReactElement {
  return (
    <IconButton
      disableFocusRipple
      ref={ref}
      onClick={(e) => {
        onClick?.(e);
        e.preventDefault();
      }}
      sx={{marginLeft: "1.5rem"}}
      {...otherProps}
    >
      <CloseIcon />
    </IconButton>
  );
}

export default React.forwardRef(WindowCloseButton);
