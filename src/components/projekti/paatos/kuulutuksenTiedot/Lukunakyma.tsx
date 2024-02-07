import React, { ReactElement, useMemo } from "react";
import { HyvaksymisPaatosVaiheJulkaisu, HyvaksymisPaatosVaihePDF, Kieli, KuulutusSaamePDF } from "@services/api";
import replace from "lodash/replace";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import ExtLink from "@components/ExtLink";
import useTranslation from "next-translate/useTranslation";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { splitFilePath } from "../../../../util/fileUtil";
import DownloadLink from "@components/DownloadLink";
import IlmoituksenVastaanottajatLukutila from "../../common/IlmoituksenVastaanottajatLukutila";
import { ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "hassu-common/testUtil.dev";
import { formatDate } from "hassu-common/util/dateUtils";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { getPaatosSpecificData, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { UudelleenKuulutusSelitteetLukutila } from "@components/projekti/lukutila/UudelleenKuulutusSelitteetLukutila";
import { isAjansiirtoSallittu } from "src/util/isAjansiirtoSallittu";
import { isKieliTranslatable } from "hassu-common/kaannettavatKielet";
import { label } from "src/util/textUtil";

interface Props {
  julkaisu?: HyvaksymisPaatosVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
  paatosTyyppi: PaatosTyyppi;
}

export default function HyvaksymisKuulutusLukunakyma({ julkaisu, projekti, paatosTyyppi }: Props): ReactElement {
  const { t } = useTranslation("common");

  const getPdft = (kieli: Kieli | undefined | null): KuulutusSaamePDF | HyvaksymisPaatosVaihePDF | null | undefined => {
    if (isKieliTranslatable(kieli) && julkaisu && julkaisu.hyvaksymisPaatosVaihePDFt) {
      return julkaisu?.hyvaksymisPaatosVaihePDFt[kieli];
    }
    if (kieli === Kieli.POHJOISSAAME && julkaisu?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME) {
      return julkaisu?.hyvaksymisPaatosVaiheSaamePDFt.POHJOISSAAME;
    }
    return undefined;
  };

  const { kasittelyntilaData } = useMemo(() => getPaatosSpecificData(projekti, paatosTyyppi), [paatosTyyppi, projekti]);
  const kielitiedot = julkaisu?.kielitiedot;
  if (!julkaisu || !projekti || !kielitiedot) {
    return <></>;
  }

  const { ensisijainenKieli, toissijainenKieli } = kielitiedot;
  const ensisijaisetPDFt = getPdft(ensisijainenKieli);
  const toissijaisetPDFt = getPdft(toissijainenKieli);

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  let { kuulutusPaiva, published } = examineKuulutusPaiva(julkaisu.kuulutusPaiva);
  let hyvaksymisPaatosVaiheHref: string | undefined;
  if (published) {
    hyvaksymisPaatosVaiheHref =
      window.location.protocol +
      "//" +
      window.location.host +
      "/suunnitelma/" +
      projekti.oid +
      (paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS
        ? "/hyvaksymispaatos"
        : paatosTyyppi === PaatosTyyppi.JATKOPAATOS1
        ? "/jatkopaatos1"
        : "jatkopaatos2");
  }

  return (
    <>
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
          <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
          <p className="md:col-span-1 mb-0">{kuulutusPaiva}</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={julkaisu.kuulutusVaihePaattyyPaiva} />
          </p>
          {isAjansiirtoSallittu() && (
            <div className="md:col-span-2 mb-0">
              <ButtonFlatWithIcon
                icon="history"
                onClick={(e) => {
                  e.preventDefault();
                  if (paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS) {
                    window.location.assign(ProjektiTestCommand.oid(projekti.oid).hyvaksymispaatosMenneisyyteen());
                  } else if (paatosTyyppi === PaatosTyyppi.JATKOPAATOS1) {
                    window.location.assign(ProjektiTestCommand.oid(projekti.oid).jatkopaatos1Menneisyyteen());
                  } else if (paatosTyyppi === PaatosTyyppi.JATKOPAATOS2) {
                    window.location.assign(ProjektiTestCommand.oid(projekti.oid).jatkopaatos2Menneisyyteen());
                  }
                }}
              >
                Siirrä päivän verran menneisyyteen (TESTAAJILLE)
              </ButtonFlatWithIcon>
              <ButtonFlatWithIcon
                icon="history"
                onClick={(e) => {
                  e.preventDefault();
                  if (paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS) {
                    window.location.assign(ProjektiTestCommand.oid(projekti.oid).hyvaksymispaatosVuosiMenneisyyteen());
                  } else if (paatosTyyppi === PaatosTyyppi.JATKOPAATOS1) {
                    window.location.assign(ProjektiTestCommand.oid(projekti.oid).jatkopaatos1VuosiMenneisyyteen());
                  } else if (paatosTyyppi === PaatosTyyppi.JATKOPAATOS2) {
                    // TODO Lisää JATKOPAATOS2 toiminnot
                  }
                }}
              >
                Siirrä vuoden verran menneisyyteen (TESTAAJILLE)
              </ButtonFlatWithIcon>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Päätöksen päivä</p>
          <p className="vayla-label md:col-span-3">Päätöksen asiatunnus</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={kasittelyntilaData?.paatoksenPvm} />
          </p>
          <p className="md:col-span-3 mb-0">{kasittelyntilaData?.asianumero}</p>
        </div>
        {julkaisu.uudelleenKuulutus && (
          <UudelleenKuulutusSelitteetLukutila uudelleenKuulutus={julkaisu.uudelleenKuulutus} kielitiedot={kielitiedot} />
        )}
        <p>Päätös ja sen liitteet löytyvät Päätös ja sen liitteenä oleva aineisto -välilehdeltä.</p>
      </Section>
      <Section>
        <h4 className="vayla-label">Muutoksenhaku</h4>
        <p>
          Päätökseen voi valittamalla hakea muutosta {t(`hallinto-oikeus-ablatiivi.${julkaisu.hallintoOikeus}`)} 30 päivän kuluessa
          päätöksen tiedoksiannosta. Valitusosoituksen tiedosto löytyy Päätös ja sen liitteenä oleva aineisto -välilehdeltä.
        </p>
      </Section>
      <Section>
        <SectionContent>
          <p className="vayla-label">Kuulutuksen yhteyshenkilöt</p>
          <p></p>
          {julkaisu?.yhteystiedot?.map((yhteystieto, index) => (
            <p key={index}>{replace(yhteystietoVirkamiehelleTekstiksi(yhteystieto, t), "@", "[at]")}</p>
          ))}
        </SectionContent>
        {epaaktiivinen ? (
          <SectionContent>
            <p className="vayla-label">Kuulutus julkisella puolella</p>
            <p>
              Kuulutus on ollut nähtävillä julkisella puolella {formatDate(julkaisu.kuulutusPaiva)}—
              {formatDate(julkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan.
            </p>
          </SectionContent>
        ) : (
          <SectionContent>
            <p className="vayla-label">Kuulutus julkisella puolella</p>
            {!published && <p>Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on {kuulutusPaiva}.</p>}
            {published && (
              <p>
                <ExtLink href={hyvaksymisPaatosVaiheHref}>Kuulutus palvelun julkisella puolella</ExtLink>
              </p>
            )}
          </SectionContent>
        )}
        {epaaktiivinen ? (
          <SectionContent>
            <p className="vayla-label">Ladattavat kuulutukset ja julkaisut</p>
            <p>Kuulutukset löytyvät asianhallinnasta.</p>
          </SectionContent>
        ) : (
          <SectionContent>
            <p className="vayla-label">Ladattavat kuulutukset ja ilmoitukset</p>
            <p>
              {label({
                label: "Kuulutus ja ilmoitus",
                inputLanguage: Kieli.SUOMI,
                kielitiedot,
              })}
            </p>
            {ensisijaisetPDFt && (
              <div className="flex flex-col mb-4">
                {ensisijaisetPDFt.__typename === "HyvaksymisPaatosVaihePDF" && (
                  <>
                    <div>
                      <DownloadLink href={ensisijaisetPDFt.hyvaksymisKuulutusPDFPath}>
                        {splitFilePath(ensisijaisetPDFt.hyvaksymisKuulutusPDFPath).fileName}
                      </DownloadLink>
                    </div>
                    <div>
                      <DownloadLink href={ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath}>
                        {
                          splitFilePath(ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath)
                            .fileName
                        }
                      </DownloadLink>
                    </div>
                    <div>
                      <DownloadLink href={ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath}>
                        {splitFilePath(ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath).fileName}
                      </DownloadLink>
                    </div>
                    <div>
                      <DownloadLink href={ensisijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath}>
                        {splitFilePath(ensisijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath).fileName}
                      </DownloadLink>
                    </div>
                    {ensisijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath && (
                      <div>
                        <DownloadLink href={ensisijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath}>
                          {splitFilePath(ensisijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath).fileName}
                        </DownloadLink>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {toissijainenKieli && (
              <div className="content mb-4">
                <p>
                  {label({
                    label: "Kuulutus ja ilmoitus",
                    inputLanguage: toissijainenKieli,
                    kielitiedot,
                  })}
                </p>
                {toissijaisetPDFt && (
                  <div className="flex flex-col">
                    {toissijaisetPDFt.__typename === "HyvaksymisPaatosVaihePDF" && (
                      <>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.hyvaksymisKuulutusPDFPath}>
                            {splitFilePath(toissijaisetPDFt.hyvaksymisKuulutusPDFPath).fileName}
                          </DownloadLink>
                        </div>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath}>
                            {
                              splitFilePath(toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath)
                                .fileName
                            }
                          </DownloadLink>
                        </div>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath}>
                            {splitFilePath(toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath).fileName}
                          </DownloadLink>
                        </div>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath}>
                            {splitFilePath(toissijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath).fileName}
                          </DownloadLink>
                        </div>
                        {toissijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath && (
                          <div>
                            <DownloadLink href={toissijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath}>
                              {splitFilePath(toissijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath).fileName}
                            </DownloadLink>
                          </div>
                        )}
                      </>
                    )}

                    {toissijaisetPDFt.__typename === "KuulutusSaamePDF" && (
                      <>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.kuulutusPDF?.tiedosto}>{toissijaisetPDFt.kuulutusPDF?.nimi}</DownloadLink>
                        </div>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.kuulutusIlmoitusPDF?.tiedosto}>
                            {toissijaisetPDFt.kuulutusIlmoitusPDF?.nimi}
                          </DownloadLink>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </SectionContent>
        )}
      </Section>
      <Section>
        <IlmoituksenVastaanottajatLukutila
          ilmoituksenVastaanottajat={julkaisu.ilmoituksenVastaanottajat}
          julkaisunTila={julkaisu.tila}
          epaaktiivinen={epaaktiivinen}
        />
      </Section>
    </>
  );
}
