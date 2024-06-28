import DownloadLink from "@components/DownloadLink";
import { AloitusKuulutusJulkaisu, AloitusKuulutusPDF, Kieli, KuulutusSaamePDF } from "@services/api";
import { isKieliTranslatable } from "hassu-common/kaannettavatKielet";
import React, { ReactElement } from "react";
import { splitFilePath } from "../../../util/fileUtil";
import { label } from "src/util/textUtil";
import { H2 } from "../../Headings";

interface Props {
  oid: string;
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
  epaaktiivinen?: boolean;
}

export default function AloituskuulutusTiedostot({ aloituskuulutusjulkaisu, oid, epaaktiivinen }: Props): ReactElement {
  const kielitiedot = aloituskuulutusjulkaisu?.kielitiedot;
  if (!oid || !aloituskuulutusjulkaisu || !kielitiedot) {
    return <></>;
  }

  const { ensisijainenKieli, toissijainenKieli } = kielitiedot;

  const getEnsisijaisetPdft = (kieli: Kieli | undefined | null): AloitusKuulutusPDF | null | undefined => {
    if (isKieliTranslatable(kieli) && aloituskuulutusjulkaisu && aloituskuulutusjulkaisu.aloituskuulutusPDFt) {
      return aloituskuulutusjulkaisu?.aloituskuulutusPDFt[kieli];
    }
    return undefined;
  };

  const getToissijaisetPdft = (kieli: Kieli | undefined | null): KuulutusSaamePDF | AloitusKuulutusPDF | null | undefined => {
    if (isKieliTranslatable(kieli) && aloituskuulutusjulkaisu && aloituskuulutusjulkaisu.aloituskuulutusPDFt) {
      return aloituskuulutusjulkaisu?.aloituskuulutusPDFt[kieli];
    }
    if (kieli === Kieli.POHJOISSAAME && aloituskuulutusjulkaisu?.aloituskuulutusSaamePDFt?.POHJOISSAAME) {
      return aloituskuulutusjulkaisu?.aloituskuulutusSaamePDFt.POHJOISSAAME;
    }
    return undefined;
  };

  const ensisijaisetPDFt = getEnsisijaisetPdft(ensisijainenKieli);
  const toissijaisetPDFt = getToissijaisetPdft(toissijainenKieli);

  return (
    <>
      <div className="content">
        <H2>Ladattavat kuulutukset ja ilmoitukset</H2>
        {!!epaaktiivinen ? (
          <p>Kuulutukset löytyvät asianhallinnasta.</p>
        ) : (
          <div>
            <p>
              {label({
                label: `Kuulutus ja ilmoitus`,
                inputLanguage: Kieli.SUOMI,
                kielitiedot,
              })}
            </p>
            {ensisijaisetPDFt && (
              <div className="flex flex-col mb-4">
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
              </div>
            )}

            {toissijainenKieli && (
              <div className="content mb-4">
                <p>
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
          </div>
        )}
      </div>
    </>
  );
}
