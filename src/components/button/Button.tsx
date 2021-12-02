import { IconProp } from "@fortawesome/fontawesome-svg-core";
import React from "react";
import { wrapper } from "@styles/button/ButtonWrapper.module.css";
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
    ...props
  }: Props & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>,
  ref: React.ForwardedRef<HTMLButtonElement>
) => {
  const buttonClass = primary ? "btn-primary" : "btn";

  return (
    <div className={classNames(wrapper, className)}>
      <button className={buttonClass} ref={ref} {...props}>
        <ButtonContent primary={primary} startIcon={startIcon} endIcon={endIcon} disabled={props.disabled}>
          {children}
        </ButtonContent>
      </button>
    </div>
  );
};

export default React.forwardRef(Button);
