import { Kieli, KuulutusSaamePDF, NahtavillaoloPDF, NahtavillaoloVaiheJulkaisu } from "@services/api";
import React, { ReactElement } from "react";
import replace from "lodash/replace";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import IlmoituksenVastaanottajatLukutila from "../../common/IlmoituksenVastaanottajatLukutila";
import ExtLink from "@components/ExtLink";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { splitFilePath } from "../../../../util/fileUtil";
import { ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "common/testUtil.dev";
import { formatDate } from "hassu-common/util/dateUtils";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { UudelleenKuulutusSelitteetLukutila } from "@components/projekti/lukutila/UudelleenKuulutusSelitteetLukutila";
import useTranslation from "next-translate/useTranslation";
import { isAjansiirtoSallittu } from "src/util/isAjansiirtoSallittu";
import { getKaannettavatKielet, isKieliTranslatable } from "hassu-common/kaannettavatKielet";
import DownloadLink from "@components/DownloadLink";
import { PreWrapParagraph } from "@components/PreWrapParagraph";
import { label } from "src/util/textUtil";

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

  let { kuulutusPaiva, published } = examineKuulutusPaiva(nahtavillaoloVaiheJulkaisu.kuulutusPaiva);
  let nahtavillaoloVaiheHref: string | undefined;
  if (published) {
    nahtavillaoloVaiheHref = window.location.protocol + "//" + window.location.host + "/suunnitelma/" + projekti.oid + "/nahtavillaolo";
  }

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
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
          <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
          <p className="md:col-span-1 mb-0">{kuulutusPaiva}</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={nahtavillaoloVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />
          </p>
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
        </div>
        {nahtavillaoloVaiheJulkaisu.uudelleenKuulutus && (
          <UudelleenKuulutusSelitteetLukutila uudelleenKuulutus={nahtavillaoloVaiheJulkaisu.uudelleenKuulutus} kielitiedot={kielitiedot} />
        )}
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
      </Section>
      <Section>
        <SectionContent>
          <p className="vayla-label">Kuulutuksen yhteyshenkilöt</p>
          <p></p>
          {nahtavillaoloVaiheJulkaisu.yhteystiedot?.map((yhteystieto, index) => (
            <p key={index}>{replace(yhteystietoVirkamiehelleTekstiksi(yhteystieto, t), "@", "[at]")}</p>
          ))}
        </SectionContent>
        <SectionContent>
          <p className="vayla-label">Kuulutus julkisella puolella</p>
          {epaaktiivinen ? (
            <p>
              Kuulutus on ollut nähtävillä palvelun julkisella puolella {formatDate(nahtavillaoloVaiheJulkaisu.kuulutusPaiva)}—
              {formatDate(nahtavillaoloVaiheJulkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan.
            </p>
          ) : (
            <>
              {!published && <p>Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on {kuulutusPaiva}.</p>}
              {published && (
                <p>
                  <ExtLink href={nahtavillaoloVaiheHref}>Kuulutus palvelun julkisella puolella</ExtLink>
                </p>
              )}
            </>
          )}
        </SectionContent>
        {epaaktiivinen ? (
          <SectionContent>
            <p className="vayla-label">Ladattavat kuulutukset ja ilmoitukset</p>
            <p>Kuulutukset löytyvät asianhallinnasta</p>
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

            {toissijainenKaannettavaKieli && (
              <div className="content mb-4">
                <p>
                  {label({
                    label: "Kuulutus ja ilmoitus",
                    inputLanguage: toissijainenKaannettavaKieli,
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
      />
    </>
  );
}
