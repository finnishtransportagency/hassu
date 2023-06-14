import { AloitusKuulutusJulkaisu, AloitusKuulutusPDF, Kieli, KuulutusJulkaisuTila, KuulutusSaamePDF } from "@services/api";
import React, { ReactElement } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import capitalize from "lodash/capitalize";
import replace from "lodash/replace";
import lowerCase from "lodash/lowerCase";
import AloituskuulutusTiedostot from "./AloituskuulutusTiedostot";
import IlmoituksenVastaanottajat from "./IlmoituksenVastaanottajat";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import { kuntametadata } from "../../../../common/kuntametadata";
import useTranslation from "next-translate/useTranslation";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import ExtLink from "@components/ExtLink";
import SectionContent from "@components/layout/SectionContent";
import { formatDate } from "../../../../common/util/dateUtils";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { formatNimi } from "../../../util/userUtil";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { Link } from "@mui/material";
import { splitFilePath } from "src/util/fileUtil";
import { UudelleenKuulutusSelitteetLukutila } from "../lukutila/UudelleenKuulutusSelitteetLukutila";
import { isKieliTranslatable, KaannettavaKieli } from "common/kaannettavatKielet";
import ButtonFlatWithIcon from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "../../../../common/testUtil.dev";

interface Props {
  projekti?: ProjektiLisatiedolla;
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
  isLoadingProjekti: boolean;
}

export default function AloituskuulutusLukunakyma({ aloituskuulutusjulkaisu, projekti, isLoadingProjekti }: Props): ReactElement {
  const { lang, t } = useTranslation();
  if (!aloituskuulutusjulkaisu || !projekti) {
    return <></>;
  }

  let { kuulutusPaiva, published } = examineKuulutusPaiva(aloituskuulutusjulkaisu?.kuulutusPaiva);

  let aloitusKuulutusHref: string | undefined;
  if (published) {
    aloitusKuulutusHref = window.location.protocol + "//" + window.location.host + "/suunnitelma/" + projekti.oid + "/aloituskuulutus";
  }

  const { ensisijainenKieli, toissijainenKieli } = aloituskuulutusjulkaisu.kielitiedot || {};

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
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
          <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
          <p className="md:col-span-1 mb-0">{kuulutusPaiva}</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={aloituskuulutusjulkaisu.siirtyySuunnitteluVaiheeseen} />
          </p>
          {process.env.ASIANHALLINTA_INTEGRATION_ENABLED === "true" && (
            <ButtonFlatWithIcon
              icon="history"
              className="md:col-span-2 mb-0"
              onClick={() => {
                window.location.assign(ProjektiTestCommand.oid(projekti.oid).kaynnistaAsianhallintasynkronointi());
              }}
            >
              Käynnistä asianhallinnan synkronointi (TESTAAJILLE)
            </ButtonFlatWithIcon>
          )}
        </div>
        {aloituskuulutusjulkaisu.uudelleenKuulutus && (
          <UudelleenKuulutusSelitteetLukutila
            uudelleenKuulutus={aloituskuulutusjulkaisu.uudelleenKuulutus}
            ensisijainenKieli={ensisijainenKieli}
            toissijainenKieli={toissijainenKieli}
          />
        )}
        {isKieliTranslatable(ensisijainenKieli) && (
          <div>
            <p className="vayla-label">Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
            <p>{aloituskuulutusjulkaisu.hankkeenKuvaus?.[ensisijainenKieli as KaannettavaKieli]}</p>
          </div>
        )}
        {isKieliTranslatable(toissijainenKieli) && (
          <div className="content">
            <p className="vayla-label">
              Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä ({lowerCase(toissijainenKieli as KaannettavaKieli)})
            </p>
            <p>{aloituskuulutusjulkaisu.hankkeenKuvaus?.[toissijainenKieli as KaannettavaKieli]}</p>
          </div>
        )}
        <div>
          <p className="vayla-label">Kuulutuksessa esitettävät yhteystiedot</p>
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
            <p className="vayla-label">Ladattavat kuulutukset ja ilmoitukset</p>
            <p>Kuulutus ja ilmoitus ensisijaisella kielellä ({lowerCase(aloituskuulutusjulkaisu.kielitiedot?.ensisijainenKieli)})</p>
            {ensisijaisetPDFt && (
              <div className="flex flex-col mb-4">
                {ensisijaisetPDFt.__typename === "AloitusKuulutusPDF" && (
                  <>
                    <div>
                      <Link className="file_download" underline="none" href={ensisijaisetPDFt.aloituskuulutusPDFPath} target="_blank">
                        {splitFilePath(ensisijaisetPDFt.aloituskuulutusPDFPath).fileName}
                      </Link>
                    </div>
                    <div>
                      <Link
                        className="file_download"
                        underline="none"
                        href={ensisijaisetPDFt.aloituskuulutusIlmoitusPDFPath}
                        target="_blank"
                      >
                        {splitFilePath(ensisijaisetPDFt.aloituskuulutusIlmoitusPDFPath).fileName}
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {aloituskuulutusjulkaisu.kielitiedot?.toissijainenKieli && (
              <div className="content mb-4">
                <p>Kuulutus ja ilmoitus toissijaisella kielellä ({lowerCase(aloituskuulutusjulkaisu.kielitiedot?.toissijainenKieli)})</p>
                {toissijaisetPDFt && (
                  <div className="flex flex-col">
                    {toissijaisetPDFt.__typename === "AloitusKuulutusPDF" && (
                      <>
                        <div>
                          <Link className="file_download" underline="none" href={toissijaisetPDFt.aloituskuulutusPDFPath} target="_blank">
                            {splitFilePath(toissijaisetPDFt.aloituskuulutusPDFPath).fileName}
                          </Link>
                        </div>
                        <div>
                          <Link
                            className="file_download"
                            underline="none"
                            href={toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath}
                            target="_blank"
                          >
                            {splitFilePath(toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath).fileName}
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
        {aloituskuulutusjulkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY && (
          <AloituskuulutusTiedostot aloituskuulutusjulkaisu={aloituskuulutusjulkaisu} oid={projekti.oid} epaaktiivinen={epaaktiivinen} />
        )}
        <SectionContent>
          <p className="vayla-label">Kuulutus julkisella puolella</p>
          {epaaktiivinen ? (
            <p>
              Kuulutus on ollut nähtävillä palvelun julkisella puolella {formatDate(aloituskuulutusjulkaisu.kuulutusPaiva)}—
              {formatDate(aloituskuulutusjulkaisu.siirtyySuunnitteluVaiheeseen)} välisen ajan.
            </p>
          ) : (
            <>
              {!published && <p>Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on {kuulutusPaiva}.</p>}
              {published && (
                <p>
                  <ExtLink href={aloitusKuulutusHref}>Kuulutus palvelun julkisella puolella</ExtLink>
                </p>
              )}
            </>
          )}
        </SectionContent>
      </Section>

      <IlmoituksenVastaanottajat isLoading={isLoadingProjekti} aloituskuulutusjulkaisu={aloituskuulutusjulkaisu} />
    </>
  );
}
