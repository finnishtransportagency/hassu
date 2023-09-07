import { IconProp } from "@fortawesome/fontawesome-svg-core";
import React, { ReactElement } from "react";
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
  external?: boolean;
}

export type ButtonLinkProps = Props &
  Omit<React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>, "ref">;

function ButtonLink(
  { children, startIcon, endIcon, primary, disabled, className, href, external, ...props }: ButtonLinkProps,
  ref: React.ForwardedRef<HTMLAnchorElement>
): ReactElement {
  const buttonClass = primary ? "btn-primary" : "btn";

  return (
    <HassuLink
      ref={ref}
      href={!disabled ? href : undefined}
      className={classNames(buttonClass, className, disabled && "disabled")}
      {...props}
    >
      <ButtonContent primary={primary} startIcon={startIcon} endIcon={external ? "external-link-alt" : endIcon} disabled={disabled}>
        {children}
      </ButtonContent>
    </HassuLink>
  );
}

export default React.forwardRef(ButtonLink);
