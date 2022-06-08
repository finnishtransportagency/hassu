import Section from "@components/layout/Section";
import Notification, { NotificationType } from "@components/notification/Notification";
import React from "react";

type Props = {};

export default function SuunnitelmatJaAineistot({}: Props) {
  return (
    <Section>
      <h4 className="vayla-small-title">Suunnitelmat ja aineistot</h4>
      <p>
        Nähtäville asetettava aineisto sekä lausuntapyyntöön liitettävä aineisto tuodaan Projektivelhosta. Nähtäville
        asetettu aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä.
      </p>
      <Notification type={NotificationType.INFO_GRAY}>
        Huomioithan, että suunnitelma-aineistojen tulee täyttää saavutettavuusvaatimukset.
      </Notification>
    </Section>
  );
}
