import React, { ComponentProps } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { styled } from "@mui/system";

interface Props {
  icon: IconProp;
}

const StyledIconButton = styled("button")(({ theme }) => ({
  height: theme.spacing(11),
  width: theme.spacing(11),
  padding: "1px",
  borderRadius: "50%",
  color: "#0064af",
  "&:not(:disabled)": {
    "&:hover": {
      backgroundColor: "rgba(0,0,0,.1)",
    },
    "&:active": {
      backgroundColor: "rgba(0,0,0,.05)",
    },
  },
  "&:disabled": {
    opacity: 0.5,
    cursor: "default",
  },
}));

const IconButton = (
  { icon, onClick, ...buttonProps }: Props & Omit<ComponentProps<typeof StyledIconButton>, "ref">,
  ref: React.ForwardedRef<HTMLButtonElement>
) => {
  return (
    <StyledIconButton
      ref={ref}
      // Work around for click events bubbling from children even if button is disabled
      // See https://github.com/facebook/react/issues/7711
      onClick={(event) => {
        if (event.currentTarget.matches(":disabled")) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...buttonProps}
    >
      <FontAwesomeIcon icon={icon} size="lg" />
    </StyledIconButton>
  );
};

export default React.forwardRef(IconButton);
