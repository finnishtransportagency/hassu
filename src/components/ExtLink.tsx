import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import styles from "@styles/ExtLink.module.css";
import classNames from "classnames";

interface Props {
  useNextLink?: boolean;
}

const ExtLink = (
  {
    href,
    children,
    className,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>, "ref">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) => {
  return (
    <div>
      <a ref={ref} href={href} {...props} className={classNames(styles["ext-link"], className)}>
        {children}
        &nbsp;
        <FontAwesomeIcon icon="external-link-alt" size="lg"></FontAwesomeIcon>
      </a>
    </div>
  );
};

export default React.forwardRef(ExtLink);
