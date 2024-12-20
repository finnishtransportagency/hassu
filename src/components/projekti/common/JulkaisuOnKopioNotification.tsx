import React from "react";
import Notification, { NotificationType } from "@components/notification/Notification";

export function JulkaisuOnKopioNotification() {
  return (
    <Notification type={NotificationType.INFO_GRAY}>
      Tämä julkaisu on laadittu toisella projektilla. Katso Liittyvät suunnitelmat -osio Projektin tiedot -sivulta.
    </Notification>
  );
}
