import { Kieli, KuulutusJulkaisuTila, KuulutusSaamePDF, NahtavillaoloPDF, NahtavillaoloVaiheJulkaisu, Vaihe } from "@services/api";
import React, { ReactElement } from "react";
import replace from "lodash/replace";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import IlmoituksenVastaanottajatLukutila from "../../common/IlmoituksenVastaanottajatLukutila";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { splitFilePath } from "../../../../util/fileUtil";
import { formatDate } from "hassu-common/util/dateUtils";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { UudelleenKuulutusSelitteetLukutila } from "@components/projekti/lukutila/UudelleenKuulutusSelitteetLukutila";
import useTranslation from "next-translate/useTranslation";
import { getKaannettavatKielet, isKieliTranslatable } from "hassu-common/kaannettavatKielet";
import DownloadLink from "@components/DownloadLink";
import { PreWrapParagraph } from "@components/PreWrapParagraph";
import { label } from "src/util/textUtil";
import { H2, H3 } from "../../../Headings";
import KuulutuksenSisalto from "../../common/KuulutuksenSisalto";
import { isAjansiirtoSallittu } from "../../../../util/isAjansiirtoSallittu";
import { ButtonFlatWithIcon } from "../../../button/ButtonFlat";
import { ProjektiTestCommand } from "hassu-common/testUtil.dev";

interface Props {
  nahtavillaoloVaiheJulkaisu?: NahtavillaoloVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
}

