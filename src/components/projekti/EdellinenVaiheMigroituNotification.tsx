import Notification, { NotificationType } from "@components/notification/Notification";
import HassuLink from "@components/HassuLink";
import React from "react";
import { TukiEmailLink } from "../EiOikeuksia";

export function EdellinenVaiheMigroituNotification(props: { oid: string | undefined }) {
  return (
    <Notification type={NotificationType.INFO_GRAY}>
      <div>
        Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa. Suunnitelman
        käsittelyä jatketaan järjestelmässä. Tarkastathan ennen kuulutuksen laatimista projektin tiedot ja henkilöt ajantasalle{" "}
        <HassuLink className="text-primary" href={`/yllapito/projekti/${props.oid}`}>
          Projektin tiedot
        </HassuLink>{" "}
        ja{" "}
        <HassuLink className="text-primary" href={`/yllapito/projekti/${props.oid}/henkilot`}>
          Projektin henkilot
        </HassuLink>{" "}
        -sivuilta. Jos projekti on migroitu väärään vaiheeseen, ole yhteydessä pääkäyttäjään <TukiEmailLink />.
      </div>
    </Notification>
  );
}
