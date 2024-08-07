import React, { ComponentProps, MouseEventHandler, ReactElement, ReactNode, useCallback, useState } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import CloseIcon from "@mui/icons-material/Close";
import classNames from "classnames";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { experimental_sx as sx, styled } from "@mui/system";
import useTranslation from "next-translate/useTranslation";

export enum NotificationType {
  DEFAULT = "default",
  INFO = "info",
  INFO_GREEN = "info-green",
  INFO_GRAY = "info-gray",
  WARN = "warn",
  ERROR = "error",
}

const FontAwesomeStartIcon = styled(({ size = "lg", className, ...props }: FontAwesomeIconProps) => (
  <FontAwesomeIcon size={size} className={classNames(className, "notification-icon")} {...props} />
))(IconStyles());
const MuiStartIcon = styled(({ className, ...props }: ComponentProps<typeof InfoOutlinedIcon>) => (
  <InfoOutlinedIcon className={classNames(className, "notification-icon")} {...props} />
))(IconStyles());

function IconStyles() {
  return sx({
    marginRight: 5,
    marginTop: 0.5,
  });
}

const defaultIcons: Record<NotificationType, ReactElement | null> = {
  [NotificationType.DEFAULT]: null,
  [NotificationType.INFO]: <FontAwesomeStartIcon icon="info-circle" />,
  [NotificationType.INFO_GRAY]: <FontAwesomeStartIcon icon="info-circle" />,
  [NotificationType.INFO_GREEN]: <MuiStartIcon />,
  [NotificationType.WARN]: <FontAwesomeStartIcon icon="exclamation-circle" />,
  [NotificationType.ERROR]: <FontAwesomeStartIcon icon="exclamation-triangle" />,
};

interface Props {
  children?: ReactNode;
  type?: NotificationType;
  icon?: IconProp;
  hideIcon?: boolean;
  closable?: boolean;
  open?: boolean;
  onClose?: MouseEventHandler;
}

const NotificationContent = styled("div")(
  sx({
    display: "flex",
    flexDirection: "row",
    paddingLeft: "7px",
    "& p": {
      marginBottom: 0,
    },
    ul: {
      listStyleType: "disc",
      li: {
        paddingLeft: "1rem",
        "&:not(:last-child)": {
          marginBottom: "1rem",
        },
        "&::marker": {
          content: "'•'",
          textAlign: "left",
          fontSize: "1.125rem",
        },
      },
    },
  })
);

const Notification = styled(
  ({
    children,
    type = NotificationType.DEFAULT,
    icon,
    hideIcon,
    closable = false,
    className,
    open: controlledOpen,
    onClose: controlledOnClose,
    ...props
  }: Props & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>): ReactElement => {
    const { t } = useTranslation("common");
    const isControlled = controlledOpen !== undefined;
    const defaultIcon = type && defaultIcons[type];
    const iconComponent = icon ? <FontAwesomeStartIcon icon={icon} /> : defaultIcon;
    const [uncontrolledOpen, uncontrolledSetOpen] = useState(true);
    const uncontrolledOnClose = useCallback(() => uncontrolledSetOpen(false), []);

    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const onClose = isControlled ? controlledOnClose : uncontrolledOnClose;

    if (!open) {
      return <></>;
    }

    return (
      <div {...props} className={classNames(className, type)}>
        {closable && (
          <CloseButton type="button" onClick={onClose} aria-label={t("common:sulje")}>
            <CloseIcon />
          </CloseButton>
        )}
        <NotificationContent>
          {!hideIcon && iconComponent}
          <div>{children}</div>
        </NotificationContent>
      </div>
    );
  }
)(
  sx({
    borderColor: "#999999",
    borderStyle: "solid",
    borderWidth: "1px",
    backgroundColor: "#F8F8F8",
    padding: 5,
    fontSize: "1rem",
    lineHeight: 1.5,
    "& .notification-icon": {
      marginRight: 5,
      marginTop: 0.5,
    },
    "&.default": {
      borderColor: "#999999",
      backgroundColor: "#F8F8F8",
      "& .notification-icon": {
        color: "#0099ff",
      },
    },
    "&.info": {
      borderColor: "#49C2F1",
      backgroundColor: "#EDFAFF",
      "& .notification-icon": {
        color: "#0064af",
      },
    },
    "&.info-gray": {
      borderColor: "#999999",
      backgroundColor: "#F8F8F8",
      "& .notification-icon": {
        color: "#0064af",
      },
    },
    "&.info-green": {
      borderColor: "#54AC54",
      backgroundColor: "#F5FFEF",
      "& .notification-icon": {
        color: "#54AC54",
      },
    },
    "&.warn": {
      borderColor: "#F0AD4E",
      backgroundColor: "#FFF6E8",
      "& .notification-icon": {
        color: "#F0AD4E",
      },
    },
    "&.error": {
      borderColor: "#FF70A6",
      backgroundColor: "#FFF8FB",
      "& .notification-icon": {
        color: "#FF70A6",
      },
    },
  })
);

const CloseButton = styled("button")(sx({ float: "right", display: "block" }));

export default Notification;
