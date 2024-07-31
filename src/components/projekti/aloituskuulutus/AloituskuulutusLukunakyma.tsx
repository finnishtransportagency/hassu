import { AloitusKuulutusJulkaisu, AloitusKuulutusPDF, Kieli, KuulutusJulkaisuTila, KuulutusSaamePDF } from "@services/api";
import React, { ReactElement } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import capitalize from "lodash/capitalize";
import replace from "lodash/replace";
import AloituskuulutusTiedostot from "./AloituskuulutusTiedostot";
import IlmoituksenVastaanottajat from "./IlmoituksenVastaanottajat";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import { kuntametadata } from "hassu-common/kuntametadata";
import useTranslation from "next-translate/useTranslation";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import SectionContent from "@components/layout/SectionContent";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { formatNimi } from "../../../util/userUtil";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { splitFilePath } from "src/util/fileUtil";
import { UudelleenKuulutusSelitteetLukutila } from "../lukutila/UudelleenKuulutusSelitteetLukutila";
import { isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import DownloadLink from "@components/DownloadLink";
import { PreWrapParagraph } from "@components/PreWrapParagraph";
import { label } from "src/util/textUtil";
import { H2, H3 } from "../../Headings";
import KuulutuksenSisalto from "../common/KuulutuksenSisalto";

interface Props {
  projekti?: ProjektiLisatiedolla;
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
  isLoadingProjekti: boolean;
}

export default function AloituskuulutusLukunakyma({ aloituskuulutusjulkaisu, projekti, isLoadingProjekti }: Props): ReactElement {
  const { lang, t } = useTranslation();
  const kielitiedot = aloituskuulutusjulkaisu?.kielitiedot;
  if (!aloituskuulutusjulkaisu || !projekti || !kielitiedot) {
    return <></>;
  }
  let { kuulutusPaiva, published } = examineKuulutusPaiva(aloituskuulutusjulkaisu?.kuulutusPaiva);

  const { ensisijainenKieli, toissijainenKieli } = kielitiedot;

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  const getPdft = (kieli: Kieli | undefined | null): KuulutusSaamePDF | AloitusKuulutusPDF | null | undefined => {
    if (isKieliTranslatable(kieli) && aloituskuulutusjulkaisu && aloituskuulutusjulkaisu.aloituskuulutusPDFt) {
      return aloituskuulutusjulkaisu?.aloituskuulutusPDFt[kieli];
    }
    if (kieli === Kieli.POHJOISSAAME && aloituskuulutusjulkaisu?.aloituskuulutusSaamePDFt?.POHJOISSAAME) {
      return aloituskuulutusjulkaisu?.aloituskuulutusSaamePDFt.POHJOISSAAME;
    }
    return undefined;
  };

  const ensisijaisetPDFt = getPdft(ensisijainenKieli);
  const toissijaisetPDFt = getPdft(toissijainenKieli);

  return (
    <>
      <Section>
        {!epaaktiivinen && (
          <>
            {!published && aloituskuulutusjulkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY && (
              <Notification type={NotificationType.WARN}>Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä {kuulutusPaiva}</Notification>
            )}
            {published && aloituskuulutusjulkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY && (
              <Notification type={NotificationType.INFO_GREEN}>
                Aloituskuulutus on julkaistu {kuulutusPaiva}. Projekti näytetään kuulutuspäivästä lasketun määräajan jälkeen palvelun
                julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy{" "}
                <FormatDate date={aloituskuulutusjulkaisu.siirtyySuunnitteluVaiheeseen} />.
              </Notification>
            )}
            {aloituskuulutusjulkaisu.tila !== KuulutusJulkaisuTila.HYVAKSYTTY && (
              <Notification type={NotificationType.WARN}>
                Aloituskuulutus on hyväksyttävänä projektipäälliköllä. Jos kuulutusta tarvitsee muokata, ota yhteys projektipäällikköön.
              </Notification>
            )}
          </>
        )}
        {aloituskuulutusjulkaisu.suunnitteluSopimus && (
          <Notification type={NotificationType.INFO_GRAY}>
            Hankkeesta on tehty suunnittelusopimus kunnan kanssa
            <br />
            <br />
            {capitalize(kuntametadata.nameForKuntaId(aloituskuulutusjulkaisu.suunnitteluSopimus.kunta, lang))}
            <br />
            {formatNimi(aloituskuulutusjulkaisu.suunnitteluSopimus)}, puh. {aloituskuulutusjulkaisu.suunnitteluSopimus.puhelinnumero},{" "}
            {aloituskuulutusjulkaisu.suunnitteluSopimus.email ? replace(aloituskuulutusjulkaisu.suunnitteluSopimus.email, "@", "[at]") : ""}
          </Notification>
        )}
        <KuulutuksenSisalto alkupvm={kuulutusPaiva ?? ""} loppupvm={aloituskuulutusjulkaisu.siirtyySuunnitteluVaiheeseen ?? ""}>
          {isKieliTranslatable(ensisijainenKieli) && (
            <div>
              <p className="vayla-label">
                {label({
                  label: `Tiivistetty hankkeen sisällön kuvaus`,
                  inputLanguage: ensisijainenKieli,
                  kielitiedot,
                })}
              </p>
              <PreWrapParagraph>{aloituskuulutusjulkaisu.hankkeenKuvaus?.[ensisijainenKieli as KaannettavaKieli]}</PreWrapParagraph>
            </div>
          )}
          {isKieliTranslatable(toissijainenKieli) && (
            <div className="content">
              <p className="vayla-label">
                {label({
                  label: `Tiivistetty hankkeen sisällön kuvaus`,
                  inputLanguage: toissijainenKieli,
                  kielitiedot,
                })}
              </p>
              <PreWrapParagraph>{aloituskuulutusjulkaisu.hankkeenKuvaus?.[toissijainenKieli as KaannettavaKieli]}</PreWrapParagraph>
            </div>
          )}
        </KuulutuksenSisalto>
        {aloituskuulutusjulkaisu.uudelleenKuulutus && (
          <UudelleenKuulutusSelitteetLukutila uudelleenKuulutus={aloituskuulutusjulkaisu.uudelleenKuulutus} kielitiedot={kielitiedot} />
        )}
        <div>
          <H3>Kuulutuksen yhteystiedot</H3>
          {aloituskuulutusjulkaisu.yhteystiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {replace(yhteystietoVirkamiehelleTekstiksi(yhteystieto, t), "@", "[at]")}
            </p>
          ))}
        </div>
      </Section>
      <Section>
        {aloituskuulutusjulkaisu.tila !== KuulutusJulkaisuTila.HYVAKSYTTY && (
          <SectionContent>
            <H2>Esikatseltavat tiedostot</H2>
            <p>
              {label({
                label: `Kuulutus ja ilmoitus`,
                inputLanguage: Kieli.SUOMI,
                kielitiedot,
              })}
            </p>
            {ensisijaisetPDFt && (
              <div className="flex flex-col mb-4">
                {ensisijaisetPDFt.__typename === "AloitusKuulutusPDF" && (
                  <>
                    <div>
                      <DownloadLink href={ensisijaisetPDFt.aloituskuulutusPDFPath}>
                        {splitFilePath(ensisijaisetPDFt.aloituskuulutusPDFPath).fileName}
                      </DownloadLink>
                    </div>
                    <div>
                      <DownloadLink href={ensisijaisetPDFt.aloituskuulutusIlmoitusPDFPath}>
                        {splitFilePath(ensisijaisetPDFt.aloituskuulutusIlmoitusPDFPath).fileName}
                      </DownloadLink>
                    </div>
                  </>
                )}
              </div>
            )}

            {toissijainenKieli && (
              <div className="content mb-4">
                <p>
                  {" "}
                  {label({
                    label: `Kuulutus ja ilmoitus`,
                    inputLanguage: toissijainenKieli,
                    kielitiedot,
                  })}
                </p>
                {toissijaisetPDFt && (
                  <div className="flex flex-col">
                    {toissijaisetPDFt.__typename === "AloitusKuulutusPDF" && (
                      <>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.aloituskuulutusPDFPath}>
                            {splitFilePath(toissijaisetPDFt.aloituskuulutusPDFPath).fileName}
                          </DownloadLink>
                        </div>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath}>
                            {splitFilePath(toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath).fileName}
                          </DownloadLink>
                        </div>
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
        {aloituskuulutusjulkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY && (
          <AloituskuulutusTiedostot aloituskuulutusjulkaisu={aloituskuulutusjulkaisu} oid={projekti.oid} epaaktiivinen={epaaktiivinen} />
        )}
      </Section>

      <IlmoituksenVastaanottajat isLoading={isLoadingProjekti} aloituskuulutusjulkaisu={aloituskuulutusjulkaisu} />
    </>
  );
}
