import { AloitusKuulutusJulkaisu, AloitusKuulutusTila, Kieli } from "@services/api";
import React, { ReactElement, useRef } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import { capitalize, replace, lowerCase } from "lodash";
import Button from "@components/button/Button";
import log from "loglevel";

interface Props {
  oid?: string;
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
}

export default function AloituskuulutusRO({ aloituskuulutusjulkaisu, oid }: Props): ReactElement {
  const pdfFormRef = useRef<HTMLFormElement | null>(null);

  const muotoilePvm = (pvm: string | null | undefined) => {
    if (!pvm) {
      return;
    }
    return new Date(pvm).toLocaleDateString("fi");
  };

  const naytaEsikatselu = async (action: string, kieli: Kieli | undefined | null) => {
    log.info("Näytä esikatselu ", kieli);
    if (!action) {
      return;
    }

    if (pdfFormRef.current) {
      pdfFormRef.current.action = action + "?kieli=" + kieli;
      pdfFormRef.current?.submit();
    }
  };

  return (
    <>
      {aloituskuulutusjulkaisu?.tila === AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA && (
        <Notification type={NotificationType.WARN}>
          Aloituskuulutus on hyväksyttävänä projektipäälliköllä. Jos kuulutusta tarvitsee muokata, ota yhteys
          projektipäällikköön.
        </Notification>
      )}
      {aloituskuulutusjulkaisu?.suunnitteluSopimus && (
        <Notification type={NotificationType.INFO_GRAY}>
          Hankkeesta on tehty suunnittelusopimus kunnan kanssa
          <br />
          <br />
          {capitalize(aloituskuulutusjulkaisu?.suunnitteluSopimus.kunta)}
          <br />
          {capitalize(aloituskuulutusjulkaisu.suunnitteluSopimus.etunimi)}{" "}
          {capitalize(aloituskuulutusjulkaisu.suunnitteluSopimus.sukunimi)}, puh.{" "}
          {aloituskuulutusjulkaisu.suunnitteluSopimus.puhelinnumero},{" "}
          {aloituskuulutusjulkaisu.suunnitteluSopimus.email
            ? replace(aloituskuulutusjulkaisu.suunnitteluSopimus.email, "@", "[at]")
            : ""}
        </Notification>
      )}
      <div className="grid grid-cols-1 md:grid-cols-4 ">
        <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
        <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
        <p className="md:col-span-1">{muotoilePvm(aloituskuulutusjulkaisu?.kuulutusPaiva)}</p>
        <p className="md:col-span-3">{muotoilePvm(aloituskuulutusjulkaisu?.siirtyySuunnitteluVaiheeseen)}</p>
      </div>
      <div className="content">
        <p className="vayla-label">Kuulutuksessa esitettävät yhteystiedot</p>
        {aloituskuulutusjulkaisu?.yhteystiedot?.map((yhteistieto, index) => (
          <p key={index}>
            {capitalize(yhteistieto?.etunimi)} {capitalize(yhteistieto?.sukunimi)}, puh. {yhteistieto?.puhelinnumero},{" "}
            {yhteistieto?.sahkoposti ? replace(yhteistieto?.sahkoposti, "@", "[at]") : ""}
          </p>
        ))}
      </div>
      <div className="content">
        <p className="vayla-label">
          Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä. (
          {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli)})
        </p>
        <p>
          {aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli === Kieli.SUOMI
            ? aloituskuulutusjulkaisu?.hankkeenKuvaus
            : aloituskuulutusjulkaisu?.hankkeenKuvausRuotsi}
        </p>
      </div>
      {aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli && (
        <div className="content">
          <p className="vayla-label">
            Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä. (
            {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli)})
          </p>
          <p>
            {aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli === Kieli.SUOMI
              ? aloituskuulutusjulkaisu?.hankkeenKuvaus
              : aloituskuulutusjulkaisu?.hankkeenKuvausRuotsi}
          </p>
        </div>
      )}
      <div className="content">
        <p className="vayla-label">Esikatseltavat tiedostot</p>
        <p>
          Kuulutus ja ilmoitus ensisijaisella kielellä (
          {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli)})
        </p>
        <div className="flex flex-col lg:flex-row gap-6">
          <Button
            type="submit"
            onClick={() =>
              naytaEsikatselu(
                `/api/projekti/${oid}/aloituskuulutus/pdf`,
                aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli
              )
            }
          >
            Kuulutuksen esikatselu
          </Button>
          <Button
            type="submit"
            onClick={() =>
              naytaEsikatselu(
                `/api/projekti/${oid}/aloituskuulutus/ilmoitus/pdf`,
                aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli
              )
            }
          >
            Ilmoituksen esikatselu
          </Button>
        </div>
      </div>
      {aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli && (
        <div className="content">
          <p>
            Kuulutus ja ilmoitus toissijaisella kielellä (
            {lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli)})
          </p>
          <div className="flex flex-col lg:flex-row gap-6">
            <Button
              type="submit"
              onClick={() =>
                naytaEsikatselu(
                  `/api/projekti/${oid}/aloituskuulutus/pdf`,
                  aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli
                )
              }
            >
              Kuulutukset esikatselu
            </Button>
            <Button
              type="submit"
              onClick={() =>
                naytaEsikatselu(
                  `/api/projekti/${oid}/aloituskuulutus/ilmoitus/pdf`,
                  aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli
                )
              }
            >
              Ilmoituksen esikatselu
            </Button>
          </div>
        </div>
      )}
      <form ref={pdfFormRef} target="_blank" method="POST">
        <input type="hidden" name="naytaEsikatselu" value="" />
      </form>
    </>
  );
}
