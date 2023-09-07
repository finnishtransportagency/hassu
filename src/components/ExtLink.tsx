import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import classNames from "classnames";
import { styled } from "@mui/material/styles";
import { FILE_PATH_DELETED_PREFIX } from "common/links";

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
    href,
    ...props
  }: Props & Omit<React.ComponentProps<typeof Anchor>, "ref">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) => {
  const isDeleted = !!href && href.startsWith(FILE_PATH_DELETED_PREFIX);
  disabled = disabled || isDeleted;
  href = disabled ? undefined : href;
  return (
    <Anchor
      // If element type is not undefined or 'a' (anchor), don't set target attribute
      target={!as || as === "a" ? target : undefined}
      as={as}
      ref={ref}
      className={classNames(disabled ? "text-gray" : "text-primary-dark", className)}
      href={href}
      {...props}
    >
      {children}
      {!hideIcon && <FontAwesomeIcon className="ml-3" icon="external-link-alt" size="1x" />}
    </Anchor>
  );
};

const Anchor = styled("a")({
  display: "inline",
  textAlign: "left",
});

export default React.forwardRef(ExtLink);
