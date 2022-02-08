import { AloitusKuulutusTila, Projekti } from "@services/api";
import React, { ReactElement } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import { capitalize, replace } from "lodash";
import Button from "@components/button/Button";
import log from "loglevel";

interface Props {
  projekti?: Projekti | null;
}

const muotoilePvm = (pvm: string | null | undefined) => {
  if (!pvm) {
    return;
  }
  return new Date(pvm).toLocaleDateString("fi");
};

export default function AloituskuulutusRO({ projekti }: Props): ReactElement {
  return (
    <>
      {projekti?.aloitusKuulutus?.tila === AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA && (
        <Notification type={NotificationType.WARN}>
          Aloituskuulutus on hyväksyttävänä projektipäälliköllä. Jos kuulutusta tarvitsee muokata, ota yhteys
          projektipäällikköön.
        </Notification>
      )}
      {projekti?.suunnitteluSopimus && (
        <Notification type={NotificationType.INFO_GRAY}>
          Hankkeesta on tehty suunnittelusopimus kunnan kanssa
          <br />
          <br />
          {capitalize(projekti.suunnitteluSopimus.kunta)}
          <br />
          {capitalize(projekti.suunnitteluSopimus.etunimi)} {capitalize(projekti.suunnitteluSopimus.sukunimi)}, puh.{" "}
          {projekti.suunnitteluSopimus.puhelinnumero},{" "}
          {projekti.suunnitteluSopimus.email ? replace(projekti.suunnitteluSopimus.email, "@", "[at]") : ""}
        </Notification>
      )}
      <div className="grid grid-cols-1 md:grid-cols-4 ">
        <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
        <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
        <p className="md:col-span-1">{muotoilePvm(projekti?.aloitusKuulutus?.kuulutusPaiva)}</p>
        <p className="md:col-span-3">{muotoilePvm(projekti?.aloitusKuulutus?.siirtyySuunnitteluVaiheeseen)}</p>
      </div>
      <div className="content">
        <p className="vayla-label">Kuulutuksessa esitettävät yhteystiedot</p>
        {projekti?.aloitusKuulutus?.esitettavatYhteystiedot?.map((yhteistieto, index) => (
          <p key={index}>
            {capitalize(yhteistieto?.etunimi)} {capitalize(yhteistieto?.sukunimi)}, puh. {yhteistieto?.puhelinnumero},{" "}
            {yhteistieto?.sahkoposti ? replace(yhteistieto?.sahkoposti, "@", "[at]") : ""}
          </p>
        ))}
      </div>
      <div className="content">
        <p className="vayla-label">Tiivistetty hankkeen kuvaus ensisijaisella kielellä (suomi)</p>
        <p> {projekti?.aloitusKuulutus?.hankkeenKuvaus} </p>
      </div>
      {projekti?.lisakuulutuskieli && (
        <div className="content">
          <p className="vayla-label">
            Tiivistetty hankkeen kuvaus toissijaisella kielellä ({projekti?.lisakuulutuskieli})
          </p>
          <p>{projekti.aloitusKuulutus?.hankkeenKuvausRuotsi}</p>
        </div>
      )}
      <div className="content">
        <p className="vayla-label">Esikatseltavat tiedostot</p>
        <p>Kuulutus ja ilmoitus ensisijaisella kielellä (suomi)</p>
        <div className="flex flex-col lg:flex-row gap-6">
          <Button type="submit" onClick={() => log.log("esikatsele kuulutus")}>
            Kuulutuksen esikatselu
          </Button>
          <Button type="submit" onClick={() => log.log("esikatsele ilmoitus")}>
            Ilmoituksen esikatselu
          </Button>
        </div>
      </div>
      <div className="content">
        <p>Kuulutus ja ilmoitus toissijaisella kielellä ({projekti?.lisakuulutuskieli})</p>
        <div className="flex flex-col lg:flex-row gap-6">
          <Button type="submit" onClick={() => log.log("esikatsele kuulutus toisella kielellä")}>
            Kuulutukset esikatselu
          </Button>
          <Button type="submit" onClick={() => log.log("esikatsele ilmoitus toisella kielellä")}>
            Ilmoituksen esikatselu
          </Button>
        </div>
      </div>
    </>
  );
};
