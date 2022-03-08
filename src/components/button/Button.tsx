import { IconProp } from "@fortawesome/fontawesome-svg-core";
import React from "react";
import classNames from "classnames";
import ButtonContent from "./ButtonContent";

interface Props {
  primary?: boolean;
  children?: React.ReactNode;
  startIcon?: IconProp;
  endIcon?: IconProp;
}

const Button = (
  {
    children,
    startIcon,
    endIcon,
    primary,
    className,
    style,
    onClick,
    ...props
  }: Props & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>,
  ref: React.ForwardedRef<HTMLButtonElement>
) => {
  const buttonClass = primary ? "btn-primary" : "btn";

  return (
    <div className={classNames("relative inline-block", className)} style={style}>
      <button
        className={buttonClass}
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
        {...props}
      >
        <ButtonContent primary={primary} startIcon={startIcon} endIcon={endIcon} disabled={props.disabled}>
          {children}
        </ButtonContent>
      </button>
    </div>
  );
};

export default React.forwardRef(Button);
