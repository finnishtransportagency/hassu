import React, { ReactElement, ReactNode } from "react";
import styles, { notification } from "@styles/notification/Notification.module.css";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";

export enum NotificationType {
  DEFAULT = "default",
  INFO = "info",
  INFO_GREEN = "info-green",
  INFO_GRAY = "info_gray",
  WARN = "warn",
  ERROR = "error",
}

const defaultIcons = new Map<NotificationType, IconProp | undefined>([
  [NotificationType.DEFAULT, undefined],
  [NotificationType.INFO, "info-circle"],
  [NotificationType.INFO_GRAY, "info-circle"],
  [NotificationType.INFO_GREEN, "info-circle"],
  [NotificationType.WARN, "exclamation-circle"],
  [NotificationType.ERROR, "exclamation-triangle"],
]);

interface Props {
  children?: ReactNode;
  type?: NotificationType;
  icon?: IconProp;
  hideIcon?: boolean;
}

export default function Notification({
  children,
  type = NotificationType.DEFAULT,
  icon,
  hideIcon,
  className,
  ...props
}: Props & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>): ReactElement {
  const defaultIcon = type && defaultIcons.get(type);
  const shownIcon = icon || defaultIcon;
  return (
    <div {...props} className={classNames(className, notification, type && styles[type])}>
      {!hideIcon && shownIcon && (
        <FontAwesomeIcon
          icon={shownIcon}
          size="lg"
          className={classNames(styles["start-icon"], type && styles[type])}
        />
      )}
      {children}
    </div>
  );
}
