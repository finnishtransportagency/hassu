import React, { ReactElement, useMemo } from "react";
import { HyvaksymisPaatosVaiheJulkaisu, HyvaksymisPaatosVaihePDF, Kieli, KuulutusJulkaisuTila, KuulutusSaamePDF } from "@services/api";
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
import IlmoituksenVastaanottajatLukutila from "../../common/IlmoituksenVastaanottajatLukutila";
import ButtonFlatWithIcon from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "../../../../../common/testUtil.dev";
import { formatDate } from "common/util/dateUtils";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { getPaatosSpecificData, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { UudelleenKuulutusSelitteetLukutila } from "@components/projekti/lukutila/UudelleenKuulutusSelitteetLukutila";
import { isAjansiirtoSallittu } from "src/util/isAjansiirtoSallittu";
import { isKieliTranslatable } from "common/kaannettavatKielet";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import kaynnistaAsianhallinnanSynkronointiNappi from "@components/projekti/common/kaynnistaAsianhallinnanSynkronointi";

interface Props {
  julkaisu?: HyvaksymisPaatosVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
  paatosTyyppi: PaatosTyyppi;
}

export default function HyvaksymisKuulutusLukunakyma({ julkaisu, projekti, paatosTyyppi }: Props): ReactElement {
  const { t } = useTranslation("common");
  const { data: kayttaja } = useCurrentUser();

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

  if (!julkaisu || !projekti) {
    return <></>;
  }

  const { ensisijainenKieli, toissijainenKieli } = julkaisu.kielitiedot || {};
  const ensisijaisetPDFt = getPdft(ensisijainenKieli);
  const toissijaisetPDFt = getPdft(toissijainenKieli);

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  let { kuulutusPaiva, published } = examineKuulutusPaiva(julkaisu.kuulutusPaiva);
  let hyvaksymisPaatosVaiheHref: string | undefined;
  if (published) {
    hyvaksymisPaatosVaiheHref =
      window.location.protocol + "//" + window.location.host + "/suunnitelma/" + projekti.oid + "/hyvaksymispaatos";
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
                    // TODO Lisää JATKOPAATOS2 toiminnot
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
              {kayttaja?.features?.asianhallintaIntegraatio &&
                julkaisu.tila == KuulutusJulkaisuTila.HYVAKSYTTY &&
                kaynnistaAsianhallinnanSynkronointiNappi({
                  oid: projekti.oid,
                  asianhallintaSynkronointiTila: julkaisu.asianhallintaSynkronointiTila,
                })}
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
          <UudelleenKuulutusSelitteetLukutila
            uudelleenKuulutus={julkaisu.uudelleenKuulutus}
            ensisijainenKieli={ensisijainenKieli}
            toissijainenKieli={toissijainenKieli}
          />
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
            <p>Kuulutus ja ilmoitus ensisijaisella kielellä ({lowerCase(julkaisu.kielitiedot?.ensisijainenKieli)})</p>
            {ensisijaisetPDFt && (
              <div className="flex flex-col mb-4">
                {ensisijaisetPDFt.__typename === "HyvaksymisPaatosVaihePDF" && (
                  <>
                    <div>
                      <Link className="file_download" underline="none" href={ensisijaisetPDFt.hyvaksymisKuulutusPDFPath} target="_blank">
                        {splitFilePath(ensisijaisetPDFt.hyvaksymisKuulutusPDFPath).fileName}
                      </Link>
                    </div>
                    <div>
                      <Link
                        className="file_download"
                        underline="none"
                        href={ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath}
                        target="_blank"
                      >
                        {
                          splitFilePath(ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath)
                            .fileName
                        }
                      </Link>
                    </div>
                    <div>
                      <Link
                        className="file_download"
                        underline="none"
                        href={ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath}
                        target="_blank"
                      >
                        {splitFilePath(ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath).fileName}
                      </Link>
                    </div>
                    <div>
                      <Link
                        className="file_download"
                        underline="none"
                        href={ensisijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath}
                        target="_blank"
                      >
                        {splitFilePath(ensisijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath).fileName}
                      </Link>
                    </div>
                    <div>
                      <Link
                        className="file_download"
                        underline="none"
                        href={ensisijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath}
                        target="_blank"
                      >
                        {splitFilePath(ensisijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath).fileName}
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {julkaisu.kielitiedot?.toissijainenKieli && (
              <div className="content mb-4">
                <p>Kuulutus ja ilmoitus toissijaisella kielellä ({lowerCase(julkaisu.kielitiedot?.toissijainenKieli)})</p>
                {toissijaisetPDFt && (
                  <div className="flex flex-col">
                    {toissijaisetPDFt.__typename === "HyvaksymisPaatosVaihePDF" && (
                      <>
                        <div>
                          <Link underline="none" href={toissijaisetPDFt.hyvaksymisKuulutusPDFPath} target="_blank">
                            {splitFilePath(toissijaisetPDFt.hyvaksymisKuulutusPDFPath).fileName}
                          </Link>
                        </div>
                        <div>
                          <Link
                            underline="none"
                            href={toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath}
                            target="_blank"
                          >
                            {
                              splitFilePath(toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath)
                                .fileName
                            }
                          </Link>
                        </div>
                        <div>
                          <Link
                            className="file_download"
                            underline="none"
                            href={toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath}
                            target="_blank"
                          >
                            {splitFilePath(toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath).fileName}
                          </Link>
                        </div>
                        <div>
                          <Link
                            className="file_download"
                            underline="none"
                            href={toissijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath}
                            target="_blank"
                          >
                            {splitFilePath(toissijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath).fileName}
                          </Link>
                        </div>
                        <div>
                          <Link
                            className="file_download"
                            underline="none"
                            href={toissijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath}
                            target="_blank"
                          >
                            {splitFilePath(toissijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath).fileName}
                          </Link>
                        </div>
                      </>
                    )}

                    {toissijaisetPDFt.__typename === "KuulutusSaamePDF" && (
                      <>
                        <div>
                          <Link className="file_download" underline="none" href={toissijaisetPDFt.kuulutusPDF?.tiedosto} target="_blank">
                            {toissijaisetPDFt.kuulutusPDF?.nimi}
                          </Link>
                        </div>
                        <div>
                          <Link
                            className="file_download"
                            underline="none"
                            href={toissijaisetPDFt.kuulutusIlmoitusPDF?.tiedosto}
                            target="_blank"
                          >
                            {toissijaisetPDFt.kuulutusIlmoitusPDF?.nimi}
                          </Link>
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
