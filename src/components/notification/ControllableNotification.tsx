import React, { ReactElement, ReactNode } from "react";
import styles from "@styles/notification/Notification.module.css";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
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
  [NotificationType.WARN, "exclamation-circle"],
  [NotificationType.ERROR, "exclamation-triangle"],
]);

interface Props {
  children?: ReactNode;
  type?: NotificationType;
  icon?: IconProp;
  hideIcon?: boolean;
  closable?: boolean;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Notification({
  children,
  type = NotificationType.DEFAULT,
  icon,
  hideIcon,
  closable = false,
  className,
  open,
  setOpen,
  ...props
}: Props & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>): ReactElement {
  const defaultIcon = type && defaultIcons.get(type);
  const shownIcon = icon || defaultIcon;

  if (!open) {
    return <></>;
  }
  return (
    <div {...props} className={classNames(className, styles.notification, type && styles[type])}>
      {closable && (
        <button onClick={() => setOpen(false)} style={{ float: "right", display: "block" }}>
          <CloseIcon />
        </button>
      )}
      <div className="flex flex-row">
        {!hideIcon && shownIcon && (
          <FontAwesomeIcon icon={shownIcon} size="lg" className={classNames(styles["start-icon"], type && styles[type])} />
        )}
        {!hideIcon && type == NotificationType.INFO_GREEN && (
          <InfoOutlinedIcon className={classNames(styles["start-icon"], type && styles[type])} />
        )}
        {children}
      </div>
    </div>
  );
}