export default function NahtavillaoloLukunakyma({ nahtavillaoloVaiheJulkaisu, projekti }: Props): ReactElement {
  const { t } = useTranslation();
  const kielitiedot = nahtavillaoloVaiheJulkaisu?.kielitiedot;

  if (!nahtavillaoloVaiheJulkaisu || !projekti || !kielitiedot) {
    return <></>;
  }

  let { kuulutusPaiva } = examineKuulutusPaiva(nahtavillaoloVaiheJulkaisu.kuulutusPaiva);

  function getPdft(kieli: Kieli | undefined | null): KuulutusSaamePDF | NahtavillaoloPDF | null | undefined {
    if (isKieliTranslatable(kieli) && nahtavillaoloVaiheJulkaisu?.nahtavillaoloPDFt) {
      return nahtavillaoloVaiheJulkaisu.nahtavillaoloPDFt[kieli];
    }
    if (kieli === Kieli.POHJOISSAAME && nahtavillaoloVaiheJulkaisu?.nahtavillaoloSaamePDFt?.POHJOISSAAME) {
      return nahtavillaoloVaiheJulkaisu.nahtavillaoloSaamePDFt.POHJOISSAAME;
    }
    return undefined;
  }
  const { toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  const { ensisijainenKieli, toissijainenKieli } = kielitiedot || {};
  const ensisijaisetPDFt = getPdft(ensisijainenKieli);
  const toissijaisetPDFt = getPdft(toissijainenKieli);
  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <>
      <KuulutuksenSisalto alkupvm={kuulutusPaiva ?? ""} loppupvm={nahtavillaoloVaiheJulkaisu.kuulutusVaihePaattyyPaiva ?? ""}>
        {isAjansiirtoSallittu() && (
          <div className="md:col-span-2 mb-0">
            {isAjansiirtoSallittu() && (
              <ButtonFlatWithIcon
                icon="history"
                onClick={() => {
                  window.location.assign(ProjektiTestCommand.oid(projekti.oid).nahtavillaoloMenneisyyteen());
                }}
              >
                Siirrä menneisyyteen (TESTAAJILLE)
              </ButtonFlatWithIcon>
            )}
          </div>
        )}
        <div>
          <p className="vayla-label">
            {label({
              label: "Muistutukset",
              inputLanguage: Kieli.SUOMI,
              kielitiedot,
            })}
          </p>
          <PreWrapParagraph>
            Kansalaisia pyydetään esittämään muistutukset viimeistään {formatDate(nahtavillaoloVaiheJulkaisu.muistutusoikeusPaattyyPaiva)}.
          </PreWrapParagraph>
        </div>
        <div>
          <p className="vayla-label">
            {label({
              label: "Tiivistetty hankkeen sisällönkuvaus",
              inputLanguage: Kieli.SUOMI,
              kielitiedot,
            })}
          </p>
          <PreWrapParagraph>
            {nahtavillaoloVaiheJulkaisu.kielitiedot?.ensisijainenKieli === Kieli.SUOMI
              ? nahtavillaoloVaiheJulkaisu.hankkeenKuvaus?.SUOMI
              : nahtavillaoloVaiheJulkaisu.hankkeenKuvaus?.RUOTSI}
          </PreWrapParagraph>
        </div>
        {toissijainenKaannettavaKieli && (
          <div className="content">
            <p className="vayla-label">
              {label({
                label: "Tiivistetty hankkeen sisällönkuvaus",
                inputLanguage: toissijainenKaannettavaKieli,
                kielitiedot,
              })}
            </p>
            <PreWrapParagraph>
              {nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli === Kieli.SUOMI
                ? nahtavillaoloVaiheJulkaisu.hankkeenKuvaus?.SUOMI
                : nahtavillaoloVaiheJulkaisu.hankkeenKuvaus?.RUOTSI}
            </PreWrapParagraph>
          </div>
        )}
      </KuulutuksenSisalto>
      {nahtavillaoloVaiheJulkaisu.uudelleenKuulutus && (
        <UudelleenKuulutusSelitteetLukutila uudelleenKuulutus={nahtavillaoloVaiheJulkaisu.uudelleenKuulutus} kielitiedot={kielitiedot} />
      )}
      <Section smallGaps>
        <H3>Kuulutuksen yhteyshenkilöt</H3>
        <p></p>
        {nahtavillaoloVaiheJulkaisu.yhteystiedot?.map((yhteystieto, index) => (
          <p key={index}>{replace(yhteystietoVirkamiehelleTekstiksi(yhteystieto, t), "@", "[at]")}</p>
        ))}
      </Section>
      <Section>
        {epaaktiivinen ? (
          <SectionContent>
            <H2>Ladattavat kuulutukset ja ilmoitukset</H2>
            <p>Kuulutukset löytyvät asianhallinnasta</p>
          </SectionContent>
        ) : (
          <SectionContent>
            <H2>
              {nahtavillaoloVaiheJulkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY
                ? "Ladattavat kuulutukset ja ilmoitukset"
                : "Esikatseltavat tiedostot"}
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
                {ensisijaisetPDFt.__typename === "NahtavillaoloPDF" && (
                  <>
                    <div>
                      <DownloadLink href={ensisijaisetPDFt.nahtavillaoloPDFPath}>
                        {splitFilePath(ensisijaisetPDFt.nahtavillaoloPDFPath).fileName}
                      </DownloadLink>
                    </div>
                    <div>
                      <DownloadLink href={ensisijaisetPDFt.nahtavillaoloIlmoitusPDFPath}>
                        {splitFilePath(ensisijaisetPDFt.nahtavillaoloIlmoitusPDFPath).fileName}
                      </DownloadLink>
                    </div>
                    <div>
                      <DownloadLink href={ensisijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath}>
                        {splitFilePath(ensisijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath).fileName}
                      </DownloadLink>
                    </div>
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
                    {toissijaisetPDFt.__typename === "NahtavillaoloPDF" && (
                      <>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.nahtavillaoloPDFPath}>
                            {splitFilePath(toissijaisetPDFt.nahtavillaoloPDFPath).fileName}
                          </DownloadLink>
                        </div>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.nahtavillaoloIlmoitusPDFPath}>
                            {splitFilePath(toissijaisetPDFt.nahtavillaoloIlmoitusPDFPath).fileName}
                          </DownloadLink>
                        </div>
                        <div>
                          <DownloadLink href={toissijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath}>
                            {splitFilePath(toissijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath).fileName}
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
      </Section>
      <IlmoituksenVastaanottajatLukutila
        epaaktiivinen={epaaktiivinen}
        julkaisunTila={nahtavillaoloVaiheJulkaisu.tila}
        ilmoituksenVastaanottajat={nahtavillaoloVaiheJulkaisu.ilmoituksenVastaanottajat}
        vaihe={Vaihe.NAHTAVILLAOLO}
        omistajahakuStatus={projekti.omistajahaku?.status}
        oid={projekti.oid}
        uudelleenKuulutus={nahtavillaoloVaiheJulkaisu.uudelleenKuulutus}
        kuulutusPaiva={kuulutusPaiva}
      />
    </>
  );
}
