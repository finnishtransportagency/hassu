import { HyvaksymisPaatosVaiheJulkaisu, HyvaksymisPaatosVaiheTila, ProjektiKayttaja } from "@services/api";
import React, { ReactElement } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import capitalize from "lodash/capitalize";
import replace from "lodash/replace";
import lowerCase from "lodash/lowerCase";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import IlmoituksenVastaanottajatLukutila from "./IlmoituksenVastaanottajatLukutila";
import ExtLink from "@components/ExtLink";
// import { Link } from "@mui/material";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
interface Props {
  hyvaksymisPaatosVaiheJulkaisu?: HyvaksymisPaatosVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
}

export default function AloituskuulutusLukunakyma({ hyvaksymisPaatosVaiheJulkaisu, projekti }: Props): ReactElement {
  if (!hyvaksymisPaatosVaiheJulkaisu || !projekti) {
    return <></>;
  }

  let { kuulutusPaiva, published } = examineKuulutusPaiva(hyvaksymisPaatosVaiheJulkaisu.kuulutusPaiva);
  let hyvaksymisPaatosVaiheHref: string | undefined;
  if (published) {
    hyvaksymisPaatosVaiheHref =
      window.location.protocol + "//" + window.location.host + "/suunnitelma/" + projekti.oid + "/hyvaksymispaatos";
  }
  const vuorovaikutusYhteysHenkilot: ProjektiKayttaja[] = hyvaksymisPaatosVaiheJulkaisu.kuulutusYhteysHenkilot
    ? hyvaksymisPaatosVaiheJulkaisu.kuulutusYhteysHenkilot
        .map((hlo) => {
          const yhteysHenkiloTietoineen: ProjektiKayttaja | undefined = (projekti?.kayttoOikeudet || []).find(
            (ko) => ko.kayttajatunnus === hlo
          );
          if (!yhteysHenkiloTietoineen) {
            return {} as ProjektiKayttaja;
          }
          return yhteysHenkiloTietoineen as ProjektiKayttaja;
        })
        .filter((pk) => pk.nimi)
    : [];

  // const getPdft = (kieli: Kieli | undefined | null) => {
  //   if (!hyvaksymisPaatosJulkaisu || !hyvaksymisPaatosJulkaisu.hyvaksymisPaatosPDFt || !kieli) {
  //     return undefined;
  //   }
  //   return hyvaksymisPaatosVaiheJulkaisu.hyvaksymisPaatosVaihePDFt[kieli];
  // };

  // const parseFilename = (path: string) => {
  //   return path.substring(path.lastIndexOf("/") + 1);
  // };

  // const ensisijaisetPDFt = getPdft(hyvaksymisPaatosVaiheJulkaisu.kielitiedot?.ensisijainenKieli);
  // const toissijaisetPDFt = getPdft(hyvaksymisPaatosVaiheJulkaisu.kielitiedot?.toissijainenKieli);

  return (
    <>
      <Section>
        {!published && hyvaksymisPaatosVaiheJulkaisu.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
          <Notification type={NotificationType.WARN}>
            Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä {kuulutusPaiva}
          </Notification>
        )}
        {published && hyvaksymisPaatosVaiheJulkaisu.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
          <Notification type={NotificationType.INFO_GREEN}>
            Kuulutus nähtäville asettamisesta on julkaistu {kuulutusPaiva}. Projekti näytetään kuulutuspäivästä lasketun
            määräajan jälkeen palvelun julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy{" "}
            <FormatDate date={hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />.
          </Notification>
        )}
        {hyvaksymisPaatosVaiheJulkaisu.tila !== HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
          <Notification type={NotificationType.WARN}>
            Kuulutus nähtäville asettamisesta odottaa hyväksyntää. Tarkasta kuulutus ja a) hyväksy tai b) palaute
            kuulutus korjattavaksi, jos havaitset puutteita tai virheen.
          </Notification>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
          <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
          <p className="md:col-span-1 mb-0">{kuulutusPaiva}</p>
          <p className="md:col-span-3 mb-0">
            <FormatDate date={hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />
          </p>
        </div>
      </Section>
      <Section>
        <SectionContent>
          <p className="vayla-label mb-5">Kuulutuksen yhteyshenkilöt</p>
          {hyvaksymisPaatosVaiheJulkaisu.kuulutusYhteystiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {capitalize(yhteystieto.etunimi)} {capitalize(yhteystieto.sukunimi)}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto?.sahkoposti ? replace(yhteystieto?.sahkoposti, "@", "[at]") : ""} ({yhteystieto.organisaatio}
              )
            </p>
          ))}
          {vuorovaikutusYhteysHenkilot.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {yhteystieto.nimi}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto.email ? replace(yhteystieto.email, "@", "[at]") : ""} ({yhteystieto.organisaatio})
            </p>
          ))}
        </SectionContent>
        <SectionContent>
          <p className="vayla-label mb-5">Kuulutus julkisella puolella</p>
          {!published && (
            <p>Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on {kuulutusPaiva}.</p>
          )}
          {published && <ExtLink href={hyvaksymisPaatosVaiheHref}>Kuulutus palvelun julkisella puolella</ExtLink>}
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Ladattavat kuulutukset ja ilmoitukset</p>
          <p>
            Kuulutus ja ilmoitus ensisijaisella kielellä (
            {lowerCase(hyvaksymisPaatosVaiheJulkaisu.kielitiedot?.ensisijainenKieli)})
          </p>
        </SectionContent>
      </Section>
      <IlmoituksenVastaanottajatLukutila hyvaksymisPaatosVaiheJulkaisu={hyvaksymisPaatosVaiheJulkaisu} />
      <Section>
        {/* {hyvaksymisPaatosVaiheJulkaisu.tila !== HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
          <NahtavillaoloPDFEsikatselu oid={oid} hyvaksymisPaatosVaihe={hyvaksymisPaatosVaihe} />
        )} */}
      </Section>
    </>
  );
}
