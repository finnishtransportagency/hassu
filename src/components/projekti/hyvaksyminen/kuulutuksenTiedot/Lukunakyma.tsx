import { HyvaksymisVaiheJulkaisu, HyvaksymisVaiheTila } from "@services/api";
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
  hyvaksymisVaiheJulkaisu?: HyvaksymisVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
}

export default function AloituskuulutusLukunakyma({ hyvaksymisVaiheJulkaisu, projekti }: Props): ReactElement {
  if (!hyvaksymisVaiheJulkaisu || !projekti) {
    return <></>;
  }

  let { kuulutusPaiva, published } = examineKuulutusPaiva(hyvaksymisVaiheJulkaisu.kuulutusPaiva);
  let hyvaksymisVaiheHref: string | undefined;
  if (published) {
    hyvaksymisVaiheHref =
      window.location.protocol + "//" + window.location.host + "/suunnitelma/" + projekti.oid + "/nahtavillaolo";
  }
  // const vuorovaikutusYhteysHenkilot: ProjektiKayttaja[] = hyvaksymisVaiheJulkaisu.kuulutusYhteysHenkilot
  //   ? hyvaksymisVaiheJulkaisu.kuulutusYhteysHenkilot
  //       .map((hlo) => {
  //         const yhteysHenkiloTietoineen: ProjektiKayttaja | undefined = (projekti?.kayttoOikeudet || []).find(
  //           (ko) => ko.kayttajatunnus === hlo
  //         );
  //         if (!yhteysHenkiloTietoineen) {
  //           return {} as ProjektiKayttaja;
  //         }
  //         return yhteysHenkiloTietoineen as ProjektiKayttaja;
  //       })
  //       .filter((pk) => pk.nimi)
  //   : [];

  // const getPdft = (kieli: Kieli | undefined | null) => {
  //   if (!hyvaksymisVaiheJulkaisu || !hyvaksymisVaiheJulkaisu.hyvaksymisVaihePDFt || !kieli) {
  //     return undefined;
  //   }
  //   return hyvaksymisVaiheJulkaisu.hyvaksymisVaihePDFt[kieli];
  // };

  // const parseFilename = (path: string) => {
  //   return path.substring(path.lastIndexOf("/") + 1);
  // };

  // const ensisijaisetPDFt = getPdft(hyvaksymisVaiheJulkaisu.kielitiedot?.ensisijainenKieli);
  // const toissijaisetPDFt = getPdft(hyvaksymisVaiheJulkaisu.kielitiedot?.toissijainenKieli);

  return (
    <>
      <Section>
        {!published && hyvaksymisVaiheJulkaisu.tila === HyvaksymisVaiheTila.HYVAKSYTTY && (
          <Notification type={NotificationType.WARN}>
            Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä {kuulutusPaiva}
          </Notification>
        )}
        {published && hyvaksymisVaiheJulkaisu.tila === HyvaksymisVaiheTila.HYVAKSYTTY && (
          <Notification type={NotificationType.INFO_GREEN}>
            Kuulutus nähtäville asettamisesta on julkaistu {kuulutusPaiva}. Projekti näytetään kuulutuspäivästä lasketun
            määräajan jälkeen palvelun julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy{" "}
            <FormatDate date={hyvaksymisVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />.
          </Notification>
        )}
        {hyvaksymisVaiheJulkaisu.tila !== HyvaksymisVaiheTila.HYVAKSYTTY && (
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
            <FormatDate date={hyvaksymisVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />
          </p>
        </div>
      </Section>
      <Section>
        <SectionContent>
          <p className="vayla-label mb-5">Kuulutuksen yhteyshenkilöt</p>
          {hyvaksymisVaiheJulkaisu.kuulutusYhteystiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {capitalize(yhteystieto.etunimi)} {capitalize(yhteystieto.sukunimi)}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto?.sahkoposti ? replace(yhteystieto?.sahkoposti, "@", "[at]") : ""} ({yhteystieto.organisaatio}
              )
            </p>
          ))}
          {/* {vuorovaikutusYhteysHenkilot.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {yhteystieto.nimi}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto.email ? replace(yhteystieto.email, "@", "[at]") : ""} ({yhteystieto.organisaatio})
            </p>
          ))} */}
        </SectionContent>
        <SectionContent>
          <p className="vayla-label mb-5">Kuulutuksen yhteyshenkilöt</p>
          {!published && (
            <p>Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on {kuulutusPaiva}.</p>
          )}
          {published && <ExtLink href={hyvaksymisVaiheHref}>Kuulutus palvelun julkisella puolella</ExtLink>}
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Ladattavat kuulutukset ja ilmoitukset</p>
          <p>
            Kuulutus ja ilmoitus ensisijaisella kielellä (
            {lowerCase(hyvaksymisVaiheJulkaisu.kielitiedot?.ensisijainenKieli)})
          </p>
        </SectionContent>
      </Section>
      <IlmoituksenVastaanottajatLukutila hyvaksymisVaiheJulkaisu={hyvaksymisVaiheJulkaisu} />
      <Section>
        {/* {hyvaksymisVaiheJulkaisu.tila !== HyvaksymisVaiheTila.HYVAKSYTTY && (
          <NahtavillaoloPDFEsikatselu oid={oid} hyvaksymisVaihe={hyvaksymisVaihe} />
        )} */}
      </Section>
    </>
  );
}
