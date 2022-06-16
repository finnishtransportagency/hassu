import { NahtavillaoloVaiheJulkaisu, NahtavillaoloVaiheTila, Kieli, ProjektiKayttaja } from "@services/api";
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
import { Link } from "@mui/material";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
interface Props {
  nahtavillaoloVaiheJulkaisu?: NahtavillaoloVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
}

export default function AloituskuulutusLukunakyma({ nahtavillaoloVaiheJulkaisu, projekti }: Props): ReactElement {
  if (!nahtavillaoloVaiheJulkaisu || !projekti) {
    return <></>;
  }

  let { kuulutusPaiva, published } = examineKuulutusPaiva(nahtavillaoloVaiheJulkaisu.kuulutusPaiva);
  let nahtavillaoloVaiheHref: string | undefined;
  if (published) {
    nahtavillaoloVaiheHref =
      window.location.protocol + "//" + window.location.host + "/suunnitelma/" + projekti.oid + "/nahtavillaolo";
  }
  const vuorovaikutusYhteysHenkilot: ProjektiKayttaja[] = nahtavillaoloVaiheJulkaisu.kuulutusYhteysHenkilot
    ? nahtavillaoloVaiheJulkaisu.kuulutusYhteysHenkilot
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

  const getPdft = (kieli: Kieli | undefined | null) => {
    if (!nahtavillaoloVaiheJulkaisu || !nahtavillaoloVaiheJulkaisu.nahtavillaoloPDFt || !kieli) {
      return undefined;
    }
    return nahtavillaoloVaiheJulkaisu.nahtavillaoloPDFt[kieli];
  };

  const parseFilename = (path: string) => {
    return path.substring(path.lastIndexOf("/") + 1);
  };

  const ensisijaisetPDFt = getPdft(nahtavillaoloVaiheJulkaisu.kielitiedot?.ensisijainenKieli);
  const toissijaisetPDFt = getPdft(nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli);

  return (
    <>
      <Section>
        {!published && nahtavillaoloVaiheJulkaisu.tila === NahtavillaoloVaiheTila.HYVAKSYTTY && (
          <Notification type={NotificationType.WARN}>
            Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä {kuulutusPaiva}
          </Notification>
        )}
        {published && nahtavillaoloVaiheJulkaisu.tila === NahtavillaoloVaiheTila.HYVAKSYTTY && (
          <Notification type={NotificationType.INFO_GREEN}>
            Kuulutus nähtäville asettamisesta on julkaistu {kuulutusPaiva}. Projekti näytetään kuulutuspäivästä lasketun
            määräajan jälkeen palvelun julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy{" "}
            <FormatDate date={nahtavillaoloVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />.
          </Notification>
        )}
        {nahtavillaoloVaiheJulkaisu.tila !== NahtavillaoloVaiheTila.HYVAKSYTTY && (
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
            <FormatDate date={nahtavillaoloVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />
          </p>
        </div>
        <div>
          <p className="vayla-label">
            Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (
            {lowerCase(nahtavillaoloVaiheJulkaisu.kielitiedot?.ensisijainenKieli)})
          </p>
          <p>
            {nahtavillaoloVaiheJulkaisu.kielitiedot?.ensisijainenKieli === Kieli.SUOMI
              ? nahtavillaoloVaiheJulkaisu.hankkeenKuvaus?.SUOMI
              : nahtavillaoloVaiheJulkaisu.hankkeenKuvaus?.RUOTSI}
          </p>
        </div>
        {nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli && (
          <div className="content">
            <p className="vayla-label">
              Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (
              {lowerCase(nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli)})
            </p>
            <p>
              {nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli === Kieli.SUOMI
                ? nahtavillaoloVaiheJulkaisu.hankkeenKuvaus?.SUOMI
                : nahtavillaoloVaiheJulkaisu.hankkeenKuvaus?.RUOTSI}
            </p>
          </div>
        )}
      </Section>
      <Section>
        <SectionContent>
          <p className="vayla-label mb-5">Kuulutuksen yhteyshenkilöt</p>
          {nahtavillaoloVaiheJulkaisu.kuulutusYhteystiedot?.map((yhteystieto, index) => (
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
          <p className="vayla-label mb-5">Kuulutuksen yhteyshenkilöt</p>
          {!published && (
            <p>Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on {kuulutusPaiva}.</p>
          )}
          {published && <ExtLink href={nahtavillaoloVaiheHref}>Kuulutus palvelun julkisella puolella</ExtLink>}
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Ladattavat kuulutukset ja ilmoitukset</p>
          <p>
            Kuulutus ja ilmoitus ensisijaisella kielellä (
            {lowerCase(nahtavillaoloVaiheJulkaisu.kielitiedot?.ensisijainenKieli)})
          </p>
          {ensisijaisetPDFt && (
            <div className="flex flex-col mb-4">
              <div>
                <Link underline="none" href={ensisijaisetPDFt.nahtavillaoloPDFPath} target="_blank">
                  {parseFilename(ensisijaisetPDFt.nahtavillaoloPDFPath)}
                </Link>
              </div>
              <div>
                <Link underline="none" href={ensisijaisetPDFt.nahtavillaoloIlmoitusPDFPath} target="_blank">
                  {parseFilename(ensisijaisetPDFt.nahtavillaoloIlmoitusPDFPath)}
                </Link>
              </div>
              <div>
                <Link
                  underline="none"
                  href={ensisijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath}
                  target="_blank"
                >
                  {parseFilename(ensisijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath)}
                </Link>
              </div>
            </div>
          )}

          {nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli && (
            <div className="content mb-4">
              <p>
                Kuulutus ja ilmoitus toissijaisella kielellä (
                {lowerCase(nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli)})
              </p>
              {toissijaisetPDFt && (
                <div className="flex flex-col">
                  <div>
                    <Link underline="none" href={toissijaisetPDFt.nahtavillaoloPDFPath} target="_blank">
                      {parseFilename(toissijaisetPDFt.nahtavillaoloPDFPath)}
                    </Link>
                  </div>
                  <div>
                    <Link underline="none" href={toissijaisetPDFt.nahtavillaoloIlmoitusPDFPath} target="_blank">
                      {parseFilename(toissijaisetPDFt.nahtavillaoloIlmoitusPDFPath)}
                    </Link>
                  </div>
                  <div>
                    <Link
                      underline="none"
                      href={toissijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath}
                      target="_blank"
                    >
                      {parseFilename(toissijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath)}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionContent>
      </Section>
      <IlmoituksenVastaanottajatLukutila nahtavillaoloVaiheJulkaisu={nahtavillaoloVaiheJulkaisu} />
      <Section>
        {/* {nahtavillaoloVaiheJulkaisu.tila !== NahtavillaoloVaiheTila.HYVAKSYTTY && (
          <NahtavillaoloPDFEsikatselu oid={oid} nahtavillaoloVaihe={nahtavillaoloVaihe} />
        )} */}
      </Section>
    </>
  );
}
