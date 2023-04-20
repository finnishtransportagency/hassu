import { Link } from "@mui/material";
import { AloitusKuulutusJulkaisu, AloitusKuulutusPDF, Kieli, KuulutusSaamePDF } from "@services/api";
import { isKieliTranslatable } from "common/kaannettavatKielet";
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
                  <Link className="file_download" underline="none" href={ensisijaisetPDFt.aloituskuulutusPDFPath} target="_blank">
                    {splitFilePath(ensisijaisetPDFt.aloituskuulutusPDFPath).fileName}
                  </Link>
                </div>
                <div>
                  <Link className="file_download" underline="none" href={ensisijaisetPDFt.aloituskuulutusIlmoitusPDFPath} target="_blank">
                    {splitFilePath(ensisijaisetPDFt.aloituskuulutusIlmoitusPDFPath).fileName}
                  </Link>
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
          </div>
        )}
      </div>
    </>
  );
}
