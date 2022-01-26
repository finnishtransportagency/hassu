import React, { ReactElement } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "@styles/button/IconButton.module.css";
import classNames from "classnames";

interface Props {
  icon: IconProp;
}

function IconButton(
  {
    icon,
    className,
    onClick,
    ...buttonProps
  }: Props & Omit<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, "ref">,
  ref: React.ForwardedRef<HTMLButtonElement>
): ReactElement {
  return (
    <button
      className={classNames(styles["icon-button"], className)}
      ref={ref}
      // Work around for click events bubbling from children even if button is disabled
      // See https://github.com/facebook/react/issues/7711
      onClick={(event) => {
        if (event.currentTarget.matches(":disabled")) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...buttonProps}
    >
      <FontAwesomeIcon icon={icon} size="lg" />
    </button>
  );
}

export default React.forwardRef(IconButton);
