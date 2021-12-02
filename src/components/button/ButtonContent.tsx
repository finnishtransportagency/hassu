import React, { ReactElement, ReactNode } from "react";
import { content, overlay } from "@styles/button/ButtonContent.module.css";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";

interface Props {
  primary?: boolean;
  startIcon?: IconProp;
  endIcon?: IconProp;
  children?: ReactNode;
  disabled?: boolean;
}

export default function ButtonContent({ primary, startIcon, endIcon, disabled, children }: Props): ReactElement {
  return (
    <div className={classNames(primary && !disabled && overlay)}>
      <div className={content}>
        {startIcon && <FontAwesomeIcon icon={startIcon} className="mr-2 mb-px" />}
        {children}
        {endIcon && <FontAwesomeIcon icon={endIcon} className="ml-2 mb-px" />}
      </div>
    </div>
  );
}
