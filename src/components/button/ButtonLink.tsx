import { IconProp } from "@fortawesome/fontawesome-svg-core";
import React, { ReactElement } from "react";
import { wrapper } from "@styles/button/ButtonWrapper.module.css";
import classNames from "classnames";
import HassuLink from "@components/HassuLink";
import ButtonContent from "./ButtonContent";

interface Props {
  primary?: boolean;
  children?: React.ReactNode;
  startIcon?: IconProp;
  endIcon?: IconProp;
  disabled?: boolean;
  useNextLink?: boolean;
}

function ButtonLink(
  {
    children,
    startIcon,
    endIcon,
    primary,
    disabled,
    className,
    href,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>, "ref">,
  ref: React.ForwardedRef<HTMLAnchorElement>
): ReactElement {
  const buttonClass = primary ? "btn-primary" : "btn";

  return (
    <div className={classNames(wrapper, className)}>
      <HassuLink
        ref={ref}
        href={!disabled ? href : undefined}
        className={classNames(buttonClass, disabled && "disabled")}
        {...props}
      >
        <ButtonContent primary={primary} startIcon={startIcon} endIcon={endIcon} disabled={disabled}>
          {children}
        </ButtonContent>
      </HassuLink>
    </div>
  );
}

export default React.forwardRef(ButtonLink);
