import { Vuorovaikutus } from "@services/api";
import React, { ReactElement } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import { examineJulkaisuPaiva } from "src/util/dateUtils";

interface Props {
  vuorovaikutus: Vuorovaikutus | undefined;
}

export default function SuunnitteluvaiheenVuorovaikuttaminen({ vuorovaikutus }: Props): ReactElement {
  const julkinen = !!vuorovaikutus?.julkinen;

  if (!julkinen) {
    return (
      <p>
        Kansalainen pääsee vaikuttamaan väylähankkeen tai väylän suunnitteluun siinä vaiheessa. kun tehdään
        yleissuunnitelmaa ja kun edetään tie- tai ratasuunnitelmaan. Kaikista suunnittelun vaiheista kuulutetaan tai
        ilmoitetaan, jotta asianosaisilla on mahdollisuus kommentoida suunnitelmia.
      </p>
    );
  }

  let { julkaisuPaiva, published } = examineJulkaisuPaiva(julkinen, vuorovaikutus.vuorovaikutusJulkaisuPaiva);

  if (published) {
    return <Notification type={NotificationType.INFO_GREEN}>Vuorovaikutus on julkaistu {julkaisuPaiva}.</Notification>;
  }

  return (
    <Notification type={NotificationType.WARN}>
      Vuorovaikutusta ei ole vielä julkaistu palvelun julkisella puolella. Julkaisu {julkaisuPaiva}.
      {!vuorovaikutus.aineistot ? " Huomaathan, että suunnitelma-aineistot tulee vielä lisätä." : ""}
    </Notification>
  );
}
