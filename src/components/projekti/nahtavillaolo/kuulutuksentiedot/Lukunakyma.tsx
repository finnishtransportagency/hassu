import { NahtavillaoloVaiheJulkaisu, Kieli, ProjektiKayttaja } from "@services/api";
import React, { ReactElement } from "react";
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
import { splitFilePath } from "../../../../util/fileUtil";
import ButtonFlatWithIcon from "@components/button/ButtonFlat";
interface Props {
  nahtavillaoloVaiheJulkaisu?: NahtavillaoloVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
}

export default function NahtavillaoloLukunakyma({ nahtavillaoloVaiheJulkaisu, projekti }: Props): ReactElement {
  if (!nahtavillaoloVaiheJulkaisu || !projekti) {
    return <></>;
  }

  let { kuulutusPaiva, published } = examineKuulutusPaiva(nahtavillaoloVaiheJulkaisu.kuulutusPaiva);
  let nahtavillaoloVaiheHref: string | undefined;
  if (published) {
    nahtavillaoloVaiheHref = window.location.protocol + "//" + window.location.host + "/suunnitelma/" + projekti.oid + "/nahtavillaolo";
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

  const ensisijaisetPDFt = getPdft(nahtavillaoloVaiheJulkaisu.kielitiedot?.ensisijainenKieli);
  const toissijaisetPDFt = getPdft(nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli);

  return (
    <>
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
          <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
          <p className="md:col-span-1 mb-0">{kuulutusPaiva}</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={nahtavillaoloVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />
          </p>
          {process.env.NODE_ENV != "production" && (
            <ButtonFlatWithIcon
              icon="history"
              className="md:col-span-2 mb-0"
              onClick={() => {
                window.location.assign(`/api/test/${projekti.oid}/nahtavillaolomenneisyyteen`);
              }}
            >
              Siirrä menneisyyteen (TESTAAJILLE)
            </ButtonFlatWithIcon>
          )}
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
              {yhteystieto?.sahkoposti ? replace(yhteystieto?.sahkoposti, "@", "[at]") : ""} ({yhteystieto.organisaatio})
            </p>
          ))}
          {vuorovaikutusYhteysHenkilot.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {yhteystieto.nimi}, puh. {yhteystieto.puhelinnumero}, {yhteystieto.email ? replace(yhteystieto.email, "@", "[at]") : ""} (
              {yhteystieto.organisaatio})
            </p>
          ))}
        </SectionContent>
        <SectionContent>
          <p className="vayla-label mb-5">Kuulutuksen yhteyshenkilöt</p>
          {!published && <p>Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on {kuulutusPaiva}.</p>}
          {published && <ExtLink href={nahtavillaoloVaiheHref}>Kuulutus palvelun julkisella puolella</ExtLink>}
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Ladattavat kuulutukset ja ilmoitukset</p>
          <p>Kuulutus ja ilmoitus ensisijaisella kielellä ({lowerCase(nahtavillaoloVaiheJulkaisu.kielitiedot?.ensisijainenKieli)})</p>
          {ensisijaisetPDFt && (
            <div className="flex flex-col mb-4">
              <div>
                <Link underline="none" href={ensisijaisetPDFt.nahtavillaoloPDFPath} target="_blank">
                  {splitFilePath(ensisijaisetPDFt.nahtavillaoloPDFPath).fileName}
                </Link>
              </div>
              <div>
                <Link underline="none" href={ensisijaisetPDFt.nahtavillaoloIlmoitusPDFPath} target="_blank">
                  {splitFilePath(ensisijaisetPDFt.nahtavillaoloIlmoitusPDFPath).fileName}
                </Link>
              </div>
              <div>
                <Link underline="none" href={ensisijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath} target="_blank">
                  {splitFilePath(ensisijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath).fileName}
                </Link>
              </div>
            </div>
          )}

          {nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli && (
            <div className="content mb-4">
              <p>Kuulutus ja ilmoitus toissijaisella kielellä ({lowerCase(nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli)})</p>
              {toissijaisetPDFt && (
                <div className="flex flex-col">
                  <div>
                    <Link underline="none" href={toissijaisetPDFt.nahtavillaoloPDFPath} target="_blank">
                      {splitFilePath(toissijaisetPDFt.nahtavillaoloPDFPath).fileName}
                    </Link>
                  </div>
                  <div>
                    <Link underline="none" href={toissijaisetPDFt.nahtavillaoloIlmoitusPDFPath} target="_blank">
                      {splitFilePath(toissijaisetPDFt.nahtavillaoloIlmoitusPDFPath).fileName}
                    </Link>
                  </div>
                  <div>
                    <Link underline="none" href={toissijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath} target="_blank">
                      {splitFilePath(toissijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath).fileName}
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
