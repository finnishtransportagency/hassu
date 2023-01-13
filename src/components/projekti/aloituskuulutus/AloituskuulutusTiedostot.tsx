import { Link } from "@mui/material";
import { AloitusKuulutusJulkaisu, Kieli } from "@services/api";
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
  const getPdft = (kieli: Kieli | undefined | null) => {
    if (!aloituskuulutusjulkaisu || !aloituskuulutusjulkaisu.aloituskuulutusPDFt || !kieli) {
      return undefined;
    }
    return aloituskuulutusjulkaisu.aloituskuulutusPDFt[kieli];
  };

  const ensisijaisetPDFt = getPdft(aloituskuulutusjulkaisu?.kielitiedot?.ensisijainenKieli);
  const toissijaisetPDFt = getPdft(aloituskuulutusjulkaisu?.kielitiedot?.toissijainenKieli);

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
                      <Link className="file_download" underline="none" href={toissijaisetPDFt.aloituskuulutusIlmoitusPDFPath} target="_blank">
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
