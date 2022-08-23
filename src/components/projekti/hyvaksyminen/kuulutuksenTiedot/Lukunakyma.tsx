import { HyvaksymisPaatosVaiheJulkaisu, ProjektiKayttaja, Kieli } from "@services/api";
import React, { ReactElement } from "react";
import capitalize from "lodash/capitalize";
import replace from "lodash/replace";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import ExtLink from "@components/ExtLink";
import useTranslation from "next-translate/useTranslation";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { splitFilePath } from "../../../../util/fileUtil";
import { Link } from "@mui/material";
import lowerCase from "lodash/lowerCase";
import IlmoituksenVastaanottajatLukutila from "./IlmoituksenVastaanottajatLukutila";

interface Props {
  hyvaksymisPaatosVaiheJulkaisu?: HyvaksymisPaatosVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
}

export default function HyvaksymisKuulutusLukunakyma({ hyvaksymisPaatosVaiheJulkaisu, projekti }: Props): ReactElement {
  const { t } = useTranslation("common");
  const getPdft = (kieli: Kieli | undefined | null) => {
    if (!hyvaksymisPaatosVaiheJulkaisu || !hyvaksymisPaatosVaiheJulkaisu.hyvaksymisPaatosVaihePDFt || !kieli) {
      return undefined;
    }
    return hyvaksymisPaatosVaiheJulkaisu?.hyvaksymisPaatosVaihePDFt[kieli];
  };
  const ensisijaisetPDFt = getPdft(hyvaksymisPaatosVaiheJulkaisu?.kielitiedot?.ensisijainenKieli);
  const toissijaisetPDFt = getPdft(hyvaksymisPaatosVaiheJulkaisu?.kielitiedot?.toissijainenKieli);

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

  return (
    <>
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
          <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
          <p className="md:col-span-1 mb-0">{kuulutusPaiva}</p>
          <p className="md:col-span-3 mb-0">
            <FormatDate date={hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Päätöksen päivä</p>
          <p className="vayla-label md:col-span-3">Päätöksen asianumero</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm} />
          </p>
          <p className="md:col-span-3 mb-0">{projekti.kasittelynTila?.hyvaksymispaatos?.asianumero}</p>
        </div>
        <p>Päätös ja sen liitteet löytyvät Päätös ja sen liitteenä oleva aineisto -välilehdeltä.</p>
      </Section>
      <Section>
        <h4 className="vayla-label">Muutoksenhaku</h4>
        <p>
          Päätökseen voi valittamalla hakea muutosta{" "}
          {t(`hallinto-oikeus-ablatiivi.${hyvaksymisPaatosVaiheJulkaisu.hallintoOikeus}`)} 30 päivän kuluessa päätöksen
          tiedoksiannosta. Valitusosoituksen tiedosto löytyy Päätös ja sen liitteenä oleva aineisto -välilehdeltä.
        </p>
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
          {ensisijaisetPDFt && (
            <div className="flex flex-col mb-4">
              <div>
                <Link underline="none" href={ensisijaisetPDFt.hyvaksymisKuulutusPDFPath} target="_blank">
                  {splitFilePath(ensisijaisetPDFt.hyvaksymisKuulutusPDFPath).fileName}
                </Link>
              </div>
              <div>
                <Link underline="none" href={ensisijaisetPDFt.hyvaksymisIlmoitusPDFPath} target="_blank">
                  {splitFilePath(ensisijaisetPDFt.hyvaksymisIlmoitusPDFPath).fileName}
                </Link>
              </div>
              <div>
                <Link underline="none" href={ensisijaisetPDFt.hyvaksymisLahetekirjePDFPath} target="_blank">
                  {splitFilePath(ensisijaisetPDFt.hyvaksymisLahetekirjePDFPath).fileName}
                </Link>
              </div>
              <div>
                <Link
                  underline="none"
                  href={ensisijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath}
                  target="_blank"
                >
                  {splitFilePath(ensisijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath).fileName}
                </Link>
              </div>
              <div>
                <Link underline="none" href={ensisijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath} target="_blank">
                  {splitFilePath(ensisijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath).fileName}
                </Link>
              </div>
            </div>
          )}

          {hyvaksymisPaatosVaiheJulkaisu.kielitiedot?.toissijainenKieli && (
            <div className="content mb-4">
              <p>
                Kuulutus ja ilmoitus toissijaisella kielellä (
                {lowerCase(hyvaksymisPaatosVaiheJulkaisu.kielitiedot?.toissijainenKieli)})
              </p>
              {toissijaisetPDFt && (
                <div className="flex flex-col">
                  <div>
                    <Link underline="none" href={toissijaisetPDFt.hyvaksymisKuulutusPDFPath} target="_blank">
                      {splitFilePath(toissijaisetPDFt.hyvaksymisKuulutusPDFPath).fileName}
                    </Link>
                  </div>
                  <div>
                    <Link underline="none" href={toissijaisetPDFt.hyvaksymisIlmoitusPDFPath} target="_blank">
                      {splitFilePath(toissijaisetPDFt.hyvaksymisIlmoitusPDFPath).fileName}
                    </Link>
                  </div>
                  <div>
                    <Link underline="none" href={toissijaisetPDFt.hyvaksymisLahetekirjePDFPath} target="_blank">
                      {splitFilePath(toissijaisetPDFt.hyvaksymisLahetekirjePDFPath).fileName}
                    </Link>
                  </div>
                  <div>
                    <Link
                      underline="none"
                      href={toissijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath}
                      target="_blank"
                    >
                      {splitFilePath(toissijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath).fileName}
                    </Link>
                  </div>
                  <div>
                    <Link
                      underline="none"
                      href={toissijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath}
                      target="_blank"
                    >
                      {splitFilePath(toissijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath).fileName}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionContent>
        <IlmoituksenVastaanottajatLukutila hyvaksymisPaatosVaiheJulkaisu={hyvaksymisPaatosVaiheJulkaisu} />
      </Section>
    </>
  );
}
