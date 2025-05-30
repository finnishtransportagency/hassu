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
  Omit<React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>, "ref" | "type">;

function DownloadButtonLink(
  { children, startIcon, endIcon, primary, disabled, className, href, external, style, ...props }: ButtonLinkProps,
  ref: React.ForwardedRef<HTMLAnchorElement>
): ReactElement {
  const buttonClass = primary ? "btn-primary" : "btn";

  return (
    <HassuLink
      ref={ref}
      href={!disabled ? href : undefined}
      className={classNames(buttonClass, className, disabled && "disabled")}
      style={{ display: "inline-block", ...style }}
      type="button"
      {...props}
    >
      <ButtonContent primary={primary} startIcon={startIcon} endIcon={external ? "external-link-alt" : endIcon} disabled={disabled}>
        {children}{" "}
        <img
          src="/assets/download.svg"
          style={{ marginBottom: "5px", marginLeft: "5px", display: "inline", width: "25px", height: "22px" }}
          alt="Liite"
        />
      </ButtonContent>
    </HassuLink>
  );
}

export default React.forwardRef(DownloadButtonLink);
