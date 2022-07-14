import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import classNames from "classnames";
import { styled } from "@mui/material/styles";

interface Props {
  hideIcon?: boolean;
  disabled?: boolean;
}

const ExtLink = (
  {
    target = "_blank",
    children,
    className,
    hideIcon,
    disabled,
    as,
    ...props
  }: Props & Omit<React.ComponentProps<typeof Anchor>, "ref">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) => (
  <Anchor
    // If element type is not undefined or 'a' (anchor), don't set target attribute
    target={!as || as === "a" ? target : undefined}
    as={as}
    ref={ref}
    className={classNames(disabled ? "text-gray" : "text-primary-dark", className)}
    {...props}
  >
    {children}
    {!hideIcon && <FontAwesomeIcon className="ml-3" icon="external-link-alt" size="lg" />}
  </Anchor>
);

const Anchor = styled("a")({
  display: "inline",
  textAlign: "left",
});

export default React.forwardRef(ExtLink);
