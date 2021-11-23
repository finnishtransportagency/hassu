import { IconProp } from "@fortawesome/fontawesome-svg-core";
import Link from "next/link";
import React, { ReactElement } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { content, overlay, wrapper } from "@styles/button/Button.module.css";

interface Props {
  primary?: boolean;
  children?: React.ReactNode;
  startIcon?: IconProp;
  endIcon?: IconProp;
  link?: { href: string; external?: boolean };
}

export default function Button({
  children,
  link,
  startIcon,
  endIcon,
  primary,
  className,
  ...buttonProps
}: Props & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>): ReactElement {
  const buttonClass = primary ? "btn-primary" : "btn";
  const childrenWithIcons = (
    <div className={primary ? overlay : ""}>
      <div className={content}>
        {startIcon && <FontAwesomeIcon icon={startIcon} className="mr-2 mb-px" />}
        {children}
        {endIcon && <FontAwesomeIcon icon={endIcon} className="ml-2 mb-px" />}
      </div>
    </div>
  );

  return !link ? (
    <div className={wrapper + " " + className}>
      <button className={buttonClass} {...buttonProps}>
        {childrenWithIcons}
      </button>
    </div>
  ) : !link.external ? (
    <div className={wrapper}>
      <Link href={link.href}>
        <a className={buttonClass}>{childrenWithIcons}</a>
      </Link>
    </div>
  ) : (
    <div className={wrapper}>
      <a className={buttonClass} href={link.href}>
        {childrenWithIcons}
      </a>
    </div>
  );
}
