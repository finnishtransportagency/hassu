import React, { ReactElement, useMemo } from "react";
import {
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  Kieli,
  KuulutusJulkaisuTila,
  KuulutusSaamePDF,
  Vaihe,
} from "@services/api";
import replace from "lodash/replace";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { splitFilePath } from "../../../../util/fileUtil";
import DownloadLink from "@components/DownloadLink";
import IlmoituksenVastaanottajatLukutila from "../../common/IlmoituksenVastaanottajatLukutila";
import { ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "hassu-common/testUtil.dev";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { getPaatosSpecificData, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { UudelleenKuulutusSelitteetLukutila } from "@components/projekti/lukutila/UudelleenKuulutusSelitteetLukutila";
import { isAjansiirtoSallittu } from "src/util/isAjansiirtoSallittu";
import { isKieliTranslatable } from "hassu-common/kaannettavatKielet";
import { label } from "src/util/textUtil";
import { H2, H3 } from "../../../Headings";
import KuulutuksenSisalto from "../../common/KuulutuksenSisalto";
import { LiittyvatSuunnitelmat } from "@components/projekti/LiittyvatSuunnitelmat";

interface Props {
  julkaisu?: HyvaksymisPaatosVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
  paatosTyyppi: PaatosTyyppi;
}

export default function HyvaksymisKuulutusLukunakyma({ julkaisu, projekti, paatosTyyppi }: Props): ReactElement {
  const { t } = useTranslation("common");
  const isJatkopaatos = useMemo(
    () => paatosTyyppi === PaatosTyyppi.JATKOPAATOS1 || paatosTyyppi === PaatosTyyppi.JATKOPAATOS2,
    [paatosTyyppi]
  );

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

  const ajansiirtoSallittu = isAjansiirtoSallittu(process.env.NEXT_PUBLIC_AJANSIIRTO_SALLITTU ?? "");

  let { kuulutusPaiva } = examineKuulutusPaiva(julkaisu.kuulutusPaiva);

  return (
    <>
      <KuulutuksenSisalto alkupvm={kuulutusPaiva ?? ""} loppupvm={julkaisu.kuulutusVaihePaattyyPaiva ?? ""}>
        {ajansiirtoSallittu && (
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
                  window.location.assign(ProjektiTestCommand.oid(projekti.oid).jatkopaatos2VuosiMenneisyyteen());
                }
              }}
            >
              Siirrä vuoden verran menneisyyteen (TESTAAJILLE)
            </ButtonFlatWithIcon>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Päätöksen päivä</p>
          <p className="vayla-label md:col-span-3">Päätöksen asiatunnus</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={kasittelyntilaData?.paatoksenPvm} />
          </p>
          <p className="md:col-span-3 mb-0">{kasittelyntilaData?.asianumero}</p>
        </div>
        {isJatkopaatos && (
          <div>
            <p className="vayla-label">Päätöksen viimeinen voimassaolovuosi</p>
            <p>{julkaisu.viimeinenVoimassaolovuosi}</p>
          </div>
        )}

        <p>Päätös ja sen liitteet löytyvät Päätös ja sen liitteenä oleva aineisto -välilehdeltä.</p>
      </KuulutuksenSisalto>
      {julkaisu.uudelleenKuulutus && (
        <UudelleenKuulutusSelitteetLukutila uudelleenKuulutus={julkaisu.uudelleenKuulutus} kielitiedot={kielitiedot} />
      )}
      <Section>
        <H3>Muutoksenhaku</H3>
        <p>
          Päätökseen voi valittamalla hakea muutosta {t(`hallinto-oikeus-ablatiivi.${julkaisu.hallintoOikeus}`)} 30 päivän kuluessa
          päätöksen tiedoksiannosta. Valitusosoituksen tiedosto löytyy Päätös ja sen liitteenä oleva aineisto -välilehdeltä.
        </p>
      </Section>
      <LiittyvatSuunnitelmat jakotieto={julkaisu.suunnitelmaJaettu} />
      <Section>
        <SectionContent>
          <H3>Kuulutuksen yhteyshenkilöt</H3>
          <p></p>
          {julkaisu?.yhteystiedot?.map((yhteystieto, index) => (
            <p key={index}>{replace(yhteystietoVirkamiehelleTekstiksi(yhteystieto, t), "@", "[at]")}</p>
          ))}
        </SectionContent>
      </Section>
      <Section>
        {epaaktiivinen ? (
          <SectionContent>
            <H2>Ladattavat kuulutukset ja julkaisut</H2>
            <p>Kuulutukset löytyvät asianhallinnasta.</p>
          </SectionContent>
        ) : (
          <SectionContent>
            <H2>
              {julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY ? "Ladattavat kuulutukset ja ilmoitukset" : "Esikatseltavat tiedostot"}
            </H2>
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
                        {toissijaisetPDFt.kirjeTiedotettavillePDF && (
                          <div>
                            <DownloadLink href={toissijaisetPDFt.kirjeTiedotettavillePDF.tiedosto}>
                              {toissijaisetPDFt.kirjeTiedotettavillePDF.nimi}
                            </DownloadLink>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </SectionContent>
        )}
      </Section>
      <IlmoituksenVastaanottajatLukutila
        ilmoituksenVastaanottajat={julkaisu.ilmoituksenVastaanottajat}
        julkaisunTila={julkaisu.tila}
        epaaktiivinen={epaaktiivinen}
        vaihe={paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS ? Vaihe.HYVAKSYMISPAATOS : undefined}
        paatosTyyppi={paatosTyyppi}
        omistajahakuStatus={projekti.omistajahaku?.status}
        oid={projekti.oid}
        uudelleenKuulutus={julkaisu.uudelleenKuulutus}
        kuulutusPaiva={kuulutusPaiva}
      />
    </>
  );
}
