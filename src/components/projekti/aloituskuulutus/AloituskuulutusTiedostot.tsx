import DownloadLink from "@components/DownloadLink";
import { AloitusKuulutusJulkaisu, AloitusKuulutusPDF, Kieli, KuulutusSaamePDF } from "@services/api";
import { isKieliTranslatable } from "hassu-common/kaannettavatKielet";
import lowerCase from "lodash/lowerCase";
import React, { ReactElement } from "react";
import { splitFilePath } from "../../../util/fileUtil";

interface Props {
  oid: string;
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
  epaaktiivinen?: boolean;
}

export default function AloituskuulutusTiedostot({ aloituskuulutusjulkaisu, oid, epaaktiivinen }: Props): ReactElement {
  if (!oid || !aloituskuulutusjulkaisu) {
    return <></>;
  }

  const { ensisijainenKieli, toissijainenKieli } = aloituskuulutusjulkaisu.kielitiedot || {};

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
        <p className="vayla-label">Ladattavat kuulutukset ja ilmoitukset</p>
        {!!epaaktiivinen ? (
          <p>Kuulutukset löytyvät asianhallinnasta.</p>
        ) : (
          <div>
            <p>Kuulutus ja ilmoitus ensisijaisella kielellä ({lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli)})</p>
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

            {aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli && (
              <div className="content mb-4">
                <p>Kuulutus ja ilmoitus toissijaisella kielellä ({lowerCase(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli)})</p>
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
