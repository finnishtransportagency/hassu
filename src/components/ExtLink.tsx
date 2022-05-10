import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import classNames from "classnames";
import { styled, Theme } from "@mui/material/styles";
import { MUIStyledCommonProps } from "@mui/system";

interface Props {
  hideIcon?: true;
}

const ExtLink = (
  {
    target = "_blank",
    children,
    className,
    hideIcon,
    as,
    ...props
  }: Omit<
    Props &
      React.PropsWithChildren<
        MUIStyledCommonProps<Theme> &
          React.ClassAttributes<HTMLAnchorElement> &
          React.AnchorHTMLAttributes<HTMLAnchorElement>
      >,
    "ref"
  >,
  ref: React.ForwardedRef<HTMLAnchorElement>
) => (
  <Anchor
    target={!as && as === "a" ? target : undefined}
    as={as}
    ref={ref}
    className={classNames("text-primary-dark", className)}
    {...props}
  >
    {children}
    &nbsp;
    {!hideIcon && <FontAwesomeIcon icon="external-link-alt" size="lg" />}
  </Anchor>
);

const Anchor = styled("a")({ display: "flex", flexFlow: "row wrap" });

export default React.forwardRef(ExtLink);
