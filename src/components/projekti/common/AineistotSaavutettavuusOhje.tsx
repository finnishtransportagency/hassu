import React from "react";
import Notification, { NotificationType } from "@components/notification/Notification";

export const AineistotSaavutettavuusOhje = () => (
  <Notification type={NotificationType.INFO_GRAY}>
    <div>
      <p>Huomioithan, että suunnitelma-aineistojen tulee täyttää saavutettavuusvaatimukset, pois luettuna kartta-aineisto.</p>
      <p>Huomioithan myös, että nähtäville ei saa asettaa henkilötietoja sisältävää aineistoa.</p>
    </div>
  </Notification>
);
