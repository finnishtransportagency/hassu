import { Link } from "@mui/material";
import { AloitusKuulutusJulkaisu } from "@services/api";
import { isKieliTranslatable, KaannettavaKieli } from "common/kaannettavatKielet";
import lowerCase from "lodash/lowerCase";
import { ReactElement } from "react";
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
  const getPdft = (kieli: KaannettavaKieli | undefined | null) => {
    if (!aloituskuulutusjulkaisu || !aloituskuulutusjulkaisu.aloituskuulutusPDFt || !kieli) {
      return undefined;
    }
    return aloituskuulutusjulkaisu.aloituskuulutusPDFt[kieli];
  };

  const ensisijaisetPDFt =
    isKieliTranslatable(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli) &&
    getPdft(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli as KaannettavaKieli);
  const toissijaisetPDFt =
    isKieliTranslatable(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli) &&
    getPdft(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli as KaannettavaKieli);

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
