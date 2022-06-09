import Section from "@components/layout/Section";
import Notification, { NotificationType } from "@components/notification/Notification";
import React from "react";

type Props = {};

export default function KuulutuksenJaIlmoituksenEsikatselu({}: Props) {
  return (
    <Section>
      <h4 className="vayla-small-title">Kuulutuksen ja ilmoituksen esikatselu</h4>
      <Notification type={NotificationType.INFO_GRAY}>
        Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä.{" "}
      </Notification>
      <p>
        Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on
        haettu Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää
        uusi rivi Lisää uusi -painikkeella.
      </p>
      <p>Jos kuntatiedoissa on virhe, tee korjaus Projektivelhoon.</p>
    </Section>
  );
}
