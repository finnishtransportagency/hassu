import { Kieli, KuulutusSaamePDF, NahtavillaoloPDF, NahtavillaoloVaiheJulkaisu } from "@services/api";
import React, { ReactElement } from "react";
import replace from "lodash/replace";
import lowerCase from "lodash/lowerCase";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import IlmoituksenVastaanottajatLukutila from "../../common/IlmoituksenVastaanottajatLukutila";
import ExtLink from "@components/ExtLink";
import { Link } from "@mui/material";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { splitFilePath } from "../../../../util/fileUtil";
import ButtonFlatWithIcon from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "../../../../../common/testUtil.dev";
import { formatDate } from "src/util/dateUtils";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { UudelleenKuulutusSelitteetLukutila } from "@components/projekti/lukutila/UudelleenKuulutusSelitteetLukutila";
import useTranslation from "next-translate/useTranslation";
import { isAjansiirtoSallittu } from "src/util/isAjansiirtoSallittu";
import { getKaannettavatKielet, isKieliTranslatable } from "common/kaannettavatKielet";

interface Props {
  nahtavillaoloVaiheJulkaisu?: NahtavillaoloVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
}

export default function NahtavillaoloLukunakyma({ nahtavillaoloVaiheJulkaisu, projekti }: Props): ReactElement {
  const { t } = useTranslation();
  if (!nahtavillaoloVaiheJulkaisu || !projekti) {
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

  const { toissijainenKaannettavaKieli } = getKaannettavatKielet(nahtavillaoloVaiheJulkaisu.kielitiedot);

  const { ensisijainenKieli, toissijainenKieli } = nahtavillaoloVaiheJulkaisu.kielitiedot || {};
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
          {isAjansiirtoSallittu() && (
            <ButtonFlatWithIcon
              icon="history"
              className="md:col-span-2 mb-0"
              onClick={() => {
                window.location.assign(ProjektiTestCommand.oid(projekti.oid).nahtavillaoloMenneisyyteen());
              }}
            >
              Siirrä menneisyyteen (TESTAAJILLE)
            </ButtonFlatWithIcon>
          )}
        </div>
        {nahtavillaoloVaiheJulkaisu.uudelleenKuulutus && (
          <UudelleenKuulutusSelitteetLukutila
            uudelleenKuulutus={nahtavillaoloVaiheJulkaisu.uudelleenKuulutus}
            ensisijainenKieli={ensisijainenKieli}
            toissijainenKieli={toissijainenKieli}
          />
        )}
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
        {toissijainenKaannettavaKieli && (
          <div className="content">
            <p className="vayla-label">
              Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä ({lowerCase(toissijainenKaannettavaKieli)})
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
            <p>Kuulutus ja ilmoitus ensisijaisella kielellä ({lowerCase(nahtavillaoloVaiheJulkaisu.kielitiedot?.ensisijainenKieli)})</p>
            {ensisijaisetPDFt && (
              <div className="flex flex-col mb-4">
                {ensisijaisetPDFt.__typename === "NahtavillaoloPDF" && (
                  <>
                    <div>
                      <Link className="file_download" underline="none" href={ensisijaisetPDFt.nahtavillaoloPDFPath} target="_blank">
                        {splitFilePath(ensisijaisetPDFt.nahtavillaoloPDFPath).fileName}
                      </Link>
                    </div>
                    <div>
                      <Link className="file_download" underline="none" href={ensisijaisetPDFt.nahtavillaoloIlmoitusPDFPath} target="_blank">
                        {splitFilePath(ensisijaisetPDFt.nahtavillaoloIlmoitusPDFPath).fileName}
                      </Link>
                    </div>
                    <div>
                      <Link
                        className="file_download"
                        underline="none"
                        href={ensisijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath}
                        target="_blank"
                      >
                        {splitFilePath(ensisijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath).fileName}
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli && (
              <div className="content mb-4">
                <p>Kuulutus ja ilmoitus toissijaisella kielellä ({lowerCase(nahtavillaoloVaiheJulkaisu.kielitiedot?.toissijainenKieli)})</p>
                {toissijaisetPDFt && (
                  <div className="flex flex-col">
                    {toissijaisetPDFt.__typename === "NahtavillaoloPDF" && (
                      <>
                        <div>
                          <Link className="file_download" underline="none" href={toissijaisetPDFt.nahtavillaoloPDFPath} target="_blank">
                            {splitFilePath(toissijaisetPDFt.nahtavillaoloPDFPath).fileName}
                          </Link>
                        </div>
                        <div>
                          <Link
                            className="file_download"
                            underline="none"
                            href={toissijaisetPDFt.nahtavillaoloIlmoitusPDFPath}
                            target="_blank"
                          >
                            {splitFilePath(toissijaisetPDFt.nahtavillaoloIlmoitusPDFPath).fileName}
                          </Link>
                        </div>
                        <div>
                          <Link
                            className="file_download"
                            underline="none"
                            href={toissijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath}
                            target="_blank"
                          >
                            {splitFilePath(toissijaisetPDFt.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath).fileName}
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
      <IlmoituksenVastaanottajatLukutila
        epaaktiivinen={epaaktiivinen}
        julkaisunTila={nahtavillaoloVaiheJulkaisu.tila}
        ilmoituksenVastaanottajat={nahtavillaoloVaiheJulkaisu.ilmoituksenVastaanottajat}
      />
    </>
  );
}
