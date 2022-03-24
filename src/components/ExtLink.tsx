import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import classNames from "classnames";

interface Props {
  useNextLink?: boolean;
  hideIcon?: true;
}

const ExtLink = (
  {
    href,
    children,
    className,
    target = "_blank",
    hideIcon,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>, "ref">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) => {
  return (
    <div>
      <a ref={ref} href={href} target={target} {...props} className={classNames("text-primary-dark", className)}>
        {children}
        &nbsp;
        {!hideIcon && <FontAwesomeIcon icon="external-link-alt" size="lg"></FontAwesomeIcon>}
      </a>
    </div>
  );
};

export default React.forwardRef(ExtLink);
